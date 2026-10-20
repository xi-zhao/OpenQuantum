"""Seeded cases frozen in plan.json before performance measurement."""
import numpy as np
from pennylane.pauli import PauliSentence, PauliWord


def random_sentence(rng, qubits, terms, weight=None, z_only=False, complex_coefficients=False):
    sentence = PauliSentence()
    while len(sentence) < terms:
        if weight is None:
            axes = rng.integers(0, 4, size=qubits)
            word = PauliWord({i: "IXYZ"[int(axis)] for i, axis in enumerate(axes) if axis})
        else:
            sites = sorted(rng.choice(qubits, size=weight, replace=False).tolist())
            word = PauliWord({i: "Z" if z_only else "XYZ"[int(rng.integers(3))] for i in sites})
        if word not in sentence:
            coefficient = float(rng.normal())
            if complex_coefficients:
                coefficient += 1j * float(rng.normal())
            sentence[word] = coefficient
    return sentence


def make_case(config, seed):
    rng = np.random.default_rng(seed)
    n = config["qubits"]
    kind = config["kind"]
    if kind == "one":
        return PauliSentence({PauliWord({0: "X"}): 1.0}), PauliSentence({PauliWord({0: "Y"}): 1.0})
    if kind == "local":
        left = PauliSentence()
        for i in range(n - 1):
            for axis, coefficient in zip("XYZ", [-1.1, 0.7, 1.3]):
                left[PauliWord({i: axis, i + 1: axis})] = coefficient
        for i in range(n):
            left[PauliWord({i: "Z"})] = 0.19 * (1 + i % 3)
        right = random_sentence(rng, n, config["right_terms"], weight=2)
        return left, right
    kwargs = {"weight": 3} if kind in ("sparse", "commuting") else {}
    if kind == "commuting":
        kwargs["z_only"] = True
    return (random_sentence(rng, n, config["left_terms"], **kwargs),
            random_sentence(rng, n, config["right_terms"], **kwargs))
