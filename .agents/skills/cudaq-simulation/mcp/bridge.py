"""CUDA-Q CPU simulation; structured builder only, no executable source input."""
import contextlib
import json
import sys


def compute(value):
    import cudaq
    import numpy as np
    cudaq.set_target("qpp-cpu")
    cudaq.set_random_seed(value["seed"])
    kernel = cudaq.make_kernel()
    qubits = kernel.qalloc(value["numQubits"])
    for instruction in value["gates"]:
        gate = instruction["gate"].lower()
        args = ([instruction["angle"]] if gate in ("rx", "ry", "rz") else []) + [qubits[index] for index in instruction["targets"]]
        getattr(kernel, gate)(*args)
    state = np.asarray(cudaq.get_state(kernel))
    probabilities = np.abs(state) ** 2
    counts = dict(cudaq.sample(kernel, shots_count=value["shots"]).items()) if value["shots"] else {}
    outcomes = []
    for index, probability in enumerate(probabilities):
        # State storage is little endian; CUDA-Q sample strings put q0 first.
        bits = format(index, f"0{value['numQubits']}b")[::-1]
        outcomes.append({"bits": bits, "probability": float(min(1.0, max(0.0, probability))), "count": int(counts.get(bits, 0))})
    outcomes.sort(key=lambda row: row["bits"])
    if sum(row["count"] for row in outcomes) != value["shots"]:
        raise ValueError("CUDA-Q returned an unexpected measurement register or shot count")
    return {"numQubits": value["numQubits"], "shots": value["shots"], "seed": value["seed"], "backend": "qpp-cpu", "bitOrder": "q0,q1,... from left to right", "outcomes": outcomes, "normError": float(abs(np.sum(probabilities) - 1)), "networkUsed": False}


if __name__ == "__main__":
    request = json.load(sys.stdin)
    with contextlib.redirect_stdout(sys.stderr):
        result = compute(request["input"])
    json.dump({"schemaVersion": "1.0", "source": request["source"], "input": request["input"], "inputSha256": request["inputSha256"], "dependencyLockSha256": request["dependencyLockSha256"], "result": result, "scientificValidation": "not_evaluated", "limitations": [
        "The backend is explicitly qpp-cpu: this is ideal CPU statevector simulation, not GPU acceleration, noise simulation or QPU execution.",
        "Outcome strings list q0,q1,... from left to right. Exact probabilities and finite-shot counts are distinct outputs; shots=0 returns zero counts and skips sampling.",
        "Dense state storage and the full probability output grow exponentially with numQubits; execution resource settings are independent of circuit parameters.",
        "Pinned binary wheels support Linux and Apple Silicon macOS; this environment is not available on native Windows or Intel macOS.",
    ]}, sys.stdout, allow_nan=False)
