"""PennyLane default.qubit state and analytic Autograd derivatives."""
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[4] / "src/lib"))
from science_bridge import execute
from sdk_differentiable import check_representation, format_result


def compute(value):
    import pennylane as qml
    from pennylane import numpy as pnp
    import numpy as np
    check_representation(value)
    trainable = {index: column for column, index in enumerate(value["trainableGateIndices"])}
    parameters = pnp.array([value["gates"][i]["angle"] for i in value["trainableGateIndices"]], dtype=float, requires_grad=True)
    device = qml.device("default.qubit", wires=value["numQubits"], shots=None)
    names = {"CX": "CNOT", "X": "PauliX", "Y": "PauliY", "Z": "PauliZ", "H": "Hadamard"}

    def apply_circuit(params):
        for index, item in enumerate(value["gates"]):
            operation = getattr(qml, names.get(item["gate"], item["gate"]))
            if item["gate"] in ["RX", "RY", "RZ"]:
                angle = params[trainable[index]] if index in trainable else item["angle"]
                operation(angle, wires=item["targets"])
            else:
                operation(wires=item["targets"])

    @qml.qnode(device, interface="autograd", diff_method="backprop")
    def state_circuit(params):
        apply_circuit(params)
        return qml.state()

    @qml.qnode(device, interface="autograd", diff_method="backprop")
    def measured_circuit(params):
        apply_circuit(params)
        measurements = []
        for word in value["observables"]:
            factors = [getattr(qml, letter)(wire) for wire, letter in enumerate(word) if letter != "I"]
            observable = qml.prod(*factors) if factors else qml.Identity(0)
            measurements.append(qml.expval(observable))
        return tuple(measurements)

    def expectations(params):
        return pnp.stack(measured_circuit(params))

    means = expectations(parameters)
    jacobian = qml.jacobian(expectations)(parameters) if trainable else np.empty((len(means), 0))
    return format_result(value, state_circuit(parameters), means, jacobian,
                         "default.qubit (CPU)", "PennyLane Autograd backpropagation")


if __name__ == "__main__":
    execute(compute)
