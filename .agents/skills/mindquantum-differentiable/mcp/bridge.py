"""MindQuantum mqvector state and adjoint expectation gradient."""
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[4] / "src/lib"))
from science_bridge import execute
from sdk_differentiable import check_representation, format_result


def compute(value):
    import numpy as np
    from mindquantum.core import gates
    from mindquantum.core.circuit import Circuit
    from mindquantum.core.operators import Hamiltonian, QubitOperator
    from mindquantum.simulator import Simulator
    check_representation(value)
    trainable = set(value["trainableGateIndices"])
    values = {f"angle_{i}": value["gates"][i]["angle"] for i in trainable}
    circuit = Circuit()
    for index, item in enumerate(value["gates"]):
        name, targets = item["gate"], item["targets"]
        if name in ["CX", "CZ"]:
            circuit += getattr(gates, name[1]).on(targets[1], targets[0])
        elif name in ["RX", "RY", "RZ"]:
            angle = f"angle_{index}" if index in trainable else item["angle"]
            circuit += getattr(gates, name)(angle).on(targets[0])
        else:
            circuit += getattr(gates, name).on(targets if name == "SWAP" else targets[0])
    observables = [Hamiltonian(QubitOperator(" ".join(f"{letter}{wire}" for wire, letter in enumerate(word) if letter != "I")))
                   for word in value["observables"]]
    simulator = Simulator("mqvector", value["numQubits"])
    if trainable:
        gradients = simulator.get_expectation_with_grad(observables, circuit)
        means, all_columns = gradients(np.array([values[name] for name in circuit.params_name], dtype=np.float64))
        columns = [circuit.params_name.index(f"angle_{index}") for index in value["trainableGateIndices"]]
        jacobian = np.real(all_columns[0][:, columns])
        means = np.real(means[0])
    simulator.apply_circuit(circuit, values)
    if not trainable:
        means = [float(np.real(simulator.get_expectation(observable))) for observable in observables]
        jacobian = np.empty((len(means), 0))
    # MindQuantum uses q0 as the least significant bit. Transpose tensor axes to
    # the public q0-first order, without changing SDK amplitudes or probabilities.
    n = value["numQubits"]
    state = np.asarray(simulator.get_qs()).reshape([2] * n).transpose(tuple(reversed(range(n)))).reshape(-1)
    return format_result(value, state, means, jacobian,
                         "mqvector CPU complex128", "MindQuantum adjoint expectation gradient")


if __name__ == "__main__":
    execute(compute)
