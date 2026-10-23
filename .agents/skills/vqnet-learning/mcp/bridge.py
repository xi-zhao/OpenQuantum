"""VQNet CPU statevector and automatic differentiation of circuit rotations."""
import importlib.util
import os
import sys
import sysconfig
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[4] / "src/lib"))
from science_bridge import execute


def prepare_macos_loader():
    # The 2.18.1 ARM wheel embeds a build-machine libpython path and a Linux
    # $ORIGIN rpath. Relaunch before reading stdin with paths derived solely
    # from the installed SDK and this Python. No wheel or host file is patched.
    if sys.platform != "darwin":
        return
    spec = importlib.util.find_spec("pyvqnet")
    if spec is None:
        return
    libraries = str(Path(spec.origin).parent / "libs") + os.pathsep + str(sysconfig.get_config_var("LIBDIR"))
    if os.environ.get("DYLD_LIBRARY_PATH") != libraries:
        os.execve(sys.executable, [sys.executable, *sys.argv], {**os.environ, "DYLD_LIBRARY_PATH": libraries})


def compute(v):
    import numpy as np
    import pyvqnet as vn
    from pyvqnet.qnn import vqc

    machine = vqc.QMachine(v["numQubits"], dtype=vn.kcomplex128)
    names = {"H": "hadamard", "X": "paulix", "Y": "pauliy", "Z": "pauliz", "S": "s", "T": "t", "CX": "cnot", "CZ": "cz", "RX": "rx", "RY": "ry", "RZ": "rz"}
    parameters = []
    for index, gate in enumerate(v["gates"]):
        kwargs = {"q_machine": machine, "wires": gate["targets"] if len(gate["targets"]) > 1 else gate["targets"][0]}
        if "angle" in gate:
            value = vn.QTensor([[gate["angle"]]], dtype=vn.kfloat64, requires_grad=True)
            kwargs["params"] = value
            parameters.append((index, value))
        getattr(vqc, names[gate["gate"]])(**kwargs)
    observable = {}
    for term in v["terms"]:
        key = " ".join(f"{letter}{i}" for i, letter in enumerate(term["pauli"]) if letter != "I")
        observable[key] = observable.get(key, 0.0) + term["coefficient"]
    # MeasureAll's coefficient dictionary is internally float32 in 2.18.1,
    # even for a complex128 device. Measure unit Pauli words, then combine
    # with explicit float64 QTensor coefficients inside VQNet's autograd graph.
    measured = None
    for word, coefficient in observable.items():
        term = vqc.MeasureAll(obs={word: 1.0})(q_machine=machine)
        weighted = term * vn.QTensor([[coefficient]], dtype=vn.kfloat64)
        measured = weighted if measured is None else measured + weighted
    probabilities = vqc.Probability(wires=list(range(v["numQubits"])))(q_machine=machine).numpy().reshape(-1)
    if parameters and measured.requires_grad:
        measured.backward()
    gradients = [{"gateIndex": index, "derivative": float(parameter.grad.numpy().reshape(-1)[0]) if parameter.grad is not None else 0.0} for index, parameter in parameters]
    return {
        "numQubits": v["numQubits"], "expectation": float(measured.numpy().reshape(-1)[0]),
        "probabilities": np.asarray(probabilities, dtype=float).tolist(), "gradients": gradients,
        "backend": "VQNet VQC CPU complex128 autograd", "bitOrder": "leftmost bit and Pauli letter is qubit 0",
    }, [
        "Exact noiseless statevector probabilities and VQNet automatic derivatives, subject to floating-point error and exponential memory use.",
        "Each rotation angle is an independent parameter. This action does not train a hybrid model or submit cloud work.",
        "On macOS the SDK sets OMP_NUM_THREADS=1 during import; requested deployment thread count may not be honored by this SDK.",
    ]


if __name__ == "__main__":
    prepare_macos_loader()
    execute(compute)
