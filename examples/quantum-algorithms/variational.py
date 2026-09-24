"""Task code using ordinary Qiskit circuits and SciPy optimizers."""
import numpy as np
from scipy.optimize import minimize
from qiskit import QuantumCircuit
from common import array, circuit_result, fidelity, integer, matrix, pauli_matrix, qubits, state, vector
from linear import linear_input


def ansatz(parameters, n, layers, features=None):
  qc = QuantumCircuit(n)
  if features is not None:
    for i, angle in enumerate(features):
      qc.ry(float(angle), i)
  angles = np.asarray(parameters).reshape(layers, n, 2)
  for layer in angles:
    for i, (y, z) in enumerate(layer):
      qc.ry(float(y), i)
      qc.rz(float(z), i)
    for i in range(n - 1):
      qc.cx(i, i + 1)
  return qc


def optimize(objective, count, maxiter, seed):
  integer(maxiter, "maxiter")
  initial = np.random.default_rng(seed).normal(0, 0.3, count)
  history = [float(objective(initial))]
  result = minimize(objective, initial, method="L-BFGS-B",
                    callback=lambda x: history.append(float(objective(x))),
                    options={"maxiter": maxiter, "ftol": 1e-12, "gtol": 1e-7})
  return result.x, {"objectiveHistory": history, "optimizerSuccess": bool(result.success),
                    "optimizerMessage": str(result.message), "iterations": result.nit,
                    "finalObjective": float(result.fun)}


def vqe_matrix(h, layers, maxiter, seed):
  n = qubits(len(h))
  integer(layers, "layers")
  def objective(theta):
    psi = state(ansatz(theta, n, layers))
    return float(np.vdot(psi, h @ psi).real)
  theta, optimization = optimize(objective, 2 * n * layers, maxiter, seed)
  qc = ansatz(theta, n, layers)
  return circuit_result(qc, statevector=state(qc), energy=objective(theta),
                        parameters=theta, **optimization)


def vqe(terms=None, layers=2, maxiter=150, seed=7):
  h = pauli_matrix(terms if terms is not None else [["ZI", -1], ["IZ", -1], ["XX", 0.3]])
  return vqe_matrix(h, layers, maxiter, seed)


def vqls(a=None, b=None, layers=2, maxiter=150, seed=7):
  a, b, rhs_norm = linear_input(a, b)
  n = qubits(len(a))
  integer(layers, "layers")
  def objective(theta):
    transformed = a @ state(ansatz(theta, n, layers))
    return float(1 - abs(np.vdot(b, transformed)) ** 2 / np.vdot(transformed, transformed).real)
  theta, optimization = optimize(objective, 2 * n * layers, maxiter, seed)
  qc = ansatz(theta, n, layers)
  psi = state(qc)
  coefficient = np.vdot(a @ psi, b * rhs_norm) / np.vdot(a @ psi, a @ psi)
  return circuit_result(qc, solutionState=psi, reconstructedSolution=coefficient * psi,
                        residual=float(np.linalg.norm(a @ (coefficient * psi) - b * rhs_norm)), rhsNorm=rhs_norm,
                        parameters=theta, **optimization)


def qaoa(edges=None, n=4, layers=2, maxiter=100, seed=7):
  integer(n, "n", 2)
  integer(layers, "layers")
  edges = [[0, 1], [1, 2], [2, 3], [3, 0]] if edges is None else edges
  if not edges or any(len(e) != 2 or any(not isinstance(i, int) or not 0 <= i < n for i in e) or e[0] == e[1] for e in edges):
    raise ValueError("edges must join two distinct valid qubit indices")
  edges = sorted(set(tuple(sorted(e)) for e in edges))
  cuts = np.array([sum(((k >> i) & 1) != ((k >> j) & 1) for i, j in edges) for k in range(2 ** n)])
  def circuit(theta):
    qc = QuantumCircuit(n)
    qc.h(range(n))
    for gamma, beta in theta.reshape(layers, 2):
      for i, j in edges:
        qc.rzz(float(gamma), i, j)
      qc.rx(float(2 * beta), range(n))
    return qc
  def objective(theta):
    return -float(np.dot(abs(state(circuit(theta))) ** 2, cuts))
  theta, optimization = optimize(objective, 2 * layers, maxiter, seed)
  qc = circuit(theta)
  probs = abs(state(qc)) ** 2
  peak = int(np.argmax(probs))
  return circuit_result(qc, expectedCut=-objective(theta), mostLikelyBitstring=format(peak, f"0{n}b"),
                        mostLikelyCut=int(cuts[peak]), probabilities=probs,
                        parameters=theta, **optimization)


def qcbm(target_probabilities=None, layers=2, maxiter=100, seed=7):
  target = np.asarray(target_probabilities if target_probabilities is not None else [0.1, 0.2, 0.3, 0.4], float)
  if target.ndim != 1 or not np.all(np.isfinite(target)) or np.any(target < 0) or target.sum() <= 0:
    raise ValueError("Target must be a nonnegative finite probability vector")
  target /= target.sum()
  n = qubits(len(target))
  integer(layers, "layers")
  support = target > 0
  def objective(theta):
    p = abs(state(ansatz(theta, n, layers))) ** 2
    return float(np.sum(target[support] * np.log(target[support] / np.maximum(p[support], 1e-15))))
  theta, optimization = optimize(objective, 2 * n * layers, maxiter, seed)
  qc = ansatz(theta, n, layers)
  probabilities = abs(state(qc)) ** 2
  return circuit_result(qc, probabilities=probabilities, targetProbabilities=target,
                        totalVariation=float(np.sum(abs(probabilities - target)) / 2),
                        parameters=theta, **optimization)


