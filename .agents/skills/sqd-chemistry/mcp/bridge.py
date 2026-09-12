import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[4] / "src/lib"))
from science_bridge import execute


def compute(v):
    import numpy as np
    from pyscf import gto, scf, ao2mo, fci
    from qiskit.primitives.containers import BitArray
    from qiskit_addon_sqd.counts import generate_bit_array_uniform
    from qiskit_addon_sqd.fermion import diagonalize_fermionic_hamiltonian
    mol = gto.M(atom=f'H 0 0 0; H 0 0 {v["bondLengthAngstrom"]}', basis="sto-3g", unit="Angstrom", spin=0, verbose=0)
    mf = scf.RHF(mol).run(conv_tol=1e-11)
    if not mf.converged:
        raise ValueError("Hartree-Fock reference did not converge")
    one = mf.mo_coeff.T @ mf.get_hcore() @ mf.mo_coeff
    two = ao2mo.restore(1, ao2mo.kernel(mol, mf.mo_coeff), 2)
    nuclear = float(mol.energy_nuc())
    counts = v.get("counts")
    bits = BitArray.from_counts(counts, num_bits=4) if counts else generate_bit_array_uniform(v["shots"], 4, rand_seed=v["seed"])
    history = []
    result = diagonalize_fermionic_hamiltonian(
        one, two, bits, samples_per_batch=v["samplesPerBatch"], norb=2, nelec=(1, 1),
        max_iterations=v["iterations"], max_dim=2, include_configurations=[1],
        initial_occupancies=(np.array([1., 0.]), np.array([1., 0.])),
        callback=lambda batch: history.append(min(float(item.energy) for item in batch) + nuclear), seed=v["seed"],
    )
    exact, _ = fci.direct_spin1.kernel(one, two, 2, (1, 1))
    energy = float(result.energy) + nuclear
    return {
        "energyHartree": energy, "fciEnergyHartree": float(exact) + nuclear,
        "hfEnergyHartree": float(mf.e_tot), "errorHartree": energy - (float(exact) + nuclear),
        "nuclearEnergyHartree": nuclear, "occupancies": [x.tolist() for x in result.orbital_occupancies],
        "iterationEnergiesHartree": history, "sampleSource": "supplied_counts" if counts else "synthetic_uniform",
        "totalShots": sum(counts.values()) if counts else v["shots"], "spatialOrbitals": 2,
        "electrons": [1, 1], "bitOrder": "beta1 beta0 alpha1 alpha0",
    }, ["H2/STO-3G only; FCI refers to this finite basis, not the exact molecule.",
        "The Hartree-Fock configuration is always included; supplied samples may not span the full sector.",
        "Synthetic uniform samples are a local demonstration and establish no quantum advantage.",
        "Reference differences are observations, not central scientific acceptance."]


execute(compute)
