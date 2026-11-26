"""Independent request-only BP+LSD replay; never imports the Tool bridge."""
import json
import math
import platform
import sys
from importlib.metadata import version


def bits(value, width):
    return isinstance(value, list) and len(value) == width and all(type(x) is int and x in (0, 1) for x in value)


def parity(matrix, vector):
    return [sum(a * b for a, b in zip(row, vector)) % 2 for row in matrix]


def normalize(raw):
    if not isinstance(raw, dict) or set(raw) - {"parityCheck", "syndromes", "errorRate", "bpIterations", "lsdOrder", "execution", "trueErrors", "logicalObservables"}:
        raise ValueError("Unknown LDPC input")
    v = {"errorRate": 0.05, "bpIterations": 10, "lsdOrder": 0, "execution": {}, **raw}
    h, syndromes = v.get("parityCheck"), v.get("syndromes")
    if not isinstance(h, list) or not h or not isinstance(h[0], list) or not h[0]:
        raise ValueError("Missing parity matrix")
    n, m = len(h[0]), len(h)
    if not all(bits(row, n) and any(row) for row in h) or not isinstance(syndromes, list) or not syndromes or not all(bits(row, m) for row in syndromes):
        raise ValueError("Nonbinary or dimensionally inconsistent input")
    if type(v["errorRate"]) not in (int, float) or not math.isfinite(v["errorRate"]) or not 0 <= v["errorRate"] <= 1:
        raise ValueError("Invalid error probability")
    if type(v["bpIterations"]) is not int or v["bpIterations"] < 1 or type(v["lsdOrder"]) is not int or v["lsdOrder"] < 0:
        raise ValueError("Invalid decoder options")
    for syndrome in syndromes:
        rows = [row[:] + [s] for row, s in zip(h, syndrome)]
        pivot = 0
        for col in range(n):
            found = next((i for i in range(pivot, m) if rows[i][col]), None)
            if found is None:
                continue
            rows[pivot], rows[found] = rows[found], rows[pivot]
            for i in range(pivot + 1, m):
                if rows[i][col]:
                    rows[i] = [a ^ b for a, b in zip(rows[i], rows[pivot])]
            pivot += 1
        if any(not any(row[:n]) and row[n] for row in rows):
            raise ValueError("Inconsistent GF(2) syndrome")
    errors = v.get("trueErrors")
    if errors is not None and (not isinstance(errors, list) or len(errors) != len(syndromes) or not all(bits(e, n) and parity(h, e) == s for e, s in zip(errors, syndromes))):
        raise ValueError("Invalid supplied true errors")
    logical = v.get("logicalObservables")
    if logical is not None and (errors is None or not isinstance(logical, list) or not logical or not all(bits(row, n) for row in logical)):
        raise ValueError("Invalid supplied logical parity vectors")
    return v


def replay(raw):
    v = normalize(raw)
    import numpy as np
    from ldpc.bplsd_decoder import BpLsdDecoder
    decoder = BpLsdDecoder(np.asarray(v["parityCheck"], dtype=np.uint8), error_rate=v["errorRate"],
        bp_method="product_sum", max_iter=v["bpIterations"], schedule="serial", lsd_method="lsd_cs", lsd_order=v["lsdOrder"])
    estimates, flags, iterations = [], [], []
    for syndrome in v["syndromes"]:
        if not any(syndrome):
            estimates.append([0] * len(v["parityCheck"][0])); flags.append(True); iterations.append(0)
        else:
            estimates.append([int(x) for x in decoder.decode(np.asarray(syndrome, dtype=np.uint8))])
            flags.append(bool(decoder.converge)); iterations.append(int(decoder.iter))
    return {"schemaVersion": "1.0", "request": v, "corrections": estimates, "bpConverged": flags, "bpIterationsUsed": iterations,
        "runtime": {"ldpc": version("ldpc"), "numpy": np.__version__, "system": platform.system(), "machine": platform.machine()}}


if __name__ == "__main__":
    try:
        print(json.dumps(replay(json.load(sys.stdin)), allow_nan=False))
    except ImportError:
        print(json.dumps({"status": "not_checked", "reason": "Prepared LDPC runtime unavailable"}))
        sys.exit(2)
    except (TypeError, ValueError, KeyError) as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
