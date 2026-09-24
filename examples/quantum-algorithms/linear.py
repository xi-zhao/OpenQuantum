"""Qiskit circuits and PennyLane transformations for linear algebra workflows."""
import math
import numpy as np
from scipy.linalg import expm
from qiskit import QuantumCircuit
from qiskit.circuit.library import QFTGate, RYGate, UnitaryGate
from common import (array, circuit_result, fidelity, integer, matrix, normalized_result,
                    prepare, qpe_circuit, qubits, state, state_input, vector)


def qft(n=3, initial_state=None, inverse=False):
  integer(n, "n")
  qc = QuantumCircuit(n)
  prepare(qc, state_input(initial_state, n))
  qc.append(QFTGate(n).inverse() if inverse else QFTGate(n), range(n))
  return circuit_result(qc, statevector=state(qc))


def lcu_circuit(coefficients, unitaries, initial_state):
  weights = array(coefficients)
  us = [matrix(u, "unitary") for u in unitaries]
  if weights.ndim != 1 or len(weights) != len(us) or not us:
    raise ValueError("LCU requires one coefficient per unitary")
  n = qubits(len(us[0]))
  if any(u.shape != us[0].shape for u in us):
    raise ValueError("LCU unitary dimensions disagree")
  anc = max(1, (len(us) - 1).bit_length())
  scale = float(np.sum(abs(weights)))
  if scale == 0:
    raise ValueError("LCU coefficients must not all vanish")
  amps = np.zeros(2 ** anc)
  amps[:len(us)] = np.sqrt(abs(weights) / scale)
  prep = QuantumCircuit(anc)
  prepare(prep, amps)
  qc = QuantumCircuit(anc + n)
  prepare(qc, state_input(initial_state, n), range(anc, anc + n))
  qc.compose(prep, range(anc), inplace=True)
  for k, (c, u) in enumerate(zip(weights, us)):
    if abs(c) > 0:
      gate = UnitaryGate(u * c / abs(c)).control(anc, ctrl_state=k)
      qc.append(gate, range(anc + n))
  qc.compose(prep.inverse(), range(anc), inplace=True)
  block = state(qc).reshape(2 ** n, 2 ** anc)[:, 0]
  return qc, block, scale


def lcu(coefficients=None, unitaries=None, initial_state=None):
  coefficients = [1, 0.5] if coefficients is None else coefficients
  unitaries = [np.eye(2), [[0, 1], [1, 0]]] if unitaries is None else unitaries
  qc, block, scale = lcu_circuit(coefficients, unitaries, initial_state)
  out, probability = normalized_result(block)
  return circuit_result(qc, statevector=out, postselectionProbability=probability,
                        blockAction=block, coefficientL1Norm=scale)


def linear_input(a, b):
  a = matrix(a if a is not None else [[1.5, 0.5], [0.5, 1.5]])
  original_b = array(b if b is not None else [1] + [0] * (len(a) - 1))
  b = vector(original_b)
  if len(a) != len(b) or np.min(abs(np.linalg.eigvalsh(a))) == 0:
    raise ValueError("Expected a nonsingular Hermitian A and a matching nonzero b")
  return a, b, float(np.linalg.norm(original_b))


def hhl(a=None, b=None, phase_bits=4):
  a, b, rhs_norm = linear_input(a, b)
  d = integer(phase_bits, "phase_bits", 2)
  n = qubits(len(a))
  grid = 2 ** d
  # Signed eigenphases remain strictly within (-1/2, 1/2).
  time = (0.5 - 1 / grid) / np.linalg.norm(a, 2)
  reciprocal_scale = 1 / (grid * time)
  pe = qpe_circuit(expm(2j * np.pi * time * a), d)
  qc = QuantumCircuit(d + n + 1)
  prepare(qc, b, range(d, d + n))
  qc.compose(pe, range(d + n), inplace=True)
  for k in range(1, grid):
    signed_k = k if k < grid // 2 else k - grid
    angle = 2 * np.arcsin(1 / signed_k)
    qc.append(RYGate(angle).control(d, ctrl_state=k), [*range(d), d + n])
  qc.compose(pe.inverse(), range(d + n), inplace=True)
  block = state(qc).reshape(2, 2 ** n, grid)[1, :, 0]
  solution, probability = normalized_result(block)
  reconstructed = block / reciprocal_scale * rhs_norm
  reference = np.linalg.solve(a, b * rhs_norm)
  return circuit_result(qc, solutionState=solution, normalizedRhs=b,
                        reconstructedSolution=reconstructed, postselectionProbability=probability,
                        referenceFidelity=fidelity(reference, solution),
                        residual=float(np.linalg.norm(a @ reconstructed - b * rhs_norm)), rhsNorm=rhs_norm, evolutionTime=time)


