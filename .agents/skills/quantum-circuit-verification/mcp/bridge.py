"""Bounded JSON bridge to pinned MQT QCEC circuit equivalence checking."""

from __future__ import annotations

import hashlib
import json
import platform
import sys
import tempfile
from importlib.metadata import version
from pathlib import Path
from typing import Any

MAX_QASM_BYTES = 64 * 1024
TIMEOUT_SECONDS = 10


def qasm_value(value: Any, field: str) -> str:
    if not isinstance(value, str):
        raise ValueError(f"{field} must be an OpenQASM 2 string")
    encoded = value.encode("utf8")
    if not encoded or len(encoded) > MAX_QASM_BYTES or b"\x00" in encoded:
        raise ValueError(f"{field} must contain 1 to {MAX_QASM_BYTES} UTF-8 bytes")
    return value


def digest(value: str) -> str:
    return hashlib.sha256(value.encode("utf8")).hexdigest()


def verify_payload(circuit_a: str, circuit_b: str) -> dict[str, Any]:
    from mqt.qcec import verify

    with tempfile.TemporaryDirectory(prefix="openquantum-qcec-") as directory:
        root = Path(directory)
        path_a = root / "circuit-a.qasm"
        path_b = root / "circuit-b.qasm"
        path_a.write_text(circuit_a, encoding="utf8")
        path_b.write_text(circuit_b, encoding="utf8")
        result = verify(path_a, path_b, timeout=TIMEOUT_SECONDS)
    raw = result.json()
    return {
        "schemaVersion": "1.0",
        "packageVersion": version("mqt.qcec"),
        "inputDigests": {"circuitA": digest(circuit_a), "circuitB": digest(circuit_b)},
        "equivalence": result.equivalence.name,
        "statistics": {
            "preprocessingSeconds": float(raw.get("preprocessing_time", 0)),
            "checkSeconds": float(raw.get("check_time", 0)),
            "performedSimulations": int(raw.get("simulations", {}).get("performed", 0)),
            "performedInstantiations": int(raw.get("parameterized", {}).get("performed_instantiations", 0)),
            "checkers": [
                {
                    "checker": str(item.get("checker", "unknown")),
                    "equivalence": str(item.get("equivalence", "no_information")),
                    "runtimeSeconds": float(item.get("runtime", 0)),
                }
                for item in raw.get("checkers", [])
            ],
        },
        "timeoutSeconds": TIMEOUT_SECONDS,
    }


def runtime_payload() -> dict[str, Any]:
    from mqt.qcec import verify  # noqa: F401

    return {
        "schemaVersion": "1.0",
        "packageVersion": version("mqt.qcec"),
        "pythonVersion": platform.python_version(),
        "maxQasmBytesPerCircuit": MAX_QASM_BYTES,
        "timeoutSeconds": TIMEOUT_SECONDS,
        "cloudExecutionEnabled": False,
    }


def main() -> None:
    raw = sys.stdin.buffer.read(256 * 1024 + 1)
    if len(raw) > 256 * 1024:
        raise ValueError("bridge request is too large")
    envelope = json.loads(raw.decode("utf8"))
    if not isinstance(envelope, dict) or set(envelope) - {"action", "circuitA", "circuitB"}:
        raise ValueError("bridge envelope is invalid")
    action = envelope.get("action")
    if action == "runtime":
        output = runtime_payload()
    elif action == "verify":
        output = verify_payload(
            qasm_value(envelope.get("circuitA"), "circuitA"),
            qasm_value(envelope.get("circuitB"), "circuitB"),
        )
    else:
        raise ValueError("bridge action is invalid")
    print(json.dumps(output, ensure_ascii=False, separators=(",", ":")))


if __name__ == "__main__":
    try:
        main()
    except Exception as error:  # noqa: BLE001 - process boundary returns one JSON error
        print(json.dumps({"error": str(error)}, ensure_ascii=False), file=sys.stderr)
        raise SystemExit(1)
