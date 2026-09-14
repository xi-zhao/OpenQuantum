"""Independent small-system numerical checks; invoked by the opt-in live suite."""
import importlib.util
import itertools
import json
import sys
from pathlib import Path
import numpy as np

if sys.argv[1] == "flow":
    target = Path.cwd() / ".agents/skills/flow-vqe/core/statevector.py"
    spec = importlib.util.spec_from_file_location("matrix_free_objective", target)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    paulis = {"I": np.eye(2), "X": np.array([[0,1],[1,0]]), "Y": np.array([[0,-1j],[1j,0]]), "Z": np.diag([1,-1])}
    def kron(matrices):
        result = np.ones((1,1))
        for matrix in matrices:
            result = np.kron(result, matrix)
        return result
    rng = np.random.default_rng(19)
    maximum = 0.
    for n in (2,3):
        for word in itertools.product("IXYZ", repeat=n):
            term = {"pauli": "".join(word), "coefficient": -0.7}
            objective = module.PauliObjective(n, 2, [term])
            vector = rng.normal(size=2**n) + 1j*rng.normal(size=2**n)
            vector /= np.linalg.norm(vector)
            dense = term["coefficient"] * kron([paulis[p] for p in word])
            error = abs(objective.expectation(vector) - np.vdot(vector, dense @ vector).real)
            assert error < 1e-12, (word, error)
            maximum = max(maximum, error)
        parameters = rng.uniform(-np.pi, np.pi, n*3)
        actual = objective.state(parameters)
        expected = np.zeros(2**n, complex); expected[0] = 1
        offset = 0
        for layer in range(3):
            if layer:
                for control in range(n-1):
                    matrix = np.zeros((2**n, 2**n))
                    for column in range(2**n):
                        bits = list(format(column, f"0{n}b"))
                        if bits[control] == "1":
                            bits[control+1] = str(1-int(bits[control+1]))
                        matrix[int("".join(bits), 2), column] = 1
                    expected = matrix @ expected
            for q in range(n):
                c, s = np.cos(parameters[offset]/2), np.sin(parameters[offset]/2); offset += 1
                expected = kron([np.array([[c,-s],[s,c]]) if i==q else np.eye(2) for i in range(n)]) @ expected
        assert np.max(np.abs(actual-expected)) < 1e-12
    print(json.dumps({"pauliWordsChecked": 80, "maximumExpectationError": maximum, "denseAnsatzCases": 2}))
else:
    from pyscf import gto, scf, ao2mo, fci
    mol = gto.M(atom="Li 0 0 0; H 0 0 1.6", basis="sto-3g", verbose=0)
    mf = scf.RHF(mol).run(conv_tol=1e-11)
    assert mf.converged
    h = mf.mo_coeff.T @ mf.get_hcore() @ mf.mo_coeff
    eri = ao2mo.restore(1, ao2mo.kernel(mol, mf.mo_coeff), mol.nao_nr())
    core = [0]; active = [1,2,3,4]
    offset = mol.energy_nuc() + sum(2*h[i,i] for i in core)
    offset += sum(2*eri[i,i,j,j]-eri[i,j,j,i] for i in core for j in core)
    one = np.array([[h[p,q]+sum(2*eri[p,q,i,i]-eri[p,i,i,q] for i in core) for q in active] for p in active])
    two = eri[np.ix_(active,active,active,active)]
    exact, _ = fci.direct_spin1.kernel(one,two,4,(1,1),tol=1e-11)
    print(json.dumps({"frozenCoreEnergyHartree": float(exact+offset), "coreEnergyOffsetHartree": float(offset), "activeOrbitalIndices": active}))
