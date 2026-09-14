# SPDX-License-Identifier: GPL-3.0-only
"""Independent analytic/channel checks using the fixed installed dependencies."""
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

import cirq
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "mcp"))
import bridge


class MitiqScienceTests(unittest.TestCase):
    def test_pec_reconstructs_original_channel_with_ideal_compensations(self):
        q0, q1 = cirq.LineQubit.range(2)
        random = np.random.default_rng(81)
        for original in [cirq.H(q0), cirq.X(q0), cirq.rz(0.31)(q0), cirq.CNOT(q0, q1)]:
            op = original.with_tags(bridge.ORIGINAL)
            qubits = sorted(op.qubits)
            a = random.normal(size=(2 ** len(qubits),) * 2) + 1j * random.normal(size=(2 ** len(qubits),) * 2)
            rho = a @ a.conj().T
            rho /= np.trace(rho)
            unitary = cirq.unitary(original)
            expected = unitary @ rho @ unitary.conj().T
            representation = bridge.represent_operation_with_local_depolarizing_noise(cirq.Circuit(op), 0.04)
            reconstructed = np.zeros_like(rho)
            incorrect = np.zeros_like(rho)
            simulator = cirq.DensityMatrixSimulator(dtype=np.complex128)
            for coefficient, operation in zip(representation.coeffs, representation.noisy_operations):
                for tagged, accumulator in [(True, reconstructed), (False, incorrect)]:
                    accumulator += coefficient * simulator.simulate(
                        bridge.noisy_circuit(operation.circuit, 0.04, tagged=tagged),
                        initial_state=rho, qubit_order=qubits).final_density_matrix
            np.testing.assert_allclose(reconstructed, expected, atol=2e-14)
            self.assertGreater(np.max(np.abs(incorrect - expected)), 1e-6)

    def test_noise_probability_convention_and_measurement_bit_order(self):
        q0, q1 = cirq.LineQubit.range(2)
        circuit = cirq.Circuit(cirq.H(q0), cirq.rz(0.7)(q0), cirq.H(q0))
        rho = bridge.density(circuit, [q0], 0.03)
        self.assertAlmostEqual(bridge.expectation(rho, "Z", [q0]), np.cos(0.7) * (1 - 4 * 0.03 / 3) ** 3)
        state = bridge.density(cirq.Circuit(cirq.X(q0)), [q0, q1])
        self.assertAlmostEqual(bridge.expectation(state, "ZI", [q0, q1]), -1)
        self.assertAlmostEqual(bridge.expectation(state, "IZ", [q0, q1]), 1)
        y = bridge.density(cirq.Circuit(cirq.H(q0), cirq.S(q0)), [q0])
        self.assertAlmostEqual(float(bridge.parity_values("Y") @ bridge.readout_distribution(y, "Y", [q0], 0)), 1)

    def test_rem_matrix_direction_and_unclipped_quasi_expectations(self):
        matrices = [np.array([[0.9, 0.2], [0.1, 0.8]]), np.array([[0.95, 0.3], [0.05, 0.7]])]
        inverse = bridge.rem.generate_tensored_inverse_confusion_matrix(2, matrices)
        ideal = np.array([0, 0, 1, 0])
        np.testing.assert_allclose(inverse @ np.kron(*matrices) @ ideal, ideal, atol=1e-14)
        estimate = bridge.parity_values("ZI") @ inverse @ ideal
        self.assertLess(estimate, -1, "Do not hide finite-sample quasi-probability estimates by clipping")

    def test_pec_missing_representations_and_lost_tags_fail(self):
        v = {"method": "pec", "numQubits": 1, "gates": [{"name": "H", "targets": [0]}], "observable": "Z",
             "depolarizingProbability": 0.03, "readoutProbability": 0, "shotsBudget": 1024, "pecSamples": 16}
        circuit = bridge.build_circuit(v)
        qubits = [cirq.LineQubit(0)]
        rho = bridge.density(circuit, qubits, 0.03)
        wrong = bridge.represent_operation_with_local_depolarizing_noise(cirq.Circuit(cirq.X(qubits[0])), 0.03)
        with patch.object(bridge, "represent_operation_with_local_depolarizing_noise", return_value=wrong):
            with self.assertRaises(UserWarning):
                bridge.run_trial(v, circuit, qubits, 0, rho, 17)
        with patch.object(bridge.pec, "construct_circuits", return_value=([circuit] * 16, [1] * 16, 1)):
            with self.assertRaisesRegex(ValueError, "noise boundary"):
                bridge.run_trial(v, circuit, qubits, 0, rho, 17)


if __name__ == "__main__":
    unittest.main(verbosity=2)
