import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[4] / "tests/fixtures"))
from sdk_devices_science import bridge, record, run
import itertools
import math
import unittest
import numpy as np

compute = bridge("perceval-photonics").compute


class PercevalScience(unittest.TestCase):
    def test_hong_ou_mandel(self):
        r, _ = compute({"inputOccupation": [1, 1], "operations": [{"gate": "BS", "modes": [0, 1], "angleRad": math.pi / 2}]})
        p = {tuple(row["occupation"]): row["probability"] for row in r["outcomes"]}
        error = max(abs(p[(2, 0)] - 0.5), abs(p[(0, 2)] - 0.5), p[(1, 1)])
        self.assertLess(error, 1e-12)
        record("two-photon HOM", maxProbabilityError=error, totalProbability=r["totalProbability"])

    def test_three_mode_asymmetric_permanent(self):
        operations = [{"gate": "BS", "modes": [2, 0], "angleRad": 0.71}, {"gate": "PS", "modes": [0], "angleRad": 0.39},
                      {"gate": "BS", "modes": [0, 1], "angleRad": 1.1}, {"gate": "PS", "modes": [2], "angleRad": -0.63},
                      {"gate": "BS", "modes": [1, 2], "angleRad": 0.9}]
        occupation = [2, 1, 0]
        r, _ = compute({"inputOccupation": occupation, "operations": operations})
        u = np.eye(3, dtype=complex)
        for op in operations:
            step = np.eye(3, dtype=complex)
            if op["gate"] == "PS":
                step[op["modes"][0], op["modes"][0]] = np.exp(1j * op["angleRad"])
            else:
                c, s = np.cos(op["angleRad"] / 2), np.sin(op["angleRad"] / 2)
                step[np.ix_(op["modes"], op["modes"])] = [[c, s], [s, -c]]
            u = step @ u
        raw = np.asarray(r["unitary"])
        unitary_error = float(np.max(abs(raw[..., 0] + 1j * raw[..., 1] - u)))
        self.assertLess(unitary_error, 1e-12)
        columns = [mode for mode, n in enumerate(occupation) for _ in range(n)]
        error = 0
        for row in r["outcomes"]:
            rows = [mode for mode, n in enumerate(row["occupation"]) for _ in range(n)]
            matrix = u[np.ix_(rows, columns)]
            permanent = sum(np.prod([matrix[i, p[i]] for i in range(3)]) for p in itertools.permutations(range(3)))
            expected = abs(permanent)**2 / math.prod(math.factorial(n) for n in occupation + row["occupation"])
            error = max(error, abs(row["probability"] - expected))
        self.assertLess(error, 1e-12)
        self.assertAlmostEqual(r["totalProbability"], 1, places=12)
        record("nonadjacent modes, phase and independent permanent", maxProbabilityError=error, unitaryError=unitary_error, outputStates=len(r["outcomes"]))

    def test_vacuum(self):
        r, _ = compute({"inputOccupation": [0, 0], "operations": []})
        self.assertEqual(r["outcomes"], [{"occupation": [0, 0], "probability": 1.0}])
        record("vacuum", totalProbability=r["totalProbability"])


if __name__ == "__main__":
    run("perceval-photonics")
