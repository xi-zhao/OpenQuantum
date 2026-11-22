"""Independent finite rotations, Gaussian moments and failure cases for the pinned control SDK."""

import importlib.util
import json
from dataclasses import replace
from pathlib import Path

import numpy as np
from qutip import basis, qeye, sigmax, sigmaz
from stgrape import (
    ControlProblem,
    ControlTask,
    FlatEnvelope,
    FilteredPulse,
    OptimizationConfig,
    configure_ode_propagation,
    evaluate_taylor_sensitivity_diagnostics,
    optimize,
)
from stgrape.archive import verify_archive
from stgrape.optimizers import LBFGSBOptions
from stgrape.systems import CommutingControlGroup

root = Path(__file__).resolve().parents[2]
location = root / ".agents/skills/stgrape-control/references/native-example.py"
spec = importlib.util.spec_from_file_location("stgrape_example", location)
sample = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sample)


def must_raise(exc, action):
    try:
        action()
    except exc:
        return
    raise AssertionError(f"expected {exc.__name__}")


def test_group_precondition():
    x = sigmax()
    problem = ControlProblem(
        0 * x, (x / 2,), basis(2, 0), basis(2, 1), np.pi, np.pi / 4, ControlTask.STATE_PREPARATION
    )
    invalid = CommutingControlGroup((0,), qeye(2), (x / 2,))
    must_raise(ValueError, lambda: sample.check_control_groups(problem, (invalid,)))
    hadamard = (sigmax() + sigmaz()) / np.sqrt(2)
    valid = CommutingControlGroup((0,), hadamard, (sigmaz() / 2,))
    sample.check_control_groups(problem, (valid,))
    must_raise(
        ValueError,
        lambda: sample.check_control_groups(problem, (replace(valid, basis_transform=2 * hadamard),)),
    )
    must_raise(ValueError, lambda: sample.check_control_groups(problem, (valid, valid)))
    return problem, valid


def reference(amplitudes, offsets=(0, 0)):
    from scipy.linalg import expm

    x = np.array([[0, 1], [1, 0]])
    y = np.array([[0, -1j], [1j, 0]])
    z = np.diag([1, -1])
    eye = np.eye(2)
    h = (
        0.55 * np.kron(x, x)
        + 0.23 * np.kron(eye, x)
        + 0.06 * offsets[0] * np.kron(eye, z)
        + 0.04 * offsets[1] * np.kron(y, eye)
    )
    control = 0.5 * np.kron(z, eye) + 0.22 * np.kron(eye, z)
    state = np.array([1, 0, 0, 0], dtype=complex)
    for amp in np.asarray(amplitudes).ravel():
        state = expm(-0.35j * (h + amp * control)) @ state
    return state


def independent_moments(amplitudes, h):
    def state(parameters):
        return reference(amplitudes, parameters)

    zero = state((0, 0))
    steps = np.eye(2) * h
    first = [(state(v) - state(-v)) / (2 * h) for v in steps]
    square = [(state(v) + state(-v) - 2 * zero) / (2 * h * h) for v in steps]
    mixed = (state((h, h)) - state((h, -h)) - state((-h, h)) + state((-h, -h))) / (4 * h * h)
    norm2 = lambda a: np.vdot(a, a).real
    p2 = 3 * sum(norm2(x) for x in square) + 2 * np.vdot(*square).real + norm2(mixed)
    return [float(np.sqrt(sum(norm2(x) for x in first))), float(np.sqrt(p2))]


