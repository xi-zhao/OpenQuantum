import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[4] / "tests/fixtures"))
from sdk_devices_science import bridge, record, run
import math
import unittest
import numpy as np

adapter = bridge("qoolqit-workbench")
compute = adapter.compute
CONTROL = {"timeSteps": 10, "atol": 1e-10, "rtol": 1e-10, "maxSolverSteps": 100000, "solverMaxStepNs": 1}
BASE = {**CONTROL, "atomPositions": [[0, 0]], "durations": [0.5, 0.5], "rabiAmplitude": [0, 4, 0], "detuning": [0, 0, 0], "phaseRad": 0.43, "energyScaleRadPerUs": 1}


class QoolQitScience(unittest.TestCase):
    def test_real_compilation_and_analytical_area(self):
        r, _ = compute(BASE)
        state = np.array([complex(*row["amplitude"]) for row in r["finalOutcomes"]])
        expected = [math.cos(1), -1j * np.exp(0.43j) * math.sin(1)]
        error = float(np.max(abs(state - expected)))
        self.assertTrue(r["qoolqitCompiled"])
        self.assertLess(error, 3e-6)
        self.assertEqual(r["conversionFactors"]["timeNs"], 1000)
        self.assertEqual(r["compiledDurationNs"], 1000)
        record("actual QoolQit compilation and pulse area", amplitudeError=error, conversionFactors=r["conversionFactors"], compiledDurationNs=r["compiledDurationNs"])

    def test_unit_conversion_and_scale_invariance(self):
        v = {**BASE, "atomPositions": [[0, 0], [1, 0.7]]}
        a, _ = compute(v)
        b, _ = compute({**v, "energyScaleRadPerUs": 2})
        for result, energy in [(a, 1), (b, 2)]:
            factors = result["conversionFactors"]
            self.assertAlmostEqual(factors["timeNs"] * factors["energyRadPerUs"], 1000)
            self.assertAlmostEqual(factors["distanceUm"]**6 * factors["energyRadPerUs"], 5420158.53, places=6)
            np.testing.assert_allclose(result["compiledPositionsUm"][1], np.array([1, 0.7]) * factors["distanceUm"], atol=1e-10)
        pa = np.array([row["probability"] for row in a["finalOutcomes"]])
        pb = np.array([row["probability"] for row in b["finalOutcomes"]])
        error = float(np.max(abs(pa - pb)))
        self.assertLess(error, 2e-4)  # grid changes from 1000 to 500 physical ns
        record("dimensionless-to-physical conversion and scale invariance", maxProbabilityDifference=error, durationNs=[a["compiledDurationNs"], b["compiledDurationNs"]], physicalPositions=[a["compiledPositionsUm"], b["compiledPositionsUm"]])

    def test_compiled_pulser_equivalence_and_rounding(self):
        from pulser_simulation import QutipEmulator
        v = {**BASE, "durations": [0.1, 0.2], "rabiAmplitude": [0, 2, 0], "detuning": [0.3, -0.1, 0.5]}
        r, _ = compute(v)
        program, _, segments = adapter.compile_program(v)
        simulation = QutipEmulator.from_sequence(program.compiled_sequence)
        state = simulation.run(atol=1e-10, rtol=1e-10, max_step=0.001).get_final_state(ignore_global_phase=False, normalize=False).full().ravel()
        emitted = np.array([complex(*row["amplitude"]) for row in reversed(r["finalOutcomes"])])
        error = float(np.max(abs(state - emitted)))
        self.assertLess(error, 1e-7)
        self.assertEqual(r["compiledDurationNs"], 300)
        self.assertEqual(segments, [100, 200])
        with self.assertRaises((ValueError, TypeError)):
            compute({**BASE, "durations": [1e-9], "rabiAmplitude": [1, 1], "detuning": [0, 0]})
        with self.assertRaisesRegex(ValueError, "rounds to 0 ns"):
            compute({**BASE, "durations": [0.0001, 0.1], "rabiAmplitude": [100000, 0, 0]})
        record("compiled Pulser equivalence and 0.1+0.2 rounding", amplitudeError=error, compiledDurationNs=r["compiledDurationNs"])


if __name__ == "__main__":
    run("qoolqit-workbench")
