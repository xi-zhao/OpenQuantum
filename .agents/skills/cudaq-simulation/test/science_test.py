import importlib.util
from pathlib import Path
import socket
import sys
import unittest
from unittest.mock import patch
import numpy as np

root = Path(__file__).resolve().parents[4]
sys.path.insert(0, str(root / "src/lib"))
from quantum_reference import circuit_statevector

spec = importlib.util.spec_from_file_location("cudaq_bridge", Path(__file__).parents[1] / "mcp/bridge.py")
bridge = importlib.util.module_from_spec(spec)
spec.loader.exec_module(bridge)


class Cudaq(unittest.TestCase):
    def compute(self, gates, shots=0, qubits=3):
        with patch.object(socket.socket, "connect", side_effect=AssertionError("network forbidden")):
            return bridge.compute({"numQubits": qubits, "gates": gates, "shots": shots, "seed": 21})

    def test_all_gates_and_wire_order_against_independent_reference(self):
        gates = []
        for name in ["H", "S", "T", "X", "Y", "Z", "RX", "RY", "RZ", "CX", "CZ"]:
            gate = {"gate": name, "targets": [2, 0] if name in ["CX", "CZ"] else [2]}
            if name.startswith("R"):
                gate["angle"] = 0.371
            gates.append(gate)
            result = self.compute(gates)
            expected = np.abs(circuit_statevector(3, gates)) ** 2
            np.testing.assert_allclose([r["probability"] for r in result["outcomes"]], expected, atol=1e-12)

    def test_seed_counts_asymmetric_and_zero_shots(self):
        gates = [{"gate": "X", "targets": [0]}]
        result = self.compute(gates, shots=200)
        self.assertEqual(next(r for r in result["outcomes"] if r["bits"] == "100")["count"], 200)
        gates.append({"gate": "H", "targets": [2]})
        first = self.compute(gates, shots=500)
        self.assertEqual(first, self.compute(gates, shots=500))
        self.assertEqual(sum(r["count"] for r in first["outcomes"]), 500)
        self.assertEqual(sum(r["count"] for r in self.compute(gates)["outcomes"]), 0)


if __name__ == "__main__":
    unittest.main()
