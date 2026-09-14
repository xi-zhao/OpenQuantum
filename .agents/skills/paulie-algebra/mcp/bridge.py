import sys
from pathlib import Path
from importlib.metadata import version
sys.path.insert(0, str(Path(__file__).resolve().parents[4] / "src/lib"))
from science_bridge import execute, json_integer
from science_reference import reference_plan
from quantum_reference import pauli_matrix


def compute(v):
    import numpy as np
    from paulie import get_pauli_string
    if version("paulie") != "0.2.3":
        raise ValueError("Unexpected PauLie version; restore the frozen environment")
    n = v["numQubits"]
    collection = get_pauli_string(v["generators"])
    dimension = int(collection.get_dla_dim())
    classification = collection.get_algebra()
    reference = reference_plan(v["referenceMode"], n <= 4,
        "Independent real dense commutator span and dimension",
        "Automatic dense reference is omitted above 4 qubits; required attempts it at any size.")
    enumerate_closure = v["closureMode"] == "full" or (v["closureMode"] == "auto" and dimension <= 4096)
    closure = None
    if enumerate_closure:
        generators = [get_pauli_string(word) for word in v["generators"]]
        words = {str(p): p for p in generators}
        queue = list(generators)
        for current in queue:
            for generator in generators:
                if not current.commutes_with(generator):
                    product = current @ generator
                    word = str(product)
                    if word not in words:
                        words[word] = product
                        queue.append(product)
        closure = sorted(words)
        if len(closure) != dimension:
            raise ValueError("PauLie classification dimension disagrees with its explicit Pauli closure")
    reference_dimension = span_error = None
    if reference["status"] == "computed":
        matrices = [1j * pauli_matrix(word) for word in v["generators"]]
        basis_matrices, basis_vectors = [], []

        def residual(matrix):
            vector = np.concatenate([matrix.real.ravel(), matrix.imag.ravel()])
            if basis_vectors:
                basis = np.asarray(basis_vectors)
                for _ in range(2):
                    vector -= (basis @ vector) @ basis
            return vector

        def add(matrix):
            vector = residual(matrix)
            norm = np.linalg.norm(vector)
            if norm > 1e-10:
                vector /= norm
                half = vector.size // 2
                basis_vectors.append(vector)
                basis_matrices.append((vector[:half] + 1j * vector[half:]).reshape(2 ** n, 2 ** n))

        for matrix in matrices:
            add(matrix)
        for current in basis_matrices:
            for generator in matrices:
                add(generator @ current - current @ generator)
        span_error = max(float(np.linalg.norm(residual(1j * pauli_matrix(word)))) for word in (closure if closure is not None else v["generators"]))
        reference_dimension = len(basis_matrices)
        if dimension != reference_dimension or span_error > 1e-8:
            raise ValueError("PauLie classification disagrees with the independent dense Lie span")
    return {
        "dimension": json_integer(dimension), "referenceDimension": json_integer(reference_dimension) if reference_dimension is not None else None,
        "classification": classification, "fullSpecialUnitaryDimension": json_integer(4 ** n - 1),
        "generatesFullSpecialUnitary": dimension == 4 ** n - 1, "reference": reference,
        "closure": closure if enumerate_closure else None, "closureStatus": "computed" if enumerate_closure else "not_run",
        "maxSpanResidual": span_error, "spanResidualTarget": ("closure" if enumerate_closure else "generators") if reference_dimension is not None else None, "bitOrder": "left-to-right q0,q1,...",
    }, [
        "Each supplied Pauli generator has an independent real control coefficient; identity/global phase generators are excluded.",
        "Classification may use isomorphic names. Closure enumeration and independent dense checking have separate execution states.",
        "Integers above the exact JSON number range are decimal strings. They are not rounded floating-point dimensions.",
        "Lie-algebra classification does not establish finite-depth ansatz performance, pulse reachability, hardware controllability or central scientific acceptance.",
    ]


execute(compute)
