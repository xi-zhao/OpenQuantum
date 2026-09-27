"""Interchange validation and serialization, with no circuit simulator or derivative."""
import numpy as np

BIT_ORDER = "lexicographic bitstrings q0 q1 ...; q0 is the leftmost, most significant bit"


def check_representation(value):
    # The requested full complex128 vector must fit the backend's addressable array.
    if value["numQubits"] > int(np.iinfo(np.intp).max // np.dtype(np.complex128).itemsize).bit_length() - 1:
        raise ValueError("Full state vector exceeds the backend's addressable complex128 array representation")


def format_result(value, state, expectations, jacobian, backend, gradient_method):
    state = np.asarray(state, dtype=np.complex128).reshape(-1)
    expectations = np.asarray(expectations, dtype=np.float64).reshape(-1)
    jacobian = np.asarray(jacobian, dtype=np.float64).reshape(len(value["observables"]), len(value["trainableGateIndices"]))
    if len(state) != 2 ** value["numQubits"] or len(expectations) != len(value["observables"]):
        raise ValueError("SDK returned an unexpected state or observable dimension")
    if not all(np.all(np.isfinite(item)) for item in [state, expectations, jacobian]):
        raise ValueError("SDK returned nonfinite numerical values")
    probabilities = np.abs(state) ** 2
    return {
        "numQubits": value["numQubits"],
        "amplitudes": np.column_stack([state.real, state.imag]).tolist(),
        "probabilities": probabilities.tolist(),
        "stateNormSquared": float(probabilities.sum()),
        "expectations": expectations.tolist(),
        "jacobian": jacobian.tolist(),
        "trainableGateIndices": value["trainableGateIndices"],
        "bitOrder": BIT_ORDER, "angleUnit": "rad", "backend": backend,
        "gradientMethod": gradient_method,
    }, [
        "Ideal pure-state simulation from the all-zero state, with no noise or finite-shot sampling.",
        "Each selected rotation angle is an independent parameter; no parameter sharing, optimization loop or hardware execution.",
        "Probabilities and amplitudes are raw numerical outputs without clipping or renormalization; full state output grows as 2^numQubits.",
        "This L1 execution does not establish scientific Acceptance or external-model validation.",
    ]
