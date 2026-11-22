import sys
import unittest
from pathlib import Path
import numpy as np
sys.path.insert(0, str(Path(__file__).resolve().parents[4] / "tests/fixtures"))
from sdk_expansion_circuits_science import bridge, record, dense_unitary, circuit_cases, deny_network
compute = bridge("braket-simulation")
deny_network()


class CircuitScience(unittest.TestCase):
    def test_cnot_noise_matches_both_gate_encodings(self):
        from braket.circuits import Circuit, Gate, Noise
        from braket.circuits.noise_model import GateCriteria, NoiseModel
        from braket.devices import LocalSimulator

        model = NoiseModel().add_noise(Noise.TwoQubitDepolarizing(0.15), GateCriteria(Gate.CNot))
        simulator = LocalSimulator("braket_dm")
        # From |11>, four of the fifteen nonidentity Pauli pairs reach each other bitstring.
        expected = [0.04, 0.04, 0.04, 0.88]
        for gate, circuit in [
            ("CNot", Circuit().x(0).cnot(0, 1)),
            ("controlled X", Circuit().x(0).x(1, control=0)),
        ]:
            with self.subTest(gate=gate):
                noisy = model.apply(circuit).probability()
                observed = simulator.run(noisy, shots=0).result().values[0]
                np.testing.assert_allclose(observed, expected, rtol=0, atol=1e-12)

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
        record("braket-simulation", {"cases": evidence, "networkGuard": "socket connections denied", "reference": "independent dense unitary"})

    def test_unaddressable_arrays_fail_before_allocation(self):
        with self.assertRaisesRegex(ValueError, "addressable array"):
            compute({"numQubits": 100, "gates": [{"gate": "H", "targets": [0]}]})


if __name__ == "__main__":
    unittest.main()
