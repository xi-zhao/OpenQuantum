"""Schroedingerized PDE circuits and MPS Ising dynamics on open backends."""
import numpy as np
from scipy.linalg import expm
from qiskit import QuantumCircuit
from qiskit.circuit.library import DiagonalGate, QFTGate
from common import array, circuit_result, integer, prepare, qubits, state


def grid_operator(points, length, boundary):
  integer(points, "points", 2)
  qubits(points)
  if length <= 0 or boundary not in ("dirichlet", "periodic"):
    raise ValueError("Require positive length and dirichlet or periodic boundaries")
  dx = length / (points + 1 if boundary == "dirichlet" else points)
  lap = np.diag(np.full(points, -2.0)) + np.diag(np.ones(points - 1), 1) + np.diag(np.ones(points - 1), -1)
  derivative = np.diag(np.ones(points - 1), 1) - np.diag(np.ones(points - 1), -1)
  if boundary == "periodic":
    lap[0, -1] += 1
    lap[-1, 0] += 1
    derivative[0, -1] -= 1
    derivative[-1, 0] += 1
  x = (np.arange(points) + (1 if boundary == "dirichlet" else 0)) * dx
  return lap / dx ** 2, derivative / (2 * dx), x


def dilation(generator, initial, time, auxiliary_points, half_width, recovery_p):
  npbits = qubits(integer(auxiliary_points, "auxiliary_points", 2))
  ns = qubits(len(initial))
  if time < 0 or half_width <= 0 or not 0 < recovery_p < half_width:
    raise ValueError("Require nonnegative time and 0 < recovery_p < half_width")
  a1 = (generator + generator.conj().T) / 2
  a2 = (generator - generator.conj().T) / (2j)
  dp = 2 * half_width / auxiliary_points
  p = -half_width + np.arange(auxiliary_points) * dp
  index = int(round((recovery_p + half_width) / dp))
  if not 0 <= index < auxiliary_points:
    raise ValueError("Recovery point falls outside the auxiliary grid")
  recovery = p[index]
  rates = np.linalg.eigvalsh(a1)
  if recovery <= max(0, rates[-1] * time) or recovery + max(0, -rates[0] * time) + dp >= half_width:
    raise ValueError("Enlarge the auxiliary domain or move the recovery point to avoid characteristic wraparound")
  warped = np.outer(initial, np.exp(-abs(p)))
  norm = np.linalg.norm(warped)
  if norm == 0:
    raise ValueError("Initial condition must be nonzero")
  qc = QuantumCircuit(npbits + ns)
  prepare(qc, warped.reshape(-1) / norm)
  qc.append(QFTGate(npbits).inverse(), range(npbits))
  frequencies = 2 * np.pi * np.fft.fftfreq(auxiliary_points, dp)
  # These constant-coefficient examples have either Hermitian diffusion or
  # skew-Hermitian advection generators. Diagonalize the spatial part once,
  # then encode all auxiliary-frequency phases in a single diagonal gate.
  if np.linalg.norm(a2) < 1e-12:
    eigenvalues, eigenvectors = np.linalg.eigh(a1)
    phases = np.exp(-1j * time * eigenvalues[:, None] * frequencies)
  elif np.linalg.norm(a1) < 1e-12:
    eigenvalues, eigenvectors = np.linalg.eigh(a2)
    phases = np.repeat(np.exp(1j * time * eigenvalues[:, None]), auxiliary_points, axis=1)
  else:
    raise ValueError("This spectral example requires a Hermitian or skew-Hermitian spatial generator")
  spatial = list(range(npbits, npbits + ns))
  qc.unitary(eigenvectors.conj().T, spatial)
  qc.append(DiagonalGate(phases.reshape(-1)), range(npbits + ns))
  qc.unitary(eigenvectors, spatial)
  qc.append(QFTGate(npbits), range(npbits))
  evolved = state(qc).reshape(len(initial), auxiliary_points)
  solution = norm * np.exp(recovery) * evolved[:, index]
  reference = expm(time * generator) @ initial
  return circuit_result(qc, solution=solution, discreteReference=reference,
    relativeL2Error=float(np.linalg.norm(solution - reference) / np.linalg.norm(reference)),
    unitaryNormDrift=abs(float(np.linalg.norm(evolved)) - 1),
    recoveryPoint=float(recovery), sliceProbability=float(np.sum(abs(evolved[:, index]) ** 2)),
    executionKind="statevector simulation of an explicit warped-phase unitary dilation circuit",
    readout="full simulated amplitudes; no hardware readout or quantum speedup claim")


