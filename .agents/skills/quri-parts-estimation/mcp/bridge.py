"""Exact local QURI Parts estimation through its Qulacs backend."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[4] / "src/lib"))
from science_bridge import execute


def compute(v):
    from quri_parts.circuit import QuantumCircuit
    from quri_parts.core.operator import Operator, PAULI_IDENTITY, pauli_label
    from quri_parts.core.state import GeneralCircuitQuantumState
    from quri_parts.qulacs.estimator import create_qulacs_vector_estimator

    circuit = QuantumCircuit(v["numQubits"])
    for gate in v["gates"]:
        name = "CNOT" if gate["gate"] == "CX" else gate["gate"]
        args = gate["targets"] + ([gate["angle"]] if "angle" in gate else [])
        getattr(circuit, "add_" + name + "_gate")(*args)
    operator = Operator()
    for term in v["terms"]:
        letters = " ".join(f"{p}{i}" for i, p in enumerate(term["pauli"]) if p != "I")
        key = pauli_label(letters) if letters else PAULI_IDENTITY
        operator[key] = operator.get(key, 0) + term["coefficient"]
    state = GeneralCircuitQuantumState(v["numQubits"], circuit)
    estimate = create_qulacs_vector_estimator()(operator, state)
    return {
        "numQubits": v["numQubits"], "expectation": float(estimate.value.real),
        "imaginaryResidual": float(abs(estimate.value.imag)), "estimatorError": float(estimate.error),
        "backend": "QURI Parts Qulacs vector estimator", "pauliConvention": "leftmost letter is qubit 0",
    }, [
        "Exact noiseless state-vector expectation, subject to floating-point arithmetic and exponential memory growth.",
        "estimatorError=0 means no sampling uncertainty; it is not a bound on floating-point or physical-model error.",
        "Only the QURI Parts/Qulacs components are exposed, not the entire QURI Algo/VM stack or cloud backends.",
    ]


if __name__ == "__main__":
    execute(compute)
