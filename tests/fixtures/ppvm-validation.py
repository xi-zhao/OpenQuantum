"""Development regression against analytic/dense references, not an Acceptance Profile."""
import importlib.metadata
import json
import math
import os
from pathlib import Path

import numpy as np
from ppvm import GeneralizedTableau, LossyPauliSum, MeasurementResult, PauliSum, StimProgram, sample_stim

checks = []


def close(name, actual, expected, tolerance=1e-10):
    actual, expected = float(actual), float(expected)
    assert math.isfinite(actual) and abs(actual - expected) <= tolerance, (name, actual, expected)
    checks.append({"name": name, "actual": actual, "reference": expected, "tolerance": tolerance})


def require(name, condition):
    assert condition, name
    checks.append({"name": name, "passed": True})


def rejects(name, action):
    try:
        action()
    except ValueError:
        checks.append({"name": name, "rejected": "ValueError"})
    else:
        raise AssertionError(f"{name}: expected ValueError")


# Independent dense 2-qubit Schrodinger reference, q0 is the left tensor factor.
identity = np.eye(2, dtype=complex)
x = np.array([[0, 1], [1, 0]], dtype=complex)
y = np.array([[0, -1j], [1j, 0]], dtype=complex)
z = np.diag([1, -1]).astype(complex)
h = (x + z) / math.sqrt(2)
t = np.diag([1, np.exp(1j * math.pi / 4)])
cnot = np.array([[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 0, 1], [0, 0, 1, 0]], dtype=complex)

for theta in (0.19, -0.61, 1.17):
    rx = math.cos(theta / 2) * identity - 1j * math.sin(theta / 2) * x
    unitary = np.kron(identity, rx) @ cnot @ np.kron(t @ h, identity)
    state = unitary @ np.array([1, 0, 0, 0], dtype=complex)
    tableau = GeneralizedTableau(2, min_abs_coeff=0.0, seed=29)
    tableau.h(0)
    tableau.t(0)
    tableau.cnot(0, 1)
    tableau.rx(1, theta)
    for word, operator in {"XI": np.kron(x, identity), "IZ": np.kron(identity, z),
                           "XX": np.kron(x, x), "XY": np.kron(x, y), "ZY": np.kron(z, y)}.items():
        reference = np.vdot(state, operator @ state).real
        close(f"tableau-dense-{theta}-{word}", tableau.expectation(word), reference)
        observable = PauliSum.new(2, [word])
        observable.rx(1, theta)
        observable.cnot(0, 1)
        # PauliSum has no t() shortcut; Rz(pi/4) differs from T only by global phase.
        observable.rz(0, math.pi / 4)
        observable.h(0)
        close(f"heisenberg-dense-{theta}-{word}", observable.overlap_with_zero(), reference)

# A non-unital channel makes the common order error observable.
theta, gamma = 0.91, 0.31
reference = gamma + (1 - gamma) * math.cos(theta)
correct = PauliSum.new(1, ["Z"])
correct.amplitude_damping(0, gamma)
correct.rx(0, theta)
close("rx-then-damping-analytic", correct.overlap_with_zero(), reference)
wrong = PauliSum.new(1, ["Z"])
wrong.rx(0, theta)
wrong.amplitude_damping(0, gamma)
require("wrong-noise-order-negative-control", abs(wrong.overlap_with_zero() - reference) > 0.1)

# Lost measurement is an erasure outcome; a leaked qubit measures its pinned bit.
tableau = GeneralizedTableau(1, seed=31)
tableau.loss_channel(0, 1.0)
tableau.reset_state(0)
require("state-reset-preserves-lost", tableau.is_lost(0) and tableau.measure(0) == MeasurementResult.LOST)
tableau.reset(0)
require("full-reset-restores-lost", not tableau.is_lost(0) and tableau.measure(0) == MeasurementResult.ZERO)
tableau.leakage_channel(0, 0.0, 1.0)
tableau.x(0)
tableau.reset_state(0)
require("state-reset-preserves-leaked-pinned-one", tableau.is_leaked(0) and tableau.measure(0) == MeasurementResult.ONE)
tableau.reset(0)
require("full-reset-restores-leaked", not tableau.is_leaked(0) and tableau.measure(0) == MeasurementResult.ZERO)

