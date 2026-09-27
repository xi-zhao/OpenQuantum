"""Rigetti's in-process NumPy simulator; no QVM/quilc service is contacted."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[4] / "src/lib"))
from science_bridge import execute


def compute(v):
    import numpy as np
    from pyquil import Program
    from pyquil import gates
    from pyquil.simulation import NumpyWavefunctionSimulator

    n = v["numQubits"]
    max_qubits = (int(np.iinfo(np.intp).max) // np.dtype(np.complex128).itemsize).bit_length() - 1
    if n > max_qubits:
        raise ValueError("State vector exceeds the backend's addressable array representation")
    program = Program()
    for item in v["gates"]:
        constructor = getattr(gates, "CNOT" if item["gate"] == "CX" else item["gate"])
        args = ([item["angle"]] if "angle" in item else []) + item["targets"]
        program += constructor(*args)
    simulator = NumpyWavefunctionSimulator(n)
    simulator.do_program(program)
    # pyQuil's NumPy tensor axis i is qubit i; C-order flattening puts q0 leftmost.
    state = np.asarray(simulator.wf).reshape(-1)
    if not np.isfinite(state).all():
        raise ValueError("pyQuil returned nonfinite amplitudes")
    probabilities = np.abs(state)**2
    return {
        "numQubits": n,
        "outcomes": [{"bits": format(i, f"0{n}b"), "probability": float(probabilities[i]),
                      "amplitude": [float(a.real), float(a.imag)]} for i, a in enumerate(state)],
        "normError": abs(float(probabilities.sum()) - 1), "backend": "pyquil.simulation.NumpyWavefunctionSimulator",
        "program": program.out(), "bitOrder": "leftmost bit is qubit 0",
    }, [
        "All-zero input and ideal unitary gates only; no noise, measurements, classical control or calibrated Rigetti device model.",
        "Uses Rigetti's local NumPy wavefunction simulator, not the separate QVM server, quilc compiler, QCS cloud or QPU.",
        "Amplitudes and probabilities are raw numerical state-vector values, without clipping or normalization, not finite-shot counts.",
        "Full state-vector memory grows as 2^N. Caller chooses circuit size and execution resources; no scientific acceptance is declared.",
    ]


if __name__ == "__main__":
    execute(compute)
