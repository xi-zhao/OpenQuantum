import importlib.util
import json
from pathlib import Path
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location("qblox_bridge", Path(__file__).resolve().parents[1] / "mcp/bridge.py")
bridge = importlib.util.module_from_spec(spec)
spec.loader.exec_module(bridge)


class QbloxTests(unittest.TestCase):
    def test_timing_amplitude_repetition_and_final_gap(self):
        with patch("socket.socket.connect", side_effect=AssertionError("offline adapter attempted network")):
            r, _ = bridge.compute({"pulses": [{"amplitude": 0.25, "durationSeconds": 40e-9, "gapAfterSeconds": 16e-9},
                                              {"amplitude": -0.1, "durationSeconds": 24e-9, "gapAfterSeconds": 8e-9}],
                                   "repetitions": 3, "sampleRateHz": 1e9})
        self.assertAlmostEqual(r["durationSeconds"], 264e-9, delta=1e-20)
        self.assertAlmostEqual(r["pulses"][1]["startSeconds"], 56e-9, delta=1e-20)
        self.assertEqual(len(r["pulses"][0]["samples"]), 40)
        self.assertEqual(r["pulses"][0]["samples"], [0.25] * 40)
        self.assertEqual(r["pulses"][1]["samples"], [-0.1] * 24)
        self.assertEqual(json.loads(r["scheduleJson"])["data"]["repetitions"], 3)

    def test_zero_pulse_and_explicit_sampling_rate(self):
        r, _ = bridge.compute({"pulses": [{"amplitude": 0, "durationSeconds": 40e-9, "gapAfterSeconds": 0}], "repetitions": 1, "sampleRateHz": 5e8})
        self.assertEqual(r["pulses"][0]["samples"], [0.0] * 20)
        self.assertAlmostEqual(r["durationSeconds"], 40e-9, delta=1e-20)


if __name__ == "__main__":
    unittest.main(verbosity=2)
