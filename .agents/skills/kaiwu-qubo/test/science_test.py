import itertools
import sys
import unittest
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parents[4]
sys.path.insert(0, str(ROOT / "tests/fixtures"))
from sdk_compilers_reference import load_bridge, deny_network, write_evidence
compute = load_bridge(Path(__file__).resolve().parents[1] / "mcp/bridge.py")
deny_network()


class KaiwuTests(unittest.TestCase):
    def test_symbolic_constraints_offsets_and_ising_sign(self):
        v = {"linear": [0.3, -1.5, 2.7], "quadratic": [{"i": 0, "j": 2, "bias": -0.73}], "offset": -2.9,
             "constraints": [{"coefficients": [1, 1, 1], "rhs": 1, "penalty": 4.2}, {"coefficients": [2, 0, -1], "rhs": 0.5, "penalty": 0.7}],
             "assignments": [list(x) for x in itertools.product([0, 1], repeat=3)]}
        actual, _ = compute(v)
        errors = []
        for row in actual["evaluations"]:
            values = np.array(row["values"])
            objective = v["offset"] + np.dot(v["linear"], values) - 0.73 * values[0] * values[2]
            residuals = [np.dot(c["coefficients"], values) - c["rhs"] for c in v["constraints"]]
            penalty = sum(c["penalty"] * residual**2 for c, residual in zip(v["constraints"], residuals))
            expected = objective + penalty
            spins = np.r_[2 * values - 1, 1]
            qubo_energy = values @ np.array(actual["quboMatrix"]) @ values + actual["quboOffset"]
            ising_energy = -spins @ np.array(actual["isingMatrix"]) @ spins + actual["isingOffset"]
            error = float(max(abs(row["energy"] - expected), abs(qubo_energy - expected), abs(ising_energy - expected)))
            self.assertLess(error, 1e-11)
            self.assertAlmostEqual(row["objective"], objective, places=12)
            self.assertAlmostEqual(row["penaltyEnergy"], penalty, places=12)
            np.testing.assert_allclose(row["constraintResiduals"], residuals, atol=1e-12)
            errors.append(error)
        write_evidence("kaiwu-qubo", {"input": v, "result": actual, "maxEnergyError": max(errors), "networkGuard": "socket connections denied"})

    def test_unused_variables_and_constant_model(self):
        v = {"linear": [0, 0, 0], "quadratic": [], "offset": 2.3, "constraints": [], "assignments": [[0, 1, 0]]}
        actual, _ = compute(v)
        self.assertEqual(actual["variableNames"], ["x_0", "x_1", "x_2"])
        self.assertEqual(actual["evaluations"][0]["energy"], 2.3)
        self.assertEqual(np.shape(actual["quboMatrix"]), (3, 3))
        self.assertEqual(np.shape(actual["isingMatrix"]), (4, 4))

    def test_coefficient_overflow_is_reported(self):
        with self.assertRaisesRegex(ValueError, "overflowed"):
            compute({"linear": [0], "quadratic": [], "offset": 0, "constraints": [{"coefficients": [1e200], "rhs": 0, "penalty": 1}], "assignments": []})


if __name__ == "__main__":
    unittest.main()
