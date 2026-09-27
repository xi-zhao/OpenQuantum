"""Alice & Bob local analytical cat-noise circuit models."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[4] / "src/lib"))
from science_bridge import execute


def compute(v):
    from qiskit import QuantumCircuit, transpile
    from qiskit_alice_bob_provider import AliceBobLocalProvider
    provider = AliceBobLocalProvider()
    parameters = {"kappa1Hz": 100, "kappa2Hz": 10000000, "averagePhotons": 16 if v["model"] == "physical" else 19, "distance": 0 if v["model"] == "physical" else 15}
    parameters.update(v["modelParameters"])
    options = {"n_qubits": v["numQubits"], "name": "OpenQuantumLocalCatModel"}
    if v["model"] == "logical-noiseless":
        backend = provider.build_logical_noiseless_backend(**options)
    else:
        options.update(kappa_1=parameters["kappa1Hz"], kappa_2=parameters["kappa2Hz"], average_nb_photons=parameters["averagePhotons"])
        if v["model"] == "physical":
            backend = provider.build_physical_backend(**options)
        else:
            backend = provider.build_logical_backend(distance=parameters["distance"], **options)
    circuit = QuantumCircuit(v["numQubits"], v["numQubits"])
    for qubit, state in enumerate(v["initialStates"]):
        circuit.initialize(state, qubit)
    for op in v["operations"]:
        args = [op["angleRad"], *op["qubits"]] if op["gate"] == "rz" else op["qubits"]
        getattr(circuit, op["gate"])(*args)
    circuit.measure(range(v["numQubits"]), range(v["numQubits"]))
    compiled = transpile(circuit, backend, seed_transpiler=v["seed"], optimization_level=1)
    counts = backend.run(compiled, shots=v["shots"], seed_simulator=v["seed"]).result().get_counts()
    return {
        "numQubits": v["numQubits"], "shots": v["shots"],
        "counts": sorted([{"bits": bits.replace(" ", "")[::-1], "count": int(count)} for bits, count in counts.items()], key=lambda row: row["bits"]),
        "nativeGateNames": sorted(backend.operation_names),
        "compiledGateCounts": [{"gate": gate, "count": int(count)} for gate, count in sorted(compiled.count_ops().items())],
        "bitOrder": "leftmost bit is input qubit 0", "backendName": backend.name, "model": v["model"],
        "resolvedModelParameters": parameters, "connectivity": "SDK all-to-all local model",
        "simulator": "AliceBobLocalProvider ProcessorSimulator",
    }, [
        "Digital circuit simulation uses Alice & Bob's analytical physical/logical cat error models and scheduled gate durations. It does not evolve a bosonic oscillator or establish hardware performance.",
        "Initial 0/1/+/- and measurement are in the encoded qubit basis; physical-cat supports x,z,rz,cx, while logical models expose discrete x,z,h,s,sdg,t,tdg,cx,ccx gates.",
        "This configurable local model uses SDK all-to-all connectivity and no arbitrary qubit cap. Noise-model validity constraints remain enforced; shots and execution resources are caller-controlled.",
        "The pinned provider requires its isolated Qiskit 1.x environment. Unsupported macOS CRY/RCCX/RCCCX gates are excluded. Counts and successful execution are not scientific acceptance.",
    ]


if __name__ == "__main__":
    execute(compute)
