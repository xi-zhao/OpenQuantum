"""Independent analytical/dense checks; SDKs are real and network is disabled."""
import copy
import importlib.util
import json
import math
import os
from pathlib import Path
import socket
import sys
import unittest
from unittest.mock import patch


def main(capability, bridge_path):
    spec = importlib.util.spec_from_file_location("domestic_bridge", bridge_path)
    bridge = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(bridge)
    if capability == "vqnet-learning":
        bridge.prepare_macos_loader()
    import numpy as np
    evidence = []

    def compute(value):
        result, _limitations = bridge.compute(copy.deepcopy(value))
        evidence.append({"input": value, "result": result})
        return result

    def tensor(operators):
        result = np.ones((1, 1), dtype=complex)
        for op in operators:
            result = np.kron(result, op)
        return result

    paulis = {"I": np.eye(2), "X": np.array([[0, 1], [1, 0]]), "Y": np.array([[0, -1j], [1j, 0]]), "Z": np.diag([1, -1])}

    def circuit_reference(value):
        n = value["numQubits"]
        state = np.zeros(2 ** n, dtype=complex)
        state[0] = 1
        for gate in value["gates"]:
            name, wires = gate["gate"], gate["targets"]
            if name in ["CX", "CZ"]:
                new = np.zeros_like(state)
                control_mask, target_mask = 1 << (n - 1 - wires[0]), 1 << (n - 1 - wires[1])
                for index, amplitude in enumerate(state):
                    if name == "CX":
                        new[index ^ target_mask if index & control_mask else index] += amplitude
                    else:
                        new[index] = amplitude * (-1 if index & control_mask and index & target_mask else 1)
                state = new
                continue
            if name.startswith("R"):
                angle = gate["angle"]
                operator = math.cos(angle / 2) * paulis["I"] - 1j * math.sin(angle / 2) * paulis[name[1]]
            elif name == "H":
                operator = np.array([[1, 1], [1, -1]]) / math.sqrt(2)
            elif name == "S":
                operator = np.diag([1, 1j])
            elif name == "T":
                operator = np.diag([1, np.exp(1j * math.pi / 4)])
            else:
                operator = paulis[name]
            state = tensor([operator if i == wires[0] else paulis["I"] for i in range(n)]) @ state
        hamiltonian = sum(term["coefficient"] * tensor([paulis[p] for p in term["pauli"]]) for term in value["terms"])
        return float(np.vdot(state, hamiltonian @ state).real), np.abs(state) ** 2

    class Cases(unittest.TestCase):
        def test_simqn_delay_loss_and_werner_analytic(self):
            if capability != "simqn-network":
                return
            base = dict(attempts=8, intervalSeconds=0.01, delaySeconds=0.005, dropProbability=0, initialFidelity=0.9,
                        lengthMeters=100, decoherencePerMeter=0.002, timeSlotsPerSecond=1000000000, seed=5)
            result = compute(base)
            self.assertEqual(result["received"], 8)
            expected_fidelity = 0.25 + (0.9 - 0.25) * math.exp(-0.2)
            for i, row in enumerate(result["arrivals"]):
                self.assertAlmostEqual(row["fidelity"], expected_fidelity, places=13)
                self.assertAlmostEqual(row["timeSeconds"], i * 0.01 + 0.005, places=8)
            all_lost = compute({**base, "dropProbability": 1})
            self.assertEqual(all_lost["arrivals"], [])
            self.assertEqual(all_lost["dropped"], 8)
            zero_fidelity = compute({**base, "initialFidelity": 0, "decoherencePerMeter": 0, "intervalSeconds": 0, "delaySeconds": 0})
            self.assertTrue(all(row["fidelity"] == 0 and row["timeSeconds"] == 0 for row in zero_fidelity["arrivals"]))

        def test_simqn_seed_and_loss_statistics(self):
            if capability != "simqn-network":
                return
            base = dict(attempts=1000, intervalSeconds=0.001, delaySeconds=0.005, dropProbability=0.25, initialFidelity=1,
                        lengthMeters=0, decoherencePerMeter=0, timeSlotsPerSecond=1000000, seed=17)
            first = compute(base)
            second = compute(base)
            self.assertEqual(first, second)
            self.assertLess(abs(first["received"] - 750), 5 * math.sqrt(1000 * 0.25 * 0.75))

        def test_qcover_against_full_hilbert_space(self):
            if capability != "qcover-optimization":
                return
            fixtures = [dict(fields=[0, 0], edges=[dict(source=0, target=1, coupling=1)], gammas=[0.3], betas=[0.2]),
                        dict(fields=[0.3, -0.5, 0.1, 0], edges=[dict(source=0, target=2, coupling=-0.7), dict(source=2, target=1, coupling=1.2)], gammas=[0.2, -0.13], betas=[-0.3, 0.27]),
                        dict(fields=[0.7], edges=[], gammas=[0.4], betas=[0.2])]
            for value in fixtures:
                n = len(value["fields"])
                z = [tensor([paulis["Z"] if i == j else paulis["I"] for i in range(n)]) for j in range(n)]
                H = sum(value["fields"][i] * z[i] for i in range(n))
                for edge in value["edges"]:
                    H += edge["coupling"] * z[edge["source"]] @ z[edge["target"]]
                state = np.ones(2 ** n, dtype=complex) / math.sqrt(2 ** n)
                for gamma, beta in zip(value["gammas"], value["betas"]):
                    state *= np.exp(1j * gamma * np.diag(H))
                    mix = math.cos(beta) * paulis["I"] + 1j * math.sin(beta) * paulis["X"]
                    state = tensor([mix] * n) @ state
                result = compute(value)
                self.assertAlmostEqual(result["energy"], float(np.vdot(state, H @ state).real), places=12)
            self.assertAlmostEqual(compute(fixtures[0])["energy"], math.sin(0.6) * math.sin(0.8), places=12)

        def test_vqnet_dense_expectation_and_numerical_gradient(self):
            if capability != "vqnet-learning":
                return
            value = dict(numQubits=3, gates=[dict(gate="H", targets=[2]), dict(gate="RY", targets=[0], angle=0.4), dict(gate="CX", targets=[0, 1]), dict(gate="RY", targets=[2], angle=0.5), dict(gate="RX", targets=[2], angle=-0.3), dict(gate="CZ", targets=[1, 2]), dict(gate="RZ", targets=[1], angle=0.2), dict(gate="S", targets=[0]), dict(gate="T", targets=[2])], terms=[dict(pauli="XXI", coefficient=0.7), dict(pauli="XYZ", coefficient=0.2), dict(pauli="IIZ", coefficient=0.4), dict(pauli="ZII", coefficient=0.1), dict(pauli="III", coefficient=0.3)])
            result = compute(value)
            energy, probabilities = circuit_reference(value)
            self.assertAlmostEqual(result["expectation"], energy, places=12)
            np.testing.assert_allclose(result["probabilities"], probabilities, atol=1e-12)
            self.assertGreaterEqual(sum(abs(g["derivative"]) > 1e-5 for g in result["gradients"]), 3)
            for gradient in result["gradients"]:
                plus, minus = copy.deepcopy(value), copy.deepcopy(value)
                plus["gates"][gradient["gateIndex"]]["angle"] += 1e-6
                minus["gates"][gradient["gateIndex"]]["angle"] -= 1e-6
                expected = (circuit_reference(plus)[0] - circuit_reference(minus)[0]) / 2e-6
                self.assertAlmostEqual(gradient["derivative"], expected, places=8)

        def test_vqnet_identity_cancellation_and_bit_order(self):
            if capability != "vqnet-learning":
                return
            value = dict(numQubits=2, gates=[dict(gate="X", targets=[0])], terms=[dict(pauli="ZI", coefficient=1)])
            result = compute(value)
            np.testing.assert_allclose(result["probabilities"], [0, 0, 1, 0], atol=1e-12)
            self.assertEqual(result["gradients"], [])
            self.assertEqual(result["expectation"], -1)
            constant = dict(numQubits=1, gates=[dict(gate="RY", targets=[0], angle=0.7)], terms=[dict(pauli="I", coefficient=2), dict(pauli="Z", coefficient=1), dict(pauli="Z", coefficient=-1)])
            output = compute(constant)
            self.assertAlmostEqual(output["expectation"], 2, places=12)
            self.assertAlmostEqual(output["gradients"][0]["derivative"], 0, places=12)

        def test_pychemiq_matrix_anticommutation_and_complex(self):
            if capability != "pychemiq-chemistry":
                return
            def term(ops, real=1, imaginary=0):
                return dict(coefficient=dict(real=real, imaginary=imaginary), operators=[dict(mode=mode, action=action) for mode, action in ops])
            fixtures = [dict(numModes=2, terms=[term([(0, "create"), (0, "annihilate")], 2)]),
                        dict(numModes=3, terms=[term([(2, "create"), (0, "annihilate")], 0.2, 0.7), term([(0, "create"), (2, "annihilate")], 0.2, -0.7), term([], 0.3)]),
                        dict(numModes=2, terms=[term([(0, "create"), (1, "create")]), term([(1, "create"), (0, "create")])]),
                        dict(numModes=1, terms=[term([(0, "annihilate"), (0, "create")]), term([(0, "create"), (0, "annihilate")])])]
            for value in fixtures:
                n = value["numModes"]
                # Direct fermionic occupation-basis action, independent of JW formulas.
                original = np.zeros((2 ** n, 2 ** n), dtype=complex)
                for column in range(2 ** n):
                    for item in value["terms"]:
                        state = column
                        amplitude = complex(item["coefficient"]["real"], item["coefficient"]["imaginary"])
                        for operator in reversed(item["operators"]):
                            mode = operator["mode"]
                            mask = 1 << (n - 1 - mode)
                            occupied = bool(state & mask)
                            if occupied == (operator["action"] == "create"):
                                amplitude = 0
                                break
                            parity = sum(bool(state & (1 << (n - 1 - j))) for j in range(mode))
                            amplitude *= (-1) ** parity
                            state ^= mask
                        original[state, column] += amplitude
                result = compute(value)
                mapped = np.zeros_like(original)
                for item in result["terms"]:
                    mapped += complex(item["coefficient"]["real"], item["coefficient"]["imaginary"]) * tensor([paulis[p] for p in item["pauli"]])
                np.testing.assert_allclose(mapped, original, atol=1e-12)
            self.assertEqual(compute(fixtures[2])["terms"], [])

        def test_pychemiq_tiny_coefficients_long_words_and_cancellation(self):
            if capability != "pychemiq-chemistry":
                return
            def term(operators, real=1, imaginary=0):
                return dict(coefficient=dict(real=real, imaginary=imaginary), operators=operators)
            number = [dict(mode=0, action="create"), dict(mode=0, action="annihilate")]
            for magnitude in [1e-6, 1e-10, 1e-100, 1e-300]:
                identity = compute(dict(numModes=1, terms=[term([], magnitude, -magnitude)]))
                self.assertEqual(identity["terms"], [dict(pauli="I", coefficient=dict(real=magnitude, imaginary=-magnitude))])
                # (n_0)^24 = n_0: checks long native products without an
                # exponential intermediate list or the SDK pruning threshold.
                result = compute(dict(numModes=1, terms=[term(number * 24, magnitude)]))
                self.assertEqual(result["terms"], [dict(pauli="I", coefficient=dict(real=magnitude / 2, imaginary=0)), dict(pauli="Z", coefficient=dict(real=-magnitude / 2, imaginary=0))])
            residual = compute(dict(numModes=1, terms=[term([], 1e10), term([], 1e-10), term([], -1e10)]))
            self.assertEqual(residual["terms"], [dict(pauli="I", coefficient=dict(real=1e-10, imaginary=0))])
            number_residual = compute(dict(numModes=1, terms=[term(number, 1e10), term(number, 1e-10), term(number, -1e10)]))
            self.assertEqual(number_residual["terms"], [dict(pauli="I", coefficient=dict(real=5e-11, imaginary=0)), dict(pauli="Z", coefficient=dict(real=-5e-11, imaginary=0))])
            with self.assertRaisesRegex(ValueError, "below floating-point representation"):
                compute(dict(numModes=1, terms=[term(number, 5e-324)]))

    # Only execute tests for this SDK, avoiding meaningless skips in the counts.
    prefix = {"simqn-network": "test_simqn", "qcover-optimization": "test_qcover", "vqnet-learning": "test_vqnet", "pychemiq-chemistry": "test_pychemiq"}[capability]
    suite = unittest.TestSuite(Cases(name) for name in unittest.defaultTestLoader.getTestCaseNames(Cases) if name.startswith(prefix))
    with patch.object(socket.socket, "connect", side_effect=AssertionError("Network forbidden in SDK numerical test")), patch.object(socket, "create_connection", side_effect=AssertionError("Network forbidden in SDK numerical test")):
        run = unittest.TextTestRunner(verbosity=2).run(suite)
    if os.environ.get("OPENQUANTUM_SDK_GAPS_DOMESTIC_EVIDENCE"):
        folder = Path(os.environ["OPENQUANTUM_SDK_GAPS_DOMESTIC_EVIDENCE"])
        folder.mkdir(parents=True, exist_ok=True)
        (folder / (capability + "-science.json")).write_text(json.dumps({"capability": capability, "testsRun": run.testsRun, "successful": run.wasSuccessful(), "network": "denied", "cases": evidence}, indent=2) + "\n")
    sys.exit(0 if run.wasSuccessful() else 1)
