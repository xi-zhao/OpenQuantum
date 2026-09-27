"""Independent analytical and dense-Hamiltonian checks, not scientific Acceptance."""
import importlib.util
import json
import os
from pathlib import Path
import socket
import unittest
from unittest.mock import patch

import numpy as np
from scipy.integrate import solve_ivp
from scipy.linalg import expm

spec = importlib.util.spec_from_file_location("bloqade_bridge", Path(__file__).resolve().parents[1] / "mcp/bridge.py")
bridge = importlib.util.module_from_spec(spec)
spec.loader.exec_module(bridge)
C6 = 2 * np.pi * 862690
RECORDS = []


def request(**overrides):
    return {"atomPositionsUm": [[0, 0]], "durationsUs": [0.9], "rabiRadPerUs": [2, 2],
            "detuningRadPerUs": [0, 0], "phaseRad": [0, 0], "timeSteps": 12,
            "atol": 1e-11, "rtol": 1e-11, **overrides}


def run(label, inputs):
    # A computation must not connect to AWS, QuEra or a Julia downloader.
    with patch.object(socket.socket, "connect", side_effect=AssertionError("Unexpected network access")):
        result, _ = bridge.compute(inputs)
    RECORDS.append({"label": label, "input": inputs, "result": result})
    return result


def operators(n):
    # Conventional tensor ordering: the first site is the leftmost bit.
    identity = np.eye(2, dtype=complex)
    local = [np.array([[0, 1], [1, 0]]), np.array([[0, -1j], [1j, 0]]), np.diag([0, 1])]
    matrices = [[], [], []]
    for site in range(n):
        for k, operator in enumerate(local):
            value = np.ones((1, 1), complex)
            for j in range(n):
                value = np.kron(value, operator if j == site else identity)
            matrices[k].append(value)
    return matrices


def independent_model(v):
    n = len(v["atomPositionsUm"])
    xs, ys, occupations = operators(n)
    drift = np.zeros((2**n, 2**n), complex)
    for i in range(n):
        for j in range(i):
            distance = np.linalg.norm(np.array(v["atomPositionsUm"][i]) - v["atomPositionsUm"][j])
            drift += C6 / distance**6 * (occupations[i] @ occupations[j])
    grid = np.r_[0, np.cumsum(v["durationsUs"])]
    def hamiltonian(t):
        omega, delta, phi = [np.interp(t, grid, v[key]) for key in ("rabiRadPerUs", "detuningRadPerUs", "phaseRad")]
        return drift + omega/2 * (np.cos(phi) * sum(xs) - np.sin(phi) * sum(ys)) - delta * sum(occupations)
    return hamiltonian, occupations, grid


