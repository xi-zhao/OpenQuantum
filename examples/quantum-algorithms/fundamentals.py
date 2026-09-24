"""Open circuit versions of the six fundamental UnitaryLab workflows."""
import numpy as np
from qiskit import QuantumCircuit
from qiskit.circuit.library import UnitaryGate
from common import (circuit_result, integer, matrix, normalized_result, prepare,
                    qpe_circuit, qubits, state, state_input, vector)


def hadamard_transform(n=3, initial_state=None):
  integer(n, "n")
  qc = QuantumCircuit(n)
  prepare(qc, state_input(initial_state, n))
  qc.h(range(n))
  return circuit_result(qc, statevector=state(qc))


def qpe(unitary=None, initial_state=None, phase_bits=4):
  u = matrix(unitary if unitary is not None else [[1, 0], [0, 1j]], "unitary")
  n = qubits(len(u))
  psi = vector(initial_state if initial_state is not None else [0] * (len(u) - 1) + [1])
  if len(psi) != len(u):
    raise ValueError("Unitary and state dimensions disagree")
  qc = QuantumCircuit(phase_bits + n)
  prepare(qc, psi, range(phase_bits, phase_bits + n))
  qc.compose(qpe_circuit(u, phase_bits), inplace=True)
  probs = np.sum(abs(state(qc).reshape(2 ** n, 2 ** phase_bits)) ** 2, axis=0)
  return circuit_result(qc, probabilities=probs,
                        estimatedPhase=int(np.argmax(probs)) / 2 ** phase_bits)


def amplification_operator(psi, good_states):
  good = sorted(set(good_states))
  if not good or any(not isinstance(k, int) or k < 0 or k >= len(psi) for k in good):
    raise ValueError("good_states must contain valid basis indices")
  oracle = np.eye(len(psi), dtype=complex)
  oracle[good, good] = -1
  return (2 * np.outer(psi, psi.conj()) - np.eye(len(psi))) @ oracle, good


def amplitude_amplification(initial_state=None, good_states=None, repetitions=1):
  psi = vector(initial_state if initial_state is not None else [1, 1, 1, 1])
  q, good = amplification_operator(psi, [3] if good_states is None else good_states)
  integer(repetitions, "repetitions", 0)
  qc = QuantumCircuit(qubits(len(psi)))
  prepare(qc, psi)
  for _ in range(repetitions):
    qc.unitary(q, range(qc.num_qubits), label="amplify")
  out = state(qc)
  return circuit_result(qc, statevector=out, successProbability=float(np.sum(abs(out[good]) ** 2)))


def grover(n=3, target=5, repetitions=None):
  integer(n, "n")
  integer(target, "target", 0)
  if target >= 2 ** n:
    raise ValueError("target is outside the search register")
  r = max(0, int(round(np.pi / (4 * np.arcsin(2 ** (-n / 2))) - 0.5))) if repetitions is None else repetitions
  result = amplitude_amplification(np.ones(2 ** n), [target], r)
  return {**result, "target": target, "repetitions": r}


def amplitude_estimation(initial_state=None, good_states=None, phase_bits=5):
  psi = vector(initial_state if initial_state is not None else [np.sqrt(0.8), np.sqrt(0.2)])
  q, good = amplification_operator(psi, [len(psi) - 1] if good_states is None else good_states)
  result = qpe(q, psi, phase_bits)
  probs = result["probabilities"]
  amplitudes = np.sin(np.pi * np.arange(len(probs)) / len(probs)) ** 2
  estimate = float(amplitudes[np.argmax(probs)])
  return {**result, "estimatedProbability": estimate,
          "inputProbability": float(np.sum(abs(psi[good]) ** 2)),
          "probabilityEstimatesByPhase": amplitudes}


def hadamard_test(unitary=None, initial_state=None, imag=False):
  u = matrix(unitary if unitary is not None else [[1, 0], [0, 1j]], "unitary")
  n = qubits(len(u))
  psi = state_input(initial_state, n) if initial_state is not None else vector(np.ones(len(u)))
  qc = QuantumCircuit(n + 1)
  prepare(qc, psi, range(1, n + 1))
  qc.h(0)
  qc.append(UnitaryGate(u).control(), range(n + 1))
  if imag:
    qc.sdg(0)
  qc.h(0)
  probs = abs(state(qc)) ** 2
  estimate = float(np.sum(probs[::2]) - np.sum(probs[1::2]))
  exact = np.vdot(psi, u @ psi)
  return circuit_result(qc, estimate=estimate, reference=float(exact.imag if imag else exact.real))


ALGORITHMS = {name: globals()[name] for name in (
  "hadamard_transform", "qpe", "amplitude_amplification", "amplitude_estimation", "grover", "hadamard_test")}
