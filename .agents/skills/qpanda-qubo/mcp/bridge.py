"""Bounded JSON bridge to the pinned pyqpanda_alg QUBO module.

The bridge only exposes local QUBO solving on the CPU simulator: it never
touches the Origin Quantum cloud, tokens or real hardware. Every algorithm call
goes through the upstream ``pyqpanda_alg.QUBO`` API as-is; this file does not
reimplement any quantum or optimization logic.
"""

from __future__ import annotations

import hashlib
import importlib
import json
import math
import sys
import types
from importlib.metadata import distribution
from typing import Any

PACKAGE_VERSION = "2.0.0"


def qubo_api() -> tuple[Any, Any, Any]:
    """Load only the upstream QUBO extension, without unrelated algorithms.

    ``pyqpanda_alg.__init__`` eagerly imports VQE, HHL and every other native
    module. Some upstream macOS wheels therefore fail QUBO startup when an
    unrelated module links an older Homebrew dylib. The QUBO extension itself
    has no such dependency, so this bounded bridge creates package namespaces
    and imports that reviewed extension directly.
    """

    package_root = distribution("pyqpanda_alg").locate_file("pyqpanda_alg")
    if "pyqpanda_alg" not in sys.modules:
        package = types.ModuleType("pyqpanda_alg")
        package.__path__ = [str(package_root)]
        package.__package__ = "pyqpanda_alg"
        sys.modules["pyqpanda_alg"] = package
    if "pyqpanda_alg.QUBO" not in sys.modules:
        qubo_package = types.ModuleType("pyqpanda_alg.QUBO")
        qubo_package.__path__ = [str(package_root / "QUBO")]
        qubo_package.__package__ = "pyqpanda_alg.QUBO"
        sys.modules["pyqpanda_alg.QUBO"] = qubo_package
    module = importlib.import_module("pyqpanda_alg.QUBO.QUBO")
    return module.QUBO_QAOA, module.QUBO_GAS_origin, module.QuadraticBinary


def is_record(value: Any) -> bool:
    return isinstance(value, dict)


def finite_number(value: Any, field: str) -> float:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ValueError(f"{field} must be a finite number")
    number = float(value)
    if not math.isfinite(number):
        raise ValueError(f"{field} must be a finite number")
    return number


def validate_problem(value: Any) -> dict[str, Any]:
    if not is_record(value) or set(value) - {"quadratic", "linear", "constant", "method", "layer", "referenceMode"}:
        raise ValueError("QUBO request is invalid")
    quadratic = value.get("quadratic")
    if not isinstance(quadratic, list) or len(quadratic) < 1:
        raise ValueError("quadratic must be a nonempty square matrix")
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
        if not isinstance(layer, int) or isinstance(layer, bool) or layer < 1:
            raise ValueError("layer must be a positive integer for qaoa")
    elif layer is not None:
        raise ValueError("layer only applies to method=qaoa")

    reference_mode = value.get("referenceMode", "auto")
    if reference_mode not in ("auto", "required", "skip"):
        raise ValueError("Invalid referenceMode")
    return {
        "referenceMode": reference_mode,
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
    QUBO_QAOA, _, QuadraticBinary = qubo_api()

    problem = {
        "quadratic": request["quadratic"],
        "linear": request["linear"],
        "constant": request["constant"],
    }
    binary = QuadraticBinary(problem)
    n_key, n_res = (int(number) for number in binary.query_qnumber())

    mode = request["referenceMode"]
    run_classical = request["method"] == "traversal" or mode == "required" or (mode == "auto" and request["size"] <= 12)
    classical = None
    consistency_error = None
    if run_classical:
        assignments_raw, minimum_value = binary.qubobytraversal()
        assignments = [[int(bit) for bit in assignment] for assignment in assignments_raw]
        minimum_value = float(minimum_value)
        if assignments:
            consistency_error = abs(float(binary.function_value(assignments[0])) - minimum_value)
        classical = {"method": "qubobytraversal", "optimalAssignments": assignments, "minimumValue": minimum_value}

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
        "classical": classical,
        "classicalRole": "main" if request["method"] == "traversal" else ("reference" if run_classical else "not_run"),
        "reference": {"mode": mode, "status": "computed" if run_classical and request["method"] == "qaoa" else "not_run",
            "reason": "Classical traversal used for comparison." if run_classical and request["method"] == "qaoa" else "No additional classical reference; traversal is still executed when selected as the main algorithm."},
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


def main() -> None:
    raw = sys.stdin.buffer.read()
    value = json.loads(raw.decode("utf8"))
    if not is_record(value) or set(value) - {"action", "request"}:
        raise ValueError("bridge envelope is invalid")
    action = value.get("action")
    if action == "solve":
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
