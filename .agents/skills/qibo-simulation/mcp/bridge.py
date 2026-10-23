"""Qibo NumPy CPU simulation, without automatic backend selection."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[4] / "src/lib"))
from science_bridge import execute
from sdk_expansion_circuits import check_statevector_representation, statevector_result, UNITARY_LIMITATIONS


def compute(v):
    n = v["numQubits"]
    check_statevector_representation(n)
    from qibo import Circuit, gates
    from qibo.backends import NumpyBackend
    backend = NumpyBackend()
    if backend.dtype != "complex128":
        raise ValueError("Expected the pinned NumPy backend complex128 representation")
    circuit = Circuit(n)
    for item in v["gates"]:
        constructor = getattr(gates, "CNOT" if item["gate"] == "CX" else item["gate"])
        kwargs = {"theta": item["angle"]} if "angle" in item else {}
        circuit.add(constructor(*item["targets"], **kwargs))
    state = backend.execute_circuit(circuit).state()
    return statevector_result(state, n, "Qibo NumPy complex128"), UNITARY_LIMITATIONS


if __name__ == "__main__":
    execute(compute)
