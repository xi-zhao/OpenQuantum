"""Independent sector projection and eigenspectra; imports no Tool or Symmer code."""
import json
import sys
import numpy as np

value = json.load(sys.stdin)
request, reduced = value["request"], value["reducedTerms"]
n = request["numQubits"]
if not 1 <= n <= 6 or len(request["terms"]) > 256:
    raise ValueError("Independent dense sector audit requires n<=6 and <=256 terms")
matrices = {"I": np.eye(2, dtype=complex), "X": np.array([[0, 1], [1, 0]], complex),
            "Y": np.array([[0, -1j], [1j, 0]], complex), "Z": np.diag([1, -1]).astype(complex)}

def pauli(word):
    out = np.ones((1, 1), complex)
    for letter in word:
        out = np.kron(out, matrices[letter])
    return out

def operator(terms, width):
    out = np.zeros((2 ** width, 2 ** width), complex)
    for row in terms:
        if len(row["pauli"]) != width or not np.isfinite(row["coefficient"]):
            raise ValueError("Invalid real Pauli operator")
        out += row["coefficient"] * pauli(row["pauli"])
    return out

H = operator(request["terms"], n)
P = np.eye(2 ** n, dtype=complex)
for row in request["symmetries"]:
    P = P @ (np.eye(2 ** n) + row["sector"] * pauli(row["pauli"])) / 2
values, vectors = np.linalg.eigh(P)
basis = vectors[:, values > 0.5]
k = len(request["symmetries"])
if basis.shape[1] != 2 ** (n - k):
    raise ValueError("Invalid projected sector dimension")
sector = np.linalg.eigvalsh(basis.conj().T @ H @ basis)
spectrum = np.linalg.eigvalsh(operator(reduced, n - k))
print(json.dumps({"request": request, "reducedTerms": reduced, "sectorSpectrum": sector.tolist(),
                  "spectrum": spectrum.tolist(), "projectorError": float(np.max(np.abs(P @ P - P)))}, allow_nan=False))
