"""Bounded JSON bridge to the pinned pyqpanda_alg QUBO module.

The bridge only exposes local QUBO solving on the CPU simulator: it never
touches the Origin Quantum cloud, tokens or real hardware. Every algorithm call
goes through the upstream ``pyqpanda_alg.QUBO`` API as-is; this file does not
reimplement any quantum or optimization logic.
"""

from __future__ import annotations

import hashlib
import json
import math
import platform
import sys
from typing import Any

PACKAGE_VERSION = "2.0.0"
MAX_VARS = 5
MAX_LAYER = 6
MAX_ABS_COEFF = 1e6


def is_record(value: Any) -> bool:
    return isinstance(value, dict)


def finite_number(value: Any, field: str) -> float:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ValueError(f"{field} must be a finite number")
    number = float(value)
    if not math.isfinite(number) or abs(number) > MAX_ABS_COEFF:
        raise ValueError(f"{field} must be a finite number within +/-{MAX_ABS_COEFF}")
    return number


def validate_problem(value: Any) -> dict[str, Any]:
    if not is_record(value) or set(value) - {"quadratic", "linear", "constant", "method", "layer"}:
        raise ValueError("QUBO request is invalid")
    quadratic = value.get("quadratic")
    if not isinstance(quadratic, list) or not 1 <= len(quadratic) <= MAX_VARS:
        raise ValueError(f"quadratic must be a matrix with 1 to {MAX_VARS} rows")
    size = len(quadratic)
    matrix: list[list[float]] = []
    for i, row in enumerate(quadratic):
        if not isinstance(row, list) or len(row) != size:
            raise ValueError("quadratic must be a square matrix")
        matrix.append([finite_number(cell, f"quadratic[{i}][{j}]") for j, cell in enumerate(row)])

    linear_value = value.get("linear")
    if linear_value is None:
        linear = [0.0] * size
    else:
        if not isinstance(linear_value, list) or len(linear_value) != size:
            raise ValueError("linear must be an array matching the matrix size")
        linear = [finite_number(item, f"linear[{i}]") for i, item in enumerate(linear_value)]

    constant = finite_number(value.get("constant", 0.0), "constant")

    method = value.get("method", "traversal")
    if method not in {"traversal", "qaoa"}:
        raise ValueError("method must be traversal or qaoa")
    layer = value.get("layer")
    if method == "qaoa":
        if not isinstance(layer, int) or isinstance(layer, bool) or not 1 <= layer <= MAX_LAYER:
            raise ValueError(f"layer must be an integer between 1 and {MAX_LAYER} for qaoa")
    elif layer is not None:
        raise ValueError("layer only applies to method=qaoa")

    return {
        "quadratic": matrix,
        "linear": linear,
        "constant": constant,
        "method": method,
        "layer": layer,
        "size": size,
    }


def jsonable(value: Any) -> Any:
    """Coerce upstream results into JSON-serializable primitives."""
    if isinstance(value, dict):
        return {str(key): jsonable(item) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        return [jsonable(item) for item in value]
    if isinstance(value, bool) or value is None or isinstance(value, (int, str)):
        return value
    if isinstance(value, float):
        return value if math.isfinite(value) else None
    try:
        return float(value)
    except (TypeError, ValueError):
        return str(value)


def solve_payload(request: dict[str, Any]) -> dict[str, Any]:
    from pyqpanda_alg.QUBO import QUBO_QAOA, QuadraticBinary

    problem = {
        "quadratic": request["quadratic"],
        "linear": request["linear"],
        "constant": request["constant"],
    }
    binary = QuadraticBinary(problem)
    n_key, n_res = (int(number) for number in binary.query_qnumber())

    # Classical brute-force reference: the deterministic anchor for this problem.
    assignments_raw, minimum_value = binary.qubobytraversal()
    assignments = [[int(bit) for bit in assignment] for assignment in assignments_raw]
    minimum_value = float(minimum_value)

    # Self-consistency check that does not depend on qubit ordering: the objective
    # value the upstream reports for a reported optimum must equal the minimum.
    consistency_error = None
    if assignments:
        recomputed = float(binary.function_value(assignments[0]))
        consistency_error = abs(recomputed - minimum_value)

    quantum = None
    if request["method"] == "qaoa":
        qaoa = QUBO_QAOA(problem)
        raw = qaoa.run(layer=request["layer"], optimizer="SLSQP")
        distribution = jsonable(raw)
        top = None
        if isinstance(distribution, dict) and distribution:
            top = max(
                distribution.items(),
                key=lambda item: item[1] if isinstance(item[1], (int, float)) else float("-inf"),
            )[0]
        quantum = {
            "layer": request["layer"],
            "optimizer": "SLSQP",
            "distribution": distribution,
            "topBitstring": top,
        }

    problem_bytes = json.dumps(problem, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf8")
    return {
        "schemaVersion": "1.0",
        "packageVersion": package_version(),
        "problem": {
            "size": request["size"],
            "keyQubits": n_key,
            "resultQubits": n_res,
            "sha256": hashlib.sha256(problem_bytes).hexdigest(),
        },
        "classical": {
            "method": "qubobytraversal",
            "optimalAssignments": assignments,
            "minimumValue": minimum_value,
        },
        "quantum": quantum,
        "checks": {
            "objectiveConsistencyError": consistency_error,
        },
        "scientificValidation": "not_evaluated",
        "limitations": [
            "Local pyqpanda_alg CPU-simulator result; no Origin Quantum cloud or real QPU was used.",
            "Engineering consistency checks are not an independent scientific Validator.",
            "QAOA output is a sampled variational estimate and may differ from the classical optimum.",
        ],
    }


def package_version() -> str:
    try:
        from importlib.metadata import version

        return version("pyqpanda_alg")
    except Exception:  # noqa: BLE001 - version reporting must never break a solve
        import pyqpanda_alg

        return str(getattr(pyqpanda_alg, "__version__", PACKAGE_VERSION))


def runtime_payload() -> dict[str, Any]:
    from pyqpanda_alg.QUBO import QUBO_QAOA, QUBO_GAS_origin, QuadraticBinary  # noqa: F401

    return {
        "schemaVersion": "1.0",
        "packageVersion": package_version(),
        "pythonVersion": platform.python_version(),
        "maxVars": MAX_VARS,
        "maxLayer": MAX_LAYER,
        "methods": ["traversal", "qaoa"],
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
    elif action == "solve":
        output = solve_payload(validate_problem(value.get("request")))
    else:
        raise ValueError("bridge action is invalid")
    print(json.dumps(output, ensure_ascii=False, separators=(",", ":")))


if __name__ == "__main__":
    try:
        main()
    except Exception as error:  # noqa: BLE001 - process boundary returns one JSON error
        print(json.dumps({"error": str(error)}, ensure_ascii=False), file=sys.stderr)
        raise SystemExit(1)
