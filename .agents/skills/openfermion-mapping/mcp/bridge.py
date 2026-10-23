"""Fermionic operator algebra only: no database queries or arbitrary source."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[4] / "src/lib"))
from science_bridge import execute


def compute(v):
    from openfermion import FermionOperator, jordan_wigner, bravyi_kitaev

    fermion = FermionOperator()
    for term in v["terms"]:
        operators = tuple((op["mode"], int(op["action"] == "create")) for op in term["operators"])
        coefficient = complex(term["coefficient"]["real"], term["coefficient"]["imag"])
        fermion += FermionOperator(operators, coefficient)
    qubit = jordan_wigner(fermion) if v["mapping"] == "jordan_wigner" else bravyi_kitaev(fermion, n_qubits=v["numModes"])
    terms = []
    for factors, coefficient in sorted(qubit.terms.items()):
        if coefficient == 0:
            continue
        letters = ["I"] * v["numModes"]
        for index, pauli in factors:
            letters[index] = pauli
        terms.append({"pauli": "".join(letters), "coefficient": {"real": float(coefficient.real), "imag": float(coefficient.imag)}})
    residual = sum(2 * abs(t["coefficient"]["imag"]) for t in terms)
    return {
        "numQubits": v["numModes"], "mapping": v["mapping"], "terms": terms,
        "coefficientL1Norm": float(sum(abs(complex(t["coefficient"]["real"], t["coefficient"]["imag"])) for t in terms)),
        "hermitian": residual == 0, "hermiticityResidualL1": float(residual),
        "pauliConvention": "leftmost letter is qubit 0; Bravyi-Kitaev changes occupation encoding",
    }, [
        "Operator products use the supplied left-to-right order; the rightmost ladder operator acts first on a ket.",
        "Jordan-Wigner uses occupation encoding. Bravyi-Kitaev uses a parity-transformed basis; equal raw matrix entries are not expected across encodings.",
        "Hermiticity is exact in the returned floating-point Pauli coefficients, with hermiticityResidualL1 reporting the coefficient L1 norm of A minus its adjoint. No tolerance-based scientific acceptance is inferred.",
        "No molecular integrals, electronic-structure calculation or dense matrix is constructed.",
    ]


if __name__ == "__main__":
    execute(compute)
