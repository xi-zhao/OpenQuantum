"""Deterministic local photonic inference with input-phase autograd."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[4] / "src/lib"))
from science_bridge import execute


def compute(v):
    import torch
    import numpy as np
    import perceval as pcvl
    from merlin import QuantumLayer, MeasurementStrategy, ComputationSpace

    circuit = pcvl.Circuit(v["numModes"])
    count = sum(operation["operation"] == "PS" for operation in v["operations"])
    width = len(str(count - 1))
    index = 0
    for operation in v["operations"]:
        if operation["operation"] == "BS":
            modes = operation["modes"]
            gate = pcvl.BS.Rx(theta=operation["theta"])
            if modes[1] == modes[0] + 1:
                circuit.add(tuple(modes), gate)
            else:
                # Perceval's Circuit.add requires consecutive ports. Embed the
                # SDK's BS matrix to preserve arbitrary logical mode indices.
                matrix = np.eye(v["numModes"], dtype=complex)
                matrix[np.ix_(modes, modes)] = np.asarray(gate.compute_unitary())
                circuit.add(0, pcvl.Unitary(pcvl.Matrix(matrix)))
        else:
            circuit.add(operation["modes"][0], pcvl.PS(pcvl.P(f"phi_{index:0{width}d}")))
            index += 1
    layer = QuantumLayer(circuit=circuit, input_state=v["occupation"], input_parameters=["phi"], trainable_parameters=[],
                         measurement_strategy=MeasurementStrategy.probs(ComputationSpace.FOCK), dtype=torch.float64, device=torch.device("cpu"))
    phases = torch.tensor(v["phases"], dtype=torch.float64, device="cpu", requires_grad=True)
    probabilities = layer(phases)
    basis = [list(key) for key in layer.output_keys]
    target = probabilities[:, basis.index(v["targetOccupation"])]
    gradients = torch.autograd.grad(target.sum(), phases)[0]
    return {
        "numModes": v["numModes"], "backend": "MerLin QuantumLayer CPU float64", "basis": basis,
        "probabilities": probabilities.detach().tolist(), "targetProbabilities": target.detach().tolist(),
        "phaseGradients": gradients.detach().tolist(), "probabilitySums": probabilities.sum(dim=-1).detach().tolist(),
        "phaseConvention": "radians in PS occurrence order; BS uses cos(theta/2) and i*sin(theta/2)",
    }, [
        "Noiseless lossless Fock simulation; all photons are indistinguishable and there is no postselection or finite-shot sampling.",
        "Gradients differentiate the selected output probability with respect to phase-shifter angles, not a trained model's accuracy or hardware performance.",
        "Uses CPU float64 tensors. Cost grows combinatorially with photon and mode counts; no training loop, arbitrary model code, GPU or cloud execution is exposed.",
    ]


if __name__ == "__main__":
    execute(compute)
