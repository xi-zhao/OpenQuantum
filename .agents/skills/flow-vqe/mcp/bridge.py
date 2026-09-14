import hashlib
import json
import sys
import tempfile
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT.parents[2] / "src/lib"))
from science_bridge import execute, tensor_product
from science_reference import reference_plan


def compute(v):
    import numpy as np
    import torch
    torch.manual_seed(v["seed"])
    np.random.seed(v["seed"])
    # Import only the pinned upstream training module, without its CLI/dataset dependencies.
    upstream = ROOT / "upstream"
    provenance = json.loads((upstream / "provenance.json").read_text())
    for filename, record in provenance["files"].items():
        if hashlib.sha256((upstream / filename).read_bytes()).hexdigest() != record["sha256"]:
            raise ValueError("Flow-VQE upstream source digest mismatch")
    sys.path.insert(0, str(ROOT)); sys.path.insert(0, str(upstream))
    from upstream.flow_training import train_single_distance_models
    n = v["numQubits"]
    from core.statevector import PauliObjective
    objective = PauliObjective(n, v["layers"], v["terms"])
    reference = reference_plan(v["referenceMode"], n <= 10, "Independent dense Pauli diagonalization", "Automatic dense reference is omitted above 10 qubits; required attempts it at the requested size.")
    h = exact = None
    if reference["status"] == "computed":
        paulis = {"I": np.eye(2), "X": np.array([[0,1],[1,0]]),
            "Y": np.array([[0,-1j],[1j,0]]), "Z": np.diag([1,-1])}
        h = sum(term["coefficient"] * tensor_product([paulis[p] for p in term["pauli"]]) for term in v["terms"])
        exact = float(np.linalg.eigvalsh(h)[0])
    dimension = n * (v["layers"] + 1)
    def state(parameters):
        p = parameters.detach().cpu().numpy() if isinstance(parameters, torch.Tensor) else parameters
        return objective.state(p)
    def energy(parameters):
        return objective.expectation(state(parameters))
    coeffs = torch.tensor([term["coefficient"] for term in v["terms"]], dtype=torch.float32)
    # The pinned trainer reads the ground energy only for diagnostic error fields.
    # NaN marks unavailable internal diagnostics; they are never returned as observations.
    # Only internal temporary checkpoint files are written; no pickle/model input is accepted.
    with tempfile.TemporaryDirectory(prefix="openquantum-flow-vqe-") as workspace:
        _, histories, best_params, best_energies = train_single_distance_models(
            {0.: h}, {0.: coeffs}, {0.: energy}, {0.: exact if exact is not None else float("nan")}, [0.], torch.device("cpu"), workspace,
            param_dim=dimension, n_epochs=v["epochs"], batch_size=v["batchSize"], buffer_size=v["batchSize"],
            lr=1e-3, n_flows=2, flow_hidden_dim=16, components=4, prior_std=1., training_noise=0.01,
            num_coeffs=len(v["terms"]))
    parameters = best_params[0.].detach().numpy()
    recomputed = energy(parameters)
    count = v["epochs"] * v["batchSize"]
    baseline = np.random.default_rng(v["seed"]).uniform(-np.pi, np.pi, size=(count, dimension))
    vector = state(parameters)
    return {"bestEnergy": float(best_energies[0.]), "recomputedEnergy": recomputed,
        "exactGroundEnergy": exact, "error": recomputed-exact if exact is not None else None, "reference": reference,
        "randomSearchBestEnergy": min(energy(p) for p in baseline), "evaluationsPerMethod": count,
        "bestParameters": parameters.tolist(), "energyHistory": [float(row["best_energy"]) for row in histories[0.]],
        "normError": float(abs(np.vdot(vector,vector)-1)),
        "ansatz": "zero state; RY on every site, then layers of nearest-neighbor CNOT and RY; leftmost Pauli is q0",
        "units": "same energy units as input coefficients"}, [
        "Upstream single-context training is used with a small local RY/CNOT objective, not the paper's molecular dataset or pretrained model.",
        "The ansatz has real amplitudes and need not express the exact ground state of an arbitrary Pauli Hamiltonian.",
        "The equal-evaluation random baseline is uniform on [-pi,pi]; no optimizer-speedup or cross-molecule generalization is established.",
        "Upstream training stores float32 sampled energies; recomputedEnergy is the local float64 expectation."]


execute(compute)
