"""Independent development oracles; no acceptance is inferred by these tests."""
import importlib.util
import itertools
import json
import math
import os
import socket
import unittest
from pathlib import Path

import numpy as np
from sdk_compilers_reference import circuit_cases, dense_unitary


def photonic_reference(v, phases):
    """Direct single-particle matrices and bosonic permanents, independent of SDKs."""
    n = v['numModes']
    unitary = np.eye(n, dtype=complex)
    phase_index = 0
    for op in v['operations']:
        matrix = np.eye(n, dtype=complex)
        modes = op['modes']
        if op['operation'] == 'PS':
            matrix[modes[0], modes[0]] = np.exp(1j * phases[phase_index])
            phase_index += 1
        else:
            c, s = math.cos(op['theta'] / 2), math.sin(op['theta'] / 2)
            matrix[np.ix_(modes, modes)] = [[c, 1j * s], [1j * s, c]]
        unitary = matrix @ unitary
    photons = sum(v['occupation'])
    incoming = [mode for mode, count in enumerate(v['occupation']) for _ in range(count)]
    probabilities = {}
    for occupied in itertools.combinations_with_replacement(range(n), photons):
        occupation = tuple(occupied.count(mode) for mode in range(n))
        block = unitary[np.ix_(occupied, incoming)]
        permanent = sum(np.prod([block[i, perm[i]] for i in range(photons)]) for perm in itertools.permutations(range(photons)))
        denominator = math.prod(math.factorial(count) for count in occupation + tuple(v['occupation']))
        probabilities[occupation] = float(abs(permanent) ** 2 / denominator)
    return probabilities


