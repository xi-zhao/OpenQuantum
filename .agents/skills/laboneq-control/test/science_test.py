"""Independent waveform/timing observations from the real offline compiler."""
import importlib.util
from pathlib import Path
import socket
import unittest
from unittest.mock import patch
import numpy as np

SPEC = importlib.util.spec_from_file_location("laboneq_bridge", Path(__file__).parents[1] / "mcp/bridge.py")
bridge = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(bridge)


class LabOneQTest(unittest.TestCase):
    def test_constant_pulse_duration_amplitude_and_gap(self):
        value = {"pulses": [{"shape": "constant", "amplitude": .2, "lengthSeconds": 80e-9, "delayAfterSeconds": 40e-9}], "repetitions": 1, "snippetStartSeconds": 0, "snippetLengthSeconds": 1e-6}
        with patch.object(socket.socket, "connect", side_effect=AssertionError("unexpected network")):
            result, _ = bridge.compute(value)
        np.testing.assert_allclose(result["real"][:192], .2, atol=1e-12)
        np.testing.assert_allclose(result["real"][192:], 0, atol=1e-12)
        np.testing.assert_allclose(result["imag"], 0, atol=1e-12)
        np.testing.assert_allclose(np.diff(result["timeSeconds"]), 1 / 2.4e9, atol=1e-20)
        self.assertEqual(len(result["timeSeconds"]), 288)
        self.assertAlmostEqual(result["totalExecutionSeconds"], 120e-9, places=18)
        self.assertIn("executeTableEntry", result["sequencers"][0]["source"])
        self.assertFalse(result["networkUsed"])
        self.assertFalse(result["hardwareExecuted"])

    def test_gaussian_envelope_matches_left_sampled_three_sigma_pulse(self):
        value = {"pulses": [{"shape": "gaussian", "amplitude": .3, "lengthSeconds": 80e-9, "delayAfterSeconds": 0}], "repetitions": 1, "snippetStartSeconds": 0, "snippetLengthSeconds": 1e-6}
        with patch.object(socket.socket, "connect", side_effect=AssertionError("unexpected network")):
            result, _ = bridge.compute(value)
        wave = np.asarray(result["real"][:192])
        self.assertLessEqual(wave.max(), .3)
        self.assertGreater(wave.max(), .29)
        # LabOne Q samples [-3 sigma, +3 sigma), excluding the right endpoint.
        expected = .3 * np.exp(-0.5 * ((np.arange(192) - 96) / 32) ** 2)
        np.testing.assert_allclose(wave, expected, atol=1e-12)
        self.assertEqual(result["simulationKind"], "instrument-output-waveforms")


if __name__ == "__main__":
    unittest.main()
