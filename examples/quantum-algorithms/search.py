"""Explicit oracle circuits; small dense-oracle simulation, not cryptanalytic scaling."""
from fractions import Fraction
from math import gcd
import numpy as np
from scipy.linalg import expm
from qiskit import QuantumCircuit
from qiskit.circuit.library import QFTGate
from common import circuit_result, integer, normalized_result, prepare, state
from fundamentals import qpe


def simon(secret="101", shots=64, seed=7):
  if not isinstance(secret, str) or not secret or set(secret) - {"0", "1"} or "1" not in secret:
    raise ValueError("secret must be a nonzero binary string")
  integer(shots, "shots")
  n = len(secret)
  s = int(secret, 2)
  pivot = next(i for i in range(n) if (s >> i) & 1)
  qc = QuantumCircuit(2 * n)
  qc.h(range(n))
  for j in range(n):
    qc.cx(j, n + j)
    if (s >> j) & 1:
      qc.cx(pivot, n + j)
  qc.h(range(n))
  probs = np.sum(abs(state(qc).reshape(2 ** n, 2 ** n)) ** 2, axis=0)
  samples = np.random.default_rng(seed).choice(2 ** n, shots, p=probs)
  # Recover the nullspace over GF(2) from measured equations, not from the supplied secret.
  rows = sorted(set(int(x) for x in samples if x))
  basis = {}
  for row in rows:
    while row:
      bit = row.bit_length() - 1
      if bit in basis:
        row ^= basis[bit]
      else:
        basis[bit] = row
        break
  free = [i for i in range(n) if i not in basis]
  recovered = None
  if len(free) == 1:
    solution = 1 << free[0]
    for bit, row in sorted(basis.items()):
      if (row & solution).bit_count() % 2:
        solution ^= 1 << bit
    recovered = format(solution, f"0{n}b")
  return circuit_result(qc, recoveredSecret=recovered, equationRank=len(basis),
                        probabilities=probs, samples=samples,
                        status="resolved" if recovered is not None else "insufficient_samples")