lossy = LossyPauliSum.new(2, ["ZZ"])
lossy.correlated_loss_channel(0, 1, [0.0, 0.3, 0.0])
close("correlated-loss-named-probability-analytic", lossy.overlap_with_zero(), 1 - 2 * 0.3)
shots = 2048
# Hoeffding two-sided bound for each Bernoulli mean, delta=1e-6. Engineering only.
sampling_tolerance = math.sqrt(math.log(2 / 1e-6) / (2 * shots))
single_losses = 0
for seed in range(shots):
    tableau = GeneralizedTableau(2, seed=seed)
    tableau.correlated_loss_channel(0, 1, [0.0, 0.3, 0.0])
    losses = sum(tableau.loss_values())
    assert losses in (0, 1)
    single_losses += losses
close("correlated-loss-trajectory-frequency", single_losses / shots, 0.6, sampling_tolerance)

program = StimProgram.parse("H 0\nCX 0 1\nM 0 1")
samples = sample_stim(program, num_shots=shots, seed=20261110)
require("stim-bell-record-shape-and-correlation", len(samples) == shots and all(len(row) == 2 and row[0] == row[1] and row[0] in (MeasurementResult.ZERO, MeasurementResult.ONE) for row in samples))
close("stim-bell-one-frequency", sum(int(row[0]) for row in samples) / shots, 0.5, sampling_tolerance)
require("stim-fixed-seed-replay", samples == sample_stim(program, num_shots=shots, seed=20261110))
lost_samples = sample_stim(StimProgram.parse("I_ERROR[loss](1) 0\nM 0"), num_shots=8, seed=7)
require("stim-loss-is-not-bool", all(row == [MeasurementResult.LOST] for row in lost_samples))

# Characterize the documented approximation, NOT a full loss-channel validation.
# For |+>, p0=0, p1=1, a physical no-loss branch is |0> (Z=1).
# This version leaves surviving |+> unchanged (Z=0).
survivors = []
for seed in range(64):
    tableau = GeneralizedTableau(1, seed=seed)
    tableau.h(0)
    tableau.asymmetric_loss_channel(0, 0.0, 1.0)
    if not tableau.is_lost(0):
        survivors.append(tableau.expectation("Z"))
require("asymmetric-loss-survivor-approximation-detected", len(survivors) > 0 and all(abs(value) < 1e-10 for value in survivors))
rejects("zero-qubit-tableau", lambda: GeneralizedTableau(0))
rejects("python-tableau-binding-limit", lambda: GeneralizedTableau(2049))
rejects("incomplete-cnot-pair", lambda: GeneralizedTableau(3).cnot(0, 1, 2))

report = {
    "upstreamVersion": importlib.metadata.version("bloqade-ppvm"),
    "status": "passed_scoped_engineering",
    "checks": checks,
    "sampling": {"shots": shots, "hoeffdingDeltaPerMean": 1e-6, "tolerance": sampling_tolerance},
    "limitations": ["Small CPU instances only; no scaling, speed or device calibration claim.",
                    "Asymmetric-loss surviving branch is intentionally recorded as an upstream approximation.",
                    "No Bloqade compilation, Lindbladian, Rust-only >2048-qubit or full Stim instruction coverage."],
    "scientificValidation": "not_evaluated",
}
destination = Path(os.environ["OPENQUANTUM_SDK_CHECK_OUTPUT"])
destination.mkdir(parents=True, exist_ok=True)
with (destination / "ppvm-validation.json").open("x", encoding="utf-8") as output:
    output.write(json.dumps(report, indent=2) + "\n")
print(f"{len(checks)} scoped numerical, semantic and failure checks passed; scientificValidation=not_evaluated")
