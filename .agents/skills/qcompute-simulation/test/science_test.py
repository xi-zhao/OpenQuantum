import sys
import unittest
from pathlib import Path
import numpy as np
sys.path.insert(0, str(Path(__file__).resolve().parents[4] / "tests/fixtures"))
from sdk_expansion_circuits_science import bridge, record, dense_unitary, circuit_cases, deny_network
compute = bridge("qcompute-simulation")
deny_network()


class CircuitScience(unittest.TestCase):
    def test_analytical_bit_order_rotations_and_random_circuits(self):
        evidence = []
        for value in circuit_cases():
            result, limitations = compute(value)
            expected = dense_unitary(value)[:, 0]
            state = np.array([complex(*row["amplitude"]) for row in result["outcomes"]])
            error = float(np.max(abs(state - expected)))
            self.assertLess(error, 1e-10)
            self.assertLess(result["normError"], 1e-10)
            self.assertEqual([row["bits"] for row in result["outcomes"]], [format(i, f'0{value["numQubits"]}b') for i in range(2**value["numQubits"])])
            np.testing.assert_allclose([row["probability"] for row in result["outcomes"]], abs(expected)**2, atol=1e-10)
            self.assertTrue(limitations)
            evidence.append({"input": value, "maxAmplitudeError": error})
        record("qcompute-simulation", {"cases": evidence, "networkGuard": "socket connections denied", "reference": "independent dense unitary"})

    def test_unaddressable_arrays_fail_before_allocation(self):
        with self.assertRaisesRegex(ValueError, "addressable array"):
            compute({"numQubits": 100, "gates": [{"gate": "H", "targets": [0]}]})


if __name__ == "__main__":
    unittest.main()
