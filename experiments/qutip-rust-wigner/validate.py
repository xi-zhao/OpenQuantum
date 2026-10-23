"""Full grids, independent polynomial formula, analytic states and failure paths."""
import argparse
from pathlib import Path

import numpy as np
import qutip as qt
from scipy.special import eval_genlaguerre

from case import wigner_rust
from common import PLAN, close_check, file_sha, metadata, save_json
from workloads import independent_laguerre, make_case, methods
import qutip_wigner_rust


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=Path(__file__).resolve().parent / "results")
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    checks, observations, files = [], [], {}
    for index, spec in enumerate(PLAN["cases"]):
        state, x, y, g = make_case(spec, index)
        reference = independent_laguerre(state, x, y, g)
        outputs = {name: function() for name, function in methods(state, x, y, g).items()}
        for name, output in outputs.items():
            error = float(np.max(np.abs(output-reference)))
            accurate = bool(np.allclose(output, reference, atol=1e-12, rtol=1e-12))
            assert output.shape == (len(y), len(x)) and output.dtype == np.float64
            assert np.isfinite(output).all() and output.flags.writeable
            observations.append({"case": spec["id"], "method": name, "independent_max_error": error, "accuracy_passed": accurate})
            if name != "qutip_iterative":
                close_check(output, reference)
        assert abs(state.tr()-1) < 1e-12 and np.linalg.eigvalsh(state.full()).min() > -1e-12
        checks.append({"case": spec["id"], "passed": True,
                       "rust_vs_qutip_max_error": close_check(outputs["rust_clenshaw"], outputs["qutip_clenshaw"]),
                       "rust_vs_independent_max_error": close_check(outputs["rust_clenshaw"], reference)})
        path = args.output / (spec["id"]+"-inputs-outputs.npz")
        np.savez_compressed(path, rho=state.full(), x=x, y=y, g=np.array(g), independent=reference, **outputs)
        files[path.name] = file_sha(path)

    # All Hermitian basis directions test both off-diagonal phases independently.
    x, y = np.array([-1.7, -0.2, 0.3, 1.1]), np.array([-0.8, 0.1, 1.6])
    for n in range(2, 6):
        basis = []
        for m in range(n):
            matrix = np.zeros((n, n), dtype=complex)
            matrix[m, m] = 1
            basis.append(matrix)
            for k in range(m+1, n):
                for value in [1, 1j]:
                    matrix = np.zeros((n, n), dtype=complex)
                    matrix[m, k], matrix[k, m] = value, np.conj(value)
                    basis.append(matrix)
        for index, matrix in enumerate(basis):
            state = qt.Qobj(matrix)
            for g in [0.7, np.sqrt(2), 2.3]:
                expected = independent_laguerre(state, x, y, g)
                error = close_check(wigner_rust(state, x, y, g), expected)
                close_check(qt.wigner(state, x, y, g=g), expected)
                checks.append({"hermitian_basis": [n, index], "g": g, "passed": True, "independent_max_error": error})

    rng = np.random.default_rng(PLAN["seed"]+100)
    for index in range(30):
        n = 2+index % 11
        a = rng.normal(size=(n, n))+1j*rng.normal(size=(n, n))
        matrix = a@a.conj().T
        matrix = (matrix+matrix.conj().T)/2
        state = qt.Qobj(matrix/np.trace(matrix).real)
        x, y = rng.uniform(-3, 3, 7), rng.uniform(-3, 3, 11)
        g = [0.7, np.sqrt(2), 2.3][index % 3]
        expected = independent_laguerre(state, x, y, g)
        error = close_check(wigner_rust(state, x, y, g), expected)
        checks.append({"random_density": index, "dimension": n, "g": g, "passed": True, "independent_max_error": error})

    x, y = np.linspace(-3, 3, 19), np.linspace(-2, 2, 17)
    xx, yy = np.meshgrid(x, y)
    for g in [0.7, np.sqrt(2), 2.3]:
        b = g*g*(xx*xx+yy*yy)
        envelope = g*g/(2*np.pi)*np.exp(-b/2)
        for photon in [0, 1, 3, 12, 40]:
            state = qt.basis(max(photon+1, 2), photon)
            expected = envelope*((-1)**photon)*eval_genlaguerre(photon, 0, b)
            for form in [state, state.dag(), state.proj().to("csr")]:
                error = close_check(wigner_rust(form, x, y, g), expected)
                checks.append({"fock": photon, "form": form.type, "g": g, "passed": True, "analytic_max_error": error})
        for phase in [1, 1j, -1j]:
            state = (qt.basis(2, 0)+phase*qt.basis(2, 1)).unit()
            interference = g*xx if phase == 1 else (g*yy if phase == 1j else -g*yy)
            expected = envelope*(b/2+interference)
            error = close_check(wigner_rust(state, x, y, g), expected)
            checks.append({"analytic_coherence": str(phase), "g": g, "passed": True, "analytic_max_error": error})
    one = wigner_rust(qt.basis(2, 1), x, y)
    assert one.min() < -0.3
    checks.append({"negative_values_preserved": True, "passed": True})

    state = qt.basis(3, 0).proj()
    bad_states = [np.eye(3), qt.Qobj(np.ones((2, 3))), qt.Qobj(np.array([[1, 1], [0, 0]])),
                  qt.Qobj(np.array([[np.nan, 0], [0, 1]])), qt.qeye(1), qt.tensor(qt.qeye(2), qt.qeye(2))]
    invalid = [("state", lambda value=value: wigner_rust(value, [0], [0])) for value in bad_states]
    for coords in [[], [[1, 2]], [1+1j], [np.nan], [np.inf]]:
        invalid.append(("coordinates", lambda coords=coords: wigner_rust(state, coords, [0])))
    for g in [0, -1, np.nan, np.inf, 1+1j, np.complex128(1+2j), [1.0]]:
        invalid.append(("g", lambda g=g: wigner_rust(state, [0], [0], g=g)))
    invalid += [("offset", lambda: wigner_rust(state, [0], [0], offset=1)),
                ("overflow", lambda: wigner_rust(state, [1e308], [0], g=1e308)),
                ("malformed_buffer", lambda: qutip_wigner_rust.clenshaw(b"bad", 3, [0], [0], 1.0))]
    for kind, function in invalid:
        try:
            function()
        except (TypeError, ValueError, OverflowError):
            checks.append({"rejected_input": kind, "passed": True})
        else:
            raise AssertionError(f"Invalid {kind} accepted")
    record = {**metadata(["qutip", "numpy", "scipy"]), "checks": checks, "method_observations": observations,
              "full_input_output_sha256": files, "extension_sha256": file_sha(Path(qutip_wigner_rust.__file__)),
              "tolerance": {"atol": 1e-12, "rtol": 1e-12},
              "note": "QuTiP iterative's high-order accuracy failures remain recorded separately; Rust tolerance is unchanged."}
    save_json(args.output / "validation.json", record)
    print(f"Passed {len(checks)} checks; preserved {len(files)} complete input/output grids.", flush=True)
    for row in observations:
        if not row["accuracy_passed"]:
            print("Alternative-method accuracy failure:", row, flush=True)


if __name__ == "__main__":
    main()
