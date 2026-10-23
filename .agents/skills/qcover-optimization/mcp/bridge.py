"""Qcover's graph-decomposed QAOA energy, with pinned legacy SDK dependencies."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[4] / "src/lib"))
from science_bridge import execute


def compute(v):
    # Qcover 2.6.0 uses the Python <=3.9 spelling. Scope the compatibility alias
    # to this isolated worker; never edit the installed upstream package.
    import collections
    import collections.abc
    if not hasattr(collections, "Callable"):
        collections.Callable = collections.abc.Callable
    import networkx as nx
    import numpy as np
    from Qcover.core import Qcover
    from Qcover.backends import CircuitByQulacs

    graph = nx.Graph()
    graph.add_nodes_from((i, {"weight": field}) for i, field in enumerate(v["fields"]))
    graph.add_weighted_edges_from((edge["source"], edge["target"], edge["coupling"]) for edge in v["edges"])
    backend = CircuitByQulacs(is_parallel=False)
    solver = Qcover(graph=graph, p=len(v["gammas"]), backend=backend)
    energy = float(solver.calculate(np.asarray(v["gammas"] + v["betas"], dtype=float)))
    subgraphs = solver.graph_decomposition(len(v["gammas"]))
    return {
        "numQubits": len(v["fields"]), "layers": len(v["gammas"]), "energy": energy,
        "subgraphCount": len(subgraphs), "largestSubgraphQubits": max(len(g) for g in subgraphs.values()),
        "edgeExpectations": [{"source": int(a), "target": int(b), "zz": float(value)} for (a, b), value in sorted(backend.element_expectation.items())],
        "backend": "Qcover CircuitByQulacs",
        "hamiltonianConvention": "sum_i fields[i] Z_i + sum_edges coupling Z_source Z_target",
    }, [
        "This evaluates supplied QAOA parameters, not a guaranteed optimum or a hardware result.",
        "Qcover applies cost RZ(2 gamma weight) and mixer RX(2 beta) using Qulacs's positive-exponent rotation convention.",
        "Graph decomposition can still require exponentially large subgraph state vectors. Layer count and graph size are caller selected.",
        "Qcover 2.6.0 requires a pinned legacy dependency environment and a worker-local collections.Callable compatibility alias.",
    ]


if __name__ == "__main__":
    execute(compute)
