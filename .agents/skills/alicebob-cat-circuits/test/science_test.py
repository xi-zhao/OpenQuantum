import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[4] / "tests/fixtures"))
from sdk_devices_science import bridge, record, run
import math
import unittest

compute = bridge("alicebob-cat-circuits").compute
BASE = {"numQubits": 2, "model": "logical-noiseless", "initialStates": ["+", "0"],
        "operations": [{"gate": "cx", "qubits": [0, 1], "angleRad": 0}], "modelParameters": {}, "shots": 4096, "seed": 17}


class AliceBobScience(unittest.TestCase):
    def test_noiseless_bell_and_seed(self):
        r, _ = compute(BASE)
        replay, _ = compute(BASE)
        self.assertEqual(r, replay)
        counts = {row["bits"]: row["count"] for row in r["counts"]}
        self.assertEqual(set(counts), {"00", "11"})
        self.assertLess(abs(counts["00"] / r["shots"] - 0.5), 0.04)
        record("logical noiseless Bell and seed replay", counts=counts)

    def test_phase_interference_and_order(self):
        r, _ = compute({**BASE, "initialStates": ["0", "1"], "operations": [{"gate": name, "qubits": [0], "angleRad": 0} for name in ["h", "t", "h"]]})
        counts = {row["bits"]: row["count"] for row in r["counts"]}
        self.assertEqual(set(counts), {"01", "11"})
        error = abs(counts["01"] / r["shots"] - math.cos(math.pi / 8)**2)
        self.assertLess(error, 0.04)
        record("logical phase interference and asymmetric order", samplingError=error, counts=counts, analyticalP01=math.cos(math.pi / 8)**2)

    def test_physical_and_logical_noise_models(self):
        rows = []
        for model in ["physical", "logical"]:
            r, _ = compute({**BASE, "model": model, "initialStates": ["1", "0"], "operations": [], "shots": 512})
            counts = {row["bits"]: row["count"] for row in r["counts"]}
            self.assertGreater(counts.get("10", 0), 450)
            rows.append({"model": model, "counts": counts, "parameters": r["resolvedModelParameters"]})
        with self.assertRaises(ValueError):
            compute({**BASE, "model": "physical", "modelParameters": {"averagePhotons": 1}})
        record("real SDK cat models and invalid noise parameter", results=rows)


if __name__ == "__main__":
    run("alicebob-cat-circuits")
