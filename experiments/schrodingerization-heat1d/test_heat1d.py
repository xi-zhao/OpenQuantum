import unittest

import numpy as np

from run import Case, heat_problem, relative_error, simulate


class HeatExperimentTests(unittest.TestCase):
  def test_zero_time_preserves_full_complex_amplitudes(self):
    case = Case(time=0)
    initial = heat_problem(case)[2]
    for method in ("spectral", "strang"):
      result, _ = simulate(case, method)
      recovered = np.array(result["solutionReal"])[1:-1] + 1j * np.array(result["solutionImaginary"])[1:-1]
      self.assertLess(relative_error(recovered, initial), 1e-12)

  def test_discrete_reference_matches_independent_sine_mode_formula(self):
    for n in (4, 8, 16):
      result, _ = simulate(Case(points=n))
      self.assertLess(result["metrics"]["discreteReferenceVsSineModes"], 1e-12)
      self.assertLess(result["metrics"]["unitaryNormDrift"], 1e-12)
      self.assertLess(result["metrics"]["relativeL2VsDiscreteHeat"], 0.01)

  def test_auxiliary_refinement_and_strang_convergence(self):
    coarse, _ = simulate(Case(auxiliary_points=128))
    fine, exact = simulate(Case(auxiliary_points=512))
    self.assertLess(fine["metrics"]["relativeL2VsDiscreteHeat"], coarse["metrics"]["relativeL2VsDiscreteHeat"])
    coarse_trotter, first = simulate(Case(), "strang", 128)
    fine_trotter, second = simulate(Case(), "strang", 512)
    self.assertLess(relative_error(second, exact), 0.35 * relative_error(first, exact))
    for result in (coarse_trotter, fine_trotter):
      self.assertLess(result["metrics"]["unitaryNormDrift"], 1e-11)

  def test_unsupported_or_unresolved_cases_do_not_silently_fall_back(self):
    for arguments in ({"points": 32}, {"time": float("nan")}, {"points": 16, "time": 0.2}, {"recovery_p": 0}, {"recovery_p": 1.001}):
      with self.assertRaises(ValueError):
        Case(**arguments)
    with self.assertRaises(ValueError):
      simulate(Case(), "block")
    with self.assertRaises(ValueError):
      simulate(Case(), "strang", 0)


if __name__ == "__main__":
  unittest.main()
