import hashlib
import json
import sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT.parents[2] / "src/lib"))
from science_bridge import execute


def compute(v):
    import numpy as np
    from sklearn.svm import SVC
    upstream = ROOT / "upstream"
    manifest_bytes = (upstream / "provenance.json").read_bytes()
    for filename, record in json.loads(manifest_bytes)["files"].items():
        if hashlib.sha256((upstream / filename).read_bytes()).hexdigest() != record["sha256"]:
            raise ValueError("cqlib-qml adapted source digest mismatch")
    sys.path.insert(0, str(upstream))
    from cqlib_qml.algorithms import QKM, QSVM
    from cqlib_qml.encoder import AngleEncoder
    train, labels, test = np.asarray(v["trainX"]), np.asarray(v["trainY"]), np.asarray(v["testX"])
    encoder = AngleEncoder(mode="classical")
    kernel = QKM(encoder=encoder, swap_test=False)
    gram, cross = kernel.kernel(train, train), kernel.kernel(test, train)
    analytic = lambda x,y: np.prod(np.cos(x[:, None, :] - y[None, :, :])**2, axis=2)
    expected, expected_cross = analytic(train,train), analytic(test,train)
    error = float(max(np.max(abs(gram-expected)), np.max(abs(cross-expected_cross))))
    if error > 1e-9: raise ValueError(f"Independent analytic angle-kernel check failed: {error}")
    model = QSVM(encoder=encoder, C=v["regularization"], swap_test=False, probability=False).fit(train,labels)
    predictions = model.predict(test)
    reference = SVC(kernel="precomputed", C=v["regularization"]).fit(expected+1e-8*np.eye(len(train)),labels)
    analytic_predictions = reference.predict(expected_cross)
    rbf_predictions = SVC(kernel="rbf", C=v["regularization"], gamma="scale").fit(train,labels).predict(test)
    accuracy = lambda predictions: float(np.mean(predictions == np.asarray(v["testY"]))) if v["testY"] else None
    return {"trainFidelityKernel": gram.tolist(), "testKernel": cross.tolist(), "predictions": predictions.tolist(),
        "analyticPredictions": analytic_predictions.tolist(), "rbfPredictions": rbf_predictions.tolist(),
        "testAccuracy": accuracy(predictions), "rbfTestAccuracy": accuracy(rbf_predictions),
        "maxAnalyticKernelError": error, "minimumGramEigenvalue": float(np.linalg.eigvalsh((gram+gram.T)/2)[0]),
        "trainingDiagonalJitter": 1e-8, "encoder": "tensor product RY(2*x_i); raw features in radians; no implicit scaling",
        "sourceTreeSha256": hashlib.sha256(manifest_bytes).hexdigest()}, [
        "Only the fixed classical angle encoder is exposed. Signed amplitude encoding, shared-parameter shift gradients, VQC and swap-test paths are excluded.",
        "The Apache-2.0 QKM/QSVM source is adapted with explicit MCGate import aliases and narrowed package exports for the pinned beta Rust SDK.",
        "Returned trainFidelityKernel excludes jitter; the upstream QSVM adds 1e-8 to the training diagonal only. Test rows never enter model fitting or scaling.",
        "This classically simulated product-state kernel has a closed analytic form. Scores on supplied test rows do not establish quantum advantage or out-of-sample validity of a user-chosen split."]


execute(compute)
