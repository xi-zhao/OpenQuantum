"""Local DDSIM sampling, without automatic dense state-vector materialization."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[4] / "src/lib"))
from science_bridge import execute


def make_circuit(v):
    from qiskit import QuantumCircuit
    circuit = QuantumCircuit(v["numQubits"])
    for gate in v["gates"]:
        args = ([gate["angle"]] if "angle" in gate else []) + gate["targets"]
        getattr(circuit, gate["gate"].lower())(*args)
    return circuit


def compute(v):
    from mqt.ddsim import DDSIMProvider

    circuit = make_circuit(v)
    circuit.measure_all()
    name = "statevector_simulator" if v["includeStatevector"] else "qasm_simulator"
    backend = DDSIMProvider().get_backend(name)
    result = backend.run(circuit, shots=v["shots"], seed_simulator=v["seed"], approximation_step_fidelity=1.0, approximation_steps=1).result()
    if not result.success:
        raise RuntimeError("DDSIM did not complete the local simulation")
    vector = None
    if v["includeStatevector"]:
        vector = [{"real": float(a.real), "imag": float(a.imag)} for a in result.get_statevector()]
    counts = [{"bitstring": bits.replace(" ", ""), "count": int(n)} for bits, n in sorted(result.get_counts().items())]
    return {
        "numQubits": v["numQubits"], "shots": v["shots"], "seed": v["seed"], "counts": counts,
        "statevector": vector, "backend": "MQT DDSIM exact decision-diagram circuit simulator",
        "bitOrder": "q[n-1]...q[0]; statevector index is the bitstring's binary value",
    }, [
        "Noiseless floating-point circuit simulation with DDSIM approximation fidelity fixed to 1; sampled frequencies have finite-shot uncertainty.",
        "Decision diagrams can still require exponential memory on unstructured circuits. Dense statevector output is only constructed when explicitly requested.",
        "The optional state vector is the coherent state before terminal sampling; no mid-circuit measurement, noise channel or hardware execution is modeled.",
    ]


if __name__ == "__main__":
    execute(compute)
