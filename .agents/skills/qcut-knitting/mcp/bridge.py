import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[4] / "src/lib"))
from science_bridge import execute
from science_reference import reference_plan
from candidate_science import qiskit_circuit, metrics


def compute(v):
    import QCut as ck
    from qiskit import QuantumCircuit, transpile
    from qiskit.quantum_info import Statevector, SparsePauliOp
    from qiskit_aer import AerSimulator
    class AuditedJob:
        def __init__(self, job, record): self.job, self.record = job, record
        def __getattr__(self, name): return getattr(self.job, name)
        def result(self, *args, **kwargs):
            result = self.job.result(*args, **kwargs)
            if not result.success: raise RuntimeError("Local Aer backend did not complete successfully")
            self.record.update(completedCircuits=len(result.results), actualShots=sum(item.shots for item in result.results))
            return result
    class AuditedAer(AerSimulator):
        def __init__(self):
            options = {"seed_simulator": v["seed"]}
            if "threads" in v["execution"]:
                options["max_parallel_threads"] = v["execution"]["threads"]
            super().__init__(**options)
            self.audit = []
        def run(self, circuits, **kwargs):
            circuits = circuits if isinstance(circuits, (list, tuple)) else [circuits]
            record = {"submittedCircuits": len(circuits)}
            self.audit.append(record)
            return AuditedJob(super().run(circuits, **kwargs), record)
    original = qiskit_circuit(v)
    options = ck.CutOptions(finder_cut_mode="gate", finder_num_partitions=v["partitions"],
        consolidate="never", joint_rotation_cuts=False, wire_cut_communication="never", expansion="exact", seed=v["seed"])
    if v["strategy"] == "automatic":
        # Fixed upstream finder sorts operands. Symmetric CZ removes that directional ambiguity.
        prepared = transpile(original, basis_gates=["u", "cz"], optimization_level=0, seed_transpiler=v["seed"])
        split = ck.find_cuts(prepared, options=options)
        preprocessing = "u,cz at Qiskit level 0; symmetric gate cuts only"
    else:
        prepared = original
        marked = QuantumCircuit(v["numQubits"])
        cuts = set(v["gateCuts"])
        for i, instruction in enumerate(original.data):
            qubits = [original.find_bit(q).index for q in instruction.qubits]
            if i in cuts: marked.append(**ck.cutGate(instruction.operation, *qubits))
            else: marked.append(instruction.operation, qubits)
        split = ck.get_locations_and_subcircuits(marked, options=options)
        preprocessing = "explicit original gate indices and operand order"
    if not split.cut_locations:
        raise ValueError("Partitioner selected no cuts; provide explicit two-qubit gateCuts or use an uncut simulator")
    # Qiskit/QCut write q0 at the right; the public contract writes it at the left.
    labels = [label[::-1] for label in v["observables"]]
    backend = AuditedAer()
    experiment = ck.get_experiment_circuits(split, labels)
    experiment = ck.transpile_circuits(experiment, backend, optimization_level=0, transpile_options={"seed_transpiler": v["seed"]})
    raw = ck.run_experiments(experiment, shots=v["shots"], backend=backend, max_batch_size=v["maxBatchSize"])
    estimates = ck.estimate_expectation_values(raw).tolist()
    reference = reference_plan(v["referenceMode"], v["numQubits"] <= 16,
        "Independent uncut Qiskit statevector Pauli expectations",
        "Auto statevector reference selects up to 16 qubits; required requests the larger reference at caller cost.")
    exact = error = None
    if reference["status"] == "computed":
        state = Statevector.from_instruction(original)
        exact = [float(state.expectation_value(SparsePauliOp(p)).real) for p in labels]
        error = float(max(abs(a-b) for a,b in zip(estimates,exact)))
    return {"estimates": estimates, "exactExpectations": exact, "maxAbsoluteError": error, "reference": reference,
        "gamma": float(split.gamma), "theoreticalSamplingOverhead": float(split.gamma**2), "cutCount": len(split.cut_locations),
        "subcircuitWidths": list(split.num_qubits), "generatedCircuits": int(experiment.num_circuits),
        "original": metrics(original), "prepared": metrics(prepared), "preprocessing": preprocessing,
        "executionCost": {"jobs": len(backend.audit), **{key: sum(row[key] for row in backend.audit) for key in ("submittedCircuits", "completedCircuits", "actualShots")}},
        "expansion": "exact QPD; finite-shot Aer execution; no wire communication or consolidation", "observableConvention": "leftmost Pauli is q0"}, [
        "Gate cutting only. Automatic partitioning uses symmetric CZ normalization to avoid the fixed upstream finder's directional-operand bug; normalization can increase cutting cost.",
        "Exact QPD expansion is still reconstructed from finite shots. Estimates can lie outside [-1,1] and are deliberately not clipped.",
        "Gamma squared is a theoretical sampling-overhead factor, not measured acceleration, total shots or a statistical confidence interval.",
        "Local Aer subexperiments support intermediate measurements. Backend actual shots are counted from completed results; no hardware jobs are submitted."]


execute(compute)
