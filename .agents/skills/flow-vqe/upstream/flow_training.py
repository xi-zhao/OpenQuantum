"""
Flow models module for Flow VQE.

Contains training functions for normalizing flow models in both single and multi-distance modes.
We thank [Zuko](https://github.com/probabilists/zuko) for their excellent implementation of flow models.
"""

import torch
import torch.optim as optim
import numpy as np
import copy
import zuko
import time
import os
import json
from zuko.flows import UnconditionalDistribution
from zuko.distributions import DiagNormal
from torch.cuda.amp import autocast, GradScaler
from .utils import tensor_to_serializable


def permute_shape(tensor):
    """Permute tensor shape for circuit evaluation"""
    if isinstance(tensor, torch.Tensor):
        dims = list(range(1, tensor.ndim)) + [0]
        return tensor.permute(*dims)
    elif isinstance(tensor, np.ndarray):
        dims = list(range(1, tensor.ndim)) + [0]
        return np.transpose(tensor, dims)
    else:
        raise ValueError("Input must be either a torch.Tensor or a numpy.ndarray")


def pretrain_flow(flow_model, unified_coeffs, training_distances, n_epochs=100, lr=1e-3, batch_size=32,
                  param_dim=32, weight_decay=1e-4, device="cpu", use_mixed_precision=False, num_coeffs=300,
                  context_type='hamiltonian_coeffs'):
    """Pretrain flow model with zero initial parameters"""
    flow_model = flow_model.to(device)
    optimizer = optim.Adam(flow_model.parameters(), lr=lr, weight_decay=weight_decay)

    scaler = GradScaler() if use_mixed_precision and device.type == 'cuda' else None

    print(f"Pretraining flow model for {n_epochs} epochs...")

    for epoch in range(n_epochs):
        all_params = []
        all_context = []

        for dist in training_distances:
            if context_type == 'hamiltonian_coeffs':
                context = unified_coeffs[dist][:num_coeffs]
            elif context_type == 'bond_length':
                context = torch.tensor([dist], dtype=torch.float32, device=device)
            else:
                raise ValueError(f"Unsupported context_type: {context_type}")

            init_params = torch.zeros(batch_size // len(training_distances) + 1, param_dim, dtype=torch.float32,
                                      device=device)

            context_batch = context.repeat(init_params.size(0), 1)

            all_params.append(init_params)
            all_context.append(context_batch)

        combined_params = torch.cat(all_params)
        combined_context = torch.cat(all_context)

        # Trim to batch size if needed
        if combined_params.size(0) > batch_size:
            indices = torch.randperm(combined_params.size(0))[:batch_size]
            combined_params = combined_params[indices]
            combined_context = combined_context[indices]

        optimizer.zero_grad()

        if use_mixed_precision and device.type == 'cuda':
            with autocast():
                loss = - flow_model(combined_context).log_prob(combined_params).mean()

            scaler.scale(loss).backward()
            scaler.step(optimizer)
            scaler.update()
        else: 
            loss = - flow_model(combined_context).log_prob(combined_params).mean()
            loss.backward()
            optimizer.step()

        if epoch % 50 == 0:
            print(f"Pretrain Epoch {epoch}, Loss: {loss.item():.8f}")

    return flow_model


