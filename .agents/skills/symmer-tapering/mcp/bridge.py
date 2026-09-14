import sys
from pathlib import Path
from importlib.metadata import version
sys.path.insert(0, str(Path(__file__).resolve().parents[4] / "src/lib"))
from science_bridge import execute
from quantum_reference import pauli_matrix


def compute(v):
    import numpy as np
    from symmer.operators import PauliwordOp, IndependentOp
    from symmer.projection import S3Projection
    if version("symmer") != "0.0.13":
        raise ValueError("Unexpected Symmer version; restore the frozen environment")
    n = v["numQubits"]
    terms = {term["pauli"]: term["coefficient"] for term in v["terms"]}
    operator = PauliwordOp.from_dictionary(terms)
    stabilizers = IndependentOp.from_list([s["pauli"] for s in v["symmetries"]])
    stabilizers.target_sqp = "Z"
    reduced = S3Projection(stabilizers).perform_projection(operator, sector=[s["sector"] for s in v["symmetries"]])
    reduced_n = n - len(v["symmetries"])
    if reduced.n_qubits != reduced_n:
        raise ValueError("Symmer returned an unexpected reduced width")
    rows = []
    for word, coefficient in sorted(reduced.to_dictionary.items()):
        if abs(complex(coefficient).imag) > 1e-9:
            raise ValueError("Reduced Hamiltonian has a non-real Pauli coefficient")
        rows.append({"pauli": word, "coefficient": float(complex(coefficient).real)})
    if not rows:
        rows = [{"pauli": "I" * reduced_n, "coefficient": 0.0}]
    hamiltonian = sum((coefficient * pauli_matrix(word) for word, coefficient in terms.items()), np.zeros((2 ** n, 2 ** n), complex))
    projector = np.eye(2 ** n, dtype=complex)
    for symmetry in v["symmetries"]:
        matrix = pauli_matrix(symmetry["pauli"])
        projector = projector @ ((np.eye(2 ** n) + symmetry["sector"] * matrix) / 2)
    eigenvalues, eigenvectors = np.linalg.eigh(projector)
    basis = eigenvectors[:, eigenvalues > 0.5]
    if basis.shape[1] != 2 ** reduced_n:
        raise ValueError("Symmetry sector has an unexpected dimension")
    reference = np.linalg.eigvalsh(basis.conj().T @ hamiltonian @ basis)
    reduced_matrix = sum((row["coefficient"] * pauli_matrix(row["pauli"]) for row in rows), np.zeros((2 ** reduced_n, 2 ** reduced_n), complex))
    spectrum = np.linalg.eigvalsh(reduced_matrix)
    error = float(np.max(abs(reference - spectrum)))
    if error > 1e-8:
        raise ValueError(f"Symmer spectrum disagrees with the selected-sector reference: {error}")
    return {"reducedQubits": reduced_n, "sectorDimension": int(basis.shape[1]), "reducedTerms": rows,
        "reducedSpectrum": spectrum.tolist(), "referenceSectorSpectrum": reference.tolist(), "maxSpectrumError": error,
        "projectorIdempotenceError": float(np.max(abs(projector @ projector - projector))),
        "bitOrder": "left-to-right tensor factors; reduced qubits use Symmer's transformed basis"}, [
        "Each supplied symmetry is a +Pauli word with an explicitly chosen ±1 eigenvalue; all generators must be independent and commute with H and each other.",
        "This uses Symmer's S3Projection tapering primitive on the supplied stabilizers, not automatic symmetry discovery or contextual-subspace VQE.",
        "The spectrum is preserved only within the specified sector; the global ground state can lie in a different sector. Reduced Pauli axes are transformed coordinates.",
        "Dense sector comparison is a calculation check for this input, not central scientific acceptance."]


execute(compute)
