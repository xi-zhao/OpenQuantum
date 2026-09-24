"""MIT adaptation of UnitaryLab Trotter/qDrift sequences using open dependencies.

See ../NOTICE, ../LICENSE and ../source.json. No UnitaryLab runtime is imported.
The circuit and the independent dense reference use separate Pauli constructions.
"""
import hashlib
import json
import math
import sys
from collections import Counter

import numpy as np
from qiskit import QuantumCircuit, qasm3
from qiskit.quantum_info import Operator, Statevector
from scipy.linalg import expm


def suzuki(terms, order, scale):
    """Yield one time slice; adapted from TrotterAlgorithm._recurse/_expand."""
    if order == 1:
        for word, coefficient in terms:
            yield word, coefficient * scale
    elif order == 2:
        for word, coefficient in terms[:-1]:
            yield word, coefficient * scale / 2
        yield terms[-1][0], terms[-1][1] * scale
        for word, coefficient in reversed(terms[:-1]):
            yield word, coefficient * scale / 2
    else:
        reduction = 1 / (4 - 4 ** (1 / (order - 1)))
        for factor in (reduction, reduction, 1 - 4 * reduction, reduction, reduction):
            yield from suzuki(terms, order - 2, scale * factor)


def pauli_rotation(circuit, word, angle):
    """Append exp(-i angle P); word[0] denotes Qiskit wire q[0]."""
    support = [q for q, letter in enumerate(word) if letter != "I"]
    for q in support:
        if word[q] == "X":
            circuit.h(q)
        elif word[q] == "Y":
            circuit.sdg(q)
            circuit.h(q)
    for a, b in zip(support, support[1:]):
        circuit.cx(a, b)
    circuit.rz(2 * angle, support[-1])
    for a, b in reversed(list(zip(support, support[1:]))):
        circuit.cx(a, b)
    for q in support:
        if word[q] == "X":
            circuit.h(q)
        elif word[q] == "Y":
            circuit.h(q)
            circuit.s(q)


def reverse_bits(value, n):
    # The public statevector has q0 as its most significant bit; Qiskit uses q0 LSB.
    return np.asarray(value).reshape([2] * n).transpose(tuple(reversed(range(n)))).reshape(-1)


def dense_hamiltonian(n, terms, identity):
    """Independent NumPy Kronecker construction, not Qiskit Pauli matrices."""
    paulis = {
        "I": np.eye(2, dtype=complex),
        "X": np.array([[0, 1], [1, 0]], complex),
        "Y": np.array([[0, -1j], [1j, 0]], complex),
        "Z": np.diag([1, -1]).astype(complex),
    }
    matrix = identity * np.eye(2 ** n, dtype=complex)
    for word, coefficient in terms:
        operator = np.ones((1, 1), complex)
        for letter in word:
            operator = np.kron(operator, paulis[letter])
        matrix += coefficient * operator
    return matrix


