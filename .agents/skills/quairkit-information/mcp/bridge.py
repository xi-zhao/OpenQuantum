"""QuAIRKit ideal gates plus ordered single-qubit noise channels."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[4] / "src/lib"))
from science_bridge import execute
from sdk_expansion_circuits import check_statevector_representation


def compute(v):
    n = v["numQubits"]
    check_statevector_representation(2 * n)
    import numpy as np
    import quairkit as qkit
    qkit.set_device("cpu")
    qkit.set_dtype("complex128")
    circuit = qkit.Circuit(n)
    for item in v["gates"]:
        name = "cnot" if item["gate"] == "CX" else item["gate"].lower()
        args = {"qubits_idx": item["targets"]}
        if "angle" in item:
            args["param"] = item["angle"]
        getattr(circuit, name)(**args)
    for channel in v["channels"]:
        getattr(circuit, channel["channel"])(channel["strength"], [channel["target"]])
    rho = circuit().density_matrix.detach().cpu().numpy().reshape((2**n, 2**n))
    if not np.isfinite(rho).all():
        raise ValueError("QuAIRKit returned a nonfinite density matrix")
    trace = np.trace(rho)
    return {"numQubits": n, "densityMatrix": np.stack((rho.real, rho.imag), axis=-1).tolist(),
            "outcomes": [{"bits": format(i, f"0{n}b"), "probability": float(rho[i, i].real)} for i in range(2**n)],
            "trace": [float(trace.real), float(trace.imag)], "purity": float(np.trace(rho @ rho).real),
            "hermiticityError": float(np.max(abs(rho - rho.conj().T))),
            "backend": "QuAIRKit CPU complex128 density matrix", "bitOrder": "leftmost bit is qubit 0"}, [
        "All channels are applied after the entire gate circuit, in the supplied order; this is not interleaved gate noise.",
        "Amplitude damping uses gamma=strength; phase damping multiplies coherences by sqrt(1-strength); depolarizing uses (1-p)*rho + p*I/2 on its target.",
        "CPU density matrices require memory proportional to 4^N. Raw output is not clipped, normalized or projected to a physical state.",
        "Trace, purity and Hermiticity are descriptive numerical values. No calibrated device model, cloud execution or scientific acceptance is provided.",
    ]


if __name__ == "__main__":
    execute(compute)
