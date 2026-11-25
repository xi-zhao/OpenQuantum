"""Request-only reference: no Tool bridge, Qiskit or reported result is imported.

Bit-index Pauli matrices, Hermitian eigendecomposition and analytic Pauli
exponentials independently check the circuit implementation. Dense references
follow auto <= 6 / required / skip; schedule checks do not require dense memory.
"""
import hashlib
import json
import math
import platform
import sys
from collections import Counter

try:
    import numpy as np
except ImportError:
    print(json.dumps({"status": "not_checked", "reason": "Prepared NumPy unavailable; no installation attempted"}))
    raise SystemExit(2)


def normalize(raw):
    allowed = {"numQubits", "terms", "time", "method", "steps", "order", "seed", "initialState", "outputMode", "referenceMode", "execution"}
    if not isinstance(raw, dict) or set(raw) - allowed:
        raise ValueError("Invalid request fields")
    v = dict(raw)
    for key, default in {"method": "trotter", "steps": 32, "initialState": "zero", "outputMode": "statevector", "referenceMode": "auto", "execution": {}}.items():
        v.setdefault(key, default)
    def integer(x, minimum):
        return type(x) is int and minimum <= x <= 2 ** 53 - 1
    def finite(x):
        return type(x) in (int, float) and math.isfinite(x)
    n = v.get("numQubits")
    if not integer(n, 1) or not integer(v["steps"], 1) or not finite(v.get("time")):
        raise ValueError("Invalid qubits, steps or time")
    if not isinstance(v.get("terms"), list) or not v["terms"]:
        raise ValueError("Nonempty real Pauli terms required")
    for item in v["terms"]:
        if not isinstance(item, dict) or set(item) != {"pauli", "coefficient"} or not isinstance(item["pauli"], str) or len(item["pauli"]) != n or set(item["pauli"]) - set("IXYZ") or not finite(item["coefficient"]):
            raise ValueError("Only Hermitian real Pauli terms of numQubits length are supported")
    if not math.isfinite(math.fsum(abs(t["coefficient"]) for t in v["terms"]) * v["time"]):
        raise ValueError("Nonfinite Hamiltonian scale")
    if v["method"] == "trotter":
        v.setdefault("order", 2)
        if "seed" in v or not integer(v["order"], 1) or v["order"] != 1 and v["order"] % 2:
            raise ValueError("Trotter order must be 1 or even; seed is qDrift only")
    elif v["method"] == "qdrift":
        v.setdefault("seed", 0)
        if "order" in v or not integer(v["seed"], 0):
            raise ValueError("qDrift requires an integer seed and no Trotter order")
    else:
        raise ValueError("Unsupported method")
    if v["outputMode"] not in ("statevector", "circuit") or v["referenceMode"] not in ("auto", "required", "skip"):
        raise ValueError("Invalid output/reference mode")
    initial = v["initialState"]
    if isinstance(initial, str):
        if initial not in ("zero", "plus"):
            raise ValueError("Unknown initial state")
    else:
        if not isinstance(initial, list) or len(initial) != 2 ** n or any(not isinstance(z, list) or len(z) != 2 or not all(finite(x) for x in z) for z in initial):
            raise ValueError("Initial state requires 2^n finite complex pairs")
        if abs(math.fsum(a*a+b*b for a, b in initial) - 1) > 1e-10:
            raise ValueError("Initial state is not normalized")
    if v["outputMode"] == "circuit" and initial != "zero":
        raise ValueError("Circuit-only mode requires the default initial state")
    if not isinstance(v["execution"], dict) or set(v["execution"]) - {"threads", "timeoutMs", "maxOutputBytes"} or any(not integer(x, 1 if k == "threads" else 0) for k, x in v["execution"].items()):
        raise ValueError("Invalid execution settings")
    return v


def pauli(word):
    """Apply bit flips/phases to basis columns; deliberately no Kronecker code."""
    n, size = len(word), 2 ** len(word)
    p = np.zeros((size, size), complex)
    for column in range(size):
        row, phase = column, 1 + 0j
        for wire, letter in enumerate(word):
            mask = 1 << (n - wire - 1)
            bit = bool(column & mask)
            if letter in "XY":
                row ^= mask
            if letter == "Y":
                phase *= -1j if bit else 1j
            elif letter == "Z" and bit:
                phase *= -1
        p[row, column] = phase
    return p


def formula_weights(length, order):
    if order == 1:
        return [(i, 1.0) for i in range(length)]
    symmetric = [(i, .5) for i in range(length-1)] + [(length-1, 1.0)] + [(i, .5) for i in range(length-2, -1, -1)]
    for degree in range(4, order+1, 2):
        factor = 1 / (4 - 4 ** (1 / (degree-1)))
        symmetric = [(i, weight * part) for part in (factor, factor, 1 - 4*factor, factor, factor) for i, weight in symmetric]
    return symmetric


def bound(lam, time, steps, order, absolute_weight):
    # Matching Taylor coefficients through order p cancel. Each remainder is
    # bounded by exp(x)*x^(p+1)/(p+1)!; telescoping over N unitary slices adds N.
    b = lam * abs(time) / steps
    a = absolute_weight * abs(time) / steps
    def remainder(x):
        if x == 0:
            return 0.0
        log_value = x + (order + 1) * math.log(x) - math.lgamma(order + 2)
        return math.exp(min(2.0, log_value))
    return min(2.0, steps * (remainder(a) + remainder(b)))


