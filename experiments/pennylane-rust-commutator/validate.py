"""Independent dense-matrix checks, complete Pauli coefficients, and contract failures."""
import hashlib
import itertools
import json
from pathlib import Path

import numpy as np
from pennylane.pauli import PauliSentence, PauliWord
import pennylane as qml

from case import canonical, compare, encode, rust_commutator, python_commutator
from workloads import random_sentence

ROOT = Path(__file__).resolve().parent
MATRICES = {"I": np.eye(2), "X": np.array([[0, 1], [1, 0]]),
            "Y": np.array([[0, -1j], [1j, 0]]), "Z": np.diag([1, -1])}


def dense(sentence, wires):
    matrix = np.zeros((2 ** len(wires),) * 2, dtype=complex)
    for word, coefficient in sentence.items():
        term = np.ones((1, 1), dtype=complex)
        for wire in wires:
            term = np.kron(term, MATRICES[word.get(wire, "I")])
        matrix += coefficient * term
    return matrix


def main():
    checks = []
    exhaustive = 0
    for n in (1, 2, 3):
        words = [PauliWord({i: axis for i, axis in enumerate(axes) if axis != "I"})
                 for axes in itertools.product("IXYZ", repeat=n)]
        sentences = [PauliSentence({word: 1.0}) for word in words]
        matrices = [dense(sentence, tuple(range(n))) for sentence in sentences]
        for i, left in enumerate(sentences):
            for j, right in enumerate(sentences):
                actual = dense(rust_commutator(left, right), tuple(range(n)))
                expected = matrices[i] @ matrices[j] - matrices[j] @ matrices[i]
                assert np.array_equal(actual, expected), (n, i, j)
                exhaustive += 1
    checks.append({"id": "exhaustive-independent-kron-matrices", "passed": True,
                   "word_pairs": exhaustive, "qubits": [1, 2, 3], "error": 0.0})
    rng = np.random.default_rng(20261020)
    worst = 0.0
    for index in range(40):
        n = 1 + index % 6
        terms = min(3 ** n, 15)
        left = random_sentence(rng, n, terms, complex_coefficients=True)
        right = random_sentence(rng, n, terms, complex_coefficients=True)
        if index % 5 == 0:
            right = left
        wires = tuple(range(n))
        expected = left.commutator(right)
        for name, operation in [("rust", rust_commutator), ("python-mask", python_commutator)]:
            actual = operation(left, right)
            coefficients = compare(canonical(actual, wires), canonical(expected, wires))
            assert coefficients["passed"], (index, name, coefficients)
            exact_matrix = dense(left, wires) @ dense(right, wires) - dense(right, wires) @ dense(left, wires)
            error = float(np.max(np.abs(dense(actual, wires) - exact_matrix)))
            assert error <= 1e-11 + 1e-12 * float(np.max(np.abs(exact_matrix))), (index, name, error)
            worst = max(worst, error)
            checks.append({"id": f"random-complex-{index}-{name}", **coefficients, "matrix_max_error": error})
    edge_cases = [
        ("empty", PauliSentence(), PauliSentence({PauliWord({0: "X"}): 1.0})),
        ("identity", PauliSentence({PauliWord({}): 3.0}), PauliSentence({PauliWord({0: "Y"}): 1.0})),
        ("different-labels", PauliSentence({PauliWord({"a": "X", 17: "Y"}): 1j}),
         PauliSentence({PauliWord({17: "Z", "b": "X"}): -0.25})),
        ("tiny-nonzero", PauliSentence({PauliWord({0: "X"}): 1e-20}), PauliSentence({PauliWord({0: "Y"}): 1.0})),
        ("cancellation", PauliSentence({PauliWord({0: "X"}): 1.0, PauliWord({0: "Z"}): 1.0}),
         PauliSentence({PauliWord({0: "X"}): 1.0, PauliWord({0: "Z"}): 1.0})),
    ]
    for name, left, right in edge_cases:
        wires = tuple(dict.fromkeys(w for sentence in (left, right) for word in sentence for w in word))
        result = compare(canonical(rust_commutator(left, right), wires), canonical(left.commutator(right), wires), atol=0, rtol=1e-14)
        assert result["passed"], (name, result)
        checks.append({"id": name, **result})
    # Force bit 63 to participate, including idle wires in the explicit encoding.
    from pauli_rust import Operator
    top = Operator([(1 << 63, 0, 1.0, 0.0)]).commutator(Operator([(1 << 63, 1 << 63, 1.0, 0.0)])).rows()
    assert top == [(0, 1 << 63, 0.0, 2.0)], top
    checks.append({"id": "bit-63", "passed": True})
    left64 = PauliSentence({PauliWord({i: "Z"}): 1.0 for i in range(63)})
    left64[PauliWord({63: "X"})] = 1.0
    right64 = PauliSentence({PauliWord({63: "Y"}): 1.0})
    assert canonical(rust_commutator(left64, right64), tuple(range(64))) == {(0, 1 << 63): 2j}
    checks.append({"id": "64-wire-adapter-roundtrip", "passed": True})
    invalid = [("65-wires", lambda: rust_commutator(PauliSentence({PauliWord({i: "X"}): 1.0 for i in range(65)}), PauliSentence())),
               ("nonfinite-real", lambda: rust_commutator(PauliSentence({PauliWord({0: "X"}): float("nan")}), PauliSentence())),
               ("nonfinite-imag", lambda: Operator([(0, 0, 0.0, float("inf"))])),
               ("broadcast-array", lambda: encode(PauliSentence({PauliWord({0: "X"}): np.array([1.0, 2.0])}), (0,))),
               ("autograd-tensor", lambda: encode(PauliSentence({PauliWord({0: "X"}): qml.numpy.array(1.0, requires_grad=True)}), (0,))),
               ("overflow-result", lambda: rust_commutator(PauliSentence({PauliWord({0: "X"}): 1e308}), PauliSentence({PauliWord({0: "Y"}): 1e308}))),
               ("large-integer", lambda: encode(PauliSentence({PauliWord({0: "X"}): 2**53 + 1}), (0,)))]
    for name, call in invalid:
        try:
            call()
        except (ValueError, TypeError):
            checks.append({"id": name, "passed": True, "expected_rejection": True})
        else:
            raise AssertionError(f"failed to reject {name}")
    assert not compare({(1, 0): complex("nan")}, {(1, 0): 1.0})["passed"]
    checks.append({"id": "comparison-rejects-nan", "passed": True})
    report = {"status": "passed", "pennylane": qml.__version__, "checks": checks,
              "exhaustive_word_pairs": exhaustive, "random_complex_pairs": 40,
              "worst_independent_matrix_error": worst,
              "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
              "scientific_acceptance": "not_evaluated_by_central_Acceptance_Builder"}
    (ROOT / "results/validation.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps({key: value for key, value in report.items() if key != "checks"}))

if __name__ == "__main__":
    main()
