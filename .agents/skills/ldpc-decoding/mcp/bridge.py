import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[4] / "src/lib"))
from science_bridge import execute


def compute(v):
    import numpy as np
    import platform
    from importlib.metadata import version
    from ldpc.bplsd_decoder import BpLsdDecoder
    matrix = np.array(v["parityCheck"], dtype=np.uint8)
    decoder = BpLsdDecoder(matrix, error_rate=v["errorRate"], bp_method="product_sum",
        max_iter=v["bpIterations"], schedule="serial", lsd_method="lsd_cs", lsd_order=v["lsdOrder"])
    corrections, residuals, weights, satisfied, converged, iterations = [], [], [], [], [], []
    for syndrome in v["syndromes"]:
        if any(syndrome):
            correction = np.asarray(decoder.decode(np.array(syndrome, dtype=np.uint8)), dtype=np.uint8)
            converged.append(bool(decoder.converge)); iterations.append(int(decoder.iter))
        else:
            correction = np.zeros(matrix.shape[1], dtype=np.uint8)
            converged.append(True); iterations.append(0)
        residual = (matrix.astype(np.int64) @ correction.astype(np.int64) + syndrome) % 2
        corrections.append(correction.tolist()); residuals.append(residual.tolist())
        weights.append(int(correction.sum())); satisfied.append(bool(np.all(residual == 0)))
    shots = len(corrections)
    logical_count = None
    exact_count = None
    if "trueErrors" in v:
        differences = (np.array(corrections, dtype=np.int64) + np.array(v["trueErrors"], dtype=np.int64)) % 2
        exact_count = int(np.count_nonzero(np.all(differences == 0, axis=1)))
        if "logicalObservables" in v:
            flips = (differences @ np.array(v["logicalObservables"], dtype=np.int64).T) % 2
            logical_count = int(np.count_nonzero(np.any(flips != 0, axis=1)))
    summary = {"shots": shots, "syndromeMatchedCount": sum(satisfied), "syndromeMatchRate": sum(satisfied) / shots,
        "bpConvergedCount": sum(converged), "bpConvergenceRate": sum(converged) / shots,
        "logicalFlipCount": logical_count, "logicalFlipRate": None if logical_count is None else logical_count / shots,
        "exactErrorMatchCount": exact_count, "exactErrorMatchRate": None if exact_count is None else exact_count / shots}
    return {"corrections": corrections, "residualSyndromes": residuals, "syndromeSatisfied": satisfied,
        "correctionWeights": weights, "implementation": "serial BP+LSD, lsd_cs",
        "logicalSuccess": "evaluated-against-supplied-errors" if "logicalObservables" in v else "not_evaluated",
        "bpConverged": converged, "bpIterationsUsed": iterations, "statistics": summary,
        "runtime": {"ldpc": version("ldpc"), "numpy": np.__version__, "system": platform.system(), "machine": platform.machine()}}, [
        "Parity consistency alone does not establish logical success; logical parity flips require supplied true errors and logical parity vectors.",
        "This wrapper uses the serial upstream implementation, not a parallel hardware decoder.",
        "Independent equal-probability bit flips are assumed; correlated noise and code-threshold estimates are outside scope."]


execute(compute)
