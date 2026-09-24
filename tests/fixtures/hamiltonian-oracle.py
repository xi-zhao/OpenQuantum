"""Dense mathematical oracle: no Qiskit or imports of the adapted implementation."""
import json
import sys
import numpy as np
from scipy.linalg import expm

v = json.load(sys.stdin)
matrices = {
    "I": np.eye(2), "X": np.array([[0, 1], [1, 0]]),
    "Y": np.array([[0, -1j], [1j, 0]]), "Z": np.diag([1, -1]),
}
terms = []
for item in v["terms"]:
    p = np.ones((1, 1))
    for letter in item["pauli"]:
        p = np.kron(p, matrices[letter])
    terms.append((p, item["coefficient"]))
dimension = 2 ** v["numQubits"]
unitary = np.eye(dimension, dtype=complex)
if v["method"] == "qdrift":
    # The oracle test case has no identity or duplicate terms.
    lam = sum(abs(c) for _, c in terms)
    choices = np.random.Generator(np.random.PCG64(v["seed"])).choice(
        len(terms), size=v["steps"], p=[abs(c) / lam for _, c in terms])
    schedule = [(terms[i][0], np.sign(terms[i][1]) * lam * v["time"] / v["steps"]) for i in choices]
else:
    # Independent first/second-order symmetric product, including identity.
    order = v["order"]
    assert order in [1, 2]
    slice_terms = [(p, c * v["time"] / v["steps"] / order) for p, c in terms]
    schedule = (slice_terms if order == 1 else slice_terms + slice_terms[::-1]) * v["steps"]
for p, angle in schedule:
    unitary = expm(-1j * angle * p) @ unitary
initial = np.array([complex(*z) for z in v["initialState"]])
state = unitary @ initial
exact = expm(-1j * v["time"] * sum(c * p for p, c in terms))
print(json.dumps({
    "statevector": [[float(z.real), float(z.imag)] for z in state],
    "frobenius": float(np.linalg.norm(unitary - exact, "fro")),
    "spectral": float(np.linalg.norm(unitary - exact, 2)),
}))
