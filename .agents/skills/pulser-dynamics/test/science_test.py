import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[4] / "tests/fixtures"))
from sdk_devices_science import bridge, record, run
import math
import unittest
import numpy as np
from scipy.linalg import expm

compute = bridge("pulser-dynamics").compute
CONTROL = {"timeSteps": 10, "atol": 1e-10, "rtol": 1e-10, "maxSolverSteps": 100000, "solverMaxStepNs": 1}


def amplitudes(result):
    return np.array([complex(*row["amplitude"]) for row in result["finalOutcomes"]])


def dense_constant(positions, omega, detuning, phase, duration_us, c6):
    n = len(positions)
    h = np.zeros((1 << n, 1 << n), dtype=complex)
    # Independent basis order: string from input atom 0 to atom n-1, g=0,r=1.
    for index in range(1 << n):
        bits = [(index >> (n - 1 - i)) & 1 for i in range(n)]
        h[index, index] = -detuning * sum(bits)
        for i in range(n):
            if bits[i] == 0:
                target = index | (1 << (n - i - 1))
                h[target, index] = omega / 2 * np.exp(1j * phase)
                h[index, target] = omega / 2 * np.exp(-1j * phase)
            for j in range(i):
                if bits[i] and bits[j]:
                    h[index, index] += c6 / np.linalg.norm(np.asarray(positions[i]) - positions[j])**6
    return expm(-1j * h * duration_us)[:, 0]


class PulserScience(unittest.TestCase):
    def test_single_atom_area_and_phase(self):
        phase = 0.43
        pulses = [{"durationNs": 500, "amplitudeRadPerUs": [0, 4], "detuningRadPerUs": [0, 0], "phaseRad": phase},
                  {"durationNs": 500, "amplitudeRadPerUs": [4, 0], "detuningRadPerUs": [0, 0], "phaseRad": phase}]
        r, _ = compute({**CONTROL, "atomPositionsUm": [[0, 0]], "pulses": pulses})
        expected = [math.cos(1), -1j * np.exp(1j * phase) * math.sin(1)]
        error = float(np.max(abs(amplitudes(r) - expected)))
        self.assertLess(error, 3e-6)
        self.assertLess(r["maxNormError"], 1e-7)
        self.assertIn(0.5, r["timesUs"])
        record("triangular single-atom area and nonzero phase", amplitudeError=error, maxNormError=r["maxNormError"])

    def test_asymmetric_2d_and_detuning(self):
        positions = [[0, 0], [8, 0], [1, 9]]
        pulse = {"durationNs": 400, "amplitudeRadPerUs": [4, 4], "detuningRadPerUs": [0.7, 0.7], "phaseRad": -0.53}
        r, _ = compute({**CONTROL, "atomPositionsUm": positions, "pulses": [pulse]})
        expected = dense_constant(positions, 4, 0.7, -0.53, 0.4, 5420158.53)
        error = float(np.max(abs(amplitudes(r) - expected)))
        self.assertLess(error, 2e-3)  # ns-sampled endpoint versus ideal constant drive
        self.assertEqual(r["c6RadPerUsUm6"], 5420158.53)
        self.assertGreater(np.ptp(r["rydbergPopulations"][-1]), 0.01)
        record("asymmetric 2D dense reference, detuning and phase", amplitudeErrorVsContinuousIdeal=error, populations=r["rydbergPopulations"][-1], maxNormError=r["maxNormError"])

    def test_blockade_and_phase_boundary(self):
        pulse = {"durationNs": 1000, "amplitudeRadPerUs": [1, 1], "detuningRadPerUs": [0, 0], "phaseRad": 0}
        r, _ = compute({**CONTROL, "atomPositionsUm": [[0, 0], [3, 0]], "pulses": [pulse]})
        p = {row["bits"]: row["probability"] for row in r["finalOutcomes"]}
        self.assertLess(p["11"], 1e-6)
        error = abs(p["01"] + p["10"] - math.sin(math.sqrt(2) / 2)**2)
        self.assertLess(error, 1e-3)
        # Differing pulse phases must not introduce implicit device delays.
        v = {**CONTROL, "atomPositionsUm": [[0, 0]], "pulses": [{**pulse, "durationNs": 100}, {**pulse, "durationNs": 200, "phaseRad": 0.7}]}
        phase_result, _ = compute(v)
        self.assertEqual(phase_result["compiledDurationNs"], 300)
        self.assertIn(0.1, phase_result["timesUs"])
        with self.assertRaises(ValueError):
            compute({**CONTROL, "atomPositionsUm": [[0, 0], [0, 0]], "pulses": [pulse]})
        record("finite-distance blockade and ns phase boundary", doubleExcitation=p["11"], collectiveExcitationError=error, compiledDurationNs=phase_result["compiledDurationNs"])


if __name__ == "__main__":
    run("pulser-dynamics")
