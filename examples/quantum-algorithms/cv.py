"""Two-mode finite-Fock CVQNN, adapting the MIT CVClassifier's optical layer.

NumPy/SciPy replace Torch autograd; optimization is explicit finite-difference
L-BFGS-B. The optical operators and layer ordering are preserved.
"""
import numpy as np
from scipy.linalg import expm
from scipy.special import expit
from common import integer
from variational import optimize


def cvqnn(features=None, labels=None, layers=1, cutoff=4, maxiter=40, seed=7):
  integer(layers, "layers")
  integer(cutoff, "cutoff", 2)
  x = np.asarray(features if features is not None else [[-0.5, 0.1], [-0.3, -0.1], [0.3, 0.1], [0.5, -0.1]], float)
  y = np.asarray(labels if labels is not None else [0, 0, 1, 1], float)
  if x.ndim != 2 or x.shape[1] != 2 or y.shape != (len(x),) or not np.all(np.isfinite(x)) or not np.all(np.isin(y, [0, 1])):
    raise ValueError("CVQNN takes two finite displacement features and a binary label per sample")
  a = np.diag(np.sqrt(np.arange(1, cutoff)), 1).astype(complex)
  ad = a.conj().T
  number = ad @ a
  position = (a + ad) / np.sqrt(2)
  identity = np.eye(cutoff)
  vacuum = np.eye(cutoff, dtype=complex)[:, 0]
  def displacement(alpha):
    return expm(alpha * ad - np.conj(alpha) * a)
  initial = [np.kron(displacement(row[0]) @ vacuum, displacement(row[1]) @ vacuum) for row in x]
  splitter = np.kron(ad, a) - np.kron(a, ad)
  observable = np.kron(position, identity)
  def evolve(theta):
    states = np.array(initial).T
    for layer in theta.reshape(layers, 9):
      single = []
      for offset in (0, 4):
        squeeze, displace, rotate, kerr = layer[offset:offset + 4]
        single.append(expm(1j * kerr * number @ number) @ displacement(displace)
                      @ expm(0.5 * squeeze * (a @ a - ad @ ad)) @ expm(-1j * rotate * number))
      states = np.kron(*single) @ expm(layer[8] * splitter) @ states
    return states
  def logits(theta):
    states = evolve(theta)
    return np.real(np.sum(states.conj() * (observable @ states), axis=0))
  def objective(theta):
    values = logits(theta)
    return float(np.mean(np.logaddexp(0, values) - y * values))
  theta, optimization = optimize(objective, 9 * layers, maxiter, seed)
  states = evolve(theta)
  boundary = np.zeros((cutoff, cutoff), bool)
  boundary[-1, :] = True
  boundary[:, -1] = True
  probabilities = expit(logits(theta))
  return {"backend": "numpy-scipy-finite-Fock", "probabilities": probabilities,
          "trainingAccuracy": float(np.mean((probabilities >= 0.5) == y)),
          "cutoff": cutoff, "boundaryOccupations": np.sum(abs(states[boundary.reshape(-1), :]) ** 2, axis=0),
          "stateNorms": np.sum(abs(states) ** 2, axis=0), "parameters": theta,
          "evaluationScope": "training set; repeat with larger Fock cutoff before physical interpretation", **optimization}


ALGORITHMS = {"cvqnn": cvqnn}
