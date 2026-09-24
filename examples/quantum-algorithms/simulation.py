"""Open Hamiltonian simulation routes; references and postselection stay explicit."""
import importlib.util
import math
from pathlib import Path
import numpy as np
from scipy.linalg import expm, schur
from qiskit import QuantumCircuit
from qiskit.quantum_info import SparsePauliOp
from common import circuit_result, integer, matrix, normalized_result, pauli_matrix, prepare, qubits, state, state_input
from linear import lcu_circuit, qsvt_unitary


def product_formula(method, terms, time, steps, order, seed, initial_state):
  terms = [["X", 0.7], ["Z", 0.3]] if terms is None else terms
  pauli_matrix(terms)  # Validate the public Pauli representation.
  integer(steps, "steps")
  if order != 1 and (not isinstance(order, int) or order < 2 or order % 2):
    raise ValueError("Suzuki order must be one or a positive even integer")
  n = len(terms[0][0])
  filename = Path(__file__).resolve().parents[2] / ".agents/skills/hamiltonian-simulation/mcp/bridge.py"
  spec = importlib.util.spec_from_file_location("open_hamiltonian", filename)
  bridge = importlib.util.module_from_spec(spec)
  spec.loader.exec_module(bridge)
  psi = state_input(initial_state, n)
  # Adapt examples' Qiskit labels/indexing to the existing Tool's q0-MSB contract.
  msb = bridge.reverse_bits(psi, n)
  result = bridge.simulate({"numQubits": n, "terms": [{"pauli": p[::-1], "coefficient": c} for p, c in terms],
    "time": time, "steps": steps, "method": method, "order": order, "seed": seed,
    "initialState": [[z.real, z.imag] for z in msb], "outputMode": "statevector", "referenceMode": "auto"})
  result["statevector"] = bridge.reverse_bits(np.array([complex(*p) for p in result["statevector"]]), n)
  result["convention"] = "Qiskit little endian; Pauli label leftmost is q[n-1]"
  return result


def trotter(terms=None, time=0.8, steps=16, order=2, initial_state=None):
  return product_formula("trotter", terms, time, steps, order, 0, initial_state)


def qdrift(terms=None, time=0.8, steps=128, seed=7, initial_state=None):
  integer(seed, "seed", 0)
  return product_formula("qdrift", terms, time, steps, 1, seed, initial_state)


def cartan(hamiltonian=None, time=0.8, initial_state=None):
  h = matrix(hamiltonian if hamiltonian is not None else [[0.3, 0.7], [0.7, -0.3]])
  if not np.allclose(h.imag, 0):
    raise ValueError("This SO(N) Cartan route requires a real symmetric Hamiltonian")
  diagonal, k = schur(h.real, output="real")
  n = qubits(len(h))
  qc = QuantumCircuit(n)
  psi = state_input(initial_state, n)
  prepare(qc, psi)
  qc.unitary(k.T, range(n), label="K_dagger")
  qc.unitary(np.diag(np.exp(-1j * np.diag(diagonal) * time)), range(n), label="Cartan_diagonal")
  qc.unitary(k, range(n), label="K")
  out = state(qc)
  return circuit_result(qc, statevector=out, orthogonalFactor=k, cartanDiagonal=np.diag(diagonal),
    decompositionResidual=float(np.linalg.norm(h - k @ np.diag(np.diag(diagonal)) @ k.T)),
    stateError=float(np.linalg.norm(out - expm(-1j * h * time) @ psi)),
    variant="SO(N) spectral Cartan factorization via real Schur; replaces the unavailable Cartan-Lax optimizer")


def taylor(terms=None, time=0.8, degree=6, initial_state=None):
  terms = [["X", 0.7], ["Z", 0.3]] if terms is None else terms
  integer(degree, "degree", 0)
  h = pauli_matrix(terms)
  # Compile the truncated series into an LCU. This dense preprocessing has no speedup claim.
  polynomial = np.eye(len(h), dtype=complex)
  power = polynomial.copy()
  for k in range(1, degree + 1):
    power = power @ (-1j * time * h) / k
    polynomial += power
  expansion = SparsePauliOp.from_operator(polynomial, atol=0, rtol=0)
  labels, weights = zip(*[(p, c) for p, c in expansion.to_list() if abs(c) > 0])
  unitaries = [SparsePauliOp.from_list([(p, 1)]).to_matrix() for p in labels]
  qc, block, scale = lcu_circuit(weights, unitaries, initial_state)
  out, probability = normalized_result(block)
  psi = state_input(initial_state, qubits(len(h)))
  return circuit_result(qc, statevector=out, postselectionProbability=probability,
    blockScale=scale, polynomialAction=block * scale,
    approximationError=float(np.linalg.norm(block * scale - expm(-1j * time * h) @ psi)),
    degree=degree, variant="truncated Taylor series, classical Pauli expansion, PREPARE-SELECT-unprepare LCU")


def hamiltonian_qsp(terms=None, time=0.8, degree=9, initial_state=None):
  terms = [["X", 0.7], ["Z", 0.3]] if terms is None else terms
  integer(degree, "degree", 2)
  h = pauli_matrix(terms)
  psi = state_input(initial_state, qubits(len(h)))
  if time == 0 or np.linalg.norm(h, 2) == 0:
    qc = QuantumCircuit(qubits(len(h)))
    prepare(qc, psi)
    return circuit_result(qc, statevector=state(qc), postselectionProbability=1.0,
                          blockScale=1.0, degree=degree, approximationError=0.0,
                          variant="identity limit of QSP for zero time or zero Hamiltonian")
  # Keep the block-encoding square root away from its singular endpoint.
  norm = max(float(np.linalg.norm(h, 2)) * 1.000001, 1e-12)
  cos_poly = np.zeros(degree + 1)
  sin_poly = np.zeros(degree + 1)
  for k in range(degree + 1):
    if k % 2 == 0:
      cos_poly[k] = (-1) ** (k // 2) * (norm * time) ** k / math.factorial(k)
    else:
      sin_poly[k] = (-1) ** ((k - 1) // 2) * (norm * time) ** k / math.factorial(k)
  cs = 1.01 * sum(abs(cos_poly))
  ss = max(1.01 * sum(abs(sin_poly)), 1e-12)
  uc = qsvt_unitary(h / norm, np.trim_zeros(cos_poly, "b") / cs)
  us = qsvt_unitary(h / norm, np.trim_zeros(sin_poly, "b") / ss)
  initial = np.concatenate([psi, np.zeros_like(psi)])
  qc, block, scale = lcu_circuit([cs / 2, cs / 2, -1j * ss / 2, -1j * ss / 2],
                                [uc, uc.conj().T, us, us.conj().T], initial)
  selected = block[:len(h)]
  out, probability = normalized_result(selected)
  return circuit_result(qc, backend="pennylane-qsvt/qiskit-lcu", statevector=out,
    postselectionProbability=probability, blockScale=scale, degree=degree,
    approximationError=float(np.linalg.norm(selected * scale - expm(-1j * time * h) @ psi)),
    variant="even/odd QSP polynomial transforms combined by heralded LCU; dense block encoding")


ALGORITHMS = {name: globals()[name] for name in ("trotter", "qdrift", "cartan", "taylor", "hamiltonian_qsp")}
