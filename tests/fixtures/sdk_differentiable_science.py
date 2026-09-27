"""Independent dense linear algebra references; never imported by production bridges."""
import copy
import importlib.util
import importlib.metadata
import json
import os
from pathlib import Path
import socket
import sys
import unittest
from unittest.mock import patch

import numpy as np

PAULI = {"I": np.eye(2, dtype=complex), "X": np.array([[0, 1], [1, 0]], dtype=complex),
         "Y": np.array([[0, -1j], [1j, 0]], dtype=complex), "Z": np.diag([1, -1]).astype(complex)}


def operator(word):
    matrix = np.ones((1, 1), dtype=complex)
    for letter in word:
        matrix = np.kron(matrix, PAULI[letter])
    return matrix


def dense(request):
    n = request["numQubits"]
    state = np.zeros(2 ** n, dtype=complex)
    state[0] = 1
    for item in request["gates"]:
        name, targets = item["gate"], item["targets"]
        if name in ["CX", "CZ", "SWAP"]:
            updated = np.zeros_like(state)
            for index, amplitude in enumerate(state):
                bits = list(format(index, f"0{n}b"))
                first, second = targets
                sign = 1
                if name == "CX" and bits[first] == "1":
                    bits[second] = "1" if bits[second] == "0" else "0"
                elif name == "CZ" and bits[first] == bits[second] == "1":
                    sign = -1
                elif name == "SWAP":
                    bits[first], bits[second] = bits[second], bits[first]
                updated[int("".join(bits), 2)] += sign * amplitude
            state = updated
            continue
        if name in ["RX", "RY", "RZ"]:
            angle = item["angle"]
            local = np.cos(angle / 2) * PAULI["I"] - 1j * np.sin(angle / 2) * PAULI[name[1]]
        else:
            local = {**PAULI, "H": np.array([[1, 1], [1, -1]]) / np.sqrt(2),
                     "S": np.diag([1, 1j]), "T": np.diag([1, np.exp(1j * np.pi / 4)])}[name]
        matrix = np.ones((1, 1), dtype=complex)
        for qubit in range(n):
            matrix = np.kron(matrix, local if qubit == targets[0] else PAULI["I"])
        state = matrix @ state
    means = np.array([np.vdot(state, operator(word) @ state).real for word in request["observables"]])
    return state, means


def independent_jacobian(request):
    columns = []
    for index in request["trainableGateIndices"]:
        plus, minus = copy.deepcopy(request), copy.deepcopy(request)
        plus["gates"][index]["angle"] += np.pi / 2
        minus["gates"][index]["angle"] -= np.pi / 2
        columns.append((dense(plus)[1] - dense(minus)[1]) / 2)
    return np.stack(columns, axis=1) if columns else np.empty((len(request["observables"]), 0))


