"""Reuse SDK state-preparation implementations, preserving the different methods."""
import numpy as np
from scipy.optimize import minimize
from qiskit import QuantumCircuit
from qiskit.circuit.library import StatePreparation
from common import circuit_result, fidelity, integer, normalized_result, qubits, state, vector


def target_state(target):
  return vector(target if target is not None else [1, 1j, -0.5, 0.5])


def pennylane_prepare(target, operation, auxiliary=0):
  import pennylane as qml
  psi = target_state(target)
  n = qubits(len(psi))
  wires = list(reversed(range(n)))
  work = list(range(n, n + auxiliary))
  device = qml.device("default.qubit", wires=wires + work)
  @qml.qnode(device)
  def circuit():
    operation(psi, wires, work)
    return qml.state()
  full = np.asarray(circuit())
  out, probability = normalized_result(full.reshape(len(psi), 2 ** auxiliary)[:, 0])
  return {"backend": "pennylane-default.qubit", "qubits": n + auxiliary, "statevector": out,
          "fidelity": fidelity(psi, out), "cleanAncillaProbability": probability}


def mottonen(target=None):
  import pennylane as qml
  return pennylane_prepare(target, lambda psi, wires, _: qml.MottonenStatePreparation(psi, wires))


def multiplexer(target=None):
  psi = target_state(target)
  qc = QuantumCircuit(qubits(len(psi)))
  # Qiskit Isometry synthesis uses uniformly controlled gates (multiplexers).
  qc.append(StatePreparation(psi), range(qc.num_qubits))
  out = state(qc)
  return circuit_result(qc, statevector=out, fidelity=fidelity(psi, out),
                        variant="Qiskit Isometry / uniformly controlled gate synthesis")


def superposition(target=None):
  import pennylane as qml
  def operation(psi, wires, work):
    support = np.flatnonzero(abs(psi) > 0)
    bases = np.array([[int(bit) for bit in format(int(k), f"0{len(wires)}b")] for k in support])
    qml.Superposition(psi[support], bases, wires, work_wire=work[0])
  return pennylane_prepare(target, operation, auxiliary=1)


def state_to_mps(psi, max_bond):
  n = qubits(len(psi))
  if max_bond is not None:
    integer(max_bond, "max_bond")
    if max_bond & (max_bond - 1):
      raise ValueError("MPSPrep requires power-of-two bond dimensions")
  tensors = []
  tail = psi.reshape(1, -1)
  previous = 1
  for _ in range(n - 1):
    u, s, vh = np.linalg.svd(tail.reshape(previous * 2, -1), full_matrices=False)
    bond = len(s) if max_bond is None else min(len(s), max_bond)
    tensors.append(u[:, :bond].reshape(previous, 2, bond))
    tail = s[:bond, None] * vh[:bond, :]
    previous = bond
  tensors.append(tail.reshape(previous, 2, 1))
  tensors[0] = tensors[0][0]
  tensors[-1] = tensors[-1][:, :, 0]
  # Restore unit normalization after optional truncation, without claiming lossless preparation.
  tensors[-1] /= np.linalg.norm(tensors[-1])
  # Canonicalize explicitly, including two-site inputs. The SDK helper can
  # return a two-site input unchanged even when it is left-canonical.
  for i in range(n - 1, 0, -1):
    original = tensors[i].shape
    q, r = np.linalg.qr(tensors[i].reshape(original[0], -1).T)
    tensors[i] = q.T.reshape((q.shape[1], *original[1:]))
    tensors[i - 1] = np.tensordot(tensors[i - 1], r.T, axes=(-1, 0))
  return tensors


def mps(target=None, max_bond=None):
  import pennylane as qml
  psi = target_state(target)
  n = qubits(len(psi))
  if n == 1:
    return {**mottonen(psi), "variant": "single-site MPS; no bond register needed"}
  tensors = state_to_mps(psi, max_bond)
  largest = max(t.shape[-1] for t in tensors[:-1])
  work_count = max(1, (largest - 1).bit_length())
  result = pennylane_prepare(psi, lambda _, wires, work:
    qml.MPSPrep(tensors, wires, work_wires=work, right_canonicalize=False), auxiliary=work_count)
  return {**result, "mpsShapes": [list(t.shape) for t in tensors], "maxBond": largest,
          "truncationFidelity": result["fidelity"]}


def pauli(target=None, maxiter=300, seed=7, tolerance=1e-9):
  import pennylane as qml
  psi = target_state(target)
  integer(maxiter, "maxiter")
  n = qubits(len(psi))
  wires = list(reversed(range(n)))
  device = qml.device("default.qubit", wires=wires)
  @qml.qnode(device)
  def circuit(weights):
    qml.ArbitraryStatePreparation(weights, wires)
    return qml.state()
  shape = qml.ArbitraryStatePreparation.shape(n)
  initial = np.random.default_rng(seed).normal(0, 0.2, shape)
  def objective(weights):
    return 1 - abs(np.vdot(psi, np.asarray(circuit(weights)))) ** 2
  optimized = minimize(objective, initial, method="BFGS", options={"maxiter": maxiter, "gtol": tolerance})
  out = np.asarray(circuit(optimized.x))
  return {"backend": "pennylane-default.qubit/scipy-BFGS", "qubits": n, "statevector": out,
          "fidelity": fidelity(psi, out), "parameters": optimized.x,
          "optimizerSuccess": bool(optimized.success), "optimizerMessage": str(optimized.message),
          "iterations": optimized.nit, "variant": "optimized Pauli-word rotations (ArbitraryStatePreparation)"}


ALGORITHMS = {name: globals()[name] for name in ("mottonen", "multiplexer", "superposition", "mps", "pauli")}