def reference(raw):
    v = normalize(raw)
    grouped = {}
    for item in v["terms"]:
        grouped.setdefault(item["pauli"], []).append(item["coefficient"])
    combined = [(p, math.fsum(c)) for p, c in grouped.items()]
    identity = next((c for p, c in combined if p == "I" * v["numQubits"]), 0.0)
    terms = [(p, c) for p, c in combined if p != "I" * v["numQubits"] and c != 0]
    lam = math.fsum(abs(c) for _, c in terms)
    active = bool(terms) and v["time"] != 0
    dense = v["referenceMode"] == "required" or v["referenceMode"] == "auto" and v["numQubits"] <= 6
    weights = formula_weights(len(terms), v["order"]) if terms and v["method"] == "trotter" else []
    matrices = [pauli(p) for p, _ in terms] if dense else []
    if dense:
        size = 2 ** v["numQubits"]
        eye = np.eye(size, dtype=complex)
        h = identity * eye + sum((c*p for (_, c), p in zip(terms, matrices)), np.zeros_like(eye))
        if not np.allclose(h, h.conj().T, atol=1e-12, rtol=0):
            raise ValueError("Non-Hermitian Hamiltonian")
        energies, basis = np.linalg.eigh(h)
        exact = (basis * np.exp(-1j * v["time"] * energies)) @ basis.conj().T
        initial = np.zeros(size, complex)
        initial[0] = 1
        if v["initialState"] == "plus":
            initial[:] = 1 / math.sqrt(size)
        elif isinstance(v["initialState"], list):
            initial = np.asarray([complex(a, b) for a, b in v["initialState"]])

    def schedule(steps):
        if not active:
            return
        if v["method"] == "qdrift":
            rng = np.random.Generator(np.random.PCG64(v["seed"]))
            probabilities = np.array([abs(c)/lam for _, c in terms])
            for _ in range(steps):
                i = int(rng.choice(len(terms), p=probabilities))
                yield i, float(np.sign(terms[i][1])) * lam * (v["time"] / steps)
        else:
            for _ in range(steps):
                for i, weight in weights:
                    yield i, terms[i][1] * ((v["time"] / steps) * weight)

    def evolution(steps):
        unitary = np.exp(-1j * identity * v["time"]) * eye
        for i, angle in schedule(steps):
            unitary = (math.cos(angle) * eye - 1j * math.sin(angle) * matrices[i]) @ unitary
        return unitary

    gates, levels = [], [0] * v["numQubits"]
    counts, term_counts, sequence_digest = Counter(), Counter(), hashlib.sha256()
    rotations = 0
    def gate(name, qubits, angle=None):
        entry = {"name": name, "qubits": qubits}
        if angle is not None:
            entry["angle"] = angle
        gates.append(entry)
        counts[name] += 1
        depth = max(levels[q] for q in qubits) + 1
        for q in qubits:
            levels[q] = depth
    for i, angle in schedule(v["steps"]):
        word = terms[i][0]
        sequence_digest.update(json.dumps([word, angle], separators=(",", ":")).encode() + b"\n")
        rotations += 1
        term_counts[i] += 1
        support = [q for q, p in enumerate(word) if p != "I"]
        for q in support:
            if word[q] == "Y":
                gate("sdg", [q])
            if word[q] in "XY":
                gate("h", [q])
        edges = list(zip(support[:-1], support[1:]))
        for edge in edges:
            gate("cx", list(edge))
        gate("rz", [support[-1]], 2 * angle)
        for edge in edges[::-1]:
            gate("cx", list(edge))
        for q in support:
            if word[q] in "XY":
                gate("h", [q])
            if word[q] == "Y":
                gate("s", [q])
    result = {
        "request": v,
        "runtime": {"numpy": np.__version__, "system": platform.system(), "machine": platform.machine()},
        "terms": [{"pauli": p, "coefficient": c} for p, c in terms], "identityCoefficient": identity, "lambda": lam,
        "pauliRotations": rotations,
        "sampledTermCounts": [term_counts[i] for i in range(len(terms))] if v["method"] == "qdrift" else [],
        "sequenceSha256": sequence_digest.hexdigest(), "gates": gates,
        "circuit": {"gates": sum(counts.values()), "gateCounts": dict(counts), "twoQubitGates": counts["cx"], "depth": max(levels), "globalPhase": -identity * v["time"]},
        "dense": None, "refinements": [],
    }
    if dense:
        approximate = evolution(v["steps"])
        final = approximate @ initial
        exact_state = exact @ initial
        difference = approximate - exact
        pairs = lambda a: [[float(z.real), float(z.imag)] for z in a]
        result["dense"] = {"statevector": pairs(final), "exactState": pairs(exact_state),
            "unitaryFrobeniusError": float(np.linalg.norm(difference, "fro")), "unitarySpectralError": float(np.linalg.norm(difference, 2)),
            "stateFidelity": float(abs(np.vdot(exact_state, final)) ** 2)}
        if v["method"] == "trotter":
            absolute_weight = math.fsum(abs(terms[i][1] * weight) for i, weight in weights)
            for steps in (v["steps"], 2*v["steps"], 4*v["steps"]):
                error = float(np.linalg.norm(evolution(steps) - exact, 2))
                result["refinements"].append({"steps": steps, "spectralError": error,
                    "bound": bound(lam, v["time"], steps, v["order"], absolute_weight)})
    return result


if __name__ == "__main__":
    try:
        print(json.dumps(reference(json.load(sys.stdin)), allow_nan=False, separators=(",", ":")))
    except Exception as error:
        print(f"{type(error).__name__}: {error}", file=sys.stderr)
        raise SystemExit(1)