def simulate(v):
    n, steps, time = v["numQubits"], v["steps"], v["time"]
    # Combine duplicates without sorting: deterministic Trotter order follows first appearance.
    grouped = {}
    for item in v["terms"]:
        grouped.setdefault(item["pauli"], []).append(item["coefficient"])
    combined = {word: math.fsum(values) for word, values in grouped.items()}
    identity = combined.pop("I" * n, 0.0)
    terms = [(word, coefficient) for word, coefficient in combined.items() if coefficient != 0]
    lam = math.fsum(abs(coefficient) for _, coefficient in terms)
    circuit = QuantumCircuit(n)
    circuit.global_phase = -identity * time
    counts = Counter()
    sequence_digest = hashlib.sha256()
    rotations = 0
    if terms and time != 0:
        if v["method"] == "trotter":
            def sequence():
                for _ in range(steps):
                    yield from suzuki(terms, v["order"], time / steps)
        else:
            # Adapt QDriftAlgorithm._expand, with a local seeded generator and signed time.
            probabilities = np.array([abs(c) / lam for _, c in terms])
            generator = np.random.Generator(np.random.PCG64(v["seed"]))

            def sequence():
                for _ in range(steps):
                    index = int(generator.choice(len(terms), p=probabilities))
                    counts[index] += 1
                    word, coefficient = terms[index]
                    yield word, math.copysign(1, coefficient) * lam * (time / steps)
        for word, angle in sequence():
            if not math.isfinite(2 * angle):
                raise ValueError("Pauli rotation angle overflows floating-point representation")
            pauli_rotation(circuit, word, angle)
            sequence_digest.update(json.dumps([word, angle], separators=(",", ":")).encode() + b"\n")
            rotations += 1

    state, state_norm = None, None
    if v["outputMode"] == "statevector":
        initial = v["initialState"]
        if isinstance(initial, str):
            vector = np.zeros(2 ** n, complex)
            vector[0] = 1
            if initial == "plus":
                vector[:] = 1 / np.sqrt(2 ** n)
        else:
            vector = np.array([complex(*pair) for pair in initial])
        evolved = Statevector(reverse_bits(vector, n)).evolve(circuit).data
        ordered = reverse_bits(evolved, n)
        state = [[float(z.real), float(z.imag)] for z in ordered]
        state_norm = float(np.vdot(ordered, ordered).real)

    mode = v["referenceMode"]
    computed = mode == "required" or (mode == "auto" and n <= 6)
    frobenius, spectral = None, None
    if computed:
        exact = expm(-1j * time * dense_hamiltonian(n, terms, identity))
        # Convert both row and column bit order before comparing; retain global phase.
        bit_order = np.arange(2 ** n).reshape([2] * n).transpose(tuple(reversed(range(n)))).reshape(-1)
        approximate = Operator(circuit).data[np.ix_(bit_order, bit_order)]
        difference = approximate - exact
        frobenius = float(np.linalg.norm(difference, "fro"))
        spectral = float(np.linalg.norm(difference, 2))
    # Qiskit 2.5.2's QASM 3 exporter omits QuantumCircuit.global_phase.
    # Export a zero-phase copy and append the exact global phase explicitly.
    export_circuit = circuit.copy()
    export_circuit.global_phase = 0
    assembly = qasm3.dumps(export_circuit)
    assembly += f"gphase({float(circuit.global_phase):.17g});\n"
    return {
        "method": v["method"], "numQubits": n, "steps": steps,
        "order": v.get("order"), "seed": v.get("seed"),
        "terms": [{"pauli": p, "coefficient": c} for p, c in terms],
        "identityCoefficient": identity, "lambda": lam, "pauliRotations": rotations,
        "sampledTermCounts": [counts[i] for i in range(len(terms))] if v["method"] == "qdrift" else [],
        "sequenceSha256": sequence_digest.hexdigest(),
        "openQasm3": assembly,
        "circuit": {
            "depth": circuit.depth(), "gates": circuit.size(),
            "twoQubitGates": sum(len(item.qubits) == 2 for item in circuit.data),
            "globalPhase": float(circuit.global_phase),
            "gateCounts": dict(circuit.count_ops()),
        },
        "statevector": state, "stateNorm": state_norm,
        "unitaryFrobeniusError": frobenius, "unitarySpectralError": spectral,
        "reference": {
            "mode": mode, "status": "computed" if computed else "not_run",
            "method": "independent NumPy Kronecker Hamiltonian and scipy.linalg.expm; full-unitary Frobenius and spectral norms",
            "reason": "Requested or auto reference (at most 6 qubits)" if computed else "Explicit skip or above auto reference size; required has no size cap",
        },
        "convention": "leftmost Pauli and statevector bit is q0; hbar=1; circuit implements exp(-iHt)",
        "interpretation": "deterministic product formula" if v["method"] == "trotter" else "one seeded random circuit; not an ensemble channel error or error guarantee",
    }


def main():
    request = json.load(sys.stdin)
    result = simulate(request["input"])
    output = {
        "schemaVersion": "1.0", **request, "result": result,
        "scientificValidation": "not_evaluated",
        "limitations": [
            "Classical noiseless circuit construction and optional statevector simulation; no hardware run or quantum speedup claim.",
            "Statevectors cost O(2^n); dense full-unitary references cost at least O(4^n). Circuit-only mode and referenceMode=skip avoid these allocations.",
            "Gate counts are in the emitted h/s/sdg/rz/cx basis, exclude initial-state preparation, and are not physical-device resources.",
            "qDrift reports one seeded circuit; its single-realization unitary error is not an ensemble channel bound and need not decrease monotonically with steps.",
            "Reference errors are numerical observations; no Scientific Validator, Acceptance Profile or final Acceptance is supplied.",
        ],
    }
    print(json.dumps(output, allow_nan=False, separators=(",", ":")))


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(f"{type(error).__name__}: {error}", file=sys.stderr)
        sys.exit(1)
