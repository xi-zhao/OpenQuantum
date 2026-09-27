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


def energy(v, values):
    return v["offset"] + sum(a * x for a, x in zip(v["linear"], values)) + sum(row["bias"] * values[row["i"]] * values[row["j"]] for row in v["quadratic"])


class OceanTests(unittest.TestCase):
    def test_exact_energies_and_binary_spin_conversion(self):
        evidence = []
        for vartype in ["BINARY", "SPIN"]:
            v = {"vartype": vartype, "linear": [0.3, -1.5, 2.7], "quadratic": [{"i": 0, "j": 2, "bias": -0.73}, {"i": 1, "j": 2, "bias": 1.2}], "offset": -2.9, "method": "exact"}
            result, _ = compute(v)
            self.assertEqual(len(result["samples"]), 8)
            self.assertTrue(result["exhaustive"])
            errors = []
            for sample in result["samples"]:
                values = sample["values"]
                binary = values if vartype == "BINARY" else [(s + 1) // 2 for s in values]
                spin = values if vartype == "SPIN" else [2 * x - 1 for x in values]
                self.assertAlmostEqual(sample["energy"], energy(v, values), places=12)
                self.assertAlmostEqual(sample["energy"], energy(result["binaryModel"], binary), places=12)
                self.assertAlmostEqual(sample["energy"], energy(result["spinModel"], spin), places=12)
                errors.extend([abs(sample["energy"] - energy(v, values)),
                               abs(sample["energy"] - energy(result["binaryModel"], binary)),
                               abs(sample["energy"] - energy(result["spinModel"], spin))])
            self.assertAlmostEqual(result["minimumEnergyFound"], min(energy(v, x) for x in itertools.product([0, 1] if vartype == "BINARY" else [-1, 1], repeat=3)), places=12)
            evidence.append({"input": v, "result": result, "maxEnergyError": max(errors)})
        write_evidence("ocean-optimization", {"cases": evidence, "reference": "independent polynomial enumeration", "networkGuard": "socket connections denied"})

    def test_seeded_annealing_and_all_zero_model(self):
        v = {"vartype": "BINARY", "linear": [-1, 0, 2], "quadratic": [], "offset": 0, "method": "simulated_annealing", "numReads": 23, "numSweeps": 20, "seed": 7}
        actual, _ = compute(v)
        repeated, _ = compute(v)
        self.assertEqual(actual, repeated)
        self.assertFalse(actual["exhaustive"])
        self.assertEqual(sum(row["numOccurrences"] for row in actual["samples"]), 23)
        self.assertTrue(all(abs(row["energy"] - energy(v, row["values"])) < 1e-12 for row in actual["samples"]))
        v.update(linear=[0, 0, 0], method="exact")
        zero, _ = compute(v)
        self.assertEqual(len(zero["samples"]), 8)
        self.assertEqual(zero["minimumEnergyFound"], 0)

    def test_unaddressable_enumeration_rejected(self):
        with self.assertRaisesRegex(ValueError, "addressable array"):
            compute({"vartype": "BINARY", "linear": [0] * 100, "quadratic": [], "offset": 0, "method": "exact"})


if __name__ == "__main__":
    unittest.main()
