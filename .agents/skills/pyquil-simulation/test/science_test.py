import sys
import unittest
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parents[4]
sys.path.insert(0, str(ROOT / "tests/fixtures"))
from sdk_compilers_reference import load_bridge, deny_network, dense_unitary, circuit_cases, write_evidence
compute = load_bridge(Path(__file__).resolve().parents[1] / "mcp/bridge.py")
deny_network()


class VendorSimulationTests(unittest.TestCase):
    def test_analytical_bit_order_rotations_and_random_circuits(self):
        evidence = []
        for v in circuit_cases():
            actual, limitations = compute(v)
            expected = dense_unitary(v)[:, 0]
            state = np.array([complex(*r["amplitude"]) for r in actual["outcomes"]])
            error = float(np.max(np.abs(state - expected)))
            self.assertLess(error, 1e-12)
            self.assertLess(actual["normError"], 1e-12)
            self.assertEqual([r["bits"] for r in actual["outcomes"]], [format(i, f'0{v["numQubits"]}b') for i in range(2**v["numQubits"])])
            np.testing.assert_allclose([r["probability"] for r in actual["outcomes"]], np.abs(expected)**2, atol=1e-12)
            self.assertTrue(actual["program"] and limitations)
            evidence.append({"input": v, "maxAmplitudeError": error, "normError": actual["normError"]})
        write_evidence("pyquil-simulation", {"cases": evidence, "networkGuard": "socket connections denied", "reference": "independent dense unitary; analytical X bit order, Bell and Rx(pi)"})

    def test_unaddressable_statevector_fails_before_allocation(self):
        with self.assertRaisesRegex(ValueError, "addressable array"):
            compute({"numQubits": 100, "gates": [{"gate": "H", "targets": [0]}]})


if __name__ == "__main__":
    unittest.main()
