import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[4] / "src/lib"))
from science_bridge import execute
from science_reference import reference_plan
from candidate_science import hea_state, pauli_action, dense_hamiltonian


def compute(v):
    import numpy as np
    from qarp.algorithms import VQD
    from qarp.blocks import HEABlock
    from qarp.operators import QubitOperator
    from qarp.optimizers import ScipyOptimizer
    from qarp.engines import QarpEngine
    class RecordingOptimizer(ScipyOptimizer):
        def __init__(self):
            super().__init__("BFGS", {"maxiter": v["maxIterations"], "gtol": 1e-8})
            self.records = []
        def minimize(self, *args, **kwargs):
            result = super().minimize(*args, **kwargs)
            self.records.append({"success": bool(result.success), "message": str(result.message),
                "iterations": int(result.nit), "evaluations": int(result.nfev)})
            return result
    n = v["numQubits"]
    operator = QubitOperator()
    for term in v["terms"]:
        operator += QubitOperator(" ".join(f"{p}{q}" for q,p in enumerate(term["pauli"]) if p != "I"), term["coefficient"])
    kets = [HEABlock(n, v["layers"], real=False, linear=True, circular=False, use_cz=False).build() for _ in range(v["states"])]
    rng = np.random.default_rng(v["seed"])
    initial = [{symbol: float(rng.uniform(-np.pi, np.pi)) for symbol in sorted(ket.symbols, key=str)} for ket in kets]
    # Strictly exceeds the conservative spectral width, including the zero operator case.
    width = 2*sum(abs(t["coefficient"]) for t in v["terms"] if any(p != "I" for p in t["pauli"]))
    penalty = float(np.nextafter(width + max(1., width*0.01), np.inf))
    opt = RecordingOptimizer()
    solver = VQD(operator, kets, [penalty]*(v["states"]-1), initial_parameters=initial,
        optimizer=opt, engine=QarpEngine(seed=v["seed"]), gradient=True, verbose=False).build()
    energies, _ = solver.run()
    parameters = [{str(k): float(p) for k,p in record.items()} for record in solver.optimal_parameters]
    vectors = [hea_state(n, v["layers"], record) for record in parameters]
    action = [pauli_action(vector, v["terms"]) for vector in vectors]
    independent = [float(np.vdot(state, hstate).real) for state,hstate in zip(vectors, action)]
    variances = [float(np.linalg.norm(hstate - energy*state)**2) for state,hstate,energy in zip(vectors, action, independent)]
    reference = reference_plan(v["referenceMode"], n <= 10, "Independent NumPy Pauli eigenspectrum",
        "Auto dense diagonalization selects up to 10 qubits; required requests the larger reference at caller cost.")
    exact = errors = None
    if reference["status"] == "computed":
        exact = np.linalg.eigvalsh(dense_hamiltonian(n, v["terms"]))[:v["states"]].tolist()
        errors = [a-b for a,b in zip(independent,exact)]
    energies = np.real(energies).tolist()
    return {"energies": energies, "recomputedEnergies": independent, "residualVariances": variances,
        "overlaps": (np.abs(np.asarray(vectors).conj() @ np.asarray(vectors).T)**2).tolist(),
        "normErrors": [float(abs(np.vdot(state,state)-1)) for state in vectors],
        "maxEnergyConsistencyError": float(max(abs(a-b) for a,b in zip(energies,independent))),
        "penalty": penalty, "parameters": [[{"name": k, "value": p} for k,p in sorted(record.items())] for record in parameters],
        "optimizer": opt.records, "reference": reference, "exactEnergies": exact, "energyErrors": errors,
        "ansatz": "RY then RZ on each qubit, then linear CX per layer; q0 is least significant bit",
        "units": "input Hamiltonian energy units; residual variance in squared units"}, [
        "VQD is a local variational optimization; optimizer success, small variance and correct excited-state ordering are distinct observations.",
        "Energies stay in deflation order; nonorthogonality, duplicate states and nonconvergence are reported without sorting or concealing them.",
        "The fixed complex ansatz can still have insufficient expressivity. Matrix-free independent state/Pauli checks use exponential statevector memory.",
        "No hardware, cloud service or quantum advantage claim is involved; numerical diagnostics are not final scientific acceptance."]


execute(compute)
