"""Binary hypergraph-product CSS construction, adapted from the MIT qLDPC guide."""
import numpy as np
from common import integer


def binary_matrix(value):
  a = np.asarray(value)
  if a.ndim != 2 or 0 in a.shape or not np.all(np.isin(a, [0, 1])):
    raise ValueError("Parity checks must be nonempty binary matrices")
  return a.astype(np.uint8)


def binary_rank(a):
  a = a.copy()
  rank = 0
  for col in range(a.shape[1]):
    pivots = np.flatnonzero(a[rank:, col])
    if len(pivots) == 0:
      continue
    pivot = rank + pivots[0]
    a[[rank, pivot]] = a[[pivot, rank]]
    for row in range(a.shape[0]):
      if row != rank and a[row, col]:
        a[row] ^= a[rank]
    rank += 1
    if rank == a.shape[0]:
      break
  return rank


def qldpc(h1=None, h2=None, x_error=None, z_error=None):
  a = binary_matrix(h1 if h1 is not None else [[1, 1, 0], [0, 1, 1]])
  b = binary_matrix(h2 if h2 is not None else [[1, 1, 0], [0, 1, 1]])
  r1, n1 = a.shape
  r2, n2 = b.shape
  hx = np.hstack([np.kron(a, np.eye(n2, dtype=np.uint8)), np.kron(np.eye(r1, dtype=np.uint8), b.T)])
  hz = np.hstack([np.kron(np.eye(n1, dtype=np.uint8), b), np.kron(a.T, np.eye(r2, dtype=np.uint8))])
  n = hx.shape[1]
  def error(value):
    e = np.zeros(n, np.uint8) if value is None else np.asarray(value)
    if e.shape != (n,) or not np.all(np.isin(e, [0, 1])):
      raise ValueError("Error vector must match the code length and contain only bits")
    return e.astype(np.uint8)
  x, z = error(x_error), error(z_error)
  return {"backend": "numpy-gf2", "hx": hx, "hz": hz, "physicalQubits": n,
          "logicalQubits": n - binary_rank(hx) - binary_rank(hz),
          "cssCommutes": bool(np.all((hx @ hz.T) % 2 == 0)),
          "xSyndrome": (hz @ x) % 2, "zSyndrome": (hx @ z) % 2,
          "distance": None, "distanceStatus": "not_computed", "executionKind": "classical code construction and syndrome calculation"}


ALGORITHMS = {"qldpc": qldpc}
