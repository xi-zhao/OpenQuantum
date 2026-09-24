"""PySCF active-space integrals and genuine quimb two-site DMRG."""
import numpy as np
from common import integer, pauli_matrix


def molecular_dmrg(atoms=None, basis="sto-3g", charge=0, spin=0, active_orbitals=None,
                   active_electrons=None, max_bond=32, sweeps=12, tolerance=1e-9, seed=7):
  from pyscf import gto, scf, mcscf, ao2mo
  import quimb.tensor as qtn
  atoms = "H 0 0 0; H 0 0 0.74" if atoms is None else atoms
  integer(max_bond, "max_bond")
  integer(sweeps, "sweeps")
  if tolerance <= 0:
    raise ValueError("tolerance must be positive")
  molecule = gto.M(atom=atoms, basis=basis, charge=charge, spin=spin, unit="Angstrom", verbose=0)
  mf = scf.RHF(molecule) if spin == 0 else scf.ROHF(molecule)
  mf.kernel()
  if not mf.converged:
    raise ValueError("PySCF SCF did not converge; do not build an unverified orbital reference")
  orbitals = mf.mo_coeff.shape[1] if active_orbitals is None else integer(active_orbitals, "active_orbitals")
  electrons = molecule.nelectron if active_electrons is None else integer(active_electrons, "active_electrons", 0)
  if orbitals > mf.mo_coeff.shape[1] or electrons > 2 * orbitals or electrons > molecule.nelectron or (molecule.nelectron - electrons) % 2 or abs(spin) > electrons:
    raise ValueError("Invalid active-space size or closed-shell frozen-core electron count")
  cas = mcscf.CASCI(mf, orbitals, electrons)
  h1, core_energy = cas.get_h1eff()
  eri = ao2mo.restore(1, cas.get_h2eff(), orbitals)
  n = 2 * orbitals
  annihilation = []
  for j in range(n):
    x, y = ["I"] * n, ["I"] * n
    for k in range(j):
      x[n - 1 - k] = y[n - 1 - k] = "Z"
    x[n - 1 - j], y[n - 1 - j] = "X", "Y"
    annihilation.append((pauli_matrix([("".join(x), 1)]) + 1j * pauli_matrix([("".join(y), 1)])) / 2)
  creation = [a.conj().T for a in annihilation]
  h = complex(core_energy) * np.eye(2 ** n, dtype=complex)
  for p in range(orbitals):
    for q in range(orbitals):
      for sigma in (0, 1):
        h += h1[p, q] * creation[2 * p + sigma] @ annihilation[2 * q + sigma]
      for r in range(orbitals):
        for s in range(orbitals):
          coefficient = eri[p, q, r, s] / 2
          if abs(coefficient) > 1e-14:
            for sigma in (0, 1):
              for tau in (0, 1):
                h += coefficient * creation[2 * p + sigma] @ creation[2 * r + tau] @ annihilation[2 * s + tau] @ annihilation[2 * q + sigma]
  number = sum(creation[j] @ annihilation[j] for j in range(n))
  spin_number = sum((-1) ** j * creation[j] @ annihilation[j] for j in range(n))
  deviation = number - electrons * np.eye(2 ** n)
  spin_deviation = spin_number - spin * np.eye(2 ** n)
  # A sector penalty larger than the full spectral width excludes other particle sectors.
  penalty = 2 * np.linalg.norm(h, 2) + 1
  mpo = qtn.MatrixProductOperator.from_dense(h + penalty * (deviation @ deviation + spin_deviation @ spin_deviation), dims=2, cutoff=1e-14)
  # A product-state seed can trap a two-site sweep at Hartree-Fock when
  # nonlocal Jordan-Wigner terms need an initial inter-site bond.
  initial = qtn.MPS_rand_state(n, bond_dim=min(max_bond, 4), dtype="complex128", seed=seed)
  dmrg = qtn.DMRG2(mpo, bond_dims=max_bond, cutoffs=1e-12, p0=initial)
  converged = dmrg.solve(tol=tolerance, max_sweeps=sweeps, verbosity=0)
  psi = np.asarray(dmrg.state.to_dense()).reshape(-1)
  psi /= np.linalg.norm(psi)
  energy = float(np.vdot(psi, h @ psi).real)
  return {"backend": "pyscf/quimb-DMRG2", "energyHartree": energy,
          "activeOrbitals": orbitals, "activeElectrons": electrons, "qubits": n,
          "particleNumber": float(np.vdot(psi, number @ psi).real),
          "particleNumberVariance": float(np.vdot(psi, deviation @ deviation @ psi).real),
          "spinProjectionTwice": float(np.vdot(psi, spin_number @ psi).real),
          "spinProjectionVariance": float(np.vdot(psi, spin_deviation @ spin_deviation @ psi).real),
          "converged": bool(converged), "statevector": psi,
          "sweepEnergies": [float(np.real(e)) for e in dmrg.energies],
          "maxBondUsed": dmrg.state.max_bond(), "scfEnergyHartree": mf.e_tot,
          "variant": "active-space integrals, dense Jordan-Wigner to MPO, two-site DMRG; no CVD compression stage",
          "scaleCost": "dense Hamiltonian preprocessing uses O(4^qubits) storage; choose an explicit active space"}


ALGORITHMS = {"molecular_dmrg": molecular_dmrg}
