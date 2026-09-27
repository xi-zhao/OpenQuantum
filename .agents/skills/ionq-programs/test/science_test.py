"""Real IonQ SDK serialization checked against independent instruction semantics."""
import importlib.util
from pathlib import Path
import socket
import unittest
from unittest.mock import patch

import numpy as np
from qiskit import QuantumCircuit, qasm2
from qiskit.quantum_info import Operator

spec = importlib.util.spec_from_file_location("ionq_bridge", Path(__file__).parents[1] / "mcp/bridge.py")
bridge = importlib.util.module_from_spec(spec)
spec.loader.exec_module(bridge)


class IonQTests(unittest.TestCase):
    def setUp(self):
        self.network = patch.object(socket.socket, "connect", side_effect=AssertionError("network forbidden"))
        self.network.start()
        self.addCleanup(self.network.stop)

    def test_all_gate_encodings_and_rotations(self):
        gates = [{"gate": g, "targets": [2]} for g in ["H", "S", "T", "X", "Y", "Z"]]
        gates += [{"gate": g, "targets": [1], "angle": a} for g, a in [("RX", .23), ("RY", -.74), ("RZ", 1.3)]]
        gates += [{"gate": "CX", "targets": [2, 0]}, {"gate": "CZ", "targets": [0, 2]}]
        result, _ = bridge.compute({"numQubits": 4, "gates": gates})
        expected = []
        for g in gates:
            if g["gate"] in ("CX", "CZ"):
                expected.append({"gate": g["gate"][1].lower(), "targets": [g["targets"][1]], "controls": [g["targets"][0]]})
            else:
                expected.append({"gate": g["gate"].lower(), "targets": g["targets"], **({"rotation": g["angle"]} if "angle" in g else {})})
        self.assertEqual(result["instructions"], expected)
        self.assertEqual(result["classicalToQubit"], [0, 1, 2, 3])
        self.assertEqual(result["measurementCount"], 4)
        self.assertFalse(result["networkUsed"])

    def test_reverse_control_idle_qubit_and_qasm_roundtrip(self):
        result, _ = bridge.compute({"numQubits": 3, "gates": [{"gate": "RY", "targets": [2], "angle": .4}, {"gate": "CX", "targets": [2, 0]}]})
        actual = qasm2.loads(result["qasm"]).remove_final_measurements(inplace=False)
        reference = QuantumCircuit(3)
        reference.ry(.4, 2)
        reference.cx(2, 0)
        np.testing.assert_allclose(Operator(actual).data, Operator(reference).data, atol=1e-14)
        self.assertEqual(result["numQubits"], 3)
        self.assertEqual(result["instructions"][1], {"gate": "x", "targets": [0], "controls": [2]})


if __name__ == "__main__":
    unittest.main()
