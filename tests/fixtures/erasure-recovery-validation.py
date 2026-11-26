"""Independent dense replay for the fixed five-qubit example. Takes its result.json."""
from collections import Counter
from functools import reduce
import json
from pathlib import Path
import sys

import numpy as np


I = np.eye(2)
X = np.array([[0, 1], [1, 0]])
Z = np.diag([1, -1])
Y = 1j * X @ Z
H = (X + Z) / np.sqrt(2)
S = np.diag([1, 1j])
PAULI = dict(I=I, X=X, Y=Y, Z=Z)
ZERO, ONE = (I + Z) / 2, (I - Z) / 2
PHI = np.array([1, 0, 0, 1]) / np.sqrt(2)
BELL = np.outer(PHI, PHI)
TOL = 1e-12


def tensor(operators):
    return reduce(np.kron, operators)


def word(letters):
    return tensor(PAULI[letter] for letter in letters)


def apply(matrix, state):
    return matrix @ state @ matrix.conj().T


def reduced(state, keep):
    n = state.shape[0].bit_length() - 1
    order = [*keep, *(site for site in range(n) if site not in keep)]
    axes = [*order, *(n + site for site in order)]
    dim, rest = 2 ** len(keep), 2 ** (n - len(keep))
    return state.reshape([2] * (2 * n)).transpose(axes).reshape(dim, rest, dim, rest).trace(axis1=1, axis2=3)


def encoded_bell(choi):
    zero = np.eye(32)[:, 0]
    for generator in ("XZZXI", "IXZZX", "XIXZZ", "ZXIXZ"):
        zero = (zero + word(generator) @ zero) / 2
    zero /= np.linalg.norm(zero)
    ket = np.concatenate((zero, word("XXXXX") @ zero)) / np.sqrt(2)
    for signed in choi:
        np.testing.assert_allclose(word(signed[1:]) @ ket, (-1 if signed[0] == "-" else 1) * ket, rtol=0, atol=TOL)
    return np.outer(ket, ket.conj())


def verify_cuts(initial):
    survivors = reduced(initial, (0, 2, 3, 4))  # dense axes for R, 1, 2, 3
    rotate = H @ S.conj().T
    smolin = apply(tensor((Y, rotate, I, rotate)), survivors)
    mixture = np.zeros((16, 16), complex)
    for pauli in PAULI.values():
        pair = apply(np.kron(I, pauli), BELL)
        mixture += np.kron(pair, pair) / 4
    errors = []
    for axes in ((0, 1, 2, 3), (0, 3, 1, 2)):
        error = float(np.max(np.abs(reduced(smolin, axes) - mixture)))
        assert error < TOL
        errors.append(error)
    return errors


def physical(site, operator):
    factors = [I] * 6
    factors[site + 1] = operator  # axis zero is the inaccessible reference
    return tensor(factors)


def reset(state, site):
    return apply(physical(site, ZERO), state) + apply(physical(site, X @ ONE), state)


def replay(case, initial, operations):
    erased = set(case["erased"])
    available = (set(range(5)) - erased) | set(case["relay_erased"])
    weights = {tuple(sorted((u, v))): weight for u, v, weight in case["hardware"] if {u, v} <= available}
    state = initial
    for site in sorted(erased):
        state = reset(state, site)
    branches = [({}, state)]
    charged = []
    for op in operations:
        gate, sites = op["gate"], op["sites"]
        assert set(sites) <= available
        site = sites[0]
        updated = []
        if gate == "CNOT":
            edge = tuple(sorted(sites))
            assert edge in weights
            charged.append(edge)
            unitary = physical(site, ZERO) + physical(site, ONE) @ physical(sites[1], X)
        for bits, rho in branches:
            if gate.startswith("MEASURE_"):
                for bit in (0, 1):
                    projector = (I + (-1) ** bit * PAULI[gate[-1]]) / 2
                    post = apply(physical(site, projector), rho)
                    if np.trace(post).real > TOL:
                        updated.append(({**bits, site: bit}, post))
                continue
            if gate == "RESET":
                rho = reset(rho, site)
            elif gate.startswith("CORRECT_"):
                if (op["offset"] + sum(bits[i] for i in op["parity"])) % 2:
                    rho = apply(physical(site, PAULI[gate[-1]]), rho)
            elif gate == "CNOT":
                rho = apply(unitary, rho)
            else:
                rho = apply(physical(site, {"H": H, "S": S}[gate]), rho)
            updated.append((bits, rho))
        branches = updated
    result = case["recovery"]
    assert Counter(charged) == Counter(tuple(sorted(edge)) for edge in result["join_edges"])
    assert sum(weights[edge] for edge in charged) == result["cost"]
    probabilities, errors = [], []
    for _, rho in branches:
        pair = reduced(rho, (0, case["output"] + 1))
        probability = float(np.trace(pair).real)
        probabilities.append(probability)
        errors.append(float(np.max(np.abs(pair / probability - BELL))))
    assert abs(sum(probabilities) - 1) < TOL
    return probabilities, errors


def main(path):
    payload = json.loads(path.read_text(encoding="utf-8"))
    cases = payload["cases"]
    initial = encoded_bell(payload["choi"])
    report = {"cutDecompositionMaxErrors": verify_cuts(initial), "numpy": np.__version__, "cases": {}}
    for name in ("line", "triangle", "fresh_relays"):
        case = cases[name]
        operations = case["recovery"]["operations"]
        probabilities, errors = replay(case, initial, operations)
        assert max(errors) < TOL
        report["cases"][name] = {"cost": case["recovery"]["cost"], "branches": len(errors),
                                 "probabilitySum": sum(probabilities), "maxBellEntryError": max(errors)}
    for name, required in (("line", {1: {(1, 2)}, 3: {(2, 3)}}),
                           ("triangle", {1: {(1, 2), (1, 3)}, 3: {(1, 3), (2, 3)}})):
        case = cases[name]
        assert set(case["erased"]) == {0, 4} and not case["relay_erased"] and case["output"] == 2
        edges = {(min(u, v), max(u, v)) for u, v, cost in case["hardware"] if not {u, v} & {0, 4}}
        assert all(cost == 1 for _, _, cost in case["hardware"])
        assert {site: {e for e in edges if site in e} for site in (1, 3)} == required
        lower = 1 if required[1] & required[3] else 2
        assert lower == case["recovery"]["cost"]
        report["cases"][name]["cutLowerBound"] = lower
    assert "connectivity" in cases["removed"]["no_recovery"]
    assert "representatives" in cases["uncorrectable"]["no_recovery"]
    assert cases["fresh_relays"]["recovery"]["cost"] == 4
    line = cases["line"]
    uncorrected = [op for op in line["recovery"]["operations"] if op["gate"] != "CORRECT_X"]
    _, errors = replay(line, initial, uncorrected)
    report["branchesFailingWithoutXCorrection"] = sum(value > TOL for value in errors)
    assert 0 < report["branchesFailingWithoutXCorrection"] < len(errors)
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main(Path(sys.argv[1]))
