import json
import numpy as np
import pennylane as qml
from catalyst import qjit, grad

device = qml.device("lightning.qubit", wires=2)
@qjit
@qml.qnode(device)
def program(angle):
    qml.RY(angle, wires=0)
    qml.CNOT(wires=[0, 1])
    return qml.expval(qml.PauliZ(0))

angle = 0.37
mean = float(program(angle))
derivative = float(grad(program)(angle))
assert np.isclose(mean, np.cos(angle), atol=1e-10)
assert np.isclose(derivative, -np.sin(angle), atol=1e-10)
with open("result.json", "w") as f:
    json.dump({"expectation": mean, "derivative": derivative, "scientificValidation": "not_evaluated"}, f)
