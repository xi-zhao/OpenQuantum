"""Numerical checks against analytic results or independent open solvers."""
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import unittest
import numpy as np
from scipy.linalg import expm
from common import serializable
from run import registry, run_algorithm


RESULTS = {}


def independent_paulis(terms):
  matrices = {"I": np.eye(2), "X": np.array([[0, 1], [1, 0]]),
              "Y": np.array([[0, -1j], [1j, 0]]), "Z": np.diag([1, -1])}
  result = np.zeros((2 ** len(terms[0][0]),) * 2, complex)
  for label, coefficient in terms:
    product = np.ones((1, 1), complex)
    for letter in label:
      product = np.kron(product, matrices[letter])
    result += coefficient * product
  return result


class Algorithms(unittest.TestCase):
  @classmethod
  def setUpClass(cls):
    cls.functions = registry()
    assert len(cls.functions) == 49
    for name in cls.functions:
      # Every named workflow is really invoked; no skipped or placeholder cases.
      with np.errstate(all="raise"):
        result = run_algorithm(name, {})
      json.dumps(serializable(result), allow_nan=False)
      RESULTS[name] = result
    cls.results = {name: result["result"] for name, result in RESULTS.items()}

  def test_all_sources_and_workflows_covered(self):
    manifest = json.loads((Path(__file__).with_name("coverage.json")).read_text())
    self.assertEqual(len(manifest["guides"]), 66)
    self.assertEqual(sum(bool(row.get("sourceAlgorithm")) for row in manifest["guides"]), 39)
    self.assertEqual({row["algorithm"] for row in manifest["guides"] if row["algorithm"]}, set(self.results))
    self.assertTrue(all(result["scientificValidation"] == "not_evaluated" for result in RESULTS.values()))

  def test_primitives_and_fourier(self):
    r = self.results
    np.testing.assert_allclose(r["hadamard_transform"]["statevector"], np.ones(8) / np.sqrt(8), atol=1e-12)
    self.assertEqual(r["qpe"]["estimatedPhase"], 0.25)
    self.assertGreater(r["grover"]["successProbability"], 0.94)
    self.assertAlmostEqual(r["amplitude_amplification"]["successProbability"], 1)
    self.assertLess(abs(r["amplitude_estimation"]["estimatedProbability"] - 0.2), 0.03)
    np.testing.assert_allclose(r["qft"]["statevector"], np.ones(8) / np.sqrt(8), atol=1e-12)
    for imag, expected in [(False, 0.5), (True, np.sqrt(3) / 2)]:
      actual = self.functions["hadamard_test"](unitary=np.exp(1j * np.pi / 3) * np.eye(2), imag=imag)
      self.assertAlmostEqual(actual["estimate"], expected)
    psi = np.array([1, 2j, 3, -1j]) / np.sqrt(15)
    out = self.functions["qft"](n=2, initial_state=psi)["statevector"]
    np.testing.assert_allclose(out, np.fft.ifft(psi, norm="ortho"), atol=1e-12)

  def test_linear_solvers_and_postselection(self):
    r = self.results
    self.assertGreater(r["hhl"]["referenceFidelity"], 0.999)
    self.assertLess(self.functions["hhl"](phase_bits=8)["residual"], r["hhl"]["residual"])
    indefinite = self.functions["hhl"](a=[[-1, 0], [0, 1]], b=[1, 1j])
    self.assertLess(indefinite["residual"], 1e-10)
    scaled = self.functions["hhl"](a=[[-1, 0], [0, 1]], b=[3, 3j])
    np.testing.assert_allclose(scaled["reconstructedSolution"], [-3, 3j], atol=1e-10)
    small_units = self.functions["hhl"](a=[[1e-13, 0], [0, 1e-13]])
    np.testing.assert_allclose(small_units["reconstructedSolution"], [1e13, 0], rtol=1e-12, atol=0.01)
    self.assertGreater(r["aqc"]["referenceFidelity"], 0.999)
    self.assertLess(r["vqls"]["residual"], 1e-5)
    improved = self.functions["qsvt_qlsa"](degree=23)
    self.assertLess(improved["residual"], r["qsvt_qlsa"]["residual"] / 4)
    self.assertLess(r["qsp"]["absoluteError"], 1e-8)
    out = self.functions["lcu"](coefficients=[1, -0.5j])
    np.testing.assert_allclose(out["blockAction"], np.array([1, -0.5j]) / 1.5, atol=1e-12)
    self.assertAlmostEqual(out["postselectionProbability"], 1.25 / 2.25)

  def test_simulation_formulas(self):
    r = self.results
    self.assertLess(r["cartan"]["stateError"], 1e-12)
    self.assertLess(r["cartan"]["decompositionResidual"], 1e-12)
    self.assertLess(r["taylor"]["approximationError"], 1e-5)
    self.assertLess(r["hamiltonian_qsp"]["approximationError"], 1e-7)
    self.assertEqual(self.functions["hamiltonian_qsp"](time=0)["approximationError"], 0)
    self.assertEqual(self.functions["hamiltonian_qsp"](terms=[["X", 0]])["approximationError"], 0)
    self.assertLess(self.functions["hamiltonian_qsp"](terms=[["Y", 0.4], ["X", 0.2]])["approximationError"], 1e-7)
    self.assertLess(r["trotter"]["unitarySpectralError"], 1e-3)
    again = self.functions["qdrift"]()
    self.assertEqual(again["sequenceSha256"], r["qdrift"]["sequenceSha256"])
    self.assertLess(r["qdrift"]["unitarySpectralError"], 0.3)
    for name in ("trotter", "qdrift"):
      out = self.functions[name](terms=[["X", 1]], time=np.pi / 4)["statevector"]
      np.testing.assert_allclose(out, [np.sqrt(0.5), -1j * np.sqrt(0.5)], atol=1e-12)

  def test_state_preparation_complex_states(self):
    rng = np.random.default_rng(17)
    target = rng.normal(size=8) + 1j * rng.normal(size=8)
    target /= np.linalg.norm(target)
    for name in ("mottonen", "multiplexer", "superposition", "mps", "pauli"):
      with self.subTest(method=name):
        self.assertGreater(self.results[name]["fidelity"], 1 - 1e-8)
        actual = self.functions[name](target=target)
        self.assertGreater(actual["fidelity"], 1 - 1e-6)
    truncated = self.functions["mps"](target=target, max_bond=1)
    self.assertLess(truncated["fidelity"], 0.99)
    self.assertAlmostEqual(np.linalg.norm(truncated["statevector"]), 1)

  def test_oracle_algorithms_recover_from_distributions(self):
    r = self.results
    self.assertEqual(r["shor"]["factors"], [3, 5])
    self.assertEqual(r["discrete_log"]["candidates"], [5])
    self.assertEqual(r["simon"]["recoveredSecret"], "101")
    self.assertEqual(self.functions["simon"](secret="01101")["recoveredSecret"], "01101")
    self.assertEqual(r["hidden_shift"]["recoveredShift"], "1010")
    self.assertEqual(self.functions["hidden_shift"](qubits=6, shift="010011")["recoveredShift"], "010011")
    self.assertGreater(r["glued_trees"]["exitProbability"], 0)
    self.assertAlmostEqual(sum(r["glued_trees"]["probabilities"]), 1)
    self.assertEqual(self.functions["glued_trees"](time=0)["exitProbability"], 0)

  def test_variational_and_classical_eigensolvers(self):
    r = self.results
    exact = np.linalg.eigvalsh(independent_paulis([["ZI", -1], ["IZ", -1], ["XX", 0.3]]))[0]
    self.assertAlmostEqual(r["vqe"]["energy"], exact, places=7)
    vqd_exact = np.linalg.eigvalsh(independent_paulis([["ZI", -1], ["IZ", -0.7], ["XX", 0.2]]))[:2]
    np.testing.assert_allclose(r["vqd"]["energies"], vqd_exact, atol=1e-5)
    np.testing.assert_allclose(r["numpy_eigensolver"]["eigenvalues"], [1, 2], atol=1e-12)
    self.assertAlmostEqual(r["numpy_minimum_eigensolver"]["eigenvalues"][0], 1)
    self.assertAlmostEqual(r["qaoa"]["expectedCut"], 4, places=6)
    self.assertEqual(r["qaoa"]["mostLikelyCut"], 4)
    self.assertLess(r["qcbm"]["totalVariation"], 1e-5)
    self.assertEqual(r["vqc"]["trainingAccuracy"], 1)
    self.assertAlmostEqual(r["fermi_hubbard_vqe"]["energy"], -3, places=6)
    self.assertEqual(r["cvqnn"]["trainingAccuracy"], 1)
    self.assertLessEqual(r["cvqnn"]["finalObjective"], r["cvqnn"]["objectiveHistory"][0])
    np.testing.assert_allclose(r["cvqnn"]["stateNorms"], 1, atol=1e-12)

  def test_independent_gradient_identities(self):
    expected = [-np.sin(0.2) * np.cos(0.4), -np.cos(0.2) * np.sin(0.4)]
    for method in ("finite_difference", "linear_combination", "parameter_shift", "reverse"):
      np.testing.assert_allclose(self.results[method]["gradient"], expected, atol=1e-8)
    np.testing.assert_allclose(self.results["spsa"]["gradient"], expected, atol=0.03)
    np.testing.assert_allclose(self.results["qfi"]["quantumFisherInformation"], np.eye(2), atol=1e-12)

  def test_css_known_code_and_failure_paths(self):
    r = self.results["qldpc"]
    self.assertTrue(r["cssCommutes"])
    self.assertEqual((r["physicalQubits"], r["logicalQubits"]), (13, 1))
    self.assertIsNone(r["distance"])
    for name, arguments in [("hhl", {"a": [[1, 2], [0, 1]]}), ("qldpc", {"h1": [[2]]}),
                            ("mps", {"max_bond": 3}), ("qsvt_qlsa", {"degree": 4}),
                            ("hidden_shift", {"qubits": 3, "shift": "101"}),
                            ("heat_1d", {"half_width": 0.1}), ("aqc", {"a": [[1, 0], [0, -1]]})]:
      with self.subTest(algorithm=name), self.assertRaises(ValueError):
        self.functions[name](**arguments)
    with self.assertRaises(TypeError):
      run_algorithm("vqe", {"backend": "unitarylab"})
    with self.assertRaises(ValueError):
      run_algorithm("unimplemented", {})

  def test_pde_discretization_and_auxiliary_convergence(self):
    for name in ("heat_1d", "heat_2d"):
      coarse = self.results[name]
      fine = self.functions[name](auxiliary_points=512)
      self.assertLess(coarse["relativeL2Error"], 0.01)
      self.assertLess(fine["relativeL2Error"], coarse["relativeL2Error"] / 5)
      self.assertLess(fine["unitaryNormDrift"], 1e-10)
    self.assertLess(self.results["advection"]["relativeL2Error"], 1e-10)

  def test_mps_ising_against_dense_strang(self):
    n, j, h, dt, steps = 4, 1, 0.7, 0.025, 8
    hx = -h * independent_paulis([["XIII", 1], ["IXII", 1], ["IIXI", 1], ["IIIX", 1]])
    hz = -j * independent_paulis([["ZZII", 1], ["IZIZ", 1], ["IIZZ", 1], ["ZIZI", 1]])
    u = expm(-1j * dt * hx / 2) @ expm(-1j * dt * hz) @ expm(-1j * dt * hx / 2)
    psi = np.linalg.matrix_power(u, steps) @ (np.ones(2 ** n) / 4)
    expected = np.vdot(psi, (hx + hz) @ psi).real
    self.assertAlmostEqual(self.results["ising"]["energy"], expected, places=9)
    self.assertLessEqual(self.results["ising"]["maxBondUsed"], 32)

  def test_molecular_dmrg_against_independent_fci(self):
    from pyscf import gto, scf, fci
    molecule = gto.M(atom="H 0 0 0; H 0 0 0.74", basis="sto-3g", unit="Angstrom", verbose=0)
    mean_field = scf.RHF(molecule).run()
    exact, _ = fci.FCI(mean_field).kernel()
    result = self.results["molecular_dmrg"]
    self.assertTrue(result["converged"])
    self.assertAlmostEqual(result["energyHartree"], exact, places=8)
    self.assertLess(result["particleNumberVariance"], 1e-10)
    self.assertLess(result["spinProjectionVariance"], 1e-10)
    self.assertGreater(result["maxBondUsed"], 1)


if __name__ == "__main__":
  suite = unittest.defaultTestLoader.loadTestsFromTestCase(Algorithms)
  outcome = unittest.TextTestRunner(verbosity=2).run(suite)
  if outcome.wasSuccessful() and os.environ.get("OPENQUANTUM_ALGORITHM_EVIDENCE"):
    directory = Path(__file__).parent
    hashes = {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(directory.glob("*.py"))}
    hashes["uv.lock"] = hashlib.sha256((directory / "uv.lock").read_bytes()).hexdigest()
    hashes["coverage.json"] = hashlib.sha256((directory / "coverage.json").read_bytes()).hexdigest()
    evidence = {"checkedAt": datetime.now(timezone.utc).isoformat(), "workflowCount": len(RESULTS),
                "testGroups": outcome.testsRun, "scientificValidation": "not_evaluated", "sourceSha256": hashes,
                "results": serializable(RESULTS)}
    Path(os.environ["OPENQUANTUM_ALGORITHM_EVIDENCE"]).write_text(json.dumps(evidence, indent=2, allow_nan=False) + "\n")
  raise SystemExit(0 if outcome.wasSuccessful() else 1)
