"""Small dense reference calculations, independent of the adapted quantum SDKs.

Tensor factors and statevector bits are ordered q0, q1, ... from left to right.
"""
import numpy as np
from science_bridge import tensor_product

PAULIS = {
    "I": np.eye(2, dtype=complex),
    "X": np.array([[0, 1], [1, 0]], complex),
    "Y": np.array([[0, -1j], [1j, 0]], complex),
    "Z": np.diag([1, -1]).astype(complex),
}


def pauli_matrix(word):
    return tensor_product([PAULIS[p] for p in word])


def circuit_unitary(n, gates):
    dimension = 2 ** n
    result = np.eye(dimension, dtype=complex)
    for instruction in gates:
        gate, targets = instruction["gate"], instruction["targets"]
        if gate in ["CX", "CZ", "SWAP"]:
            a, b = targets
            operator = np.zeros((dimension, dimension), complex)
            for column in range(dimension):
                first = (column >> (n - 1 - a)) & 1
                second = (column >> (n - 1 - b)) & 1
                row = column
                if gate == "CX" and first:
                    row ^= 1 << (n - 1 - b)
                if gate == "SWAP" and first != second:
                    row ^= (1 << (n - 1 - a)) | (1 << (n - 1 - b))
                operator[row, column] = -1 if gate == "CZ" and first and second else 1
        else:
            if gate in PAULIS:
                local = PAULIS[gate]
            elif gate == "H":
                local = (PAULIS["X"] + PAULIS["Z"]) / np.sqrt(2)
            elif gate in ["S", "T"]:
                local = np.diag([1, np.exp(1j * np.pi / (2 if gate == "S" else 4))])
            elif gate in ["RX", "RY", "RZ"]:
                angle = instruction["angle"]
                local = np.cos(angle / 2) * PAULIS["I"] - 1j * np.sin(angle / 2) * PAULIS[gate[-1]]
            else:
                raise ValueError(f"Unsupported reference gate: {gate}")
            operator = tensor_product([local if q == targets[0] else PAULIS["I"] for q in range(n)])
        result = operator @ result
    return result


def complex_pairs(vector):
    return [[float(z.real), float(z.imag)] for z in np.asarray(vector).reshape(-1)]
