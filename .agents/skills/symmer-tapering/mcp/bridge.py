import sys
from pathlib import Path
from importlib.metadata import version
sys.path.insert(0, str(Path(__file__).resolve().parents[4] / "src/lib"))
from science_bridge import execute, json_integer
from science_reference import reference_plan
from math import fsum
from quantum_reference import pauli_matrix


def compute(v):
    import numpy as np
    from symmer.operators import PauliwordOp, IndependentOp
    from symmer.projection import S3Projection
    if version("symmer") != "0.0.13":
        raise ValueError("Unexpected Symmer version; restore the frozen environment")
    n = v["numQubits"]
    terms = {term["pauli"]: term["coefficient"] for term in v["terms"]}
    stabilizers = IndependentOp.from_list([s["pauli"] for s in v["symmetries"]])
    stabilizers.target_sqp = "Z"
    projector_tool = S3Projection(stabilizers)
    reduced_n = n - len(v["symmetries"])
    contributions = {}
    # S3Projection's cleanup drops tiny coefficients. Project unit Pauli terms
    # separately so its numerical cleanup cannot silently erase input terms.
    for word, coefficient in terms.items():
        if coefficient == 0:
            continue
        reduced = projector_tool.perform_projection(PauliwordOp.from_dictionary({word: 1.0}), sector=[s["sector"] for s in v["symmetries"]])
        if reduced.n_qubits != reduced_n:
            raise ValueError("Symmer returned an unexpected reduced width")
        mapped = reduced.to_dictionary
        if len(mapped) != 1:
            raise ValueError("A commuting unit Pauli must project to one signed unit Pauli")
        for output_word, factor in mapped.items():
            factor = complex(factor)
            if abs(factor.imag) > 1e-9 or abs(abs(factor.real) - 1) > 1e-9:
                raise ValueError("Unexpected non-unit Pauli projection factor")
            contributions.setdefault(output_word, []).append(coefficient * (1 if factor.real > 0 else -1))
    rows = [{"pauli": word, "coefficient": fsum(values)} for word, values in sorted(contributions.items())]
    rows = [row for row in rows if row["coefficient"] != 0] or [{"pauli": "I" * reduced_n, "coefficient": 0.0}]
    reference_info = reference_plan(v["referenceMode"], n <= 6,
        "Independent dense projection and full spectrum of the selected symmetry sector",
        "Automatic dense reference is omitted above 6 qubits; required attempts it at any size.")
    reference = spectrum = error = projector_error = None
    if reference_info["status"] == "computed":
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
        projector_error = float(np.max(abs(projector @ projector - projector)))
    return {"reducedQubits": reduced_n, "sectorDimension": json_integer(2 ** reduced_n), "reducedTerms": rows,
        "reference": reference_info, "reducedSpectrum": spectrum.tolist() if spectrum is not None else None, "referenceSectorSpectrum": reference.tolist() if reference is not None else None, "maxSpectrumError": error,
        "projectorIdempotenceError": projector_error,
        "bitOrder": "left-to-right tensor factors; reduced qubits use Symmer's transformed basis"}, [
        "Each supplied symmetry is a +Pauli word with an explicitly chosen ±1 eigenvalue; all generators must be independent and commute with H and each other.",
        "This uses Symmer's S3Projection tapering primitive on the supplied stabilizers, not automatic symmetry discovery or contextual-subspace VQE.",
        "The spectrum is preserved only within the specified sector; the global ground state can lie in a different sector. Reduced Pauli axes are transformed coordinates.",
        "Dense sector comparison is a calculation check for this input, not central scientific acceptance."]


execute(compute)