def vqc(features=None, labels=None, layers=2, maxiter=100, seed=7):
  x = np.asarray(features if features is not None else [[0, 0], [0, np.pi], [np.pi, 0], [np.pi, np.pi]], float)
  y = np.asarray(labels if labels is not None else [0, 0, 1, 1], float)
  if x.ndim != 2 or x.shape[1] < 1 or y.shape != (len(x),) or not np.all(np.isfinite(x)) or not np.all(np.isin(y, [0, 1])):
    raise ValueError("Expected finite samples x features and matching binary labels")
  n = x.shape[1]
  integer(layers, "layers")
  def probabilities(theta):
    return np.array([sum(abs(state(ansatz(theta, n, layers, row))[1::2]) ** 2) for row in x])
  def objective(theta):
    p = np.clip(probabilities(theta), 1e-12, 1 - 1e-12)
    return float(-np.mean(y * np.log(p) + (1 - y) * np.log(1 - p)))
  theta, optimization = optimize(objective, 2 * n * layers, maxiter, seed)
  p = probabilities(theta)
  return {"backend": "qiskit-statevector/scipy-L-BFGS-B", "probabilities": p,
          "trainingAccuracy": float(np.mean((p >= 0.5) == y)), "parameters": theta,
          "evaluationScope": "training data only; no generalization claim", **optimization}


def numpy_eigensolver(hamiltonian=None, k=None):
  h = matrix(hamiltonian if hamiltonian is not None else [[1.5, 0.5], [0.5, 1.5]])
  k = len(h) if k is None else integer(k, "k")
  if k > len(h):
    raise ValueError("k exceeds matrix dimension")
  values, vectors = np.linalg.eigh(h)
  return {"backend": "numpy-linalg-eigh", "eigenvalues": values[:k], "eigenvectors": vectors[:, :k],
          "residuals": [float(np.linalg.norm(h @ vectors[:, i] - values[i] * vectors[:, i])) for i in range(k)],
          "executionKind": "classical eigensolver"}


def numpy_minimum_eigensolver(hamiltonian=None):
  return numpy_eigensolver(hamiltonian, 1)


def vqd(terms=None, k=2, layers=2, maxiter=200, penalty=None, seed=7):
  h = pauli_matrix(terms if terms is not None else [["ZI", -1], ["IZ", -0.7], ["XX", 0.2]])
  n = qubits(len(h))
  integer(k, "k")
  integer(layers, "layers")
  if k > len(h):
    raise ValueError("k exceeds Hilbert-space dimension")
  penalty = 4 * np.linalg.norm(h, 2) + 1 if penalty is None else penalty
  if penalty <= 0:
    raise ValueError("penalty must be positive")
  states, energies, optimizations = [], [], []
  for index in range(k):
    def objective(theta):
      psi = state(ansatz(theta, n, layers))
      return float(np.vdot(psi, h @ psi).real + penalty * sum(abs(np.vdot(old, psi)) ** 2 for old in states))
    theta, optimization = optimize(objective, 2 * n * layers, maxiter, seed + index)
    psi = state(ansatz(theta, n, layers))
    states.append(psi)
    energies.append(float(np.vdot(psi, h @ psi).real))
    optimizations.append(optimization)
  return {"backend": "qiskit-statevector/scipy-L-BFGS-B", "energies": energies,
          "statevectors": states, "overlaps": np.abs(np.asarray(states).conj() @ np.asarray(states).T) ** 2,
          "optimizations": optimizations, "penalty": penalty}


def fermi_hubbard_vqe(sites=2, hopping=1.0, interaction=4.0, field=1.5, layers=3, maxiter=200, seed=7):
  integer(sites, "sites")
  n = 2 * sites
  annihilation = []
  for j in range(n):
    x = ["I"] * n
    y = x.copy()
    for k in range(j):
      x[n - 1 - k] = y[n - 1 - k] = "Z"
    x[n - 1 - j], y[n - 1 - j] = "X", "Y"
    annihilation.append((pauli_matrix([("".join(x), 1)]) + 1j * pauli_matrix([("".join(y), 1)])) / 2)
  numbers = [c.conj().T @ c for c in annihilation]
  h = np.zeros((2 ** n, 2 ** n), complex)
  for i in range(sites):
    h += interaction * numbers[2 * i] @ numbers[2 * i + 1]
    h += field * (numbers[2 * i] - numbers[2 * i + 1])
    if i + 1 < sites:
      for spin in (0, 1):
        term = annihilation[2 * i + spin].conj().T @ annihilation[2 * (i + 1) + spin]
        h -= hopping * (term + term.conj().T)
  result = vqe_matrix(h, layers, maxiter, seed)
  psi = result["statevector"]
  return {**result, "particleNumber": float(np.vdot(psi, sum(numbers) @ psi).real),
          "variant": "open-boundary Hubbard chain, Jordan-Wigner, unrestricted Fock-space VQE"}


ALGORITHMS = {name: globals()[name] for name in ("vqe", "vqls", "qaoa", "qcbm", "vqc",
  "numpy_eigensolver", "numpy_minimum_eigensolver", "vqd", "fermi_hubbard_vqe")}