def heat_1d(points=4, diffusivity=0.1, time=0.05, length=1.0, boundary="dirichlet", initial=None,
            auxiliary_points=128, half_width=8.0, recovery_p=1.0):
  if diffusivity <= 0:
    raise ValueError("diffusivity must be positive")
  lap, _, x = grid_operator(points, length, boundary)
  u0 = array(initial) if initial is not None else np.sin(np.pi * x / length) if boundary == "dirichlet" else 1 + 0.2 * np.cos(2 * np.pi * x / length)
  if u0.shape != (points,):
    raise ValueError("Initial condition must match the spatial grid")
  return {**dilation(diffusivity * lap, u0, time, auxiliary_points, half_width, recovery_p), "grid": x, "boundary": boundary}


def heat_2d(points=4, diffusivity=0.1, time=0.02, length=1.0, boundary="dirichlet", initial=None,
            auxiliary_points=128, half_width=8.0, recovery_p=1.0):
  if diffusivity <= 0:
    raise ValueError("diffusivity must be positive")
  lap, _, x = grid_operator(points, length, boundary)
  generator = diffusivity * (np.kron(lap, np.eye(points)) + np.kron(np.eye(points), lap))
  mode = np.sin(np.pi * x / length) if boundary == "dirichlet" else 1 + 0.2 * np.cos(2 * np.pi * x / length)
  u0 = array(initial).reshape(-1) if initial is not None else np.outer(mode, mode).reshape(-1)
  if u0.shape != (points ** 2,):
    raise ValueError("Initial condition must contain points squared values")
  return {**dilation(generator, u0, time, auxiliary_points, half_width, recovery_p), "grid": x, "shape": [points, points], "boundary": boundary}


def advection(points=4, velocity=0.3, time=0.1, length=1.0, initial=None,
              auxiliary_points=32, half_width=8.0, recovery_p=1.0):
  _, derivative, x = grid_operator(points, length, "periodic")
  u0 = array(initial) if initial is not None else 1 + 0.2 * np.cos(2 * np.pi * x / length)
  if u0.shape != (points,):
    raise ValueError("Initial condition must match the spatial grid")
  return {**dilation(-velocity * derivative, u0, time, auxiliary_points, half_width, recovery_p),
          "grid": x, "boundary": "periodic", "spatialScheme": "centered finite difference"}


def ising(rows=2, cols=2, coupling=1.0, field=0.7, time_step=0.025, steps=8, max_bond=32, cutoff=1e-12):
  import quimb.tensor as qtn
  integer(rows, "rows")
  integer(cols, "cols")
  integer(steps, "steps")
  integer(max_bond, "max_bond")
  if cutoff < 0:
    raise ValueError("cutoff must be nonnegative")
  n = rows * cols
  circuit = qtn.CircuitMPS(n, max_bond=max_bond, cutoff=cutoff)
  for i in range(n):
    circuit.apply_gate("H", i)
  edges = []
  for r in range(rows):
    for c in range(cols):
      i = r * cols + c
      if r + 1 < rows:
        edges.append((i, i + cols))
      if c + 1 < cols:
        edges.append((i, i + 1))
  # H = -J sum ZZ - h sum X, Strang splitting; all ZZ terms commute.
  for _ in range(steps):
    for i in range(n):
      circuit.apply_gate("RX", -field * time_step, i)
    for i, j in edges:
      circuit.apply_gate("RZZ", -2 * coupling * time_step, i, j)
    for i in range(n):
      circuit.apply_gate("RX", -field * time_step, i)
  z, x = np.diag([1, -1]), np.array([[0, 1], [1, 0]])
  mz = [float(np.real(circuit.local_expectation(z, i, normalized=True))) for i in range(n)]
  mx = [float(np.real(circuit.local_expectation(x, i, normalized=True))) for i in range(n)]
  energy = -field * sum(mx) - coupling * sum(float(np.real(circuit.local_expectation(np.kron(z, z), (i, j), normalized=True))) for i, j in edges)
  return {"backend": "quimb-CircuitMPS", "qubits": n, "magnetizationZ": mz,
          "magnetizationX": mx, "energy": energy, "maxBondUsed": circuit.psi.max_bond(),
          "norm": float(abs(circuit.psi.norm())), "steps": steps, "time": steps * time_step,
          "trotterOrder": 2, "maxBond": max_bond, "cutoff": cutoff,
          "variant": "open rectangular grid, MPS with long-range gate routing; no dense-state allocation"}


ALGORITHMS = {name: globals()[name] for name in ("heat_1d", "heat_2d", "advection", "ising")}
