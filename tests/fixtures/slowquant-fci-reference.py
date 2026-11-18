"""Independent singlet FCI reference; this program never imports SlowQuant.

For two electrons in two spatial orbitals, full SD response can be compared
with all three singlet FCI roots. This equivalence is not assumed for larger
truncated active spaces. PySCF supplies a distinct FCI solver and transition RDM.
"""
import json
from pathlib import Path
import sys

import numpy as np
from pyscf import ao2mo, fci, gto, scf

distance = float(sys.argv[1])
mol = gto.M(atom=f"H 0 0 0; H 0 0 {distance}", basis="sto-3g", unit="Angstrom", verbose=0)
hf = scf.RHF(mol)
hf.conv_tol = 1e-12
hf.kernel()
assert hf.converged
orbitals = hf.mo_coeff
h1 = orbitals.T @ hf.get_hcore() @ orbitals
eri = ao2mo.kernel(mol, orbitals)
solver = fci.direct_spin0.FCI(mol)
solver.conv_tol = 1e-12
energies, vectors = solver.kernel(h1, eri, orbitals.shape[1], mol.nelec, nroots=3, ecore=mol.energy_nuc())
spins = [float(fci.spin_op.spin_square(vector, orbitals.shape[1], mol.nelec)[0]) for vector in vectors]
assert max(abs(value) for value in spins) < 1e-10
dipole = np.einsum("pi,xpq,qj->xij", orbitals, mol.intor("int1e_r", comp=3), orbitals)
strengths = []
for energy, vector in zip(energies[1:], vectors[1:]):
    transition_rdm = fci.direct_spin1.trans_rdm1(vectors[0], vector, orbitals.shape[1], mol.nelec)
    transition = np.einsum("xpq,qp->x", dipole, transition_rdm)
    strengths.append(float(2 / 3 * (energy - energies[0]) * np.dot(transition, transition)))
result = {"reference": "PySCF singlet FCI and transition one-particle density matrices",
          "distanceAngstrom": distance, "basis": "sto-3g", "spinSquared": spins,
          "totalEnergyHartree": float(energies[0]),
          "excitationEnergiesHartree": (energies[1:] - energies[0]).tolist(),
          "oscillatorStrengths": strengths, "scientificValidation": "not_evaluated"}
Path("reference.json").write_text(json.dumps(result, indent=2) + "\n")
