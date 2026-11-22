"""Editable two-qubit state-control experiment using the public ST-GRAPE API."""

import argparse
import hashlib
import json
import math
import os
import platform
import tomllib
from importlib.metadata import version
from pathlib import Path

import numpy as np
from qutip import basis, qeye, sigmax, sigmay, sigmaz, tensor
from scipy.linalg import expm
from stgrape import (
    ControlProblem,
    ControlTask,
    FilteredPulse,
    FlatEnvelope,
    OptimizationConfig,
    RobustnessModel,
    TaylorNoise,
    configure_ode_propagation,
    evaluate_taylor_sensitivity_diagnostics,
    optimize,
)
from stgrape.optimizers import LBFGSBOptions
from stgrape.systems import CommutingControlGroup


def check_control_groups(problem, groups):
    dim = problem.hilbert_dimension
    seen = set()
    for group in groups:
        u = group.basis_transform.full()
        if u.shape != (dim, dim) or not np.allclose(u.conj().T @ u, np.eye(dim), rtol=0, atol=1e-10):
            raise ValueError("control basis must be unitary")
        for channel, term in zip(group.channels, group.diagonal_hamiltonians, strict=True):
            if channel not in range(problem.n_controls) or channel in seen:
                raise ValueError("control channels must be covered exactly once")
            seen.add(channel)
            diagonal = term.full()
            h = problem.control_hamiltonians[channel].full()
            if (
                diagonal.shape != (dim, dim)
                or not np.all(np.isfinite(diagonal))
                or not np.allclose(diagonal, np.diag(diagonal.diagonal().real), rtol=0, atol=1e-10)
                or not np.allclose(u @ diagonal @ u.conj().T, h, rtol=0, atol=1e-10)
            ):
                raise ValueError("control group needs a real diagonal spectrum in its stated basis")
    if seen != set(range(problem.n_controls)):
        raise ValueError("missing control channel")


def experiment(coefficients, widths, order):
    x, y, z, eye = sigmax(), sigmay(), sigmaz(), qeye(2)
    drift = 0.55 * tensor(x, x) + 0.23 * tensor(eye, x)
    control = 0.5 * tensor(z, eye) + 0.22 * tensor(eye, z)
    start, target = (tensor(basis(2, i), basis(2, i)) for i in (0, 1))
    dt = 0.35
    problem = ControlProblem(drift, (control,), start, target, 4 * dt, dt, ControlTask.STATE_PREPARATION)
    pulse = FilteredPulse(
        1,
        4,
        dt,
        np.array([coefficients]),
        envelope=FlatEnvelope(),
        cutoff_frequency=0.5,
        filter_kernel=(0.6, 0.4),
    )
    operators = (widths[0] * tensor(eye, z), widths[1] * tensor(y, eye))
    noise = RobustnessModel(taylor=TaylorNoise(static_operators=operators, order=order))
    group = CommutingControlGroup((0,), tensor(eye, eye), (control,))
    return problem, pulse, noise, group


