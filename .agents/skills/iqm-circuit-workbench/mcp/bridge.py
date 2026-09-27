"""IQM target compilation/validation and seeded local Aer simulation."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[4] / "src/lib"))
from science_bridge import execute


def compute(v):
    from qiskit import QuantumCircuit, transpile
    from qiskit_aer import AerSimulator
    from iqm.qiskit_iqm.fake_backends import IQMFakeAdonis, IQMFakeApollo, IQMFakeAphrodite
    from iqm.qiskit_iqm.iqm_circuit_validation import validate_circuit
    backend = {"adonis": IQMFakeAdonis, "apollo": IQMFakeApollo, "aphrodite": IQMFakeAphrodite}[v["backend"]]()
    if v["numQubits"] > backend.num_qubits:
        raise ValueError(f"Selected IQM device has {backend.num_qubits} physical qubits")
    circuit = QuantumCircuit(v["numQubits"], v["numQubits"])
    for op in v["operations"]:
        args = [op["angleRad"], *op["qubits"]] if op["gate"] in {"rx", "ry", "rz"} else op["qubits"]
        getattr(circuit, op["gate"])(*args)
    circuit.measure(range(v["numQubits"]), range(v["numQubits"]))
    compiled = transpile(circuit, backend, seed_transpiler=v["seed"], optimization_level=v["optimizationLevel"])
    validate_circuit(compiled, backend)
    # IQMFakeBackend.run in 35.0.3 ignores seed_simulator. Use its actual target
    # and noise model with Aer explicitly so the advertised seed is honored.
    simulator = AerSimulator(noise_model=backend.noise_model if v["simulationMode"] == "device-noise" else None)
    counts = simulator.run(compiled, shots=v["shots"], seed_simulator=v["seed"]).result().get_counts()
    return {
        "numQubits": v["numQubits"], "shots": v["shots"],
        "counts": sorted([{"bits": bits.replace(" ", "")[::-1], "count": int(count)} for bits, count in counts.items()], key=lambda row: row["bits"]),
        "nativeGateNames": sorted(backend.operation_names),
        "compiledGateCounts": [{"gate": gate, "count": int(count)} for gate, count in sorted(compiled.count_ops().items())],
        "bitOrder": "leftmost bit is input qubit 0", "backendName": backend.name, "deviceQubits": backend.num_qubits,
        "couplingMap": [list(edge) for edge in backend.coupling_map.get_edges()], "simulationMode": v["simulationMode"],
        "sdkCircuitValidation": "passed", "simulator": "Qiskit AerSimulator",
    }, [
        "IQM SDK fake-device topology, native-gate target and static noise profile are local models, not live calibrations or QPU results.",
        "Compilation and native-circuit validation use iqm-client. Execution uses Qiskit Aer explicitly to honor seed_simulator; IQMFakeBackend.run does not forward that option in the pinned version.",
        "Counts are finite-shot samples in the original logical classical-bit order; different package/platform versions can change compilation or random streams.",
        "Selected physical device capacity constrains numQubits. Caller controls shots and execution resources; SDK validation is not scientific acceptance.",
    ]


if __name__ == "__main__":
    execute(compute)
