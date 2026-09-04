"""Bounded Stim + PyMatching rotated-surface-code memory experiment."""

from __future__ import annotations

import hashlib
import json
import math
import sys
import time
from typing import Any

MAX_DISTANCE = 7
MAX_ROUNDS = 20
MAX_SHOTS = 50_000
MAX_ERROR_RATE = 0.05
MAX_SEED = 2**32 - 1


def canonical_digest(value: dict[str, Any]) -> str:
    encoded = json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf8")
    return hashlib.sha256(encoded).hexdigest()


def normalize_request(value: Any) -> dict[str, Any]:
    allowed = {"basis", "distance", "rounds", "shots", "physicalErrorRate", "seed"}
    if not isinstance(value, dict) or set(value) - allowed:
        raise ValueError("QEC memory experiment request is invalid")
    basis = value.get("basis")
    if basis not in {"x", "z"}:
        raise ValueError("basis must be x or z")
    distance = value.get("distance")
    if (
        isinstance(distance, bool)
        or not isinstance(distance, int)
        or not 3 <= distance <= MAX_DISTANCE
        or distance % 2 == 0
    ):
        raise ValueError(f"distance must be an odd integer between 3 and {MAX_DISTANCE}")
    rounds = value.get("rounds")
    if isinstance(rounds, bool) or not isinstance(rounds, int) or not 1 <= rounds <= MAX_ROUNDS:
        raise ValueError(f"rounds must be an integer between 1 and {MAX_ROUNDS}")
    shots = value.get("shots")
    if isinstance(shots, bool) or not isinstance(shots, int) or not 100 <= shots <= MAX_SHOTS:
        raise ValueError(f"shots must be an integer between 100 and {MAX_SHOTS}")
    error_rate_value = value.get("physicalErrorRate")
    if isinstance(error_rate_value, bool) or not isinstance(error_rate_value, (int, float)):
        raise ValueError("physicalErrorRate must be a finite probability")
    error_rate = float(error_rate_value)
    if not math.isfinite(error_rate) or not 0 <= error_rate <= MAX_ERROR_RATE:
        raise ValueError(f"physicalErrorRate must be between 0 and {MAX_ERROR_RATE}")
    seed = value.get("seed")
    if isinstance(seed, bool) or not isinstance(seed, int) or not 0 <= seed <= MAX_SEED:
        raise ValueError(f"seed must be an integer between 0 and {MAX_SEED}")
    return {
        "basis": basis,
        "distance": distance,
        "rounds": rounds,
        "shots": shots,
        "physicalErrorRate": 0 if error_rate == 0 else error_rate_value,
        "seed": seed,
    }


def wilson_interval(errors: int, shots: int) -> dict[str, float]:
    z = 1.959963984540054
    estimate = errors / shots
    denominator = 1 + z**2 / shots
    center = (estimate + z**2 / (2 * shots)) / denominator
    half_width = z * math.sqrt(estimate * (1 - estimate) / shots + z**2 / (4 * shots**2)) / denominator
    low = 0.0 if errors == 0 else max(0.0, center - half_width)
    high = 1.0 if errors == shots else min(1.0, center + half_width)
    return {"low": low, "high": high}


def experiment_payload(request: dict[str, Any]) -> dict[str, Any]:
    import numpy as np
    import pymatching
    import stim

    error_rate = float(request["physicalErrorRate"])
    code_task = f"surface_code:rotated_memory_{request['basis']}"
    started = time.perf_counter()
    circuit = stim.Circuit.generated(
        code_task,
        distance=request["distance"],
        rounds=request["rounds"],
        after_clifford_depolarization=error_rate,
        before_round_data_depolarization=error_rate,
        before_measure_flip_probability=error_rate,
        after_reset_flip_probability=error_rate,
    )
    detector_model = circuit.detector_error_model(decompose_errors=True)
    matching = pymatching.Matching.from_detector_error_model(detector_model)
    sampler = circuit.compile_detector_sampler(seed=request["seed"])
    detection_events, actual_observables = sampler.sample(
        shots=request["shots"],
        separate_observables=True,
    )
    predicted_observables = matching.decode_batch(detection_events)
    logical_errors = int(np.sum(np.any(predicted_observables != actual_observables, axis=1)))
    logical_error_rate = logical_errors / request["shots"]
    circuit_text = str(circuit)
    detector_model_text = str(detector_model)
    return {
        "schemaVersion": "1.0",
        "packages": {"stim": stim.__version__, "pymatching": pymatching.__version__},
        "experiment": request,
        "experimentDigest": canonical_digest(request),
        "codeTask": code_task,
        "circuit": {
            "qubits": circuit.num_qubits,
            "detectors": circuit.num_detectors,
            "observables": circuit.num_observables,
            "sha256": hashlib.sha256(circuit_text.encode("utf8")).hexdigest(),
        },
        "detectorModel": {
            "detectors": detector_model.num_detectors,
            "observables": detector_model.num_observables,
            "sha256": hashlib.sha256(detector_model_text.encode("utf8")).hexdigest(),
        },
        "result": {
            "shots": request["shots"],
            "logicalErrors": logical_errors,
            "successfulShots": request["shots"] - logical_errors,
            "logicalErrorRate": logical_error_rate,
            "standardError": math.sqrt(logical_error_rate * (1 - logical_error_rate) / request["shots"]),
            "wilson95": wilson_interval(logical_errors, request["shots"]),
        },
        "runtimeSeconds": time.perf_counter() - started,
    }


def main() -> None:
    raw = sys.stdin.buffer.read(128 * 1024 + 1)
    if len(raw) > 128 * 1024:
        raise ValueError("bridge request is too large")
    envelope = json.loads(raw.decode("utf8"))
    if not isinstance(envelope, dict) or set(envelope) - {"action", "request"}:
        raise ValueError("bridge envelope is invalid")
    action = envelope.get("action")
    if action == "experiment":
        output = experiment_payload(normalize_request(envelope.get("request")))
    else:
        raise ValueError("bridge action is invalid")
    print(json.dumps(output, ensure_ascii=False, separators=(",", ":")))


if __name__ == "__main__":
    try:
        main()
    except Exception as error:  # noqa: BLE001 - process boundary returns one JSON error
        print(json.dumps({"error": str(error)}, ensure_ascii=False), file=sys.stderr)
        raise SystemExit(1)