def reference_state(problem, amplitudes, operators=(), offsets=()):
    h = problem.drift_hamiltonian.full()
    for operator, offset in zip(operators, offsets, strict=True):
        h = h + offset * operator.full()
    state = problem.initial.full()[:, 0]
    control = problem.control_hamiltonians[0].full()
    for amp in np.asarray(amplitudes).reshape(-1):
        state = expm(-1j * problem.time_step * (h + amp * control)) @ state
    if not np.all(np.isfinite(state)) or not np.isclose(np.linalg.norm(state), 1, atol=1e-10, rtol=0):
        raise ValueError("independent propagation failed its finite, normalized state check")
    return state


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--method", choices=["st-grape", "dense", "block-sparse"], default="st-grape")
    p.add_argument("--coefficients", nargs=3, type=float, default=[0.3, -0.7, 1.1])
    p.add_argument("--widths", nargs=2, type=float, default=[0.06, 0.04])
    p.add_argument("--order", type=int, choices=[1, 2], default=2)
    p.add_argument("--steps", type=int, default=2)
    p.add_argument("--iterations", type=int, default=3)
    p.add_argument("--evaluations", type=int, default=16)
    p.add_argument("--seconds", type=float, default=12)
    p.add_argument("--seed", type=int, default=20261122)
    args = p.parse_args()
    if (
        not all(math.isfinite(x) for x in [*args.coefficients, *args.widths, args.seconds])
        or min(args.widths) < 0
        or args.seed < 0
        or min(args.steps, args.iterations, args.evaluations, args.seconds) <= 0
    ):
        p.error("coefficients and widths must be finite, widths and seed nonnegative, budgets positive")
    if Path("result.json").exists():
        raise FileExistsError("use a fresh task directory")
    problem, pulse, noise, group = experiment(args.coefficients, args.widths, args.order)
    if args.method == "st-grape":
        check_control_groups(problem, (group,))
    ode = configure_ode_propagation(
        representation="block-sparse" if args.method == "block-sparse" else "dense", rtol=1e-10, atol=1e-12
    )
    config = OptimizationConfig(
        algorithm="st-grape" if args.method == "st-grape" else "grape",
        propagation=ode,
        optimizer=LBFGSBOptions(
            max_iterations=args.iterations,
            max_function_evaluations=args.evaluations,
            max_control_amplitude=3.0,
        ),
        time_limit_seconds=args.seconds,
        exact_check_interval=1,
        final_exact_evaluation=True,
        splitting_steps=args.steps,
        max_splitting_steps=args.steps,
    )
    outcome = optimize(problem, pulse, noise, config, control_groups=(group,))
    r = outcome.result
    operators = noise.taylor.static_operators
    target = problem.target.full()[:, 0]

    def loss(amplitudes, offsets=(0.0, 0.0)):
        state = reference_state(problem, amplitudes, operators, offsets)
        return float(1 - abs(np.vdot(target, state)) ** 2)

    holdout = np.random.default_rng(args.seed).normal(size=(8, 2))
    diagnostics = evaluate_taylor_sensitivity_diagnostics(problem, noise, r.control_amplitudes)
    inputs = {
        "model": "H0=0.55XX+0.23IX, Hc=0.5ZI+0.22IZ, noise=(width0*IZ,width1*YI)",
        "initial": "00",
        "target": "11",
        "units": "rad/us and us",
        "dt": problem.time_step,
        "parameters": vars(args),
        "initialAmplitudes": pulse.amplitudes().tolist(),
    }
    root = Path(os.environ.get("OPENQUANTUM_ROOT") or Path(__file__).resolve().parents[4])
    lock = root / ".agents/skills/stgrape-control/uv.lock"
    lock_bytes = lock.read_bytes()
    sdk_package = next(p for p in tomllib.loads(lock_bytes.decode())["package"] if p["name"] == "stgrape")
    blas = np.show_config(mode="dicts")["Build Dependencies"]["blas"]
    report = {
        "inputs": inputs,
        "inputSha256": hashlib.sha256(json.dumps(inputs, sort_keys=True).encode()).hexdigest(),
        "lockSha256": hashlib.sha256(lock_bytes).hexdigest(),
        "wheel": sdk_package["wheels"][0]["hash"],
        "programSha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
        "platform": platform.platform(),
        "python": platform.python_version(),
        "blas": {key: blas.get(key) for key in ("name", "version")},
        "versions": {n: version(n) for n in ["stgrape", "numpy", "scipy", "qutip"]},
        "configuration": config.metadata(),
        "optimizerWallSeconds": outcome.elapsed_seconds,
        "optimizerSuccess": bool(r.success),
        "termination": r.message,
        "initialSdkLoss": r.initial_fidelity_loss,
        "initialReferenceLoss": loss(pulse.amplitudes()),
        "controls": r.control_amplitudes.tolist(),
        "optimizedCoefficients": r.coefficients.tolist(),
        "objectiveHistory": r.objective_history.tolist(),
        "exactCheckIterations": r.exact_evaluation_iterations.tolist(),
        "splittingHistory": r.trotter_splitting_steps_history.tolist(),
        "objective": r.objective,
        "odeObjective": r.exact_objective,
        "finalReferenceLoss": loss(r.control_amplitudes),
        "gaussianDiagnostics": diagnostics.as_dict(),
        "heldoutOffsets": holdout.tolist(),
        "heldoutLosses": [loss(r.control_amplitudes, pair) for pair in holdout],
        "scientificValidation": "not_evaluated",
    }
    data = json.dumps(report, indent=2, allow_nan=False)
    with Path("result.json").open("x") as output:
        output.write(data + "\n")


if __name__ == "__main__":
    main()
