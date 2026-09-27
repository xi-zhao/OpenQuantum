"""Official IonQ serializer only. No IonQProvider, account or cloud requests."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[4] / "src/lib"))
from science_bridge import execute


def compute(v):
    from qiskit import QuantumCircuit, qasm2
    from qiskit_ionq.helpers import qiskit_circ_to_ionq_circ

    circuit = QuantumCircuit(v["numQubits"], v["numQubits"], name="openquantum_ionq")
    for item in v["gates"]:
        args = ([item["angle"]] if item["gate"].startswith("R") else []) + item["targets"]
        getattr(circuit, item["gate"].lower())(*args)
    circuit.measure(range(v["numQubits"]), range(v["numQubits"]))
    instructions, measured, mapping = qiskit_circ_to_ionq_circ(circuit, gateset="qis")
    return {
        "numQubits": circuit.num_qubits, "gateset": "qis", "instructions": instructions,
        "measurementCount": measured, "classicalToQubit": mapping, "qasm": qasm2.dumps(circuit),
        "networkUsed": False,
        "interpretation": "instruction indices are input qubit indices; classicalToQubit[c] is the qubit measured into classical bit c",
    }, [
        "Official SDK QIS instruction conversion is local program preparation; it does not perform IonQ's remote hardware-aware native compiler passes.",
        "Terminal measurements map every input qubit to the same-index classical bit. No shots, device calibration or hardware results are generated.",
        "Cloud access remains in the existing optional hardware connection; this Tool does not receive credentials or submit jobs.",
    ]


if __name__ == "__main__":
    execute(compute)
