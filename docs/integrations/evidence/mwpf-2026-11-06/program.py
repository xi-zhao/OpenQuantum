"""Editable MWPF program; public SDK access is not limited to these fixtures."""
import argparse
import importlib.metadata
import json
from pathlib import Path

import mwpf
import numpy as np
import stim

DEFAULT_GRAPH = {
    "vertex_count": 4,
    "edges": [[[0, 1], 100], [[1, 2], 100], [[2, 3], 100], [[0], 100], [[0, 1, 2], 60]],
    "syndrome": [0, 1, 3],
}


def solve_hypergraph(graph, cluster_node_limit=None):
    """Omit the cluster limit for upstream defaults; zero is a real finite limit."""
    initializer = mwpf.SolverInitializer(
        graph["vertex_count"], [mwpf.HyperEdge(vertices, weight) for vertices, weight in graph["edges"]]
    )
    config = {} if cluster_node_limit is None else {"cluster_node_limit": cluster_node_limit}
    solver = mwpf.SolverSerialJointSingleHair(initializer, config=config)
    solver.solve(mwpf.SyndromePattern(graph["syndrome"]))
    edges, bounds = solver.subgraph_range()
    return {
        "edges": list(edges),
        "weight": sum(graph["edges"][i][1] for i in edges),
        "lowerBound": bounds.lower.float(),
        "upperBound": bounds.upper.float(),
        "requestedClusterNodeLimit": cluster_node_limit,
        "effectiveConfig": solver.config,
        "fallbackObserved": "not_exposed_by_this_interface",
    }


def decode_detector_samples(dem, detectors, cluster_node_limit=50):
    """A decoder panic is a failed computation, never a substitute prediction."""
    if (not isinstance(detectors, np.ndarray) or detectors.dtype != np.uint8
            or detectors.ndim != 2 or detectors.shape[1] != (dem.num_detectors + 7) // 8):
        raise ValueError("detectors must be a uint8 shot-by-ceil(num_detectors/8) little-endian array")
    decoder = mwpf.SinterMWPFDecoder(
        cluster_node_limit=cluster_node_limit, panic_action=mwpf.PanicAction.RAISE
    ).compile_decoder_for_dem(dem=dem)
    return decoder.decode_shots_bit_packed(bit_packed_detection_event_data=detectors)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--input", type=Path, help="JSON with vertex_count, [vertices, weight] edges and syndrome")
    mode.add_argument("--dem", type=Path, help="Stim DEM; sample and decode without changing its error mechanisms")
    parser.add_argument("--cluster-node-limit", type=int, help="Nonnegative finite cluster budget; 0 is NOT unlimited")
    parser.add_argument("--shots", type=int, default=1024)
    parser.add_argument("--seed", type=int, default=20261106)
    args = parser.parse_args()
    if args.cluster_node_limit is not None and args.cluster_node_limit < 0:
        parser.error("cluster-node-limit must be nonnegative; omit it for native defaults")
    if args.shots < 1:
        parser.error("shots must be positive")
    result = {
        "scope": "editable native API example; not a threshold or fault-tolerance experiment",
        "versions": {name: importlib.metadata.version(name) for name in ("mwpf", "stim", "sinter", "numpy")},
        "scientificValidation": "not_evaluated",
    }
    if args.dem:
        dem_text = args.dem.read_text()
        dem = stim.DetectorErrorModel(dem_text)
        limit = 50 if args.cluster_node_limit is None else args.cluster_node_limit
        detectors, actual, _ = dem.compile_sampler(seed=args.seed).sample(args.shots, bit_packed=True)
        predicted = decode_detector_samples(dem, detectors, limit)
        with Path("samples.npz").open("xb") as output:
            np.savez_compressed(output, detectors=detectors, actual=actual, predicted=predicted)
        result.update(dem=dem_text, shots=args.shots, seed=args.seed, clusterNodeLimit=limit,
                      panicAction="RAISE", fallbackObserved="not_exposed_by_this_interface",
                      logicalErrors=int(np.count_nonzero(np.any(predicted != actual, axis=1))))
    else:
        graph = json.loads(args.input.read_text()) if args.input else DEFAULT_GRAPH
        result.update(graph=graph, solution=solve_hypergraph(graph, args.cluster_node_limit))
    # A failed computation leaves no fabricated success result; existing results are preserved.
    with Path("result.json").open("x", encoding="utf-8") as output:
        json.dump(result, output, indent=2)
        output.write("\n")


if __name__ == "__main__":
    main()