def train_single_distance_models(
        unified_hamiltonians, unified_coeffs, circuits, gs_energies,
        training_distances, device, save_dir, param_dim,
        n_epochs=1000, lr=1e-4, batch_size=8, buffer_size=8,
        pretrain_epochs=0, weight_decay=1e-4,
        n_flows=10, flow_hidden_dim=256, prior_std=0.01,
        components=32, training_noise=0.0005, num_coeffs=None):
    """Train individual flow models for each distance (single-distance mode)"""

    first_dist = training_distances[0]
    cond_dim = num_coeffs if num_coeffs is not None else unified_coeffs[first_dist].shape[0]

    print(f"Parameter dimension: {param_dim}, Conditional dimension: {cond_dim}")

    individual_models_dir = os.path.join(save_dir, 'individual_models')
    os.makedirs(individual_models_dir, exist_ok=True)

    # Initialize results storage
    all_models = {}
    all_histories = {}
    all_best_params = {}
    all_best_energies = {}

    for dist in training_distances:
        print(f"\nTraining model for bond length {dist} Å")
        dist_dir = os.path.join(individual_models_dir, f'distance_{dist}')
        os.makedirs(dist_dir, exist_ok=True)

        flow_model = zuko.flows.GF(
            features=param_dim,
            context=cond_dim,
            transforms=n_flows,
            components=components,
            hidden_features=(flow_hidden_dim, flow_hidden_dim, flow_hidden_dim)
        )
        flow_model = flow_model.to(device)

        num_params = sum(p.numel() for p in flow_model.parameters())
        print(f"Flow model parameter count: {num_params}")

        flow_model.base = UnconditionalDistribution(
            DiagNormal,
            torch.zeros(param_dim, device=device),
            prior_std * torch.ones(param_dim, device=device),
            buffer=True
        )

        # Optional pretraining phase
        if pretrain_epochs > 0:
            flow_model = pretrain_flow(
                flow_model, {dist: unified_coeffs[dist]}, [dist],
                n_epochs=pretrain_epochs, lr=lr, batch_size=batch_size,
                param_dim=param_dim, weight_decay=weight_decay, device=device,
                use_mixed_precision=False, num_coeffs=num_coeffs,
                context_type='hamiltonian_coeffs'
            )
        else:
            print("Skipping pretraining phase...")

        optimizer = optim.Adam(flow_model.parameters(), lr=lr, weight_decay=weight_decay)

        best_model = copy.deepcopy(flow_model).to(device)
        best_params = None
        best_energy = float("inf")
        min_loss = float('inf')
        min_loss_model = None

        chemical_accuracy_achieved = False
        evaluations_at_chemical_accuracy = None
        total_evaluations = 0

        memory_buffer = []
        history = []

        print(f"Starting training for bond length {dist} Å")
        print(f"Using {batch_size} samples per batch")
        print(f"Using training noise with standard deviation: {training_noise}")

        for epoch in range(n_epochs):
            epoch_loss = 0.0

            # Get Hamiltonian components for this distance
            H = unified_hamiltonians[dist]
            circuit = circuits[dist]
            coeffs_tensor = unified_coeffs[dist]

            # Generate samples from the flow model
            coeffs_batch = coeffs_tensor.repeat(batch_size, 1)
            x, log_prob_batch = flow_model(coeffs_tensor).rsample_and_log_prob((batch_size,))
            params_batch = x

            energies_batch = torch.zeros(batch_size, device=device)
            for j, params in enumerate(params_batch):
                energies_batch[j] = torch.tensor(circuit(params), device=device)
                total_evaluations += 1 

            # Track best parameters
            min_idx = torch.argmin(energies_batch)
            current_min_energy = energies_batch[min_idx].item()

            if current_min_energy < best_energy:
                best_energy = current_min_energy
                best_params = params_batch[min_idx].clone().detach()
                
                # Check for chemical accuracy
                error = best_energy - gs_energies[dist]
                if not chemical_accuracy_achieved and abs(error) < 1.6e-3:
                    chemical_accuracy_achieved = True
                    evaluations_at_chemical_accuracy = total_evaluations
                    print(f"\nChemical accuracy achieved for bond length {dist} Å!")
                    print(f"Total circuit evaluations: {total_evaluations}")
                    print(f"Final error: {error:.8f} Ha")

            # Update memory buffer with all samples
            for j in range(batch_size):
                memory_buffer.append((params_batch[j].detach(), energies_batch[j].detach()))

            # Sort and trim memory buffer (keep best samples)
            memory_buffer.sort(key=lambda x: x[1].item())
            if len(memory_buffer) > buffer_size * 10:
                memory_buffer = memory_buffer[:buffer_size * 10]

            # Create training batch from best samples in memory buffer
            training_params = []
            training_coeffs = []

            # Select top samples from memory buffer
            pos_samples_count = min(batch_size, len(memory_buffer))
            if pos_samples_count > 0:
                pos_samples = [p for p, _ in memory_buffer[:pos_samples_count]]
                pos_samples_tensor = torch.stack(pos_samples)
                pos_samples_tensor = pos_samples_tensor + training_noise * torch.randn(pos_samples_tensor.shape, device=device)
                pos_coeffs_batch = coeffs_tensor.repeat(pos_samples_tensor.size(0), 1)

                training_params.append(pos_samples_tensor)
                training_coeffs.append(pos_coeffs_batch)

            # Perform batch update if we have samples
            if training_params:
                combined_params = torch.cat(training_params)
                combined_coeffs = torch.cat(training_coeffs)

                # Forward pass and loss computation
                optimizer.zero_grad()
                pos_logprob = flow_model(combined_coeffs).log_prob(combined_params)
                loss = - torch.mean(pos_logprob)
                loss.backward()
                optimizer.step()

                epoch_loss = loss.item()

            # Record epoch information
            error = best_energy - gs_energies[dist]
            epoch_info = {
                'epoch': epoch,
                'loss': float(epoch_loss),
                'best_energy': float(best_energy),
                'error': float(error),
                'total_evaluations': total_evaluations,
                'chemical_accuracy_achieved': chemical_accuracy_achieved,
                'evaluations_at_chemical_accuracy': evaluations_at_chemical_accuracy
            }
            history.append(epoch_info)

            if epoch % 20 == 0 or epoch == n_epochs - 1:
                if epoch > 0:   
                    print(f"\nEpoch {epoch}:")
                    print(f"Loss: {epoch_loss:.8f}")
                else:
                    print(f"\nEpoch {epoch}:")
                    print(f"Loss: {epoch_loss:.8f}")
                
                print(f"Ground state energy error: {error:.8f} Ha {'(chemical accuracy)' if abs(error) < 1.6e-3 else ''}")
                print(f"Total circuit evaluations: {total_evaluations}")

                if epoch % 1000 == 0:
                    torch.save(flow_model.state_dict(), os.path.join(dist_dir, f'flow_model_epoch_{epoch}.pt'))

                    serializable_history = tensor_to_serializable(history)
                    with open(os.path.join(dist_dir, f'history_epoch_{epoch}.json'), 'w') as f:
                        json.dump(serializable_history, f, indent=4)

                if epoch_loss < min_loss:
                    min_loss = epoch_loss
                    min_loss_model = copy.deepcopy(flow_model)
                    torch.save(min_loss_model.state_dict(), os.path.join(dist_dir, 'min_loss_model.pt'))

        final_model = copy.deepcopy(flow_model)
        torch.save(final_model.state_dict(), os.path.join(dist_dir, 'final_model.pt'))

        best_model = min_loss_model if min_loss_model is not None else flow_model
        torch.save(best_model.state_dict(), os.path.join(dist_dir, 'best_flow_model.pt'))

        serializable_history = tensor_to_serializable(history)
        with open(os.path.join(dist_dir, 'training_history.json'), 'w') as f:
            json.dump(serializable_history, f, indent=4)

        if best_params is not None:
            best_params_serializable = best_params.cpu().numpy().tolist()
            with open(os.path.join(dist_dir, 'best_parameters.json'), 'w') as f:
                json.dump(best_params_serializable, f, indent=4)
                
        chemical_accuracy_info = {
            'chemical_accuracy_achieved': chemical_accuracy_achieved,
            'total_evaluations': total_evaluations,
            'evaluations_at_chemical_accuracy': evaluations_at_chemical_accuracy,
            'final_error': float(best_energy - gs_energies[dist])
        }
        with open(os.path.join(dist_dir, 'chemical_accuracy_info.json'), 'w') as f:
            json.dump(chemical_accuracy_info, f, indent=4)

        all_models[dist] = best_model
        all_histories[dist] = history
        all_best_params[dist] = best_params
        all_best_energies[dist] = best_energy

    return all_models, all_histories, all_best_params, all_best_energies