class BloqadeScience(unittest.TestCase):
    def check_normalization(self, result):
        self.assertLess(result["maxNormError"], 2e-8)
        self.assertAlmostEqual(sum(row["probability"] for row in result["finalOutcomes"]), 1, places=8)
        self.assertEqual(result["hilbertDimension"], 2**result["atomCount"])

    def test_single_atom_rabi(self):
        v = request(durationsUs=[np.pi/2])
        result = run("single-atom-pi-pulse", v)
        expected = np.sin(np.asarray(result["timesUs"]))**2
        np.testing.assert_allclose(np.array(result["rydbergPopulations"])[:, 0], expected, atol=2e-9)
        self.check_normalization(result)

    def test_phase_ramp_with_detuning(self):
        v = request(detuningRadPerUs=[1, 1], phaseRad=[0, 1.8])
        result = run("detuned-phase-ramp", v)
        # Rotating drive phase beta=2 gives Delta_eff=Delta+beta=3.
        expected = 4/13 * np.sin(np.sqrt(13)*np.asarray(result["timesUs"])/2)**2
        np.testing.assert_allclose(np.array(result["rydbergPopulations"])[:, 0], expected, atol=2e-9)
        self.check_normalization(result)

    def test_finite_blockade_against_matrix_exponential(self):
        v = request(atomPositionsUm=[[0, 0], [5, 0]], durationsUs=[float(np.pi/(2*np.sqrt(2)))])
        result = run("two-atom-finite-blockade", v)
        h, occupations, _ = independent_model(v)
        ground = np.eye(4, dtype=complex)[:, 0]
        for t, row in zip(result["timesUs"], result["rydbergPopulations"]):
            state = expm(-1j*h(0)*t) @ ground
            expected = [np.vdot(state, number @ state).real for number in occupations]
            np.testing.assert_allclose(row, expected, atol=2e-9)
        expected = expm(-1j*h(0)*result["timesUs"][-1]) @ ground
        actual = np.array([complex(*row["amplitude"]) for row in result["finalOutcomes"]])
        np.testing.assert_allclose(actual, expected, atol=2e-9)
        self.assertGreater(result["finalOutcomes"][-1]["probability"], 0)
        self.assertLess(result["finalOutcomes"][-1]["probability"], 1e-3)
        self.check_normalization(result)

    def test_asymmetric_2d_time_dependent_reference(self):
        v = request(atomPositionsUm=[[0, 0], [8, 1], [1, 9.5]], durationsUs=[0.13, 0.27, 0.31],
                    rabiRadPerUs=[0, 6, 4, 0], detuningRadPerUs=[-2, 1, 3, -1], phaseRad=[0, 0.4, -0.3, 0.8])
        result = run("asymmetric-2d-shaped-pulse", v)
        h, occupations, grid = independent_model(v)
        state = np.eye(8, dtype=complex)[:, 0]
        max_error = 0
        for begin, end in zip(grid[:-1], grid[1:]):
            solution = solve_ivp(lambda t, y: -1j*h(t) @ y, (begin, end), state, method="RK45", atol=1e-12, rtol=1e-12, dense_output=True)
            self.assertTrue(solution.success)
            for t, row in zip(result["timesUs"], result["rydbergPopulations"]):
                if begin <= t <= end:
                    expected_state = solution.sol(t)
                    expected = [np.vdot(expected_state, number @ expected_state).real for number in occupations]
                    max_error = max(max_error, float(np.max(np.abs(np.asarray(row)-expected))))
            state = solution.y[:, -1]
        actual = np.array([complex(*row["amplitude"]) for row in result["finalOutcomes"]])
        np.testing.assert_allclose(actual, state, atol=3e-8)
        self.assertLess(max_error, 3e-8)
        self.assertGreater(np.ptp(result["rydbergPopulations"][-1]), 1e-3)
        self.check_normalization(result)
        RECORDS[-1]["independentMaxPopulationError"] = max_error
        RECORDS[-1]["independentMaxAmplitudeError"] = float(np.max(abs(actual-state)))

    def test_decimal_duration_and_zero_drive(self):
        v = request(atomPositionsUm=[[0, 0], [7, 0]], durationsUs=[0.1, 0.2], rabiRadPerUs=[0, 0, 0],
                    detuningRadPerUs=[-2, 4, 1], phaseRad=[0, 1, 3], timeSteps=7)
        result = run("decimal-times-zero-drive", v)
        self.assertEqual(result["timesUs"][-1], 0.3)
        self.assertIn(0.1, result["timesUs"])
        np.testing.assert_array_equal(result["rydbergPopulations"], 0)
        self.check_normalization(result)

    def test_tolerance_refinement(self):
        inputs = request(atomPositionsUm=[[0, 0], [8, 1]], durationsUs=[0.17, 0.23],
                         rabiRadPerUs=[0, 4, 0], detuningRadPerUs=[-1, 2, 3], phaseRad=[0, 0.4, -0.2])
        coarse = run("refinement-1e-8", {**inputs, "atol": 1e-8, "rtol": 1e-8})
        fine = run("refinement-1e-11", inputs)
        np.testing.assert_allclose(coarse["rydbergPopulations"], fine["rydbergPopulations"], atol=2e-6)
        self.check_normalization(fine)

    def test_backend_representation_and_unresolvable_times(self):
        with self.assertRaisesRegex(ValueError, "addressable"):
            bridge.compute(request(atomPositionsUm=[[6*i, 0] for i in range(65)]))
        with self.assertRaisesRegex(ValueError, "strictly increasing"):
            bridge.compute(request(durationsUs=[1.0, 1e-30], rabiRadPerUs=[0, 0, 0], detuningRadPerUs=[0, 0, 0], phaseRad=[0, 0, 0]))


if __name__ == "__main__":
    result = unittest.main(exit=False).result
    if directory := os.environ.get("OPENQUANTUM_BLOQADE_EVIDENCE"):
        import importlib.metadata
        p = Path(directory)
        p.mkdir(parents=True, exist_ok=True)
        (p / "independent-science.json").write_text(json.dumps({"passed": result.wasSuccessful(), "testsRun": result.testsRun,
            "versions": {name: importlib.metadata.version(name) for name in ["bloqade-analog", "numpy", "scipy"]},
            "records": RECORDS}, indent=2))
    sys_exit = 0 if result.wasSuccessful() else 1
    raise SystemExit(sys_exit)
