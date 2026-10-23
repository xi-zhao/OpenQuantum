"""Serialization and representation checks for isolated SDK circuit workers."""

def check_statevector_representation(n):
    import numpy as np
    max_qubits = (int(np.iinfo(np.intp).max) // np.dtype(np.complex128).itemsize).bit_length() - 1
    if n > max_qubits:
        raise ValueError("State vector exceeds the backend's addressable array representation")


def statevector_result(state, n, backend):
    import numpy as np
    state = np.asarray(state, dtype=complex).reshape(-1)
    if len(state) != 2**n or not np.isfinite(state).all():
        raise ValueError("SDK returned a nonfinite or incorrectly sized state vector")
    probabilities = abs(state)**2
    return {"numQubits": n, "outcomes": [
        {"bits": format(i, f"0{n}b"), "amplitude": [float(a.real), float(a.imag)], "probability": float(probabilities[i])}
        for i, a in enumerate(state)], "normError": abs(float(probabilities.sum()) - 1),
        "backend": backend, "bitOrder": "leftmost bit is qubit 0"}


UNITARY_LIMITATIONS = [
    "Ideal unitary gates from an all-zero input; no noise, finite-shot measurement, feed-forward or device calibration.",
    "Raw numerical amplitudes and probabilities are not clipped or renormalized and do not predict QPU fidelity.",
    "Full state vectors require memory proportional to 2^N; caller chooses size and execution resources.",
    "Local SDK simulation only; no cloud submission, account lookup or hardware connection. Scientific acceptance is not evaluated.",
]
