"""Independent dense Lindblad stationary state; no RcmpsCore code imported."""
import json
from pathlib import Path
import sys
import numpy as np

record = json.loads(Path(sys.argv[1]).read_text())["nontrivial"]
def matrix(name):
    return np.array([[x["real"] + 1j*x["imaginary"] for x in row] for row in record[name]])
r, k, actual = matrix("R"), matrix("K"), matrix("rho")
d = len(r)
def action(rho):
    n = r.conj().T @ r
    return -1j*(k @ rho-rho @ k) + r @ rho @ r.conj().T - (n @ rho+rho @ n)/2
basis = np.eye(d*d).reshape(d*d, d, d)
operator = np.column_stack([action(e).reshape(-1) for e in basis])
system = np.vstack((operator, np.eye(d).reshape(1, -1)))
target = np.r_[np.zeros(d*d), 1]
reference = np.linalg.lstsq(system, target, rcond=None)[0].reshape(d, d)
error = float(np.linalg.norm(reference-actual))
residual = float(np.linalg.norm(action(actual)))
assert error < 1e-9, error
assert residual < 1e-9, residual
assert abs(np.trace(actual)-1) < 1e-10
assert np.linalg.norm(actual-actual.conj().T) < 1e-10
minimum = float(np.linalg.eigvalsh(actual).min())
assert minimum >= -1e-10
singular = np.linalg.svd(operator, compute_uv=False)
assert np.count_nonzero(singular < 1e-10) == 1
result = dict(reference="NumPy least squares of independently constructed Lindblad operator",
              numpy=np.__version__, stateError=error, residual=residual,
              minimumEigenvalue=minimum, singularValues=singular.tolist(),
              referenceReal=reference.real.tolist(), referenceImaginary=reference.imag.tolist(),
              scientificValidation="not_evaluated", status="passed_scoped_numerical_check")
Path(sys.argv[2]).write_text(json.dumps(result, indent=2, allow_nan=False)+"\n")
