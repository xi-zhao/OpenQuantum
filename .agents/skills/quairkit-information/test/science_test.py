import sys
import unittest
from pathlib import Path
import numpy as np
sys.path.insert(0, str(Path(__file__).resolve().parents[4] / "tests/fixtures"))
from sdk_expansion_circuits_science import bridge, record, dense_unitary, circuit_cases, deny_network
compute = bridge("quairkit-information")
deny_network()


def as_complex(raw):
    a = np.asarray(raw)
    return a[..., 0] + 1j * a[..., 1]


def embed(operator, target, n):
    out = np.ones((1, 1), dtype=complex)
    for i in range(n):
        out = np.kron(out, operator if i == target else np.eye(2))
    return out


def reference(value):
    vector = dense_unitary(value)[:, 0]
    rho = np.outer(vector, vector.conj())
    for c in value["channels"]:
        p = c["strength"]
        if c["channel"] == "amplitude_damping":
            kraus = [np.diag([1, np.sqrt(1-p)]), np.array([[0, np.sqrt(p)], [0, 0]])]
        elif c["channel"] == "phase_damping":
            kraus = [np.diag([1, np.sqrt(1-p)]), np.diag([0, np.sqrt(p)])]
        else:
            kraus = [np.sqrt(1-3*p/4)*np.eye(2)] + [np.sqrt(p/4)*a for a in [np.array([[0,1],[1,0]]), np.array([[0,-1j],[1j,0]]), np.diag([1,-1])]]
        operators = [embed(k, c["target"], value["numQubits"]) for k in kraus]
        rho = sum(k @ rho @ k.conj().T for k in operators)
    return rho


class ChannelScience(unittest.TestCase):
    def test_circuits_and_ordered_channels_against_independent_kraus(self):
        cases = [{**v, "channels": []} for v in circuit_cases()[:6]]
        bell = {"numQubits": 2, "gates": [{"gate": "H", "targets": [0]}, {"gate": "CX", "targets": [0, 1]}]}
        for name in ["amplitude_damping", "phase_damping", "depolarizing"]:
            for p in [0, 0.23, 1]:
                cases.append({**bell, "channels": [{"channel": name, "target": 0, "strength": p}]})
        cases.append({**circuit_cases()[-1], "channels": [{"channel": "depolarizing", "target": 2, "strength": 0.4}, {"channel": "amplitude_damping", "target": 0, "strength": 0.7}, {"channel": "phase_damping", "target": 2, "strength": 0.2}]})
        evidence = []
        for v in cases:
            result, _ = compute(v)
            expected = reference(v)
            actual = as_complex(result["densityMatrix"])
            error = float(np.max(abs(actual - expected)))
            self.assertLess(error, 1e-10)
            self.assertAlmostEqual(result["purity"], float(np.trace(expected @ expected).real), places=10)
            self.assertAlmostEqual(result["trace"][0], 1, places=10)
            self.assertLess(result["hermiticityError"], 1e-12)
            evidence.append({"input": v, "maxDensityMatrixError": error})
        record("quairkit-information", {"cases": evidence, "networkGuard": "socket connections denied", "reference": "independent dense unitary and local Kraus operators"})


if __name__ == "__main__":
    unittest.main()
