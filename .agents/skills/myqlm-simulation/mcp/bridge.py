"""Explicit PyLinalg keeps user QPU configuration out of this local action."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[4] / "src/lib"))
from science_bridge import execute


def compute(v):
    import numpy as np
    from qat.lang import AQASM
    from qat.qpus import PyLinalg

    program = AQASM.Program()
    qubits = program.qalloc(v["numQubits"])
    for gate in v["gates"]:
        operation = AQASM.Z.ctrl() if gate["gate"] == "CZ" else getattr(AQASM, "CNOT" if gate["gate"] == "CX" else gate["gate"])
        if "angle" in gate:
            operation = operation(gate["angle"])
        program.apply(operation, *[qubits[q] for q in gate["targets"]])
    result = PyLinalg().submit(program.to_circ().to_job(nbshots=0, amp_threshold=0))
    vector = np.zeros(2 ** v["numQubits"], dtype=complex)
    for sample in result:
        vector[sample.state.int] = sample.amplitude
    return {
        "numQubits": v["numQubits"], "bitOrder": "leftmost bit is qubit 0", "backend": "myQLM PyLinalg",
        "probabilities": (np.abs(vector) ** 2).tolist(),
        "amplitudes": [{"real": float(a.real), "imag": float(a.imag)} for a in vector],
        "norm": float(np.vdot(vector, vector).real),
    }, [
        "Exact noiseless state-vector computation up to floating-point error; memory and output grow exponentially with qubit count.",
        "PyLinalg is selected explicitly: no QPU discovery, server access, cloud submission or analog/annealing backend.",
        "myQLM is a separately installed dependency governed by the vendor's EULA; the integration does not redistribute it.",
    ]


if __name__ == "__main__":
    execute(compute)
