"""Ocean classical CPU samplers and model conversion, with no Leap client."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[4] / "src/lib"))
from science_bridge import execute


def compute(v):
    import numpy as np
    import dimod
    from dwave.samplers import SimulatedAnnealingSampler

    n = len(v["linear"])
    model = dimod.BinaryQuadraticModel(
        dict(enumerate(v["linear"])), {(row["i"], row["j"]): row["bias"] for row in v["quadratic"]},
        v["offset"], getattr(dimod, v["vartype"]),
    )
    if v["method"] == "exact":
        # ExactSolver creates an int8 array with shape (2^N, N).
        if n >= int(np.iinfo(np.intp).max).bit_length() or (1 << n) * n > int(np.iinfo(np.intp).max):
            raise ValueError("Exact enumeration exceeds the backend's addressable array representation")
        samples = dimod.ExactSolver().sample(model)
        backend = "dimod.ExactSolver"
    else:
        samples = SimulatedAnnealingSampler().sample(model, num_reads=v["numReads"], num_sweeps=v["numSweeps"], seed=v["seed"])
        backend = "dwave.samplers.SimulatedAnnealingSampler"

    def describe(m):
        pairs = [(min(i, j), max(i, j), float(bias)) for (i, j), bias in m.quadratic.items()]
        return {"linear": [float(m.get_linear(i)) for i in range(n)],
                "quadratic": [{"i": i, "j": j, "bias": b} for i, j, b in sorted(pairs)], "offset": float(m.offset)}

    rows = [{"values": [int(row.sample[i]) for i in range(n)], "energy": float(row.energy),
             "numOccurrences": int(row.num_occurrences)} for row in samples.aggregate().data()]
    rows.sort(key=lambda row: (row["energy"], row["values"]))
    if any(not np.isfinite(row["energy"]) for row in rows):
        raise ValueError("Ocean returned a nonfinite energy; reduce coefficient magnitudes")
    return {
        "vartype": v["vartype"], "samples": rows, "binaryModel": describe(model.binary), "spinModel": describe(model.spin),
        "minimumEnergyFound": rows[0]["energy"], "exhaustive": v["method"] == "exact", "backend": backend,
    }, [
        "Both samplers are classical CPU algorithms. This call does not use quantum annealing hardware, Leap services or hybrid cloud solvers.",
        "Energy is offset + sum_i linear[i]*v_i + sum_{i<j} quadratic[i,j]*v_i*v_j; BINARY v is 0/1 and SPIN v is -1/+1, with s=2*x-1.",
        "ExactSolver enumerates 2^N configurations. Simulated annealing is heuristic and minimumEnergyFound is not an optimality certificate.",
        "numReads, numSweeps and seed apply only to simulated annealing. Exact mode returns each configuration once; scientific acceptance is not evaluated.",
    ]


if __name__ == "__main__":
    execute(compute)
