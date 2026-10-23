import sys
import math
import itertools
import unittest
from pathlib import Path
import numpy as np
sys.path.insert(0, str(Path(__file__).resolve().parents[4] / "tests/fixtures"))
from sdk_expansion_circuits_science import bridge, record, deny_network
compute = bridge("lightworks-photonics")
deny_network()


class OpticsScience(unittest.TestCase):
    def test_hom_vacuum_asymmetric_modes_and_independent_permanent(self):
        cases = [{"inputOccupation": [1,1], "operations": [{"gate": "BS", "modes": [0,1], "reflectivity": 0.5}]},
                 {"inputOccupation": [0,0], "operations": []},
                 {"inputOccupation": [1,0], "operations": [{"gate": "BS", "modes": [1,0], "reflectivity": 0.2}]},
                 {"inputOccupation": [2,1,0], "operations": [{"gate": "BS", "modes": [2,0], "reflectivity": 0.3}, {"gate": "PS", "modes": [0], "phaseRad": 0.43}, {"gate": "BS", "modes": [0,1], "reflectivity": 0.7}, {"gate": "PS", "modes": [2], "phaseRad": -0.71}]}]
        evidence = []
        for v in cases:
            result, _ = compute(v)
            n = len(v["inputOccupation"])
            expected_u = np.eye(n, dtype=complex)
            for op in v["operations"]:
                step = np.eye(n, dtype=complex)
                if op["gate"] == "PS":
                    step[op["modes"][0], op["modes"][0]] = np.exp(1j*op["phaseRad"])
                else:
                    r = op["reflectivity"]
                    step[np.ix_(op["modes"], op["modes"])] = [[np.sqrt(r), 1j*np.sqrt(1-r)], [1j*np.sqrt(1-r), np.sqrt(r)]]
                expected_u = step @ expected_u
            raw = np.asarray(result["unitary"])
            unitary_error = float(np.max(abs(raw[...,0] + 1j*raw[...,1] - expected_u)))
            self.assertLess(unitary_error, 1e-12)
            columns = [i for i, count in enumerate(v["inputOccupation"]) for _ in range(count)]
            error = 0
            for row in result["outcomes"]:
                rows = [i for i, count in enumerate(row["occupation"]) for _ in range(count)]
                matrix = expected_u[np.ix_(rows, columns)]
                permanent = sum(np.prod([matrix[i, p[i]] for i in range(len(rows))]) for p in itertools.permutations(range(len(rows))))
                expected = permanent / np.sqrt(math.prod(math.factorial(k) for k in v["inputOccupation"] + row["occupation"]))
                error = max(error, abs(complex(*row["amplitude"]) - expected))
            self.assertLess(error, 1e-12)
            self.assertAlmostEqual(result["totalProbability"], 1, places=12)
            evidence.append({"input": v, "maxAmplitudeError": error, "unitaryError": unitary_error})
        record("lightworks-photonics", {"cases": evidence, "networkGuard": "socket connections denied", "reference": "analytical passive unitary and enumerated permanent including Fock normalization"})


if __name__ == "__main__":
    unittest.main()
