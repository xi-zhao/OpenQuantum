"""
Utilities module for Flow VQE.

Contains utility functions for environment setup, data serialization, and other helper functions.
"""

import torch
import numpy as np
import os
import json
from datetime import datetime
from molecule_configs import MOLECULE_CONFIGS


def tensor_to_serializable(obj): 
    if isinstance(obj, dict):
        return {k: tensor_to_serializable(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [tensor_to_serializable(item) for item in obj]
    elif isinstance(obj, tuple):
        return tuple(tensor_to_serializable(item) for item in obj)
    elif isinstance(obj, torch.Tensor):
        return obj.detach().cpu().tolist()
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, np.floating):
        return float(obj)
    elif isinstance(obj, np.integer):
        return int(obj)
    else:
        return obj


def setup_environment(args):
    """Setup device and seed""" 
    torch.manual_seed(args.seed)
    np.random.seed(args.seed)

    # Determine device
    if args.device == 'auto':
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    else:
        device = torch.device(args.device)

    print(f"Using device: {device}")

    # Print mixed precision settings
    if device.type == 'cuda' and args.use_mixed_precision:
        print("Mixed precision training enabled")
        if args.use_dynamic_loss_scaling:
            print("Using dynamic loss scaling")
        else:
            print("Using static loss scaling")
    elif args.use_mixed_precision:
        print("Mixed precision requested but not available on CPU, will use full precision")

    # Create save directory
    save_dir = os.path.join(args.save_dir, args.experiment_name)
    os.makedirs(save_dir, exist_ok=True)

    # Create a copy of args for saving (to handle None values)
    args_dict = vars(args).copy()
    
    if args.molecules in MOLECULE_CONFIGS:
        config = MOLECULE_CONFIGS[args.molecules]
        if args.symbols is None:
            args_dict['symbols'] = ','.join(config['symbols'])
        if args.active_electrons is None:
            args_dict['active_electrons'] = config['active_electrons']
        if args.active_orbitals is None:
            args_dict['active_orbitals'] = config['active_orbitals']

    config_path = os.path.join(save_dir, 'config.json')
    with open(config_path, 'w') as f:
        json.dump(args_dict, f, indent=4)

    args_txt_path = os.path.join(save_dir, 'args.txt')
    with open(args_txt_path, 'w') as f:
        f.write(f"Experiment start time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
        f.write("Command line arguments:\n")
        f.write("=" * 50 + "\n")

        categories = {
            "General Settings": ["experiment_name", "save_dir", "device", "seed"],
            "Molecule Configuration": ["molecules", "symbols", "active_electrons", "active_orbitals", "use_tapering", "ansatz_type"],
            "Training Mode": ["training_mode"],
            "Training Settings": ["training_range"],
            "Test Range Settings": ["test_range"],
            "Quantum Circuit Settings": ["ansatz_layer"],
            "Flow Model Settings": ["n_flows", "flow_hidden_dim", "prior_std", "components", "num_coeffs"],
            "Training Parameters": ["n_epochs", "pretrain_epochs", "lr", "batch_size", "buffer_size",
                                  "weight_decay", "samples_per_point", "training_noise"],
            "Mixed Precision Settings": ["use_mixed_precision", "use_dynamic_loss_scaling"]
        }

        for category, param_names in categories.items():
            f.write(f"\n{category}:\n")
            for name in param_names:
                value = args_dict.get(name, getattr(args, name))
                if name in ["training_range", "test_range"]:
                    f.write(f"  {name}: {value}\n")
                else:
                    f.write(f"  {name}: {value}\n")

    print(f"Configuration saved to {config_path} and {args_txt_path}")
    return device, save_dir


def save_single_distance_final_results(all_histories, all_best_energies, gs_energies, save_dir):
    """Save final results for single-distance mode in a single JSON file"""
    results = {}
    
    for dist, history in all_histories.items():
        evaluations_at_chemical_accuracy = history[-1]['evaluations_at_chemical_accuracy']
        
        final_error = abs(history[-1]['error'])
        
        results[str(dist)] = {
            'evaluations_at_chemical_accuracy': evaluations_at_chemical_accuracy,
            'final_error': float(final_error),
            'best_energy': float(all_best_energies[dist]),
            'ground_state_energy': float(gs_energies[dist])
        }
    
    with open(os.path.join(save_dir, 'final_results.json'), 'w') as f:
        json.dump(results, f, indent=4) 