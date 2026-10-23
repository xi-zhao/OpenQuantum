import sys
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[4] / "tests/fixtures"))
from sdk_expansion_circuits_science import bridge, record, deny_network
compute = bridge("qrisp-arithmetic")
deny_network()


class ArithmeticScience(unittest.TestCase):
    def test_basis_modular_wrap_and_uniform_distribution(self):
        evidence = []
        for a, b, width in [(0,0,1),(1,1,1),(2,3,2),(6,3,3),(7,7,3),(3,5,4),
                            (2**53+1,0,54), (2**53+1,1,54), (2**54-1,3,54),
                            (1,2**53+1,54), (2**70+1,2**69+3,80)]:
            v = {"bitWidth": width, "initialBits": format(a, "b"), "addendBits": format(b, "b"), "preparation": "basis"}
            result, _ = compute(v)
            expected = format((a+b) % 2**width, f"0{width}b")
            probs = {row["bits"]: row["probability"] for row in result["outcomes"]}
            self.assertAlmostEqual(probs.get(expected, 0), 1, places=6)
            self.assertAlmostEqual(result["totalProbability"], 1, places=6)
            evidence.append({"input": v, "expectedBits": expected, "expectedProbability": probs[expected]})
        for width in [1,2,3]:
            v = {"bitWidth": width, "initialBits": "0", "addendBits": "1", "preparation": "uniform"}
            result, _ = compute(v)
            self.assertEqual(len(result["outcomes"]), 2**width)
            error = max(abs(row["probability"] - 2**(-width)) for row in result["outcomes"])
            self.assertLess(error, 1e-6)
            evidence.append({"input": v, "maxUniformError": error})
        record("qrisp-arithmetic", {"cases": evidence, "networkGuard": "socket connections denied", "reference": "classical modular addition and analytical uniform probabilities"})


if __name__ == "__main__":
    unittest.main()
