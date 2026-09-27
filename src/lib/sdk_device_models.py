"""Shared local Pulser result materialization for the two explicit SDK adapters."""
import warnings


def virtual_device():
    from pulser.channels import Rydberg
    from pulser.devices import VirtualDevice
    return VirtualDevice(
        name="OpenQuantumLocalRb70S", dimensions=2, rydberg_level=70,
        min_atom_distance=0.0,
        channel_objects=(Rydberg.Global(None, None, clock_period=1, min_duration=1, max_duration=None, custom_phase_jump_time=0),),
    )


def simulate_sequence(sequence, v, boundary_times_ns=()):
    import numpy as np
    from pulser_simulation import QutipEmulator

    positions = [list(map(float, position)) for position in sequence.register.qubits.values()]
    n = len(positions)
    max_atoms = (int(np.iinfo(np.intp).max) // np.dtype(np.complex128).itemsize).bit_length() - 1
    if n > max_atoms:
        raise ValueError("Full state vector exceeds the addressable array representation")
    c6 = float(sequence.device.interaction_coeff)
    for i, a in enumerate(positions):
        for b in positions[i + 1:]:
            distance = np.hypot(a[0] - b[0], a[1] - b[1])
            with np.errstate(over="ignore", divide="ignore", invalid="ignore"):
                interaction = c6 / distance**6
            if distance <= 0 or not np.isfinite(distance) or not np.isfinite(interaction):
                raise ValueError("Atom separation or interaction is not numerically representable")
    duration = int(sequence.get_duration())
    if duration < 4:
        raise ValueError("Pulser QutipEmulator requires a compiled duration of at least 4 ns")
    times = np.unique(np.concatenate((np.linspace(0, duration / 1000, v["timeSteps"] + 1), np.asarray(boundary_times_ns) / 1000)))
    if times[0] < 0 or times[-1] > duration / 1000:
        raise ValueError("Evaluation boundary lies outside the compiled sequence")
    with warnings.catch_warnings():
        # This pinned public API exposes solver tolerances and unnormalized states.
        warnings.filterwarnings("ignore", category=DeprecationWarning, message=".*QutipEmulator.*")
        simulation = QutipEmulator.from_sequence(sequence, evaluation_times=times.tolist())
        results = simulation.run(atol=v["atol"], rtol=v["rtol"], nsteps=v["maxSolverSteps"],
                                 max_step=v["solverMaxStepNs"] / 1000, normalize_output=False)
    # Pulser orders local bases as |r>, |g>, with input atom 0 most significant.
    occupations = np.asarray([[1 - ((index >> (n - atom - 1)) & 1) for atom in range(n)] for index in range(1 << n)])
    populations, norm_errors, final = [], [], None
    for time in times:
        final = np.asarray(results.get_state(float(time), ignore_global_phase=False, normalize=False, t_tol=1e-12).full()).ravel().copy()
        if not np.isfinite(final).all():
            raise ValueError("Pulser returned a nonfinite state")
        probabilities = abs(final)**2
        populations.append((probabilities @ occupations).tolist())
        norm_errors.append(abs(float(probabilities.sum()) - 1))
    outcomes = [{"bits": "".join(map(str, occupation)), "probability": float(abs(amplitude)**2),
                 "amplitude": [float(amplitude.real), float(amplitude.imag)]}
                for occupation, amplitude in zip(occupations, final)]
    outcomes.sort(key=lambda row: row["bits"])
    return {
        "timesUs": times.tolist(), "rydbergPopulations": populations, "finalOutcomes": outcomes,
        "maxNormError": max(norm_errors), "atomCount": n, "hilbertDimension": 1 << n,
        "compiledDurationNs": duration, "compiledPositionsUm": positions, "c6RadPerUsUm6": c6,
        "backend": "Pulser QutipEmulator", "bitOrder": "leftmost bit is input atom 0; 0=ground, 1=Rydberg",
        "model": "H/hbar=sum_i Omega(t)/2*(exp(-i*phi)|g><r|+exp(i*phi)|r><g|)-Delta(t)*n_i + sum_i<j C6/r_ij^6*n_i*n_j",
        "units": {"position": "um", "time": "us", "angularFrequency": "rad/us", "phase": "rad"},
    }


ANALOG_LIMITATIONS = [
    "Closed two-level, fixed-position, globally driven Rb70S model from all-ground state; no dissipation, atom motion, local addressing, cloud or calibrated hardware.",
    "Pulser samples pulse envelopes on its nanosecond grid and interpolates them for QuTiP; solver tolerances do not bound error relative to a continuous-time ideal waveform. Endpoints and rounding must be checked for convergence.",
    "Probabilities are raw wavefunction values, not finite-shot counts. No adapter clipping, normalization or global-phase removal; inspect maxNormError and perform convergence checks.",
    "The full 2^N Hilbert space is simulated. Caller selects problem size and deployment execution limits. Numerical comparisons do not constitute scientific acceptance.",
]
