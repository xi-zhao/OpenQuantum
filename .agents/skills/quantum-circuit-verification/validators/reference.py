"""Independent, bounded OpenQASM 2 unitary reference; never imports MQT."""

from __future__ import annotations

import hashlib
import json
import math
import re
import sys
from importlib.metadata import version

MAX_BYTES = 65536
MAX_DENSE_QUBITS = 8


def validate_unitary_domain(circuit):
    from qiskit.circuit import Barrier, Gate

    if circuit.num_clbits or not math.isfinite(float(circuit.global_phase)):
        raise ValueError("Reference input must have finite unitary semantics")
    for instruction in circuit.data:
        operation = instruction.operation
        if isinstance(operation, Barrier):
            continue
        if not isinstance(operation, Gate) or any(not math.isfinite(float(value)) for value in operation.params):
            raise ValueError("Reference input must have finite unitary gates")
        # OpenQASM custom-gate bodies may be lazily expanded by Qiskit. Validate
        # those expressions too, without allocating a full-circuit matrix.
        if operation.definition is not None:
            validate_unitary_domain(operation.definition)


def reference(request: dict) -> dict:
    if not isinstance(request, dict) or set(request) != {"circuitAOpenQasm2", "circuitBOpenQasm2"}:
        raise ValueError("Invalid independent reference request")
    sources = [request["circuitAOpenQasm2"], request["circuitBOpenQasm2"]]
    for source in sources:
        if not isinstance(source, str) or not 0 < len(source.encode("utf8")) <= MAX_BYTES:
            raise ValueError("Invalid reference input size")
        stripped = re.sub(r'"[^"\r\n]*"|//[^\r\n]*|/\*.*?\*/',
                          lambda match: match[0] if match[0].startswith('"') else " ", source, flags=re.S)
        if re.search(r"\b(measure|reset|if|creg|opaque)\b", stripped, re.I):
            raise ValueError("Reference input must be unitary")
        includes = re.findall(r'\binclude\s+"([^"]+)"\s*;', stripped)
        if any(value != "qelib1.inc" for value in includes):
            raise ValueError("Reference include is not allowed")
    result = {
        "schemaVersion": "1.0",
        "engine": {"name": "qiskit", "version": version("qiskit")},
        "inputDigests": {
            "circuitA": hashlib.sha256(sources[0].encode("utf8")).hexdigest(),
            "circuitB": hashlib.sha256(sources[1].encode("utf8")).hexdigest(),
        },
        "maxDenseQubits": MAX_DENSE_QUBITS,
    }
    from qiskit import qasm2
    from qiskit.quantum_info import Operator
    import numpy as np

    try:
        # qelib1.inc is supplied by Qiskit's parser; no user directory is searched.
        circuits = [qasm2.loads(source, include_path=()) for source in sources]
    except qasm2.QASM2ParseError:
        return {**result, "mode": "unavailable", "reason": "reference_parser_does_not_support_input"}
    if circuits[0].num_qubits != circuits[1].num_qubits or not 1 <= circuits[0].num_qubits <= 16:
        raise ValueError("Independent qubit counts differ or exceed the scientific audit scope")
    for circuit in circuits:
        validate_unitary_domain(circuit)
    if sources[0] == sources[1]:
        return {**result, "mode": "input-identity", "qubits": circuits[0].num_qubits,
                "unitaryDomainChecked": True, "strictResidual": 0.0,
                "globalPhaseResidual": 0.0, "phase": {"real": 1.0, "imag": 0.0}}
    if circuits[0].num_qubits > MAX_DENSE_QUBITS:
        return {**result, "mode": "unavailable", "reason": "dense_reference_budget_exceeded",
                "qubits": circuits[0].num_qubits}
    left, right = [Operator(circuit).data for circuit in circuits]
    if not np.isfinite(left).all() or not np.isfinite(right).all():
        raise ValueError("Non-finite independent matrix")
    overlap = np.vdot(right, left)
    phase = overlap / abs(overlap) if abs(overlap) > 1e-14 else 1.0 + 0.0j
    return {**result, "mode": "dense-unitary", "qubits": circuits[0].num_qubits,
            "basisOrder": "qubit 0 is the least significant bit; declarations are flattened in order",
            "strictResidual": float(np.max(np.abs(left - right))),
            "globalPhaseResidual": float(np.max(np.abs(left - phase * right))),
            "phase": {"real": float(np.real(phase)), "imag": float(np.imag(phase))}}


if __name__ == "__main__":
    try:
        raw = sys.stdin.buffer.read(256 * 1024 + 1)
        if len(raw) > 256 * 1024:
            raise ValueError("Independent reference request is too large")
        print(json.dumps(reference(json.loads(raw)), allow_nan=False, separators=(",", ":")))
    except Exception as error:
        # Error text may quote user input. Return only the class at this boundary.
        print(json.dumps({"error": type(error).__name__}), file=sys.stderr)
        raise SystemExit(1)
