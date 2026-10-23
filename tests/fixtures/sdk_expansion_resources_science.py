"""Development oracles for the resource/algebra/compiler SDK expansion.

Dense references are deliberately restricted to these test cases; production
tools neither allocate these matrices nor infer scientific acceptance.
"""
import importlib.util
import json
import math
import os
import socket
import unittest
from pathlib import Path

import numpy as np
from sdk_compilers_reference import circuit_cases, dense_unitary


def pauli_matrix(word):
    matrices = {"I": np.eye(2), "X": np.array([[0, 1], [1, 0]]),
                "Y": np.array([[0, -1j], [1j, 0]]), "Z": np.diag([1, -1])}
    result = np.ones((1, 1), dtype=complex)
    for letter in word:
        result = np.kron(result, matrices[letter])
    return result


def fermion_matrix(v):
    """Occupation-basis CAR representation; mode zero is the leftmost bit."""
    n = v["numModes"]
    dimension = 2**n
    answer = np.zeros((dimension, dimension), dtype=complex)
    for term in v["terms"]:
        product = np.eye(dimension, dtype=complex)
        for op in term["operators"]:
            matrix = np.zeros_like(product)
            for column in range(dimension):
                bits = [int(b) for b in format(column, f"0{n}b")]
                mode, create = op["mode"], op["action"] == "create"
                if bits[mode] == int(create):
                    continue
                sign = (-1) ** sum(bits[:mode])
                bits[mode] = int(create)
                row = int("".join(map(str, bits)), 2)
                matrix[row, column] = sign
            product = product @ matrix
        coefficient = term["coefficient"]
        answer += complex(coefficient["real"], coefficient["imag"]) * product
    return answer


def qubit_matrix(result):
    n = result["numQubits"]
    answer = np.zeros((2**n, 2**n), dtype=complex)
    for term in result["terms"]:
        c = term["coefficient"]
        answer += complex(c["real"], c["imag"]) * pauli_matrix(term["pauli"])
    return answer