def train_flow_with_unified_hamiltonians(
        unified_hamiltonians, unified_coeffs, circuits, gs_energies,
        training_distances, device, save_dir, param_dim,
        n_epochs=1000, lr=1e-4, batch_size=8, buffer_size=8,
        pretrain_epochs=0, weight_decay=1e-4,
        n_flows=10, flow_hidden_dim=256, prior_std=0.01,
        components=32, initial_model=None, training_noise=0.0005, num_coeffs=300,
        context_type='hamiltonian_coeffs'):
    """Train flow model using unified Hamiltonians and consistent coefficient ordering"""

    # Get the conditional dimension based on context_type
    if context_type == 'hamiltonian_coeffs':
        cond_dim = num_coeffs
    elif context_type == 'bond_length':
        cond_dim = 1
    else:
        raise ValueError(f"Unsupported context_type: {context_type}")

    print(f"Parameter dimension: {param_dim}, Conditional dimension: {cond_dim}")

    # Create or use provided normalizing flow model
    if initial_model is None:
        print("Creating new flow model...")
        flow_model = zuko.flows.GF(
            features=param_dim,
            context=cond_dim,
            transforms=n_flows,
            components=components,
            hidden_features=(flow_hidden_dim, flow_hidden_dim, flow_hidden_dim)
        )
        flow_model = flow_model.to(device)
    else:
        print("Using provided flow model...")
        flow_model = initial_model

    num_params = sum(p.numel() for p in flow_model.parameters())
    print(f"Flow model parameter count: {num_params}")

    flow_model.base = UnconditionalDistribution(
        DiagNormal,
        torch.zeros(param_dim, device=device),
        prior_std * torch.ones(param_dim, device=device),
        buffer=True
    )

    # Optional pretraining phase
    if pretrain_epochs > 0:
        flow_model = pretrain_flow(
            flow_model, unified_coeffs, training_distances,
            n_epochs=pretrain_epochs, lr=lr, batch_size=batch_size,
            param_dim=param_dim, weight_decay=weight_decay, device=device,
            use_mixed_precision=False, num_coeffs=num_coeffs,
            context_type=context_type
        )
    else:
        print("Skipping pretraining phase...")

    # Initialize optimizer for main training
    optimizer = optim.Adam(flow_model.parameters(), lr=lr, weight_decay=weight_decay)

    scaler = GradScaler() if False and device.type == 'cuda' else None

    # Initialize tracking variables
    best_model = copy.deepcopy(flow_model).to(device)
    best_params = {dist: None for dist in training_distances}
    best_energies = {dist: float("inf") for dist in training_distances}
    min_loss = float('inf')
    min_loss_model = None
    min_avg_energy = float('inf')
    min_avg_energy_model = None

    # Create memory buffer for each bond length
    memory_buffers = {dist: [] for dist in training_distances}

    history = []

    chemical_accuracy = 1.6e-3 
    chemical_accuracy_reached = {dist: False for dist in training_distances}
    circuit_evals_at_chemical_accuracy = {dist: None for dist in training_distances}
    total_circuit_evals = {dist: 0 for dist in training_distances}

    # Track minimum energies per bond length throughout training
    energy_history = {dist: [] for dist in training_distances}
    circuit_eval_history = {dist: [] for dist in training_distances}

    # Determine samples per bond length
    samples_per_distance = batch_size

    # Start training
    print("Starting flow model training with unified Hamiltonians...")
    print(f"Using {samples_per_distance} samples per bond length in each batch")
    print(f"Using training noise with standard deviation: {training_noise}")

    last_20_time_start = time.time()  

    for epoch in range(n_epochs):
        epoch_loss = 0.0

        all_params_samples = []
        all_energies_samples = []
        all_logprobs = []
        all_coeffs_batch = []
        all_context_batch = []

        for dist in training_distances:
            H = unified_hamiltonians[dist]
            circuit = circuits[dist]
            
            if context_type == 'hamiltonian_coeffs':
                context_tensor = unified_coeffs[dist][:num_coeffs]
            elif context_type == 'bond_length':
                context_tensor = torch.tensor([dist], dtype=torch.float32, device=device)
            else:
                raise ValueError(f"Unsupported context_type: {context_type}")

            context_batch = context_tensor.repeat(samples_per_distance, 1)

            if False and device.type == 'cuda':
                with autocast():
                    x, log_prob_batch = flow_model(context_tensor).rsample_and_log_prob((batch_size,))
                params_batch = x
            else: 
                x, log_prob_batch = flow_model(context_tensor).rsample_and_log_prob((batch_size,))
                params_batch = x
 
            energies_batch = torch.tensor(circuit(permute_shape(params_batch)), device=device)
            total_circuit_evals[dist] += batch_size

            min_idx = torch.argmin(energies_batch)
            current_min_energy = energies_batch[min_idx].item()

            if current_min_energy < best_energies[dist]:
                best_energies[dist] = current_min_energy
                best_params[dist] = params_batch[min_idx].clone().detach()

            energy_history[dist].append(best_energies[dist])
            circuit_eval_history[dist].append(total_circuit_evals[dist])

            if not chemical_accuracy_reached[dist]:
                error = abs(best_energies[dist] - gs_energies[dist])
                if error < chemical_accuracy:
                    chemical_accuracy_reached[dist] = True
                    circuit_evals_at_chemical_accuracy[dist] = total_circuit_evals[dist]

            for j in range(buffer_size):
                memory_buffers[dist].append((params_batch[j].detach(), energies_batch[j].detach()))

            memory_buffers[dist].sort(key=lambda x: x[1].item())
            if len(memory_buffers[dist]) > buffer_size * 2:
                memory_buffers[dist] = memory_buffers[dist][:buffer_size * 2]

            all_params_samples.append(params_batch)
            all_energies_samples.append(energies_batch)
            all_logprobs.append(log_prob_batch)
            all_coeffs_batch.append(context_batch)
            all_context_batch.append(context_batch) 

        # Create training batch from best samples in memory buffers
        training_params = []
        training_coeffs = []
        training_context = []

        for dist in training_distances:
            if context_type == 'hamiltonian_coeffs':
                context_tensor = unified_coeffs[dist][:num_coeffs]
            elif context_type == 'bond_length':
                context_tensor = torch.tensor([dist], dtype=torch.float32, device=device)
            else:
                raise ValueError(f"Unsupported context_type: {context_type}")

            # Select top samples from memory buffer
            pos_samples_count = min(buffer_size, len(memory_buffers[dist]))
            if pos_samples_count > 0:
                pos_samples = [p for p, _ in memory_buffers[dist][:pos_samples_count]]
                pos_samples_tensor = torch.stack(pos_samples)

                # Add noise to the samples to make the training more smooth
                pos_samples_tensor = pos_samples_tensor + training_noise * torch.randn(pos_samples_tensor.shape, device=device)

                pos_coeffs_batch = context_tensor.repeat(pos_samples_tensor.size(0), 1)
                pos_context_batch = context_tensor.repeat(pos_samples_tensor.size(0), 1)

                training_params.append(pos_samples_tensor)
                training_coeffs.append(pos_coeffs_batch)
                training_context.append(pos_context_batch) 

        # Perform batch update if we have samples
        if training_params:
            combined_params = torch.cat(training_params)
            combined_coeffs = torch.cat(training_coeffs)
            combined_context = torch.cat(training_context) # Get combined context

            optimizer.zero_grad()

            if False and device.type == 'cuda':
                with autocast():
                    pos_logprob = flow_model(combined_context).log_prob(combined_params)
                    loss = - torch.mean(pos_logprob)
 
                scaler.scale(loss).backward()
                scaler.step(optimizer)
                scaler.update()
            else: 
                pos_logprob = flow_model(combined_context).log_prob(combined_params)
                loss = - torch.mean(pos_logprob)
                loss.backward()
                optimizer.step()

            epoch_loss = loss.item()
 
        best_energy_values = {str(dist): float(energy) for dist, energy in best_energies.items()}
        error_values = {str(dist): float(energy - gs_energies[dist]) for dist, energy in best_energies.items()}

        epoch_info = {
            'epoch': epoch,
            'loss': float(epoch_loss),
            'best_energies': best_energy_values,
            'errors': error_values,
            'circuit_evaluations': {str(dist): total_circuit_evals[dist] for dist in training_distances}
        }
        history.append(epoch_info)
 
        if epoch % 20 == 0 or epoch == n_epochs - 1:
            if epoch > 0:   
                elapsed_time = time.time() - last_20_time_start
                print(f"\nEpoch {epoch}:")
                print(f"Loss: {epoch_loss:.8f}")
                print(f"Time for last 20 epochs: {elapsed_time:.2f}s")
            else:
                print(f"\nEpoch {epoch}:")
                print(f"Loss: {epoch_loss:.8f}")
                 
            last_20_time_start = time.time()
            
            print("Ground state energy errors for each bond length:")
            for dist in training_distances:
                error = best_energies[dist] - gs_energies[dist]
                print(f"  Bond length {dist} Å: {error:.8f} Ha {'(chemical accuracy)' if abs(error) < chemical_accuracy else ''}")
                if chemical_accuracy_reached[dist]:
                    print(f"    Chemical accuracy reached at {circuit_evals_at_chemical_accuracy[dist]} circuit evaluations")
 
            if epoch % 1000 == 0:
                torch.save(flow_model.state_dict(), os.path.join(save_dir, f'flow_model_epoch_{epoch}.pt'))
 
                history_data = {
                    'training_history': tensor_to_serializable(history),
                    'energy_history': {str(dist): tensor_to_serializable(energies) 
                                     for dist, energies in energy_history.items()},
                    'circuit_eval_history': {str(dist): tensor_to_serializable(evals) 
                                           for dist, evals in circuit_eval_history.items()},
                    'chemical_accuracy_data': {
                        'reached_at': circuit_evals_at_chemical_accuracy,
                        'final_errors': {str(dist): float(best_energies[dist] - gs_energies[dist]) 
                                       for dist in training_distances}
                    }
                }
                
                with open(os.path.join(save_dir, f'history_epoch_{epoch}.json'), 'w') as f:
                    json.dump(history_data, f, indent=4)
 
            current_avg_energy = np.mean(list(best_energies.values()))
            if current_avg_energy < min_avg_energy:
                min_avg_energy = current_avg_energy
                min_avg_energy_model = copy.deepcopy(flow_model)
 
    final_model = copy.deepcopy(flow_model)
    torch.save(final_model.state_dict(), os.path.join(save_dir, 'final_model.pt'))
 
    best_model = min_avg_energy_model if min_avg_energy_model is not None else flow_model
    torch.save(best_model.state_dict(), os.path.join(save_dir, 'best_flow_model.pt'))
 
    final_history_data = {
        'training_history': tensor_to_serializable(history),
        'energy_history': {str(dist): tensor_to_serializable(energies) 
                          for dist, energies in energy_history.items()},
        'circuit_eval_history': {str(dist): tensor_to_serializable(evals) 
                                for dist, evals in circuit_eval_history.items()},
        'chemical_accuracy_data': {
            'reached_at': circuit_evals_at_chemical_accuracy,
            'final_errors': {str(dist): float(best_energies[dist] - gs_energies[dist]) 
                            for dist in training_distances}
        }
    }
    
    with open(os.path.join(save_dir, 'training_history.json'), 'w') as f:
        json.dump(final_history_data, f, indent=4)
 
    best_params_serializable = {str(dist): tensor_to_serializable(params) 
                              for dist, params in best_params.items()}
    with open(os.path.join(save_dir, 'best_parameters.json'), 'w') as f:
        json.dump(best_params_serializable, f, indent=4)

    best_energies_serializable = {str(dist): float(energy) for dist, energy in best_energies.items()}
    with open(os.path.join(save_dir, 'best_energies.json'), 'w') as f:
        json.dump(best_energies_serializable, f, indent=4)
 
    memory_buffer_best_params = {}
    for dist in training_distances:
        if memory_buffers[dist]: 
            best_buffer_params, best_buffer_energy = min(memory_buffers[dist], key=lambda x: x[1])
            memory_buffer_best_params[str(dist)] = {
                'params': tensor_to_serializable(best_buffer_params),
                'energy': float(best_buffer_energy),
                'error': float(best_buffer_energy - gs_energies[dist])
            }

    with open(os.path.join(save_dir, 'memory_buffer_best_parameters.json'), 'w') as f:
        json.dump(memory_buffer_best_params, f, indent=4)

    return best_model, history, best_params, best_energies, energy_history, circuit_eval_history 