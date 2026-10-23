import importlib.util
import math
from pathlib import Path
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location("guppy_bridge", Path(__file__).resolve().parents[1] / "mcp/bridge.py")
bridge = importlib.util.module_from_spec(spec)
spec.loader.exec_module(bridge)


def operation(gate, targets, **kwargs):
    return {"gate": gate, "targets": targets, "angleRadians": 0, "conditionMeasurement": -1, "conditionValue": True, **kwargs}


def run(operations, num_qubits=2, shots=32):
    return bridge.compute({"numQubits": num_qubits, "operations": operations, "shots": shots, "seed": 42})[0]


class GuppyTests(unittest.TestCase):
    def test_measurement_feedback_and_reset(self):
        with patch("socket.socket.connect", side_effect=AssertionError("offline adapter attempted network")):
            r = run([operation("H", [0]), operation("MEASURE_RESET", [0]), operation("X", [1], conditionMeasurement=0)])
        self.assertEqual(r["measurementCount"], 1)
        self.assertEqual(sum(c["count"] for c in r["counts"]), 32)
        self.assertEqual({(c["measurementBits"], c["finalBits"]) for c in r["counts"]}, {("0", "00"), ("1", "01")})
        self.assertGreater(r["hugrBytes"], 0)
        self.assertEqual(len(r["hugrSha256"]), 64)

    def test_bell_state_without_mid_measurement(self):
        r = run([operation("H", [0]), operation("CX", [0, 1])])
        self.assertEqual({c["finalBits"] for c in r["counts"]}, {"00", "11"})
        self.assertTrue(all(c["measurementBits"] == "" for c in r["counts"]))

    def test_radians_and_condition_false(self):
        r = run([operation("RY", [0], angleRadians=math.pi)], num_qubits=1, shots=4)
        self.assertEqual(r["counts"], [{"measurementBits": "", "finalBits": "1", "count": 4}])
        r = run([operation("MEASURE_RESET", [0]), operation("X", [1], conditionMeasurement=0, conditionValue=False)], shots=4)
        self.assertEqual(r["counts"], [{"measurementBits": "0", "finalBits": "01", "count": 4}])

    def test_empty_program(self):
        self.assertEqual(run([], shots=3)["counts"], [{"measurementBits": "", "finalBits": "00", "count": 3}])


if __name__ == "__main__":
    unittest.main(verbosity=2)