def main(capability, bridge_path):
    spec = importlib.util.spec_from_file_location("resources_bridge", bridge_path)
    bridge = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(bridge)
    compute = bridge.compute
    evidence = []

    def denied(*args, **kwargs):
        raise AssertionError("Local resource/algebra SDK attempted a network connection")
    socket.socket.connect = denied
    socket.create_connection = denied

    class QuriTests(unittest.TestCase):
        def test_dense_expectations_all_gates_and_pauli_order(self):
            for case in circuit_cases():
                n = case["numQubits"]
                state = dense_unitary(case)[:, 0]
                words = ["I" * n, "Z" * n, "X" * n, "Y" + "I" * (n - 1), "I" * (n - 1) + "Z"]
                terms = [{"pauli": word, "coefficient": [0.3, -1.2, 0.6, 0.9, -0.7][i]} for i, word in enumerate(words)]
                matrix = sum(t["coefficient"] * pauli_matrix(t["pauli"]) for t in terms)
                expected = np.vdot(state, matrix @ state).real
                actual, _ = compute({**case, "terms": terms})
                error = abs(actual["expectation"] - expected)
                self.assertLess(error, 1e-11)
                self.assertLess(actual["imaginaryResidual"], 1e-11)
                self.assertEqual(actual["estimatorError"], 0)
                evidence.append({"case": case, "expectationError": float(error)})

        def test_duplicate_pauli_terms_cancel(self):
            result, _ = compute({"numQubits": 1, "gates": [{"gate": "X", "targets": [0]}], "terms": [{"pauli": "Z", "coefficient": 2}, {"pauli": "Z", "coefficient": -2}]})
            self.assertEqual(result["expectation"], 0)

    class QdkTests(unittest.TestCase):
        def test_resource_frontier_and_time_scaling(self):
            v = {"numQubits": 2, "gates": [{"gate": "H", "targets": [0]}, {"gate": "T", "targets": [0]}, {"gate": "CX", "targets": [0, 1]}],
                 "physicalErrorRate": 0.0001, "gateTimeNs": 100, "measurementTimeNs": 500, "maxError": 0.01}
            first, _ = compute(v)
            scaled, _ = compute({**v, "gateTimeNs": 200, "measurementTimeNs": 1000})
            self.assertTrue(first["feasible"])
            self.assertEqual(len(first["frontier"]), len(scaled["frontier"]))
            for a, b in zip(first["frontier"], scaled["frontier"]):
                self.assertGreater(a["physicalQubits"], v["numQubits"])
                self.assertGreater(a["runtimeNs"], 0)
                self.assertLessEqual(a["errorProbability"], v["maxError"])
                self.assertEqual(a["physicalQubits"], b["physicalQubits"])
                self.assertEqual(a["runtimeNs"] * 2, b["runtimeNs"])
                self.assertAlmostEqual(a["errorProbability"], b["errorProbability"], places=12)
            evidence.append({"input": v, "result": first, "timingScaledResult": scaled})

        def test_qsharp_generated_gate_surface_and_budget(self):
            gates = [{"gate": name, "targets": [0]} for name in ["H", "S", "T", "X", "Y", "Z"]]
            gates += [{"gate": name, "targets": [0], "angle": angle} for name, angle in [("RX", 0.1), ("RY", -0.5), ("RZ", 1.2)]]
            gates += [{"gate": "CX", "targets": [0, 1]}, {"gate": "CZ", "targets": [1, 0]}]
            v = {"numQubits": 2, "gates": gates, "physicalErrorRate": 0.0001, "gateTimeNs": 100, "measurementTimeNs": 500, "maxError": 0.001}
            result, _ = compute(v)
            self.assertTrue(result["feasible"])
            self.assertTrue(all(r["errorProbability"] <= 0.001 for r in result["frontier"]))
            evidence.append({"input": v, "result": result})

    class QualtranTests(unittest.TestCase):
        def test_adder_and_cswap_resource_formulas(self):
            costs = {"toffoli": 4, "controlledSwap": 4, "temporaryAnd": 4, "rotation": 11}
            for n in [1, 2, 4, 7, 100]:
                for operation in ["add", "controlled_swap"]:
                    result, _ = compute({"operation": operation, "bitsize": n, "constant": 0, "tCosts": costs})
                    if operation == "add":
                        self.assertEqual(result["gateCounts"]["and_bloq"], n - 1)
                        self.assertEqual(result["tEquivalentCount"], 4 * (n - 1))
                        self.assertEqual(result["qubitCount"], 3 * n - 1)
                    else:
                        self.assertEqual(result["gateCounts"]["cswap"], n)
                        self.assertEqual(result["tEquivalentCount"], 4 * n)
                        self.assertEqual(result["qubitCount"], 2 * n + 1)
                    evidence.append(result)

        def test_comparison_truth_table_and_accounting_weights(self):
            v = {"operation": "less_than_constant", "bitsize": 4, "constant": 5, "tCosts": {"toffoli": 7, "controlledSwap": 7, "temporaryAnd": 6, "rotation": 11}}
            bloq = bridge.make_bloq(v)
            for x in range(16):
                for target in [0, 1]:
                    value = bloq.call_classically(x=x, target=target)
                    self.assertEqual(value, (x, target ^ (x < 5)))
            result, _ = compute(v)
            self.assertEqual(result["tEquivalentCount"], 24)
            evidence.append(result)

    class OpenFermionTests(unittest.TestCase):
        def test_jordan_wigner_against_independent_car_matrices(self):
            rng = np.random.default_rng(913)
            for n in [1, 2, 3]:
                terms = [{"coefficient": {"real": 0.25, "imag": 0}, "operators": []}]
                for _ in range(12):
                    terms.append({"coefficient": {"real": float(rng.normal()), "imag": float(rng.normal())}, "operators": [{"mode": int(rng.integers(n)), "action": "create" if rng.integers(2) else "annihilate"} for _ in range(int(rng.integers(1, 5)))]})
                v = {"numModes": n, "mapping": "jordan_wigner", "terms": terms}
                result, _ = compute(v)
                error = float(np.max(np.abs(qubit_matrix(result) - fermion_matrix(v))))
                self.assertLess(error, 1e-12)
                self.assertGreater(result["hermiticityResidualL1"], 0)
                self.assertFalse(result["hermitian"])
                evidence.append({"numModes": n, "carMatrixError": error})

        def test_bravyi_kitaev_hermitian_spectrum_and_anticommutation(self):
            for n in [2, 3, 4]:
                terms = []
                for i in range(n):
                    terms.append({"coefficient": {"real": i + 0.5, "imag": 0}, "operators": [{"mode": i, "action": "create"}, {"mode": i, "action": "annihilate"}]})
                terms += [{"coefficient": {"real": 0.4, "imag": 0}, "operators": [{"mode": a, "action": "create"}, {"mode": b, "action": "annihilate"}]} for a, b in [(0, n - 1), (n - 1, 0)]]
                v = {"numModes": n, "mapping": "bravyi_kitaev", "terms": terms}
                actual, _ = compute(v)
                self.assertTrue(actual["hermitian"])
                error = float(np.max(np.abs(np.linalg.eigvalsh(qubit_matrix(actual)) - np.linalg.eigvalsh(fermion_matrix(v)))))
                self.assertLess(error, 1e-11)
                evidence.append({"numModes": n, "bravyiKitaevSpectrumError": error})
            for mapping in ["jordan_wigner", "bravyi_kitaev"]:
                for mode in [0, 1]:
                    terms = [{"coefficient": {"real": 1, "imag": 0}, "operators": [{"mode": mode, "action": a}, {"mode": mode, "action": b}]} for a, b in [("create", "annihilate"), ("annihilate", "create")]]
                    result, _ = compute({"numModes": 2, "mapping": mapping, "terms": terms})
                    np.testing.assert_allclose(qubit_matrix(result), np.eye(4), atol=1e-12)

    class DdsimTests(unittest.TestCase):
        def test_dense_state_vector_gate_conventions(self):
            for case in circuit_cases():
                result, _ = compute({**case, "shots": 64, "seed": 101, "includeStatevector": True})
                actual = np.array([complex(a["real"], a["imag"]) for a in result["statevector"]])
                n = case["numQubits"]
                expected_big = dense_unitary(case)[:, 0]
                expected = expected_big[[int(format(i, f"0{n}b")[::-1], 2) for i in range(2**n)]]
                error = float(np.max(np.abs(actual - expected)))
                self.assertLess(error, 1e-11)
                self.assertEqual(sum(row["count"] for row in result["counts"]), 64)
                evidence.append({"case": case, "statevectorError": error})

        def test_sampling_seed_and_asymmetric_bit_order(self):
            case = {"numQubits": 3, "gates": [{"gate": "X", "targets": [0]}], "shots": 23, "seed": 55, "includeStatevector": False}
            result, _ = compute(case)
            self.assertIsNone(result["statevector"])
            self.assertEqual(result["counts"], [{"bitstring": "001", "count": 23}])
            case["gates"] = [{"gate": "H", "targets": [0]}, {"gate": "CX", "targets": [0, 2]}]
            first, _ = compute(case)
            second, _ = compute(case)
            self.assertEqual(first["counts"], second["counts"])
            self.assertEqual({r["bitstring"] for r in first["counts"]}, {"000", "101"})
            evidence.append({"seededSampling": first})

    class QmapTests(unittest.TestCase):
        def test_mapping_unitary_ancillas_global_phase_and_permutations(self):
            from qiskit import qasm2
            from qiskit.quantum_info import Operator
            for index, case in enumerate(circuit_cases()):
                n = case["numQubits"]
                m = n + index % 2
                coupling = [[a, b] for a in range(m - 1) for b in [a + 1]]
                if index % 3:
                    coupling += [[b, a] for a, b in coupling.copy()]
                result, _ = compute({**case, "numPhysicalQubits": m, "coupling": coupling})
                mapped = qasm2.loads(result["qasm"])
                full = Operator(mapped).data * np.exp(1j * result["globalPhaseRadians"])
                def indices(mapping):
                    return [sum(int(format(i, f"0{n}b")[p["logical"]]) << p["physical"] for p in mapping) for i in range(2**n)]
                ins, outs = indices(result["initialMapping"]), indices(result["finalMapping"])
                actual = full[np.ix_(outs, ins)]
                error = float(np.max(np.abs(actual - dense_unitary(case))))
                self.assertLess(error, 1e-10)
                self.assertLess(float(np.max(np.abs(np.sum(np.abs(actual) ** 2, axis=0) - 1))), 1e-10)
                for instruction in mapped.data:
                    targets = [mapped.find_bit(q).index for q in instruction.qubits]
                    if instruction.operation.name == "cx":
                        self.assertIn(targets, coupling)
                    if instruction.operation.name in ["swap", "oq_swap"]:
                        self.assertTrue(targets in coupling or targets[::-1] in coupling)
                evidence.append({"case": case, "physicalQubits": m, "initialMapping": result["initialMapping"], "finalMapping": result["finalMapping"], "unitaryError": error})

        def test_nonadjacent_cx_needs_routing(self):
            result, _ = compute({"numQubits": 3, "gates": [{"gate": "H", "targets": [1]}, {"gate": "CX", "targets": [0, 2]}], "numPhysicalQubits": 3, "coupling": [[0, 1], [1, 0], [1, 2], [2, 1]]})
            self.assertGreater(result["resources"]["insertedSwaps"], 0)
            self.assertNotEqual(result["initialMapping"], result["finalMapping"])

    suites = {"quri-parts-estimation": QuriTests, "qdk-resource-estimation": QdkTests,
              "qualtran-resources": QualtranTests, "openfermion-mapping": OpenFermionTests,
              "mqt-ddsim": DdsimTests, "mqt-qmap": QmapTests}
    result = unittest.TextTestRunner(verbosity=2).run(unittest.defaultTestLoader.loadTestsFromTestCase(suites[capability]))
    folder = Path(os.environ.get("OPENQUANTUM_SDK_RESOURCES_EVIDENCE", ".openquantum/sdk-expansion-evidence/resources"))
    folder.mkdir(parents=True, exist_ok=True)
    (folder / f"science-{capability}.json").write_text(json.dumps({"capability": capability, "testsRun": result.testsRun, "success": result.wasSuccessful(), "networkGuard": "socket connections denied", "cases": evidence}, indent=2) + "\n")
    raise SystemExit(0 if result.wasSuccessful() else 1)
