"""DeepQuantum state-vector simulation with explicit PyTorch trainable angles."""
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[4] / "src/lib"))
from science_bridge import execute
from sdk_differentiable import check_representation, format_result


def compute(value):
    import torch
    import deepquantum as dq
    import numpy as np
    check_representation(value)
    torch.set_default_dtype(torch.float64)
    if value.get("execution", {}).get("threads") is not None:
        torch.set_num_threads(value["execution"]["threads"])
    trainable = {index: column for column, index in enumerate(value["trainableGateIndices"])}
    parameters = torch.tensor([value["gates"][i]["angle"] for i in value["trainableGateIndices"]],
                              dtype=torch.float64, requires_grad=bool(trainable))
    circuit = dq.QubitCircuit(value["numQubits"])
    for index, item in enumerate(value["gates"]):
        name, targets = item["gate"], item["targets"]
        operation = getattr(circuit, "cnot" if name == "CX" else name.lower())
        if name in ["RX", "RY", "RZ"]:
            angle = parameters[trainable[index]] if index in trainable else torch.tensor(item["angle"], dtype=torch.float64)
            operation(targets[0], inputs=angle)
        elif name == "SWAP":
            operation(targets)
        else:
            operation(*targets)
    for word in value["observables"]:
        wires = [wire for wire, letter in enumerate(word) if letter != "I"]
        basis = "".join(letter.lower() for letter in word if letter != "I") or "z"
        circuit.observable(wires, basis=basis)
    circuit = circuit.to(torch.float64).cpu()
    state = circuit()
    means = circuit.expectation().reshape(-1)
    rows = []
    for mean in means:
        if trainable and mean.requires_grad:
            gradient, = torch.autograd.grad(mean, parameters, retain_graph=True, allow_unused=True)
            rows.append(np.zeros(len(trainable)) if gradient is None else gradient.detach().cpu().numpy())
        else:
            rows.append(np.zeros(len(trainable)))
    result, limitations = format_result(value, state.detach().cpu().numpy(), means.detach().cpu().numpy(), rows,
                                       "QubitCircuit state vector (CPU)", "PyTorch reverse-mode autodifferentiation")
    limitations.append("DeepQuantum constructs some fixed gate constants, including H, at complex64 precision before promotion; numerical norm drift is returned unchanged.")
    limitations.append("This action exposes differentiable qubit circuits; DeepQuantum photonic, Gaussian, Fock, MPS and distributed APIs are outside this tool contract.")
    return result, limitations


if __name__ == "__main__":
    execute(compute)
