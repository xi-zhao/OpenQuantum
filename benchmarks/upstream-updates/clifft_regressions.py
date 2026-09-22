"""Probe the continuation-reset defect from Clifft PR #484 on spectator qubits."""
import json
from importlib.metadata import version
import numpy as np
from clifft import noncomp

rows = []
shots, probability = 8192, 0.03
# The spectator never interacts with the lossy pair: two independent X errors
# give an analytic odd-parity probability, independent of the pair's loss model.
expected = 2 * probability * (1 - probability)
tolerance = 6 * np.sqrt(expected * (1 - expected) / shots) + 1 / shots
model = noncomp.Model(classifier=noncomp.Classifier([[1, 0, 1, 0, 1], [0, 1, 0, 1, 0]]))
for annotation in ("LOSS", "LEAKAGE"):
    circuit = (f"H 0\nCX 0 1\n{annotation}(0.5) 1\nX_ERROR({probability}) 2\n"
               f"X_ERROR({probability}) 2\n{annotation}(0.5) 0\nM 0 1 2")
    serial = noncomp.sample(circuit, model, shots=shots, seed=2209, threads=1)
    parallel = noncomp.sample(circuit, model, shots=shots, seed=2209, threads=3)
    np.testing.assert_array_equal(serial.measurements, parallel.measurements)
    np.testing.assert_array_equal(serial.final_status, parallel.final_status)
    computational = serial.final_status == noncomp.QubitStatus.COMPUTATIONAL
    assert computational[:, 2].all()
    assert computational[:, :2].any() and (~computational[:, :2]).any()
    actual = float(serial.measurements[:, 2].mean())
    assert abs(actual - expected) < tolerance, (annotation, actual, expected)
    rows.append({"case": annotation, "shots": shots, "seed": 2209,
        "observedSpectatorFlipProbability": actual, "expectedProbability": expected,
        "tolerance": float(tolerance), "serialParallelIdentical": True})
print(json.dumps({"versions": {p: version(p) for p in ("clifft", "numpy")},
    "denominator": len(rows), "passed": len(rows), "cases": rows,
    "scope": "development-only loss/leakage API; the product Tool still exposes final-measurement circuits only",
    "scientificValidation": "not_evaluated"}, indent=2))
