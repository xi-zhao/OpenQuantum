"""Local Bloqade Analog adaptation; no cloud or Julia execution path."""
import sys
from decimal import Decimal
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[4] / "src/lib"))
from science_bridge import execute


def compute(v):
    import numpy as np
    from bloqade.analog import start
    from bloqade.analog.constants import RB_C6

    positions = v["atomPositionsUm"]
    durations = v["durationsUs"]
    max_atoms = (int(np.iinfo(np.intp).max) // np.dtype(np.complex128).itemsize).bit_length() - 1
    if len(positions) > max_atoms:
        raise ValueError("Full state vector exceeds this backend's addressable array representation")
    elapsed = Decimal(0)
    knots = [0.0]
    for dt in durations:
        elapsed += Decimal(str(dt))
        knots.append(float(elapsed))
    knots = np.asarray(knots)
    if not np.all(np.diff(knots) > 0) or not np.isfinite(knots[-1]):
        raise ValueError("Pulse segment times must be finite and strictly increasing")
    for i, first in enumerate(positions):
        for second in positions[i + 1:]:
            distance = np.hypot(first[0] - second[0], first[1] - second[1])
            with np.errstate(over="ignore", divide="ignore", invalid="ignore"):
                interaction = float(RB_C6) / distance**6
            if distance <= 0 or not np.isfinite(distance) or not np.isfinite(interaction):
                raise ValueError("Atom separation or pair interaction is not numerically representable")
    program = (
        start.add_position([tuple(site) for site in positions])
        .rydberg.rabi.amplitude.uniform.piecewise_linear(durations, v["rabiRadPerUs"])
        .detuning.uniform.piecewise_linear(durations, v["detuningRadPerUs"])
        .rabi.phase.uniform.piecewise_linear(durations, v["phaseRad"])
    )
    emulation = program.bloqade.python().hamiltonian(blockade_radius=0.0)[0]
    # Use the compiled Decimal duration, avoiding 0.1 + 0.2 overshooting 0.3.
    knots[-1] = float(emulation.hamiltonian.emulator_ir.duration)
    configurations = emulation.hamiltonian.space.configurations
    # Bloqade stores atom zero in the least significant configuration bit.
    occupations = np.array([[(int(config) >> atom) & 1 for atom in range(len(positions))]
                            for config in configurations], dtype=float)
    times = np.unique(np.concatenate((np.linspace(0, knots[-1], v["timeSteps"] + 1), knots)))
    populations, norm_errors = [], []
    final = None
    for state in emulation.evolve(times=times.tolist(), solver_name="dop853", atol=v["atol"], rtol=v["rtol"]):
        amplitudes = np.asarray(state.data).copy()
        if not np.isfinite(amplitudes).all():
            raise ValueError("Bloqade returned a nonfinite state")
        probabilities = np.abs(amplitudes)**2
        norm_errors.append(abs(float(probabilities.sum()) - 1.0))
        populations.append((probabilities @ occupations).tolist())
        final = amplitudes
    if final is None or len(populations) != len(times):
        raise ValueError("Bloqade did not return every requested time point")
    outcomes = [{
        "bits": "".join(str((int(config) >> atom) & 1) for atom in range(len(positions))),
        "probability": float(abs(amplitude)**2),
        "amplitude": [float(amplitude.real), float(amplitude.imag)],
    } for config, amplitude in zip(configurations, final)]
    outcomes.sort(key=lambda row: row["bits"])
    return {
        "timesUs": times.tolist(), "rydbergPopulations": populations,
        "finalOutcomes": outcomes, "maxNormError": max(norm_errors),
        "atomCount": len(positions), "hilbertDimension": len(configurations),
        "c6RadPerUsUm6": float(RB_C6), "backend": "bloqade.analog Python emulator",
        "bitOrder": "leftmost bit is atomPositionsUm[0]; 0=ground, 1=Rydberg",
        "model": "H/hbar=sum_i Omega(t)/2*(exp(i*phi(t))|g><r|+exp(-i*phi(t))|r><g|)-Delta(t)*n_i + sum_i<j C6/r_ij^6*n_i*n_j",
        "units": {"position": "um", "time": "us", "angularFrequency": "rad/us", "phase": "rad"},
    }, [
        "Closed, two-level, fixed-position Rydberg model with global controls, all-ground initial state and Bloqade's fixed Rb C6; no calibrated hardware, dissipation, motion or local addressing.",
        "Full 2^N Hilbert space without a blockade-radius truncation; time and memory grow exponentially. Caller chooses size and deployment execution limits.",
        "State probabilities and amplitudes are numerical wavefunction results, not finite-shot counts. No clipping or renormalization is applied; inspect maxNormError and vary solver tolerances for convergence.",
        "Time points include the uniform grid and every pulse segment boundary. ODE tolerances are not guaranteed observable error bounds; no scientific acceptance is declared.",
    ]


if __name__ == "__main__":
    execute(compute)
