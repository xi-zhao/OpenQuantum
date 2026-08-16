"""Bounded JSON bridge to the pinned TyxonQ Python SDK."""

from __future__ import annotations

import hashlib
import json
import math
import platform
import sys
from typing import Any

TYXONQ_VERSION = "1.2.0"
MAX_QUBITS = 8
MAX_OPERATIONS = 64
MAX_SHOTS = 8192
SINGLE_QUBIT_GATES = {"h", "x", "s", "sdg"}
ROTATION_GATES = {"rx", "ry", "rz"}
TWO_QUBIT_GATES = {"cx", "cz"}
SUPPORTED_GATES = SINGLE_QUBIT_GATES | ROTATION_GATES | TWO_QUBIT_GATES
NOISE_TYPES = {
    "depolarizing",
    "amplitude_damping",
    "phase_damping",
    "pauli",
}


def is_record(value: Any) -> bool:
    return isinstance(value, dict)


def finite_number(value: Any, field: str) -> float:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise TypeError(f"{field} must be a finite number")
    number = float(value)
    if not math.isfinite(number):
        raise ValueError(f"{field} must be a finite number")
    return number


def bounded_probability(value: Any, field: str) -> float:
    number = finite_number(value, field)
    if number < 0.0 or number > 1.0:
        raise ValueError(f"{field} must be between 0 and 1")
    return number


def validate_operation(operation: Any, num_qubits: int, index: int) -> dict[str, Any]:
    if not is_record(operation) or set(operation) - {"gate", "qubits", "angle"}:
        raise ValueError(f"operations[{index}] is invalid")
    gate = operation.get("gate")
    qubits = operation.get("qubits")
    if gate not in SUPPORTED_GATES or not isinstance(qubits, list):
        raise ValueError(f"operations[{index}] gate or qubits is invalid")
    expected_arity = 2 if gate in TWO_QUBIT_GATES else 1
    if len(qubits) != expected_arity:
        raise ValueError(f"operations[{index}] has the wrong qubit arity")
    if any(
        isinstance(qubit, bool)
        or not isinstance(qubit, int)
        or qubit < 0
        or qubit >= num_qubits
        for qubit in qubits
    ):
        raise ValueError(f"operations[{index}] contains an invalid qubit")
    if len(set(qubits)) != len(qubits):
        raise ValueError(f"operations[{index}] repeats a qubit")
    normalized: dict[str, Any] = {"gate": gate, "qubits": qubits}
    if gate in ROTATION_GATES:
        normalized["angle"] = finite_number(
            operation.get("angle"), f"operations[{index}].angle"
        )
    elif "angle" in operation:
        raise ValueError(f"operations[{index}].angle is not valid for {gate}")
    return normalized


def validate_noise(value: Any) -> dict[str, Any] | None:
    if value is None:
        return None
    if not is_record(value):
        raise ValueError("noise must be an object")
    noise_type = value.get("type")
    if noise_type not in NOISE_TYPES:
        raise ValueError("noise.type is invalid")
    if noise_type == "pauli":
        allowed = {"type", "x", "y", "z"}
        if set(value) - allowed:
            raise ValueError("pauli noise has unknown fields")
        x = bounded_probability(value.get("x"), "noise.x")
        y = bounded_probability(value.get("y"), "noise.y")
        z = bounded_probability(value.get("z"), "noise.z")
        if x + y + z > 1.0:
            raise ValueError("noise.x + noise.y + noise.z must not exceed 1")
        return {"type": noise_type, "x": x, "y": y, "z": z}
    if set(value) - {"type", "strength"}:
        raise ValueError(f"{noise_type} noise has unknown fields")
    return {
        "type": noise_type,
        "strength": bounded_probability(value.get("strength"), "noise.strength"),
    }


def validate_request(value: Any) -> dict[str, Any]:
    if not is_record(value) or set(value) - {
        "numQubits",
        "operations",
        "mode",
        "shots",
        "noise",
    }:
        raise ValueError("simulation request is invalid")
    num_qubits = value.get("numQubits")
    if (
        isinstance(num_qubits, bool)
        or not isinstance(num_qubits, int)
        or num_qubits < 1
        or num_qubits > MAX_QUBITS
    ):
        raise ValueError(f"numQubits must be between 1 and {MAX_QUBITS}")
    operations = value.get("operations")
    if (
        not isinstance(operations, list)
        or len(operations) < 1
        or len(operations) > MAX_OPERATIONS
    ):
        raise ValueError(f"operations must contain 1 to {MAX_OPERATIONS} gates")
    mode = value.get("mode")
    if mode not in {"exact", "sampled"}:
        raise ValueError("mode must be exact or sampled")
    noise = validate_noise(value.get("noise"))
    if mode == "exact" and noise is not None:
        raise ValueError("noise requires mode=sampled")
    shots = value.get("shots", 1024 if mode == "sampled" else 0)
    if mode == "exact":
        if shots not in {0, None}:
            raise ValueError("exact mode does not accept shots")
        shots = 0
    elif (
        isinstance(shots, bool)
        or not isinstance(shots, int)
        or shots < 1
        or shots > MAX_SHOTS
    ):
        raise ValueError(f"shots must be between 1 and {MAX_SHOTS}")
    return {
        "numQubits": num_qubits,
        "operations": [
            validate_operation(operation, num_qubits, index)
            for index, operation in enumerate(operations)
        ],
        "mode": mode,
        "shots": shots,
        "noise": noise,
    }


