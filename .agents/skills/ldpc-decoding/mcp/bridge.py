import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[4] / "src/lib"))
from science_bridge import execute


def compute(v):
    import numpy as np
    from ldpc.bplsd_decoder import BpLsdDecoder
    matrix = np.array(v["parityCheck"], dtype=np.uint8)
    decoder = BpLsdDecoder(matrix, error_rate=v["errorRate"], bp_method="product_sum",
        max_iter=v["bpIterations"], schedule="serial", lsd_method="lsd_cs", lsd_order=v["lsdOrder"])
    corrections, residuals, weights, satisfied = [], [], [], []
    for syndrome in v["syndromes"]:
        correction = np.asarray(decoder.decode(np.array(syndrome, dtype=np.uint8)), dtype=np.uint8)
        residual = (matrix.astype(np.int64) @ correction.astype(np.int64) + syndrome) % 2
        corrections.append(correction.tolist()); residuals.append(residual.tolist())
        weights.append(int(correction.sum())); satisfied.append(bool(np.all(residual == 0)))
    return {"corrections": corrections, "residualSyndromes": residuals, "syndromeSatisfied": satisfied,
        "correctionWeights": weights, "implementation": "serial BP+LSD, lsd_cs", "logicalSuccess": "not_evaluated"}, [
        "Parity consistency does not establish a successful logical correction; no logical operators or true errors are supplied.",
        "This wrapper uses the serial upstream implementation, not a parallel hardware decoder.",
        "Independent equal-probability bit flips are assumed; correlated noise and code-threshold estimates are outside scope."]


execute(compute)
