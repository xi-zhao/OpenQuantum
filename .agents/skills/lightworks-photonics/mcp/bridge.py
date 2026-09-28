"""Aegiq Lightworks permanent amplitudes for a lossless optical network."""
import os
import sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[4]
sys.path.insert(0, str(ROOT / "src/lib"))
from science_bridge import execute


def compute(v):
    os.environ["NUMBA_CACHE_DIR"] = str(ROOT / ".openquantum/cache/lightworks-numba")
    import numpy as np
    import lightworks as lw
    circuit = lw.PhotonicCircuit(len(v["inputOccupation"]))
    for item in v["operations"]:
        if item["gate"] == "BS":
            circuit.bs(*item["modes"], reflectivity=item["reflectivity"], convention="Rx")
        else:
            circuit.ps(item["modes"][0], item["phaseRad"])
    initial = lw.State(v["inputOccupation"])
    result = lw.emulator.Backend("permanent").run(lw.Simulator(circuit, initial))
    outcomes = [{"occupation": list(state), "amplitude": [float(a.real), float(a.imag)], "probability": float(abs(a)**2)}
                for state, a in result[initial].items()]
    outcomes.sort(key=lambda row: row["occupation"])
    unitary = np.asarray(circuit.U, dtype=complex)
    return {"modeCount": len(v["inputOccupation"]), "photonCount": sum(v["inputOccupation"]),
            "outcomes": outcomes, "totalProbability": sum(row["probability"] for row in outcomes),
            "unitary": np.stack((unitary.real, unitary.imag), axis=-1).tolist(),
            "backend": "Lightworks permanent Simulator", "modeOrder": "occupation[i] and unitary row/column i refer to mode i"}, [
        "Lossless passive linear optics and perfectly indistinguishable photons only; no source impurity, detector noise, loss or postselection.",
        "BS uses Lightworks Rx convention and power reflectivity r, not Perceval's Hadamard angle. Phases and ordered modes follow the returned unitary.",
        "Every fixed-total-photon Fock output is returned. Space grows combinatorially; caller selects size and execution resources.",
        "Amplitudes and probabilities are raw local permanent-backend results, without renormalization. No cloud, hardware or scientific acceptance is involved.",
    ]


if __name__ == "__main__":
    execute(compute)
