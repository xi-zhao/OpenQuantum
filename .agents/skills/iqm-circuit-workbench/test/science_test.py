import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[4] / "tests/fixtures"))
from sdk_devices_science import bridge, record, run
import math
import unittest

compute = bridge("iqm-circuit-workbench").compute
BASE = {"numQubits": 2, "backend": "adonis", "operations": [{"gate": "h", "qubits": [0], "angleRad": 0}, {"gate": "cx", "qubits": [0, 1], "angleRad": 0}],
        "shots": 4096, "seed": 11, "simulationMode": "ideal", "optimizationLevel": 1}


class IQMScience(unittest.TestCase):
    def test_bell_and_seed(self):
        r, _ = compute(BASE)
        replay, _ = compute(BASE)
        self.assertEqual(r, replay)
        counts = {row["bits"]: row["count"] for row in r["counts"]}
        self.assertEqual(set(counts), {"00", "11"})
        deviation = abs(counts["00"] / r["shots"] - 0.5)
        self.assertLess(deviation, 0.04)
        self.assertEqual(r["sdkCircuitValidation"], "passed")
        self.assertTrue(all(op["gate"] in r["nativeGateNames"] or op["gate"] == "barrier" for op in r["compiledGateCounts"]))
        record("ideal Bell and reproducible seed", counts=counts, deviation=deviation, compiledGateCounts=r["compiledGateCounts"])

    def test_asymmetric_bit_order(self):
        angle = 0.81
        r, _ = compute({**BASE, "operations": [{"gate": "x", "qubits": [0], "angleRad": 0}, {"gate": "ry", "qubits": [1], "angleRad": angle}]})
        p = {row["bits"]: row["count"] / r["shots"] for row in r["counts"]}
        self.assertEqual(set(p), {"10", "11"})
        error = abs(p["11"] - math.sin(angle / 2)**2)
        self.assertLess(error, 0.03)
        record("asymmetric logical bit order", measuredProbabilities=p, analyticalP11=math.sin(angle / 2)**2, samplingError=error)

    def test_noise_and_capacity(self):
        r, _ = compute({**BASE, "simulationMode": "device-noise"})
        wrong = sum(row["count"] for row in r["counts"] if row["bits"] in {"01", "10"})
        self.assertGreater(wrong, 0)
        with self.assertRaisesRegex(ValueError, "physical qubits"):
            compute({**BASE, "numQubits": 6})
        record("actual IQM noise profile and capacity rejection", bellLeakageCounts=wrong, shots=r["shots"], physicalQubits=r["deviceQubits"])


if __name__ == "__main__":
    run("iqm-circuit-workbench")
