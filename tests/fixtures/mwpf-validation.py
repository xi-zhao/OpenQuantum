"""Independent small-instance regression for the editable MWPF example."""
import importlib.util
import importlib.metadata
import json
import sys
import unittest
from pathlib import Path


def deny_python_network(event, _args):
    if event in ("socket.connect", "socket.getaddrinfo"):
        raise RuntimeError("Network is disabled during MWPF regression")


sys.addaudithook(deny_python_network)

import mwpf
import numpy as np
import stim

ROOT = Path(__file__).resolve().parents[2]
EXAMPLE = ROOT / ".agents/skills/mwpf-decoding/references/native-example.py"
OBSERVATIONS = []


def load_example():
    spec = importlib.util.spec_from_file_location("mwpf_example", EXAMPLE)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class HypergraphTests(unittest.TestCase):
    def test_user_hyperedge_solves_the_spec_reference(self):
        example = load_example()
        result = example.solve_hypergraph(example.DEFAULT_GRAPH)
        self.assertEqual(sorted(result["edges"]), [2, 4])
        self.assertEqual(result["weight"], 160)
        self.assertEqual(result["lowerBound"], 160)
        self.assertEqual(result["upperBound"], 160)

    def test_all_syndromes_agree_with_independent_subset_enumeration(self):
        example = load_example()
        graph = example.DEFAULT_GRAPH
        best = {}
        for subset in range(1 << len(graph["edges"])):
            syndrome = 0
            weight = 0
            for i, (vertices, cost) in enumerate(graph["edges"]):
                if subset & (1 << i):
                    weight += cost
                    for vertex in vertices:
                        syndrome ^= 1 << vertex
            best[syndrome] = min(best.get(syndrome, float("inf")), weight)
        self.assertEqual(len(best), 16)
        for syndrome, optimum in best.items():
            data = {**graph, "syndrome": [i for i in range(4) if syndrome & (1 << i)]}
            for limit in (None, 0, 1, 50):
                with self.subTest(syndrome=syndrome, limit=limit):
                    result = example.solve_hypergraph(data, limit)
                    parity = 0
                    for edge in result["edges"]:
                        for vertex in graph["edges"][edge][0]:
                            parity ^= 1 << vertex
                    self.assertEqual(parity, syndrome)
                    self.assertLessEqual(result["lowerBound"], optimum)
                    self.assertGreaterEqual(result["upperBound"], optimum)
                    self.assertEqual(result["upperBound"], result["weight"])
                    OBSERVATIONS.append({"syndrome": syndrome, "limit": limit, "oracleWeight": optimum, **result})
                    if limit is None:
                        self.assertEqual(result["weight"], optimum)

    def test_zero_cluster_budget_is_not_an_unlimited_alias(self):
        example = load_example()
        graph = {**example.DEFAULT_GRAPH, "syndrome": [0, 3]}
        default = example.solve_hypergraph(graph)
        bounded = example.solve_hypergraph(graph, 0)
        self.assertEqual(default["weight"], 300)
        self.assertEqual(bounded["weight"], 360)
        self.assertLess(bounded["lowerBound"], bounded["upperBound"])

    def test_native_solver_can_be_cleared_and_reused(self):
        solver = mwpf.SolverSerialJointSingleHair(mwpf.SolverInitializer(3, [mwpf.HyperEdge([0, 1, 2], 7)]))
        for syndrome, expected in [([0, 1, 2], [0]), ([], []), ([0, 1, 2], [0])]:
            solver.clear()
            solver.solve(mwpf.SyndromePattern(syndrome))
            self.assertEqual(list(solver.subgraph()), expected)


class DetectorTests(unittest.TestCase):
    def test_hyperedge_observables_cross_byte_boundaries(self):
        example = load_example()
        # Three independent mechanisms. Unused detector/observable indices stay zero.
        dem = stim.DetectorErrorModel("error(0.01) D0 D1 D8 L0\nerror(0.02) D1 L8\nerror(0.03) D8 L0 L8")
        # Independently XOR the stated mechanisms, not an MWPF/Stim reference decoder.
        detectors = np.array([[0, 0], [3, 1], [2, 0], [1, 1], [0, 1], [3, 0], [2, 1], [1, 0]], dtype=np.uint8)
        expected = np.array([[0, 0], [1, 0], [0, 1], [1, 1], [1, 1], [0, 1], [1, 0], [0, 0]], dtype=np.uint8)
        for limit in (0, 1, 50):
            predicted = example.decode_detector_samples(dem, detectors, limit)
            np.testing.assert_array_equal(predicted, expected)

    def test_unreachable_syndrome_raises_instead_of_random_prediction(self):
        example = load_example()
        dem = stim.DetectorErrorModel("error(0.1) D0 D1 L0")
        with self.assertRaises(BaseException) as context:
            example.decode_detector_samples(dem, np.array([[1]], dtype=np.uint8))
        self.assertEqual(type(context.exception).__name__, "PanicException")
        self.assertIn("unsolvable", str(context.exception))

    def test_wrong_packed_shape_is_rejected(self):
        example = load_example()
        dem = stim.DetectorErrorModel("error(0.1) D0 D1 L0")
        with self.assertRaises((ValueError, AssertionError, IndexError)):
            example.decode_detector_samples(dem, np.zeros((1, 0), dtype=np.uint8))


if __name__ == "__main__":
    outcome = unittest.TextTestRunner(verbosity=2).run(unittest.defaultTestLoader.loadTestsFromModule(sys.modules[__name__]))
    Path("validation.json").write_text(json.dumps({
        "testsRun": outcome.testsRun, "passed": outcome.wasSuccessful(),
        "failures": len(outcome.failures), "errors": len(outcome.errors),
        "oracle": "exhaustive XOR of independent edge subsets; no MWPF reference solver",
        "hypergraphCases": OBSERVATIONS,
        "versions": {n: importlib.metadata.version(n) for n in ("mwpf", "stim", "sinter", "numpy")},
        "scope": "small API, objective/bound, packed-bit and failure regressions",
        "scientificValidation": "not_evaluated",
    }, indent=2) + "\n")
    sys.exit(0 if outcome.wasSuccessful() else 1)