def tyxonq_noise(value: dict[str, Any] | None) -> dict[str, Any] | None:
    if value is None:
        return None
    if value["type"] == "depolarizing":
        return {"type": "depolarizing", "p": value["strength"]}
    if value["type"] == "amplitude_damping":
        return {"type": "amplitude_damping", "gamma": value["strength"]}
    if value["type"] == "phase_damping":
        return {"type": "phase_damping", "lambda": value["strength"]}
    return {
        "type": "pauli",
        "px": value["x"],
        "py": value["y"],
        "pz": value["z"],
    }


def apply_operation(circuit: Any, operation: dict[str, Any]) -> None:
    gate = operation["gate"]
    qubits = operation["qubits"]
    if gate in ROTATION_GATES:
        getattr(circuit, gate)(qubits[0], operation["angle"])
    elif gate in TWO_QUBIT_GATES:
        getattr(circuit, gate)(qubits[0], qubits[1])
    else:
        getattr(circuit, gate)(qubits[0])


def simulation_payload(request: dict[str, Any]) -> dict[str, Any]:
    import tyxonq as tq

    tq.set_backend("numpy")
    circuit = tq.Circuit(request["numQubits"])
    for operation in request["operations"]:
        apply_operation(circuit, operation)

    noise = tyxonq_noise(request["noise"])
    simulator = "density_matrix" if noise is not None else "statevector"
    options: dict[str, Any] = {}
    if noise is not None:
        options.update({"use_noise": True, "noise": noise})
    raw_results = circuit.run(
        provider="simulator",
        device=simulator,
        shots=request["shots"],
        **options,
    )
    if not isinstance(raw_results, list) or len(raw_results) != 1:
        raise RuntimeError("TyxonQ returned an unexpected result collection")
    result = raw_results[0]
    inner = result.get("result_meta") if is_record(result) else None
    if not is_record(result) or not is_record(inner):
        raise RuntimeError("TyxonQ returned an unexpected result shape")
    error = result.get("error") or inner.get("error")
    if error:
        raise RuntimeError(f"TyxonQ simulation failed: {error}")

    counts_value = result.get("result") or inner.get("result") or {}
    counts = {
        str(key): int(count)
        for key, count in sorted(dict(counts_value).items())
    }
    statevector_value = inner.get("statevector")
    probabilities_value = inner.get("probabilities")
    statevector: list[dict[str, float]] = []
    if statevector_value is not None:
        for amplitude in list(statevector_value):
            number = complex(amplitude)
            statevector.append({"real": float(number.real), "imag": float(number.imag)})

    probabilities: dict[str, float] = {}
    if probabilities_value is not None:
        width = request["numQubits"]
        probabilities = {
            format(index, f"0{width}b"): float(probability)
            for index, probability in enumerate(list(probabilities_value))
        }
    elif request["shots"] > 0:
        probabilities = {
            key: count / request["shots"] for key, count in counts.items()
        }

    normalization_sum = sum(probabilities.values())
    total_counts = sum(counts.values())
    circuit_bytes = json.dumps(
        {
            "numQubits": request["numQubits"],
            "operations": request["operations"],
        },
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    ).encode("utf8")
    return {
        "schemaVersion": "1.0",
        "tyxonqVersion": str(getattr(tq, "__version__", TYXONQ_VERSION)),
        "circuit": {
            "numQubits": request["numQubits"],
            "operationCount": len(request["operations"]),
            "sha256": hashlib.sha256(circuit_bytes).hexdigest(),
        },
        "execution": {
            "mode": request["mode"],
            "simulator": simulator,
            "shots": request["shots"],
            "noise": request["noise"],
        },
        "result": {
            "counts": counts,
            "probabilities": probabilities,
            "statevector": statevector,
        },
        "checks": {
            "normalizationSum": normalization_sum,
            "normalizationError": abs(normalization_sum - 1.0),
            "countsMatchShots": (
                total_counts == request["shots"] if request["shots"] > 0 else None
            ),
        },
        "scientificValidation": "not_evaluated",
        "limitations": [
            "Local TyxonQ simulator output; no cloud or quantum hardware was used.",
            "Engineering consistency checks are not an independent scientific Validator.",
        ],
    }


def runtime_payload() -> dict[str, Any]:
    import tyxonq as tq

    return {
        "schemaVersion": "1.0",
        "tyxonqVersion": str(getattr(tq, "__version__", TYXONQ_VERSION)),
        "pythonVersion": platform.python_version(),
        "maxQubits": MAX_QUBITS,
        "maxOperations": MAX_OPERATIONS,
        "maxShots": MAX_SHOTS,
        "gates": sorted(SUPPORTED_GATES),
        "noiseModels": sorted(NOISE_TYPES),
        "cloudExecutionEnabled": False,
    }


def main() -> None:
    raw = sys.stdin.buffer.read(256 * 1024 + 1)
    if len(raw) > 256 * 1024:
        raise ValueError("bridge request is too large")
    value = json.loads(raw.decode("utf8"))
    if not is_record(value) or set(value) - {"action", "request"}:
        raise ValueError("bridge envelope is invalid")
    action = value.get("action")
    if action == "runtime":
        output = runtime_payload()
    elif action == "simulate":
        output = simulation_payload(validate_request(value.get("request")))
    else:
        raise ValueError("bridge action is invalid")
    print(json.dumps(output, ensure_ascii=False, separators=(",", ":")))


if __name__ == "__main__":
    try:
        main()
    except Exception as error:  # noqa: BLE001 - process boundary returns one JSON error
        print(json.dumps({"error": str(error)}, ensure_ascii=False), file=sys.stderr)
        raise SystemExit(1)