def run_suite(skill_root):
    skill_root = Path(skill_root)
    sdk = skill_root.name.removesuffix("-differentiable")
    spec = importlib.util.spec_from_file_location(f"{sdk}_bridge", skill_root / "mcp/bridge.py")
    bridge = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(bridge)
    records = []
    tolerance = 2e-7 if sdk == "deepquantum" else 1e-10

    class ScienceTests(unittest.TestCase):
        def check(self, label, request):
            with patch.object(socket.socket, "connect", side_effect=AssertionError("Unexpected network connection")):
                result, limitations = bridge.compute(request)
            amplitudes = np.array(result["amplitudes"])
            state = amplitudes[:, 0] + 1j * amplitudes[:, 1]
            expected_state, expected_means = dense(request)
            expected_jacobian = independent_jacobian(request)
            np.testing.assert_allclose(state, expected_state, atol=tolerance, rtol=0)
            np.testing.assert_allclose(result["expectations"], expected_means, atol=tolerance, rtol=0)
            np.testing.assert_allclose(result["jacobian"], expected_jacobian, atol=tolerance, rtol=0)
            np.testing.assert_allclose(result["probabilities"], np.abs(state) ** 2, atol=1e-15, rtol=0)
            self.assertAlmostEqual(result["stateNormSquared"], sum(result["probabilities"]), places=14)
            self.assertEqual(result["trainableGateIndices"], request["trainableGateIndices"])
            records.append({"label": label, "input": request, "result": result, "limitations": limitations,
                            "maxAmplitudeError": float(np.max(np.abs(state - expected_state))),
                            "maxExpectationError": float(np.max(np.abs(np.array(result["expectations"]) - expected_means))),
                            "maxJacobianError": float(np.max(np.abs(np.array(result["jacobian"]) - expected_jacobian))) if expected_jacobian.size else 0})
            return result

        def test_analytic_rotation(self):
            result = self.check("analytic-ry", {"numQubits": 1, "gates": [{"gate": "RY", "targets": [0], "angle": .37}],
                                                "observables": ["X", "Y", "Z", "I"], "trainableGateIndices": [0]})
            np.testing.assert_allclose(np.array(result["jacobian"])[:, 0], [np.cos(.37), 0, -np.sin(.37), 0], atol=tolerance, rtol=0)

        def test_phase_and_column_order(self):
            self.check("complex-phase-reordered-parameters", {"numQubits": 1,
                "gates": [{"gate": "RY", "targets": [0], "angle": .71}, {"gate": "RZ", "targets": [0], "angle": -.43}],
                "observables": ["Y", "X", "I", "Z"], "trainableGateIndices": [1, 0]})

        def test_all_gates_and_nonadjacent_controls(self):
            gates = [{"gate": "H", "targets": [2]}, {"gate": "RY", "targets": [0], "angle": .31},
                     {"gate": "CX", "targets": [2, 0]}, {"gate": "RX", "targets": [1], "angle": -.61},
                     {"gate": "CZ", "targets": [1, 2]}, {"gate": "Y", "targets": [0]},
                     {"gate": "S", "targets": [2]}, {"gate": "T", "targets": [1]},
                     {"gate": "RZ", "targets": [2], "angle": 1.23}, {"gate": "SWAP", "targets": [2, 0]},
                     {"gate": "X", "targets": [1]}, {"gate": "Z", "targets": [2]},
                     {"gate": "RX", "targets": [0], "angle": .12}, {"gate": "H", "targets": [1]}]
            self.check("all-gates-three-qubits", {"numQubits": 3, "gates": gates,
                "observables": ["XZY", "YIX", "IZZ", "IIY", "III", "ZZZ", "IXX"], "trainableGateIndices": [8, 1, 3]})

        def test_basis_order_without_gradients(self):
            result = self.check("q0-most-significant", {"numQubits": 3, "gates": [{"gate": "X", "targets": [0]}],
                "observables": ["ZII", "IIZ", "IZI"], "trainableGateIndices": []})
            self.assertAlmostEqual(result["probabilities"][4], 1)

        def test_empty_circuit(self):
            self.check("empty-circuit-no-parameters", {"numQubits": 2, "gates": [],
                "observables": ["II", "ZI", "IX", "YY"], "trainableGateIndices": []})

        def test_zero_angle_and_stationary_expectations(self):
            self.check("zero-rotation-stationary-points", {"numQubits": 2,
                "gates": [{"gate": "RX", "targets": [0], "angle": 0}, {"gate": "RY", "targets": [1], "angle": 0}],
                "observables": ["YI", "IX", "ZZ", "II"], "trainableGateIndices": [1, 0]})

        def test_multiple_hadamards_preserve_raw_numerics(self):
            self.check("raw-norm-no-renormalization", {"numQubits": 1,
                "gates": [{"gate": "H", "targets": [0]} for _ in range(4)],
                "observables": ["I", "Z"], "trainableGateIndices": []})

    result = unittest.TextTestRunner(verbosity=2).run(unittest.defaultTestLoader.loadTestsFromTestCase(ScienceTests))
    evidence = os.environ.get("OPENQUANTUM_DIFFERENTIABLE_EVIDENCE")
    if evidence:
        directory = Path(evidence)
        directory.mkdir(parents=True, exist_ok=True)
        payload = {"sdk": sdk, "version": importlib.metadata.version(sdk), "python": sys.version,
                   "testsRun": result.testsRun, "failures": len(result.failures), "errors": len(result.errors),
                   "reference": "independent dense Pauli/gate algebra and exact parameter-shift derivative",
                   "tolerance": tolerance, "networkConnectBlocked": True, "cases": records}
        (directory / f"science-{sdk}.json").write_text(json.dumps(payload, indent=2) + "\n")
    return result.wasSuccessful()