def verify():
    import tempfile

    p, group = test_group_precondition()
    pulse = FilteredPulse(
        1,
        4,
        np.pi / 4,
        np.full((1, 3), 4 / 3),
        envelope=FlatEnvelope(),
        cutoff_frequency=0.2,
        filter_kernel=(0.5, 0.5),
    )
    options = OptimizationConfig(
        optimizer=LBFGSBOptions(max_iterations=3, max_function_evaluations=16),
        time_limit_seconds=12,
        exact_check_interval=1,
    )
    state = optimize(p, pulse, None, options, control_groups=(group,)).result
    assert abs(state.initial_fidelity_loss) < 1e-9
    wrong_basis = CommutingControlGroup((0,), qeye(2), (sigmax() / 2,))
    area = float(np.sum(pulse.amplitudes()) * p.time_step)
    invalid_reference_loss = float(np.cos(area / 2) ** 2)
    assert invalid_reference_loss < 1e-25
    try:
        raw = optimize(p, pulse, None, options, control_groups=(wrong_basis,)).result
        invalid = dict(
            upstreamRejected=False,
            initialLoss=raw.initial_fidelity_loss,
            success=bool(raw.success),
            message=raw.message,
        )
    except ValueError:
        invalid = dict(upstreamRejected=True)
    invalid.update(analyticLoss=invalid_reference_loss, controlArea=area, exampleRejected=True)
    gate = replace(p, initial=qeye(2), target=sigmax(), task=ControlTask.GATE_SYNTHESIS)
    gate_run = optimize(gate, pulse, None, options, control_groups=(group,)).result
    assert abs(gate_run.initial_fidelity_loss) < 1e-9
    must_raise(ValueError, lambda: replace(p, duration=0.9 * p.duration))
    must_raise(ValueError, lambda: replace(p, target=qeye(2)))
    must_raise(ValueError, lambda: optimize(p, pulse, None, options, control_groups=()))
    problem, w, noise, g = sample.experiment([0.3, -0.7, 1.1], [0.06, 0.04], 2)
    expected_amplitudes = np.convolve([0.3, -0.7, 1.1], [0.6, 0.4])
    np.testing.assert_allclose(w.amplitudes()[0], expected_amplitudes, rtol=0, atol=1e-15)
    initial = float(1 - abs(reference(expected_amplitudes)[3]) ** 2)
    diag = evaluate_taylor_sensitivity_diagnostics(problem, noise, w.amplitudes())
    moments = {str(h): independent_moments(expected_amplitudes, h) for h in (0.006, 0.003, 0.0015)}
    np.testing.assert_allclose([diag.p1, diag.p2], moments["0.0015"], atol=2e-8, rtol=0)
    errors, runs = [], []
    holdout = np.random.default_rng(20261122).normal(size=(8, 2))
    for method, k in [("ST", 1), ("ST", 2), ("ST", 4), ("dense", 1), ("block-sparse", 1)]:
        ode = configure_ode_propagation(
            representation="block-sparse" if method == "block-sparse" else "dense", rtol=1e-10, atol=1e-12
        )
        config = replace(
            options,
            algorithm="st-grape" if method == "ST" else "grape",
            optimizer=replace(options.optimizer, max_control_amplitude=3.0),
            splitting_steps=k,
            max_splitting_steps=k,
            propagation=ode,
        )
        run = optimize(problem, w, noise, config, control_groups=(g,))
        result = run.result
        err = abs(result.initial_fidelity_loss - initial)
        if method == "ST":
            errors.append(err)
        else:
            assert err < 1e-8
        assert np.all(np.isfinite(result.control_amplitudes))
        assert result.message and not result.success and "LIMIT" in result.message.upper()
        final = float(1 - abs(reference(result.control_amplitudes)[3]) ** 2)
        held = [float(1 - abs(reference(result.control_amplitudes, v)[3]) ** 2) for v in holdout]
        runs.append(
            dict(
                method=method,
                substeps=k,
                initialLossError=err,
                finalReferenceLoss=final,
                holdoutMeanLoss=float(np.mean(held)),
                termination=result.message,
                elapsedSeconds=run.elapsed_seconds,
                finalControls=result.control_amplitudes.tolist(),
            )
        )
    assert errors[0] > 3 * errors[1] > 9 * errors[2] > 0
    must_raise(ValueError, lambda: sample.reference_state(problem, [np.nan]))
    with tempfile.TemporaryDirectory() as tmp:
        must_raise(FileNotFoundError, lambda: verify_archive(Path(tmp)))
    return dict(
        singleQubitStateLoss=state.initial_fidelity_loss,
        singleQubitGateLoss=gate_run.initial_fidelity_loss,
        twoQubitInitialReferenceLoss=initial,
        gaussian=diag.as_dict(),
        finiteDifferences=moments,
        runs=runs,
        heldoutSeed=20261122,
        heldoutCount=8,
        invalidBasis=invalid,
        scientificValidation="not_evaluated",
    )


if __name__ == "__main__":
    print(json.dumps(verify(), indent=2, allow_nan=False))
