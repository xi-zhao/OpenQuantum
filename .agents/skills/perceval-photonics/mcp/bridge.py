"""Real local Perceval SLOS, with no cloud/provider construction."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[4] / "src/lib"))
from science_bridge import execute


def compute(v):
    import numpy as np
    import perceval as pcvl
    from perceval.backends import SLOSBackend
    from perceval.utils import allstate_iterator
    circuit = pcvl.Circuit(len(v["inputOccupation"]))
    for op in v["operations"]:
        component = pcvl.BS.H(theta=op["angleRad"]) if op["gate"] == "BS" else pcvl.PS(op["angleRad"])
        if op["gate"] == "PS":
            circuit.add(op["modes"][0], component)
        else:
            # Circuit.add requires consecutive ports. Route the ordered user
            # modes to ports 0,1 with real SDK permutations and undo afterwards.
            order = op["modes"] + [i for i in range(circuit.m) if i not in op["modes"]]
            permutation = [order.index(i) for i in range(circuit.m)]
            circuit.add(0, pcvl.PERM(permutation))
            circuit.add(0, component)
            circuit.add(0, pcvl.PERM(order))
    initial = pcvl.BasicState(v["inputOccupation"])
    backend = SLOSBackend()
    backend.set_circuit(circuit)
    backend.set_input_state(initial)
    # prob_distribution uses BSDistribution's small-probability pruning. Enumerate
    # the public state iterator instead and keep every raw probability, even zero.
    outcomes = [{"occupation": list(state), "probability": float(abs(backend.prob_amplitude(state))**2)}
                for state in allstate_iterator(initial)]
    outcomes.sort(key=lambda row: row["occupation"])
    matrix = np.asarray(circuit.compute_unitary(), dtype=complex)
    if not np.isfinite(matrix).all() or not all(np.isfinite(row["probability"]) for row in outcomes):
        raise ValueError("Perceval returned nonfinite numerical results")
    return {
        "modeCount": len(v["inputOccupation"]), "photonCount": sum(v["inputOccupation"]),
        "totalProbability": sum(row["probability"] for row in outcomes), "outcomes": outcomes,
        "unitary": np.stack((matrix.real, matrix.imag), axis=-1).tolist(),
        "backend": "Perceval SLOSBackend", "modeOrder": "occupation[i] and unitary row/column i refer to input mode i",
    }, [
        "Lossless passive BS/PS circuit with perfectly indistinguishable photons, fixed Fock input and exact numerical probabilities; no source/detector noise, loss, postselection or finite-shot sampling.",
        "BS.H(theta) uses [[cos(theta/2),sin(theta/2)],[sin(theta/2),-cos(theta/2)]], and PS(phi) multiplies its mode by exp(i*phi). All angles are radians.",
        "Every Fock output at the conserved photon count is returned without adapter pruning or normalization. Fock space grows combinatorially; caller chooses scale and execution resources.",
        "A successful numerical run does not imply scientific acceptance or measured hardware performance.",
    ]


if __name__ == "__main__":
    execute(compute)
