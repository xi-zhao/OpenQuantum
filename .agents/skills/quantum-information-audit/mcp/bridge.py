"""Bounded JSON bridge to pinned toqito density-matrix operations."""

from __future__ import annotations

import hashlib
import json
import math
import platform
import sys
from importlib.metadata import version
from typing import Any

import numpy as np
from toqito.matrix_ops import partial_transpose
from toqito.matrix_props import is_density

PACKAGE_VERSION = "1.3.1"
MAX_DIMENSION = 16
MAX_ABS_COEFFICIENT = 1e6


def finite_number(value: Any, field: str) -> int | float:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ValueError(f"{field} must be a finite number")
    number = float(value)
    if not math.isfinite(number) or abs(number) > MAX_ABS_COEFFICIENT:
        raise ValueError(f"{field} must be within +/-{MAX_ABS_COEFFICIENT}")
    # Preserve JSON integer/float spelling so the cross-language canonical
    # digest is identical to JSON.stringify after the JS boundary check.
    return 0 if number == 0 else value


def matrix(value: Any, dimension: int, field: str) -> list[list[float]]:
    if not isinstance(value, list) or len(value) != dimension:
        raise ValueError(f"{field} must be a {dimension}x{dimension} matrix")
    result: list[list[float]] = []
    for row_index, row in enumerate(value):
        if not isinstance(row, list) or len(row) != dimension:
            raise ValueError(f"{field} must be a {dimension}x{dimension} matrix")
        result.append(
            [finite_number(cell, f"{field}[{row_index}][{column_index}]") for column_index, cell in enumerate(row)]
        )
    return result


def normalize_request(value: Any) -> dict[str, Any]:
    allowed = {"matrixReal", "matrixImag", "subsystemDimensions", "transposeSubsystems"}
    if not isinstance(value, dict) or set(value) - allowed:
        raise ValueError("density-matrix audit request is invalid")
    dimensions = value.get("subsystemDimensions")
    if (
        not isinstance(dimensions, list)
        or len(dimensions) < 2
        or any(isinstance(item, bool) or not isinstance(item, int) or item < 2 for item in dimensions)
    ):
        raise ValueError("subsystemDimensions must contain at least two integers >= 2")
    dimension = math.prod(dimensions)
    if dimension > MAX_DIMENSION:
        raise ValueError(f"total matrix dimension must not exceed {MAX_DIMENSION}")
    real = matrix(value.get("matrixReal"), dimension, "matrixReal")
    imag = (
        [[0.0] * dimension for _ in range(dimension)]
        if value.get("matrixImag") is None
        else matrix(value.get("matrixImag"), dimension, "matrixImag")
    )
    subsystems = value.get("transposeSubsystems")
    if (
        not isinstance(subsystems, list)
        or not 1 <= len(subsystems) < len(dimensions)
        or any(isinstance(item, bool) or not isinstance(item, int) or not 0 <= item < len(dimensions) for item in subsystems)
        or len(set(subsystems)) != len(subsystems)
    ):
        raise ValueError("transposeSubsystems must be a unique, non-empty proper subset")
    return {
        "matrixReal": real,
        "matrixImag": imag,
        "subsystemDimensions": dimensions,
        "transposeSubsystems": sorted(subsystems),
    }


def complex_value(value: complex) -> dict[str, float]:
    return {"real": float(np.real(value)), "imag": float(np.imag(value))}


def hermiticity_residual(value: np.ndarray) -> float:
    return float(np.max(np.abs(value - value.conj().T)))


def canonical_digest(request: dict[str, Any]) -> str:
    encoded = json.dumps(request, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf8")
    return hashlib.sha256(encoded).hexdigest()


def audit_payload(request: dict[str, Any]) -> dict[str, Any]:
    rho = np.asarray(request["matrixReal"], dtype=float) + 1j * np.asarray(request["matrixImag"], dtype=float)
    hermitian_part = (rho + rho.conj().T) / 2
    state_eigenvalues = np.linalg.eigvalsh(hermitian_part)
    transposed = partial_transpose(
        rho,
        sys=request["transposeSubsystems"],
        dim=request["subsystemDimensions"],
    )
    transposed_hermitian_part = (transposed + transposed.conj().T) / 2
    transpose_eigenvalues = np.linalg.eigvalsh(transposed_hermitian_part)
    return {
        "schemaVersion": "1.0",
        "packageVersion": version("toqito"),
        "requestDigest": canonical_digest(request),
        "state": {
            "dimension": int(rho.shape[0]),
            "trace": complex_value(np.trace(rho)),
            "hermiticityResidual": hermiticity_residual(rho),
            "hermitianPartMinimumEigenvalue": float(state_eigenvalues[0]),
            "purity": complex_value(np.trace(rho @ rho)),
            "numericalRank": int(np.sum(state_eigenvalues > 1e-10)),
            "toqitoDensity": bool(is_density(rho)),
        },
        "partialTranspose": {
            "subsystems": request["transposeSubsystems"],
            "trace": complex_value(np.trace(transposed)),
            "hermiticityResidual": hermiticity_residual(transposed),
            "eigenvalues": [float(item) for item in transpose_eigenvalues],
            "minimumEigenvalue": float(transpose_eigenvalues[0]),
            "negativity": float(np.sum(np.maximum(0, -transpose_eigenvalues))),
        },
    }


def runtime_payload() -> dict[str, Any]:
    return {
        "schemaVersion": "1.0",
        "packageVersion": version("toqito"),
        "pythonVersion": platform.python_version(),
        "maxDimension": MAX_DIMENSION,
        "operations": ["is_density", "partial_transpose", "negativity_reconstruction"],
        "cloudExecutionEnabled": False,
    }


def main() -> None:
    raw = sys.stdin.buffer.read(512 * 1024 + 1)
    if len(raw) > 512 * 1024:
        raise ValueError("bridge request is too large")
    envelope = json.loads(raw.decode("utf8"))
    if not isinstance(envelope, dict) or set(envelope) - {"action", "request"}:
        raise ValueError("bridge envelope is invalid")
    action = envelope.get("action")
    if action == "runtime":
        output = runtime_payload()
    elif action == "audit":
        output = audit_payload(normalize_request(envelope.get("request")))
    else:
        raise ValueError("bridge action is invalid")
    print(json.dumps(output, ensure_ascii=False, separators=(",", ":")))


if __name__ == "__main__":
    try:
        main()
    except Exception as error:  # noqa: BLE001 - process boundary returns one JSON error
        print(json.dumps({"error": str(error)}, ensure_ascii=False), file=sys.stderr)
        raise SystemExit(1)