def shor(n=15, base=2, phase_bits=None):
  integer(n, "n", 3)
  integer(base, "base", 2)
  if base >= n:
    raise ValueError("base must be smaller than n")
  factor = gcd(base, n)
  if factor > 1:
    return {"backend": "classical-preprocessing", "factors": [factor, n // factor], "order": None}
  width = (n - 1).bit_length()
  bits = 2 * width if phase_bits is None else integer(phase_bits, "phase_bits")
  u = np.zeros((2 ** width, 2 ** width), dtype=complex)
  for k in range(2 ** width):
    u[(base * k) % n if k < n else k, k] = 1
  initial = np.zeros(2 ** width)
  initial[1] = 1
  result = qpe(u, initial, bits)
  order, factors = None, None
  for k in np.argsort(result["probabilities"])[::-1]:
    if k == 0 or result["probabilities"][k] < 1e-12:
      continue
    denominator = Fraction(int(k), 2 ** bits).limit_denominator(n - 1).denominator
    if denominator < 2:
      continue
    for multiple in range(1, n // denominator + 1):
      r = denominator * multiple
      if pow(base, r, n) != 1:
        continue
      order = r
      if r % 2 == 0:
        for sign in (-1, 1):
          factor = gcd(pow(base, r // 2, n) + sign, n)
          if 1 < factor < n:
            factors = sorted([factor, n // factor])
      break
    if factors:
      break
  return {**result, "factors": factors, "order": order,
          "status": "factored" if factors else "retry_with_another_base_or_precision"}


def discrete_log(g=3, y=5, modulus=7):
  integer(modulus, "modulus", 3)
  if not 0 < g < modulus or not 0 < y < modulus or gcd(g, modulus) != 1 or gcd(y, modulus) != 1:
    raise ValueError("g and y must be invertible nonzero residues")
  # The cyclic group order is an explicit classical setup cost of this dense educational oracle.
  order, v = 1, g % modulus
  while v != 1:
    v = v * g % modulus
    order += 1
    if order > modulus:
      raise ValueError("Could not determine the generated cyclic group")
  width = max(1, (order - 1).bit_length())
  out_width = (modulus - 1).bit_length()
  size = 2 ** width
  amps = np.zeros(size)
  amps[:order] = 1 / np.sqrt(order)
  qc = QuantumCircuit(2 * width + out_width)
  prepare(qc, amps, range(width))
  prepare(qc, amps, range(width, 2 * width))
  # Reversible XOR lookup of f(a,b)=g^a y^b mod P. It does not encode a known logarithm.
  for a in range(order):
    for b in range(order):
      value = pow(g, a, modulus) * pow(y, b, modulus) % modulus
      ctrl = a + (b << width)
      for bit in range(out_width):
        if value >> bit & 1:
          from qiskit.circuit.library import XGate
          qc.append(XGate().control(2 * width, ctrl_state=ctrl),
                    [*range(2 * width), 2 * width + bit])
  # Exact cyclic Fourier transform padded to a qubit register; order need not be a power of two.
  fourier = np.eye(size, dtype=complex)
  idx = np.arange(order)
  fourier[:order, :order] = np.exp(2j * np.pi * np.outer(idx, idx) / order) / np.sqrt(order)
  qc.unitary(fourier, range(width))
  qc.unitary(fourier, range(width, 2 * width))
  probs = np.sum(abs(state(qc).reshape(2 ** out_width, size, size)) ** 2, axis=0)
  candidates = []
  for l, k in zip(*np.where(probs > 1e-10)):
    if gcd(int(k), order) == 1:
      candidate = (int(l) * pow(int(k), -1, order)) % order
      if pow(g, candidate, modulus) == y and candidate not in candidates:
        candidates.append(candidate)
  return circuit_result(qc, candidates=candidates, groupOrder=order,
                        jointFourierProbabilities=probs,
                        status="resolved" if candidates else "no_verified_logarithm")


def hidden_shift(qubits=4, shift="1010", shots=64, seed=7):
  n = integer(qubits, "qubits", 2)
  if n % 2 or len(shift) != n or set(shift) - {"0", "1"}:
    raise ValueError("Bent quadratic hidden shift requires even qubits and a matching binary shift")
  s = int(shift, 2)
  def bent(x):
    return sum(((x >> j) & 1) * ((x >> (j + 1)) & 1) for j in range(0, n, 2)) % 2
  qc = QuantumCircuit(n)
  qc.h(range(n))
  qc.unitary(np.diag([(-1) ** bent(x ^ s) for x in range(2 ** n)]), range(n), label="shifted_oracle")
  qc.h(range(n))
  qc.unitary(np.diag([(-1) ** bent(x) for x in range(2 ** n)]), range(n), label="dual_bent_oracle")
  qc.h(range(n))
  probs = abs(state(qc)) ** 2
  samples = np.random.default_rng(seed).choice(2 ** n, integer(shots, "shots"), p=probs)
  return circuit_result(qc, recoveredShift=format(int(np.argmax(probs)), f"0{n}b"),
                        probabilities=probs, samples=samples)


def glued_trees(depth=2, time=2.0, seed=7):
  integer(depth, "depth")
  tree_size = 2 ** (depth + 1) - 1
  vertices = 2 * tree_size
  n = (vertices - 1).bit_length()
  adjacency = np.zeros((2 ** n, 2 ** n))
  for offset in (0, tree_size):
    for parent in range(2 ** depth - 1):
      for child in (2 * parent + 1, 2 * parent + 2):
        adjacency[offset + parent, offset + child] = adjacency[offset + child, offset + parent] = 1
  left = np.arange(2 ** depth - 1, tree_size)
  right = tree_size + np.random.default_rng(seed).permutation(left)
  # Random alternating leaf cycle, the standard glued-trees walk construction.
  for j, vertex in enumerate(left):
    for neighbor in (right[j], right[(j - 1) % len(right)]):
      adjacency[vertex, neighbor] = adjacency[neighbor, vertex] = 1
  qc = QuantumCircuit(n)
  qc.unitary(expm(-1j * time * adjacency), range(n), label="continuous_time_walk")
  probs = abs(state(qc)) ** 2
  return circuit_result(qc, vertices=vertices, exitVertex=tree_size,
                        exitProbability=float(probs[tree_size]), probabilities=probs,
                        variant="dense continuous-time adjacency walk; padded states disconnected")


ALGORITHMS = {name: globals()[name] for name in ("simon", "shor", "discrete_log", "hidden_shift", "glued_trees")}
