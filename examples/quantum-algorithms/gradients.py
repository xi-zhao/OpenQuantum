"""Use the six public Qiskit Algorithms gradient / QFI implementations directly."""
import numpy as np
from qiskit import QuantumCircuit
from qiskit.circuit import ParameterVector
from qiskit.primitives import StatevectorEstimator
from qiskit.quantum_info import SparsePauliOp
from qiskit_algorithms.gradients import (
  FiniteDiffEstimatorGradient, LinCombEstimatorGradient, ParamShiftEstimatorGradient,
  ReverseEstimatorGradient, SPSAEstimatorGradient, QFI, ReverseQGT)
from common import integer


def problem(angles, observable):
  angles = np.asarray([0.2, 0.4] if angles is None else angles, float)
  if angles.ndim != 1 or len(angles) < 1 or not np.all(np.isfinite(angles)):
    raise ValueError("angles must be a nonempty finite vector")
  n = len(angles)
  parameters = ParameterVector("theta", n)
  circuit = QuantumCircuit(n)
  for i, theta in enumerate(parameters):
    circuit.ry(theta, i)
  for i in range(n - 1):
    circuit.cz(i, i + 1)
  observable = "Z" * n if observable is None else observable
  if len(observable) != n or set(observable) - set("IXYZ"):
    raise ValueError("observable must be a matching I/X/Y/Z Pauli label")
  return circuit, angles, SparsePauliOp.from_list([(observable, 1)])


def evaluate(method, angles, observable):
  circuit, values, operator = problem(angles, observable)
  gradient = method.run([circuit], [operator], [values]).result().gradients[0]
  return {"backend": "qiskit-algorithms/StatevectorEstimator", "method": type(method).__name__,
          "gradient": np.asarray(gradient), "angles": values, "circuit": "RY per qubit followed by nearest-neighbor CZ"}


def finite_difference(angles=None, observable=None, epsilon=1e-5):
  if not np.isfinite(epsilon) or epsilon <= 0:
    raise ValueError("epsilon must be positive and finite")
  return evaluate(FiniteDiffEstimatorGradient(StatevectorEstimator(), epsilon=epsilon), angles, observable)


def linear_combination(angles=None, observable=None):
  return evaluate(LinCombEstimatorGradient(StatevectorEstimator()), angles, observable)


def parameter_shift(angles=None, observable=None):
  return evaluate(ParamShiftEstimatorGradient(StatevectorEstimator()), angles, observable)


def reverse(angles=None, observable=None):
  return evaluate(ReverseEstimatorGradient(), angles, observable)


def spsa(angles=None, observable=None, epsilon=1e-3, batch_size=256, seed=7):
  integer(batch_size, "batch_size")
  if not np.isfinite(epsilon) or epsilon <= 0:
    raise ValueError("epsilon must be positive and finite")
  return evaluate(SPSAEstimatorGradient(StatevectorEstimator(), epsilon=epsilon, batch_size=batch_size, seed=seed), angles, observable)


def qfi(angles=None):
  circuit, values, _ = problem(angles, None)
  result = QFI(ReverseQGT()).run([circuit], [values]).result().qfis[0]
  return {"backend": "qiskit-algorithms/ReverseQGT", "quantumFisherInformation": result, "angles": values}


ALGORITHMS = {name: globals()[name] for name in ("finite_difference", "linear_combination", "parameter_shift", "reverse", "spsa", "qfi")}