def main(capability, bridge_path):
    spec = importlib.util.spec_from_file_location('simulation_bridge', bridge_path)
    bridge = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(bridge)
    compute = bridge.compute
    evidence = []

    def denied(*args, **kwargs):
        raise AssertionError('Local simulation SDK attempted network access')
    socket.socket.connect = denied
    socket.socket.connect_ex = denied
    socket.create_connection = denied

    class GateTests(unittest.TestCase):
        def test_all_gates_and_bit_order_against_dense_matrices(self):
            for case in circuit_cases():
                v = {**case, **({'shots': 0, 'seed': 7} if capability == 'mimiq-simulation' else {})}
                result, _ = compute(v)
                actual = np.array([complex(z['real'], z['imag']) for z in result['amplitudes']])
                expected = dense_unitary(case)[:, 0]
                np.testing.assert_allclose(actual, expected, atol=2e-12)
                np.testing.assert_allclose(result['probabilities'], np.abs(expected) ** 2, atol=2e-12)
                self.assertAlmostEqual(result['norm'], 1, places=11)
                evidence.append({'input': v, 'amplitudeMaxError': float(max(abs(actual - expected)))})

        def test_basis_state_and_seeded_samples_if_supported(self):
            basis = {'numQubits': 3, 'gates': [{'gate': 'X', 'targets': [0]}], **({'shots': 0, 'seed': 7} if capability == 'mimiq-simulation' else {})}
            result, _ = compute(basis)
            np.testing.assert_allclose(result['probabilities'], [0, 0, 0, 0, 1, 0, 0, 0], atol=1e-12)
            evidence.append({'input': basis, 'result': result})
            if capability != 'mimiq-simulation':
                return
            v = {'numQubits': 3, 'gates': [{'gate': 'X', 'targets': [0]}, {'gate': 'H', 'targets': [2]}], 'shots': 2000, 'seed': 123}
            first, _ = compute(v)
            second, _ = compute(v)
            self.assertEqual(first, second)
            counts = {row['bitstring']: row['count'] for row in first['counts']}
            self.assertEqual(set(counts), {'100', '101'})
            self.assertEqual(sum(counts.values()), 2000)
            self.assertLess(abs(counts['100'] - 1000), 100)
            evidence.append({'input': v, 'counts': counts})

    class MerlinTests(unittest.TestCase):
        def test_probabilities_and_phase_derivatives_with_permanents(self):
            cases = [
                {'numModes': 2, 'occupation': [1, 0], 'targetOccupation': [1, 0], 'operations': [
                    {'operation': 'BS', 'modes': [0, 1], 'theta': math.pi/2}, {'operation': 'PS', 'modes': [0]}, {'operation': 'BS', 'modes': [0, 1], 'theta': math.pi/2}], 'phases': [[0.0], [0.7], [-1.2]]},
                {'numModes': 3, 'occupation': [1, 1, 0], 'targetOccupation': [0, 1, 1], 'operations': [
                    {'operation': 'PS', 'modes': [0]}, {'operation': 'BS', 'modes': [0, 2], 'theta': 1.2}, {'operation': 'PS', 'modes': [2]}, {'operation': 'BS', 'modes': [2, 1], 'theta': 0.9}, {'operation': 'PS', 'modes': [1]}, {'operation': 'BS', 'modes': [0, 1], 'theta': -0.6}], 'phases': [[0.2, 0.8, 1.4], [-0.3, 0.7, -0.8]]},
                {'numModes': 2, 'occupation': [1, 1], 'targetOccupation': [1, 1], 'operations': [
                    {'operation': 'PS', 'modes': [0]}, {'operation': 'BS', 'modes': [0, 1], 'theta': math.pi/2}], 'phases': [[0.4]]},
                {'numModes': 1, 'occupation': [1], 'targetOccupation': [1], 'operations': [{'operation': 'PS', 'modes': [0]}], 'phases': [[0.7]]},
            ]
            for v in cases:
                actual, _ = compute(v)
                for batch, phases in enumerate(v['phases']):
                    expected = photonic_reference(v, phases)
                    np.testing.assert_allclose(actual['probabilities'][batch], [expected[tuple(key)] for key in actual['basis']], atol=1e-11)
                    self.assertAlmostEqual(actual['probabilitySums'][batch], 1, places=10)
                    derivatives = []
                    for p in range(len(phases)):
                        above, below = phases.copy(), phases.copy()
                        above[p] += 1e-6
                        below[p] -= 1e-6
                        target = tuple(v['targetOccupation'])
                        derivatives.append((photonic_reference(v, above)[target] - photonic_reference(v, below)[target]) / 2e-6)
                    np.testing.assert_allclose(actual['phaseGradients'][batch], derivatives, atol=2e-8)
                evidence.append({'input': v, 'result': actual})

        def test_phase_order_with_more_than_ten_parameters(self):
            # Unequal phases and repeated interferometers reveal lexical/index permutations.
            ops = []
            for i in range(12):
                ops += [{'operation': 'BS', 'modes': [0, 1], 'theta': 0.31 + i * 0.03}, {'operation': 'PS', 'modes': [i % 2]}]
            v = {'numModes': 2, 'occupation': [1, 0], 'targetOccupation': [0, 1], 'operations': ops, 'phases': [[0.07*i for i in range(12)]]}
            result, _ = compute(v)
            expected = photonic_reference(v, v['phases'][0])
            np.testing.assert_allclose(result['probabilities'][0], [expected[tuple(key)] for key in result['basis']], atol=1e-10)
            evidence.append({'input': v, 'result': result})

    class MrMustardTests(unittest.TestCase):
        def run_case(self, modes, operations, cutoff=8):
            v = {'numModes': modes, 'operations': operations, 'cutoff': cutoff}
            result, _ = compute(v)
            evidence.append({'input': v, 'result': result})
            return result

        def test_vacuum_coherent_poisson_and_cutoff(self):
            vacuum = self.run_case(2, [], 3)
            np.testing.assert_allclose(vacuum['means'], np.zeros(4), atol=1e-12)
            np.testing.assert_allclose(vacuum['covariance'], np.eye(4), atol=1e-12)
            self.assertAlmostEqual(vacuum['retainedProbability'], 1)
            operations = [{'operation': 'D', 'modes': [0], 'x': 0.8, 'y': -0.6}]
            for cutoff in [1, 8]:
                result = self.run_case(1, operations, cutoff)
                np.testing.assert_allclose(result['means'], [1.6, -1.2], atol=1e-12)
                np.testing.assert_allclose(result['meanPhotons'], [1.0], atol=1e-12)
                probs = [row['probability'] for row in result['fockProbabilities']]
                np.testing.assert_allclose(probs, [math.exp(-1) / math.factorial(n) for n in range(cutoff)], atol=1e-12)
                self.assertAlmostEqual(result['retainedProbability'], sum(probs))
                self.assertLess(result['retainedProbability'], 1)

        def test_squeezing_and_loss_moments(self):
            r, eta = 0.4, 0.3
            squeezed = self.run_case(1, [{'operation': 'S', 'modes': [0], 'r': r, 'phi': 0}], 10)
            np.testing.assert_allclose(squeezed['covariance'], np.diag([math.exp(-2*r), math.exp(2*r)]), atol=1e-12)
            expected = [0 if n%2 else math.comb(n,n//2) / 2**n * math.tanh(r)**n / math.cosh(r) for n in range(10)]
            np.testing.assert_allclose([row['probability'] for row in squeezed['fockProbabilities']], expected, atol=1e-12)
            lossy = self.run_case(1, [{'operation': 'S', 'modes': [0], 'r': r, 'phi': 0}, {'operation': 'LOSS', 'modes': [0], 'transmissivity': eta}], 10)
            np.testing.assert_allclose(lossy['covariance'], eta*np.diag([math.exp(-2*r), math.exp(2*r)]) + (1-eta)*np.eye(2), atol=1e-12)
            np.testing.assert_allclose(lossy['meanPhotons'], [eta*math.sinh(r)**2], atol=1e-12)
            erased = self.run_case(1, [{'operation': 'D', 'modes': [0], 'x': 1, 'y': 2}, {'operation': 'LOSS', 'modes': [0], 'transmissivity': 0}], 3)
            np.testing.assert_allclose(erased['meanPhotons'], [0], atol=1e-12)
            self.assertAlmostEqual(erased['fockProbabilities'][0]['probability'], 1)

        def test_rotation_beamsplitter_and_two_mode_squeezing(self):
            angle = 0.7
            rotated = self.run_case(1, [{'operation': 'D', 'modes': [0], 'x': 1, 'y': 0}, {'operation': 'R', 'modes': [0], 'theta': angle}])
            np.testing.assert_allclose(rotated['means'], [2*math.cos(angle), 2*math.sin(angle)], atol=1e-12)
            theta = 0.37
            split = self.run_case(2, [{'operation': 'D', 'modes': [0], 'x': 1, 'y': 0}, {'operation': 'BS', 'modes': [0, 1], 'theta': theta, 'phi': 0.2}], 4)
            np.testing.assert_allclose(split['meanPhotons'], [math.cos(theta)**2, math.sin(theta)**2], atol=1e-12)
            np.testing.assert_allclose(split['covariance'], np.eye(4), atol=1e-12)
            r = 0.3
            pair = self.run_case(2, [{'operation': 'S2', 'modes': [0, 1], 'r': r, 'phi': 0.4}], 5)
            np.testing.assert_allclose(pair['meanPhotons'], [math.sinh(r)**2]*2, atol=1e-12)
            for row in pair['fockProbabilities']:
                i, j = row['occupation']
                self.assertAlmostEqual(row['probability'], math.tanh(r)**(2*i)/math.cosh(r)**2 if i == j else 0, places=11)

    cls = MerlinTests if capability == 'merlin-learning' else MrMustardTests if capability == 'mrmustard-optics' else GateTests
    suite = unittest.defaultTestLoader.loadTestsFromTestCase(cls)
    result = unittest.TextTestRunner(verbosity=2).run(suite)
    directory = os.environ.get('OPENQUANTUM_SDK_SIMULATION_EVIDENCE')
    if directory:
        Path(directory).mkdir(parents=True, exist_ok=True)
        (Path(directory)/(capability+'.json')).write_text(json.dumps({'capability': capability, 'networkDenied': True, 'passed': result.wasSuccessful(), 'cases': evidence}, indent=2)+'\n')
    if not result.wasSuccessful():
        raise SystemExit(1)
