"""Editable offline molecular response example using SlowQuant's public API.

Run with the interpreter returned by sdk-access inspect, using -B. For a copy
outside the repository, set OPENQUANTUM_ROOT to the installed plugin/repository.
The example's two response choices do not restrict the upstream SDK surface.
"""
import argparse
import importlib.metadata
import json
import os
from pathlib import Path
import sys

root = Path(os.environ.get("OPENQUANTUM_ROOT") or Path(__file__).resolve().parents[4])
sys.path.insert(0, str(root / "src/lib"))
from sdk_bootstrap import prepare_sdk

# Keep JIT outputs in the task workspace, outside the attested source tree.
os.environ.setdefault("NUMBA_CACHE_DIR", str(Path.cwd() / ".numba-cache"))
prepare_sdk("slowquant-response")

import numpy as np
import scipy.linalg
from pyscf import gto, scf
from slowquant.unitary_coupled_cluster.ucc_wavefunction import WaveFunctionUCC
from slowquant.unitary_coupled_cluster.linear_response import naive, projected

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--atom", default="H 0 0 0; H 0 0 0.74")
parser.add_argument("--basis", default="sto-3g")
parser.add_argument("--charge", type=int, default=0)
parser.add_argument("--spin", type=int, default=0, help="N_alpha - N_beta; the example uses restricted HF")
parser.add_argument("--active-electrons", type=int, default=2)
parser.add_argument("--active-orbitals", type=int, default=2)
parser.add_argument("--excitations", default="SD")
parser.add_argument("--method", choices=["naive", "projected"], default="naive")
parser.add_argument("--optimize-orbitals", action="store_true")
parser.add_argument("--maxiter", type=int, default=100)
parser.add_argument("--output", default="result.json")
args = parser.parse_args()
mol = gto.M(atom=args.atom, basis=args.basis, charge=args.charge, spin=args.spin,
            unit="Angstrom", verbose=0)
hf = scf.RHF(mol)
hf.conv_tol = 1e-12
hf.kernel()
if not hf.converged:
    raise RuntimeError("Reference HF did not converge; no response result written")
wf = WaveFunctionUCC((args.active_electrons, args.active_orbitals), hf.mo_coeff, mol, args.excitations)
wf.run_wf_optimization_1step("BFGS", args.optimize_orbitals, tol=1e-10, maxiter=args.maxiter)
response = {"naive": naive, "projected": projected}[args.method].LinearResponse(wf, args.excitations)
response.calc_excitation_energies()
strengths = response.get_oscillator_strength()
vectors = response.response_vectors
residuals = [float(np.linalg.norm(response.hessian @ vectors[:, i]
                                 - energy * response.metric @ vectors[:, i]))
             for i, energy in enumerate(response.excitation_energies)]
raw_eigenvalues = scipy.linalg.eigvals(response.hessian, response.metric)
source = root / os.environ.get("OPENQUANTUM_SDK_SOURCE_ROOT", ".openquantum/sdk-sources")
record = json.loads((source / "slowquant-response/openquantum-source.json").read_text(encoding="utf-8"))
result = {
    "inputs": vars(args), "distanceUnit": "Angstrom", "energyUnit": "Hartree",
    "totalEnergyHartree": float(wf.energy_elec + mol.energy_nuc()),
    "excitationEnergiesHartree": response.excitation_energies.tolist(),
    "transitionDipolesAtomicUnits": response.get_transition_dipole().tolist(),
    "oscillatorStrengths": strengths.tolist(),
    "diagnostics": {
        "hfConverged": bool(hf.converged),
        "responseResiduals": residuals, "maxResponseResidual": max(residuals, default=0),
        "responseNorms": response.get_excited_state_norm().tolist(),
        "smallestHessianEigenvalue": float(np.linalg.eigvalsh(response.hessian).min()),
        "maxImaginaryEigenvalue": float(np.max(np.abs(raw_eigenvalues.imag))),
        "finiteGeneralizedEigenvalues": bool(np.isfinite(raw_eigenvalues).all()),
        "note": "Keep stdout/stderr optimizer and response diagnostics; these fields do not decide scientific acceptance.",
    },
    "upstreamRevision": record["revision"],
    "versions": {name: importlib.metadata.version(name) for name in ["numpy", "scipy", "numba", "pyscf", "qiskit", "qiskit-nature"]},
    "scientificValidation": "not_evaluated",
}
Path(args.output).write_text(json.dumps(result, indent=2, allow_nan=False) + "\n")
print(f"Wrote {args.output}; scientificValidation=not_evaluated")
