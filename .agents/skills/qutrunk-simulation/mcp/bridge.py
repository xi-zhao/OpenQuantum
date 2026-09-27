"""QuTrunk explicit local backend; never select a backend from user environment."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[4] / "src/lib"))
from science_bridge import execute


def compute(v):
    import numpy as np
    from qutrunk.backends import BackendLocal
    from qutrunk.circuit import QCircuit
    from qutrunk.circuit import gates

    n = v["numQubits"]
    max_qubits = (int(np.iinfo(np.intp).max) // np.dtype(np.complex128).itemsize).bit_length() - 1
    if n > max_qubits:
        raise ValueError("State vector exceeds the backend's addressable array representation")
    circuit = QCircuit(backend=BackendLocal(run_mode="local"), name="openquantum")
    qubits = circuit.allocate(n)
    for item in v["gates"]:
        name = {"CX": "CNOT", "RX": "Rx", "RY": "Ry", "RZ": "Rz"}.get(item["gate"], item["gate"])
        gate = getattr(gates, name)
        if "angle" in item:
            gate = gate(item["angle"])
        targets = tuple(qubits[i] for i in item["targets"])
        gate * (targets if len(targets) > 1 else targets[0])
    state = circuit.get_statevector()
    if not np.isfinite(state).all():
        raise ValueError("QuTrunk returned nonfinite amplitudes")
    probabilities = np.abs(state)**2
    # QuTrunk integer state indices have q0 least significant.
    outcomes = [{"bits": format(i, f"0{n}b")[::-1], "probability": float(probabilities[i]),
                 "amplitude": [float(a.real), float(a.imag)]} for i, a in enumerate(state)]
    outcomes.sort(key=lambda row: row["bits"])
    program = 'OPENQASM 2.0;\ninclude "qelib1.inc";\n' + f"qreg q[{n}];\n" + "\n".join(command.qasm() + ";" for command in circuit.cmds)
    return {
        "numQubits": n, "outcomes": outcomes, "normError": abs(float(probabilities.sum()) - 1),
        "backend": "QuTrunk BackendLocal", "program": program, "bitOrder": "leftmost bit is qubit 0",
    }, [
        "All-zero input and ideal unitary gates only; no noise, mid-circuit measurement, classical control or hardware calibration.",
        "BackendLocal(run_mode='local') is selected explicitly; QuSAAS, GPU/MPI and environment-selected remote backends are not used.",
        "Amplitudes and probabilities are raw numerical state-vector values, without clipping or normalization, not finite-shot counts.",
        "QuTrunk 0.2.2 requires Python 3.10. Full state-vector memory grows as 2^N; no scientific acceptance is declared.",
    ]


if __name__ == "__main__":
    execute(compute)
