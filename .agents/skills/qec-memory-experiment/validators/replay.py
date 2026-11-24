"""Independent reference execution: accepts only the original bounded request.

Never imports the Tool bridge or consumes its counts, circuit, DEM or status.
Reproducibility requires the same Stim build/machine and a single sample batch.
"""
from __future__ import annotations

import base64
import hashlib
import json
import math
import platform
import sys


def reference(request):
    keys = {"basis", "distance", "rounds", "shots", "physicalErrorRate", "seed"}
    if not isinstance(request, dict) or set(request) != keys:
        raise ValueError("Invalid QEC reference request fields")
    if request["basis"] not in ("x", "z"):
        raise ValueError("Invalid memory basis")
    for key, minimum, maximum in [("distance", 3, 2**53-1), ("rounds", 1, 2**53-1),
                                   ("shots", 1, 2**53-1), ("seed", 0, 2**32-1)]:
        if type(request[key]) is not int or not minimum <= request[key] <= maximum:
            raise ValueError(f"Invalid {key}")
    if request["distance"] % 2 != 1:
        raise ValueError("Code distance must be odd")
    p = request["physicalErrorRate"]
    if type(p) not in (int, float) or not math.isfinite(p) or not 0 <= p <= 1:
        raise ValueError("Invalid physical error probability")

    import numpy as np
    import pymatching
    import stim

    circuit = stim.Circuit.generated(
        "surface_code:rotated_memory_" + request["basis"],
        distance=request["distance"], rounds=request["rounds"],
        before_measure_flip_probability=p, after_reset_flip_probability=p,
        before_round_data_depolarization=p, after_clifford_depolarization=p,
    )
    dem = circuit.detector_error_model(decompose_errors=True)
    detections, observations = circuit.compile_detector_sampler(seed=request["seed"]).sample(
        request["shots"], separate_observables=True)
    decoder = pymatching.Matching.from_detector_error_model(dem)
    predictions = decoder.decode_batch(detections)
    # Count from shot records, independently of the worker's reduction.
    failures = [not np.array_equal(predicted, actual) for predicted, actual in zip(predictions, observations, strict=True)]
    digest = lambda value: hashlib.sha256(value).hexdigest()
    return {
        "packages": {"stim": stim.__version__, "pymatching": pymatching.__version__},
        "circuit": {"qubits": circuit.num_qubits, "detectors": circuit.num_detectors,
                    "observables": circuit.num_observables, "sha256": digest(str(circuit).encode())},
        "detectorModel": {"detectors": dem.num_detectors, "observables": dem.num_observables,
                          "sha256": digest(str(dem).encode())},
        "shots": len(failures), "logicalErrors": sum(failures),
        "sampling": {
            "method": "stim-detector-single-batch-v1", "batchShots": request["shots"], "bitOrder": "little",
            "failureBits": base64.b64encode(np.packbits(failures, bitorder="little").tobytes()).decode(),
            "detectorSha256": digest(detections.astype(np.uint8).tobytes()),
            "observableSha256": digest(observations.astype(np.uint8).tobytes()),
            "predictionSha256": digest(predictions.astype(np.uint8).tobytes()),
            "runtime": {"system": platform.system(), "machine": platform.machine(), "stimImplementation": stim.Circuit.__module__},
        },
    }


if __name__ == "__main__":
    try:
        print(json.dumps(reference(json.load(sys.stdin)), separators=(",", ":")))
    except Exception as error:
        print(json.dumps({"error": str(error)}), file=sys.stderr)
        raise SystemExit(1)
