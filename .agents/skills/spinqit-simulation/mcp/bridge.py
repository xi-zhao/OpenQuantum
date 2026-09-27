"""SpinQit's native compiler and basic simulator, without cloud or NMR execution."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[4] / "src/lib"))
from science_bridge import execute


def compute(v):
    import ctypes
    import platform
    import sysconfig
    import numpy as np

    # The upstream macOS wheel uses a Linux-style $ORIGIN rpath. Load its bundled
    # dependency explicitly; no binary modification or external library search.
    if sys.platform == "darwin":
        arch = "arm_64" if platform.machine() == "arm64" else "x86_64"
        library = Path(sysconfig.get_path("purelib")) / "spinqit" / f"libSpinQInterface_darwin_{arch}.dylib"
        if not library.is_file():
            raise ValueError("SpinQit wheel is missing its bundled macOS interface library")
        ctypes.CDLL(str(library), mode=ctypes.RTLD_GLOBAL)
    import spinqit as sq

    n = v["numQubits"]
    max_qubits = (int(np.iinfo(np.intp).max) // np.dtype(np.complex128).itemsize).bit_length() - 1
    if n > max_qubits:
        raise ValueError("State vector exceeds the backend's addressable array representation")
    circuit = sq.Circuit()
    qubits = circuit.allocateQubits(n)
    for item in v["gates"]:
        name = {"RX": "Rx", "RY": "Ry", "RZ": "Rz"}.get(item["gate"], item["gate"])
        gate = getattr(sq, name)
        targets = tuple(qubits[i] for i in item["targets"])
        instruction = (gate, targets if len(targets) > 1 else targets[0])
        if "angle" in item:
            instruction += (item["angle"],)
        circuit << instruction
    program = "\n".join(str(instruction) for instruction in circuit.instructions)
    executable = sq.get_compiler("native").compile(circuit, 0)
    output = sq.get_basic_simulator().execute(executable, sq.BasicSimulatorConfig())
    state = np.asarray(output.states, dtype=complex)
    if len(state) != 2**n or not np.isfinite(state).all():
        raise ValueError("SpinQit returned invalid state-vector amplitudes")
    probabilities = np.abs(state)**2
    return {
        "numQubits": n,
        "outcomes": [{"bits": format(i, f"0{n}b"), "probability": float(probabilities[i]),
                      "amplitude": [float(a.real), float(a.imag)]} for i, a in enumerate(state)],
        "normError": abs(float(probabilities.sum()) - 1), "backend": "SpinQit basic simulator",
        "program": program, "bitOrder": "leftmost bit is qubit 0",
    }, [
        "All-zero input and ideal unitary gates only; no noise, measurements, classical control or SpinQ hardware calibration.",
        "Uses the native compiler at optimization level 0 and the basic local simulator; no cloud or NMR operation is invoked.",
        "Probabilities are calculated from the SDK's raw amplitudes without clipping or normalization. SDK rounded counts are not returned as shot measurements.",
        "SpinQit 0.2.4 uses Python 3.10. Its macOS wheel's bundled interface library is preloaded to resolve an upstream rpath issue; the library is not modified.",
        "Full state-vector memory grows as 2^N. Caller chooses size and execution resources; no scientific acceptance is declared.",
    ]


if __name__ == "__main__":
    execute(compute)
