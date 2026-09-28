"""Amazon Braket's local state-vector device, never AwsDevice."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[4] / "src/lib"))
from science_bridge import execute
from sdk_expansion_circuits import check_statevector_representation, statevector_result, UNITARY_LIMITATIONS


def compute(v):
    n = v["numQubits"]
    check_statevector_representation(n)
    from braket.circuits import Circuit
    from braket.devices import LocalSimulator
    circuit = Circuit()
    # Explicit identities retain idle qubits and their canonical ascending order.
    for q in range(n):
        circuit.i(q)
    for item in v["gates"]:
        method = "cnot" if item["gate"] == "CX" else item["gate"].lower()
        args = item["targets"] + ([item["angle"]] if "angle" in item else [])
        getattr(circuit, method)(*args)
    circuit.state_vector()
    state = LocalSimulator("braket_sv").run(circuit, shots=0).result().values[0]
    return statevector_result(state, n, "Amazon Braket LocalSimulator braket_sv"), UNITARY_LIMITATIONS


if __name__ == "__main__":
    execute(compute)
