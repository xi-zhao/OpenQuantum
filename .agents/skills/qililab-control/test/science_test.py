import importlib.util
import json
from pathlib import Path
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location("qililab_bridge", Path(__file__).resolve().parents[1] / "mcp/bridge.py")
bridge = importlib.util.module_from_spec(spec)
spec.loader.exec_module(bridge)


class QililabTests(unittest.TestCase):
    def test_complex_envelope_and_wait_in_actual_compiler(self):
        with patch("socket.socket.connect", side_effect=AssertionError("offline adapter attempted network")):
            r, _ = bridge.compute({"pulses": [{"iAmplitude": 0.2, "qAmplitude": -0.1, "durationNs": 40, "waitAfterNs": 16}]})
        self.assertEqual(r["requestedDurationNs"], 56)
        self.assertRegex(r["program"], r"play\s+0, 1, 40")
        self.assertRegex(r["program"], r"wait\s+16")
        self.assertEqual(r["waveforms"][0]["samples"], [0.2] * 40)
        self.assertEqual(r["waveforms"][1]["samples"], [-0.1] * 40)
        self.assertEqual(json.loads(r["sequenceJson"])["program"], r["program"])

    def test_minimum_duration_and_signed_boundary_amplitudes(self):
        r, _ = bridge.compute({"pulses": [{"iAmplitude": -1, "qAmplitude": 1, "durationNs": 4, "waitAfterNs": 0}]})
        self.assertEqual(r["requestedDurationNs"], 4)
        self.assertEqual(r["waveforms"][0]["samples"], [-1] * 4)
        self.assertEqual(r["waveforms"][1]["samples"], [1] * 4)


if __name__ == "__main__":
    unittest.main(verbosity=2)
