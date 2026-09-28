"""Local Exaqt state-vector adapter; deliberately no MimiqConnection or cloud API."""
import sys
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[4] / "src/lib"))
from science_bridge import execute


def compute(v):
    import numpy as np
    from exaqt import ExaqtSV, Rng

    n = v["numQubits"]
    state = ExaqtSV.zero(n)
    for gate in v["gates"]:
        args = ([gate["angle"]] if "angle" in gate else []) + gate["targets"]
        getattr(state, "apply_" + gate["gate"].lower())(*args)
    # Exaqt's index is little endian; OpenQuantum output strings put q0 leftmost.
    amplitudes = np.asarray(state.amplitudes()).reshape([2] * n).transpose(list(reversed(range(n)))).reshape(-1)
    counts = Counter("".join(str(int(bit)) for bit in row) for row in state.sample(Rng(seed=v["seed"]), nsamples=v["shots"])) if v["shots"] else {}
    return {
        "numQubits": n, "bitOrder": "leftmost bit is qubit 0", "backend": "MIMIQ ExaqtSV",
        "probabilities": (np.abs(amplitudes) ** 2).tolist(),
        "amplitudes": [{"real": float(a.real), "imag": float(a.imag)} for a in amplitudes],
        "counts": [{"bitstring": bits, "count": count} for bits, count in sorted(counts.items())],
        "norm": float(state.norm_squared()),
    }, [
        "Exact noiseless state-vector simulation up to floating-point error; memory and output grow exponentially with qubit count.",
        "Counts are optional pseudorandom samples; probabilities and amplitudes have no shot noise.",
        "This adapter exposes the local Exaqt engine, not MIMIQ cloud jobs or TensorWeaver.",
    ]


if __name__ == "__main__":
    execute(compute)
