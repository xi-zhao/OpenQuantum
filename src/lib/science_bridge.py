"""JSON framing for isolated scientific workers; no registry or agent runtime."""
import contextlib
import json
import sys


def execute(compute):
    request = json.load(sys.stdin)
    with contextlib.redirect_stdout(sys.stderr):
        result, limitations = compute(request["input"])
    json.dump({
        "schemaVersion": "1.0", "source": request["source"],
        "input": request["input"], "inputSha256": request["inputSha256"],
        "dependencyLockSha256": request["dependencyLockSha256"],
        "result": result, "scientificValidation": "not_evaluated", "limitations": limitations,
    }, sys.stdout, allow_nan=False)


def tensor_product(operators):
    import numpy as np
    result = np.ones((1, 1), dtype=complex)
    for operator in operators:
        result = np.kron(result, operator)
    return result


def json_integer(value):
    """Keep ordinary JSON numbers compatible and serialize large integers exactly."""
    value = int(value)
    if abs(value) <= 2 ** 53 - 1:
        return value
    if hasattr(sys, "set_int_max_str_digits"):
        sys.set_int_max_str_digits(0)
    return str(value)
