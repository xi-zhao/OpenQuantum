import importlib.util
import math
from pathlib import Path
import unittest
from unittest.mock import patch
import numpy as np

spec = importlib.util.spec_from_file_location("qat_bridge", Path(__file__).resolve().parents[1] / "mcp/bridge.py")
bridge = importlib.util.module_from_spec(spec)
spec.loader.exec_module(bridge)


def pulse(**kwargs):
    return {"shape": "square", "amplitude": 0.2, "phaseRadians": 0, "durationNs": 8, "sigmaNs": 2, "waitAfterNs": 0, **kwargs}


class QatTests(unittest.TestCase):
    def test_complex_square_and_zero_wait_samples(self):
        with patch("socket.socket.connect", side_effect=AssertionError("offline adapter attempted network")):
            r, _ = bridge.compute({"pulses": [pulse(phaseRadians=math.pi / 2, waitAfterNs=4)]})
        self.assertEqual(r["durationNs"], 12)
        np.testing.assert_allclose(r["real"], np.zeros(12), atol=1e-15)
        np.testing.assert_allclose(r["imag"], [0.2] * 8 + [0.0] * 4, atol=1e-15)
        self.assertEqual(r["timeline"], [{"kind": "pulse", "startSample": 0, "endSample": 8}, {"kind": "wait", "startSample": 8, "endSample": 12}])

    def test_gaussian_against_independent_sample_midpoint_formula(self):
        r, _ = bridge.compute({"pulses": [pulse(shape="gaussian", amplitude=-0.4)]})
        t_ns = np.arange(8) + 0.5 - 4
        expected = -0.4 * np.exp(-0.5 * (t_ns / 2) ** 2)
        np.testing.assert_allclose(r["real"], expected, rtol=1e-13, atol=1e-15)
        np.testing.assert_allclose(r["imag"], np.zeros(8), atol=1e-15)

    def test_one_sample_and_multiple_pulses(self):
        r, _ = bridge.compute({"pulses": [pulse(durationNs=1, amplitude=0), pulse(durationNs=1, amplitude=-0.5)]})
        self.assertEqual(r["real"], [0.0, -0.5])
        self.assertEqual(r["durationNs"], 2)


if __name__ == "__main__":
    unittest.main(verbosity=2)