def aqc(a=None, b=None, total_time=40.0, steps=200, schedule_power=1.4):
  a, b, rhs_norm = linear_input(a, b)
  if np.min(np.linalg.eigvalsh(a)) <= 0:
    raise ValueError("This adiabatic interpolation requires positive-definite A to keep its gap open")
  integer(steps, "steps")
  if total_time <= 0 or not 0 < schedule_power < 2:
    raise ValueError("total_time must be positive and 0 < schedule_power < 2")
  a = a / np.linalg.norm(a, 2)
  kappa = np.linalg.cond(a)
  q = np.eye(len(a)) - np.outer(b, b.conj())
  z = np.zeros_like(a)
  h0 = np.block([[z, q], [q, z]])
  h1 = np.block([[z, a @ q], [q @ a, z]])
  n = qubits(len(a))
  qc = QuantumCircuit(n + 1)
  prepare(qc, np.concatenate([b, np.zeros_like(b)]))
  def schedule(s):
    p = schedule_power
    if abs(kappa - 1) < 1e-10:
      return s
    if abs(p - 1) < 1e-10:
      return (1 - kappa ** (-s)) / (1 - 1 / kappa)
    return (1 - (1 + s * (kappa ** (p - 1) - 1)) ** (1 / (1 - p))) / (1 - 1 / kappa)
  for j in range(steps):
    f = schedule((j + 0.5) / steps)
    qc.unitary(expm(-1j * total_time / steps * ((1 - f) * h0 + f * h1)), range(n + 1))
  solution, probability = normalized_result(state(qc)[:len(b)])
  return circuit_result(qc, solutionState=solution, postselectionProbability=probability,
                        referenceFidelity=fidelity(np.linalg.solve(a, b), solution),
                        conditionNumber=float(kappa), rhsNorm=rhs_norm, steps=steps, totalTime=total_time)


def qsvt_unitary(a, polynomial):
  import pennylane as qml
  n = qubits(len(a))
  def circuit():
    qml.qsvt(a, polynomial, encoding_wires=list(range(n + 1)), block_encoding="embedding")
  return np.asarray(qml.matrix(circuit, wire_order=list(range(n + 1)))())


def qsp(t=1.0, degree=8, x=0.5):
  integer(degree, "degree", 2)
  if not -1 <= x <= 1:
    raise ValueError("x must be in [-1, 1]")
  # A bounded even Taylor polynomial; QSVT supplies its real block via QSP phases.
  degree -= degree % 2
  coefficients = [0.0] * (degree + 1)
  for k in range(0, degree + 1, 2):
    coefficients[k] = (-1) ** (k // 2) * t ** k / math.factorial(k)
  scale = 1.01 * sum(abs(c) for c in coefficients)
  u = qsvt_unitary(np.diag([x, x]), np.array(coefficients) / scale)
  # The control-0 LCU of U and U† selects the Hermitian (real polynomial) block.
  qc, block, _ = lcu_circuit([0.5, 0.5], [u, u.conj().T], [1, 0, 0, 0])
  estimate = float(block[0].real * scale)
  return circuit_result(qc, backend="pennylane-qsvt/qiskit-lcu", estimate=estimate,
                        reference=float(np.cos(t * x)), polynomial=coefficients,
                        blockScale=scale, absoluteError=abs(estimate - np.cos(t * x)))


def qsvt_qlsa(a=None, b=None, degree=11):
  a, b, rhs_norm = linear_input(a, b)
  integer(degree, "degree")
  if degree % 2 != 1:
    raise ValueError("The reciprocal polynomial requires an odd degree")
  scale_a = np.linalg.norm(a, 2) * 1.000001
  scaled = a / scale_a
  # x sum_{k=0}^m (1-x^2)^k -> 1/x away from zero; conservative bound on [-1,1].
  from numpy.polynomial import Polynomial
  x = Polynomial([0, 1])
  m = (degree - 1) // 2
  polynomial = sum((1 - x * x) ** k for k in range(m + 1)) * x / (2 * (m + 1))
  u = qsvt_unitary(scaled, polynomial.coef)
  initial = np.concatenate([b, np.zeros_like(b)])
  qc, block, _ = lcu_circuit([0.5, 0.5], [u, u.conj().T], initial)
  solution, probability = normalized_result(block[:len(b)])
  reconstructed = block[:len(b)] * (2 * (m + 1)) / scale_a * rhs_norm
  return circuit_result(qc, backend="pennylane-qsvt/qiskit-lcu", solutionState=solution,
                        reconstructedSolution=reconstructed, postselectionProbability=probability,
                        referenceFidelity=fidelity(np.linalg.solve(a, b), solution),
                        residual=float(np.linalg.norm(a @ reconstructed - b * rhs_norm)), rhsNorm=rhs_norm,
                        polynomial=polynomial.coef, degree=degree,
                        approximation="bounded geometric reciprocal polynomial; increase odd degree for convergence")


ALGORITHMS = {name: globals()[name] for name in ("qft", "lcu", "hhl", "aqc", "qsp", "qsvt_qlsa")}
