"""Small helpers for runnable SDK examples, not an Agent runtime or Tool provider."""
import numpy as np
from qiskit import QuantumCircuit
from qiskit.circuit.library import QFTGate, StatePreparation, UnitaryGate
from qiskit.quantum_info import Statevector, SparsePauliOp


def array(value):
  def decode(x):
    if isinstance(x, dict) and set(x) == {"real", "imag"}:
      return complex(x["real"], x["imag"])
    if isinstance(x, list):
      return [decode(v) for v in x]
    return x
  a = np.asarray(decode(value), dtype=complex)
  if not np.all(np.isfinite(a)):
    raise ValueError("Array entries must be finite")
  return a


def integer(value, name, minimum=1):
  if isinstance(value, bool) or not isinstance(value, int) or value < minimum:
    raise ValueError(f"{name} must be an integer >= {minimum}")
  return value


def qubits(dimension):
  if dimension < 2 or dimension & (dimension - 1):
    raise ValueError("Dimension must be a power of two >= 2")
  return dimension.bit_length() - 1


def vector(value):
  a = array(value)
  if a.ndim != 1:
    raise ValueError("Expected a vector")
  qubits(len(a))
  norm = np.linalg.norm(a)
  if norm == 0:
    raise ValueError("State/RHS must be nonzero")
  return a / norm


def matrix(value, kind="hermitian"):
  a = array(value)
  if a.ndim != 2 or a.shape[0] != a.shape[1]:
    raise ValueError("Expected a square matrix")
  qubits(len(a))
  target = a if kind == "hermitian" else np.eye(len(a))
  actual = a.conj().T if kind == "hermitian" else a.conj().T @ a
  if not np.allclose(actual, target, atol=1e-10, rtol=1e-10):
    raise ValueError(f"Matrix must be {kind}")
  return a


def state_input(state, n):
  if state is None:
    a = np.zeros(2 ** n, dtype=complex)
    a[0] = 1
    return a
  a = vector(state)
  if len(a) != 2 ** n:
    raise ValueError("State dimension does not match the circuit")
  return a


def prepare(qc, state, wires=None):
  wires = list(range(qc.num_qubits)) if wires is None else list(wires)
  qc.append(StatePreparation(state), wires)


def state(qc):
  return np.asarray(Statevector.from_instruction(qc).data)


def circuit_result(qc, **result):
  return {"backend": "qiskit-statevector", "qubits": qc.num_qubits,
          "gateCounts": dict(qc.count_ops()), "depth": qc.depth(), **result}


def qpe_circuit(unitary, phase_bits):
  u = matrix(unitary, "unitary")
  d = integer(phase_bits, "phase_bits")
  n = qubits(len(u))
  qc = QuantumCircuit(d + n)
  qc.h(range(d))
  for j in range(d):
    qc.append(UnitaryGate(np.linalg.matrix_power(u, 2 ** j)).control(),
              [j, *range(d, d + n)])
  qc.append(QFTGate(d).inverse(), range(d))
  return qc


def pauli_matrix(terms):
  if not terms or not all(len(p) == len(terms[0][0]) for p, _ in terms):
    raise ValueError("Pauli terms must have equal nonzero length")
  if not all(set(p) <= set("IXYZ") and np.isfinite(c) and np.isreal(c) for p, c in terms):
    raise ValueError("Expected real coefficients and I/X/Y/Z labels")
  return SparsePauliOp.from_list(terms).to_matrix()


def normalized_result(v):
  probability = float(np.vdot(v, v).real)
  if not np.isfinite(probability) or probability <= 0:
    raise ValueError("Postselection has zero probability; choose resolvable parameters")
  return v / np.sqrt(probability), probability


def fidelity(a, b):
  return float(abs(np.vdot(vector(a), vector(b))) ** 2)


def serializable(value):
  if isinstance(value, np.ndarray):
    return serializable(value.tolist())
  if isinstance(value, (complex, np.complexfloating)):
    return {"real": float(value.real), "imag": float(value.imag)}
  if isinstance(value, np.generic):
    return value.item()
  if isinstance(value, dict):
    return {str(k): serializable(v) for k, v in value.items()}
  if isinstance(value, (list, tuple)):
    return [serializable(v) for v in value]
  return value
