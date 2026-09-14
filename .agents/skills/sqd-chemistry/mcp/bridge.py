import sys
from math import comb
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[4] / "src/lib"))
from science_bridge import execute
from science_reference import reference_plan


def compute(v):
    import numpy as np
    from pyscf import gto, scf, ao2mo, fci, mcscf
    from qiskit.primitives.containers import BitArray
    from qiskit_addon_sqd.counts import generate_bit_array_uniform
    from qiskit_addon_sqd.fermion import diagonalize_fermionic_hamiltonian
    molecule = v.get("molecule", {"atoms": [{"element": "H", "positionAngstrom": [0, 0, 0]},
        {"element": "H", "positionAngstrom": [0, 0, v["bondLengthAngstrom"]]}], "charge": 0})
    mol = gto.M(atom=[(a["element"], a["positionAngstrom"]) for a in molecule["atoms"]],
        charge=molecule["charge"], basis=v["basis"], unit="Angstrom", spin=0, verbose=0)
    if mol.nao_nr() > 128:
        raise ValueError("Molecular basis exceeds 128 spatial orbitals")
    active = v.get("activeSpace", {"numOrbitals": mol.nao_nr(), "numElectrons": mol.nelectron})
    norb, ne = active["numOrbitals"], active["numElectrons"]
    ncore = (mol.nelectron - ne) // 2
    if not (2 <= norb <= 32 and 2 <= ne <= 2*norb and ne % 2 == 0 and ncore >= 0 and ncore+norb <= mol.nao_nr()):
        raise ValueError("Choose a compatible active space with 2–32 orbitals and an even electron count")
    max_dim = min(v["maxSubspaceDimension"], comb(norb, ne//2))
    if norb**4 * v["maxSubspaceDimension"]**2 > 268435456:
        raise ValueError("Active integral/subspace work budget exceeded; reduce orbitals or maxSubspaceDimension")
    determinant_dimension = comb(norb, ne//2)**2
    reference = reference_plan(v["referenceMode"], norb <= 12 and determinant_dimension <= 10000,
        "FCI of the same active-space Hamiltonian, including frozen-core and nuclear energy",
        "FCI reference is limited to 12 active spatial orbitals and 10000 determinants.")
    counts = v.get("counts")
    if counts and any(len(key) != 2*norb for key in counts):
        raise ValueError(f"Supplied counts require {2*norb} bits for this active space")
    mf = scf.RHF(mol).run(conv_tol=1e-11)
    if not mf.converged:
        raise ValueError("Hartree-Fock orbital calculation did not converge")
    # CASCI owns the frozen-core contraction and total-energy offset. No orbital optimization.
    cas = mcscf.CASCI(mf, norb, (ne//2, ne//2), ncore=ncore)
    one, offset = cas.get_h1eff()
    two = ao2mo.restore(1, cas.get_h2eff(), norb)
    offset = float(offset)
    bits = BitArray.from_counts(counts, num_bits=2*norb) if counts else generate_bit_array_uniform(v["shots"], 2*norb, rand_seed=v["seed"])
    history = []
    occupations = np.array([1.]*(ne//2) + [0.]*(norb-ne//2))
    result = diagonalize_fermionic_hamiltonian(
        one, two, bits, samples_per_batch=v["samplesPerBatch"], norb=norb, nelec=(ne//2, ne//2),
        max_iterations=v["iterations"], max_dim=max_dim, include_configurations=[(1 << (ne//2))-1],
        initial_occupancies=(occupations.copy(), occupations.copy()), symmetrize_spin=False,
        callback=lambda batch: history.append(min(float(item.energy) for item in batch) + offset), seed=v["seed"],
    )
    exact = None
    if reference["status"] == "computed":
        solver = fci.direct_spin1.FCI(mol)
        electronic, _ = solver.kernel(one, two, norb, (ne//2, ne//2), tol=1e-10)
        if not solver.converged:
            raise ValueError("Active-space FCI reference did not converge")
        exact = float(electronic) + offset
    energy = float(result.energy) + offset
    return {
        "energyHartree": energy, "fciEnergyHartree": exact, "reference": reference,
        "hfEnergyHartree": float(mf.e_tot), "errorHartree": energy-exact if exact is not None else None,
        "nuclearEnergyHartree": float(mol.energy_nuc()), "coreEnergyOffsetHartree": offset,
        "occupancies": [x.tolist() for x in result.orbital_occupancies],
        "iterationEnergiesHartree": history, "sampleSource": "supplied_counts" if counts else "synthetic_uniform",
        "totalShots": sum(counts.values()) if counts else v["shots"], "spatialOrbitals": norb,
        "electrons": [ne//2, ne//2], "frozenCoreOrbitals": ncore, "activeOrbitalIndices": list(range(ncore, ncore+norb)),
        "basis": v["basis"], "fullSpatialOrbitals": mol.nao_nr(), "determinantDimension": determinant_dimension,
        "maxSubspaceDimensionPerSpin": max_dim,
        "bitOrder": " ".join(f"{spin}{i}" for spin in ("beta", "alpha") for i in reversed(range(norb))),
        "spinSector": "n_alpha=n_beta (M_s=0); total spin is not constrained",
    }, ["Molecular orbitals come from closed-shell RHF; active orbitals are contiguous after the frozen core. Total spin is not constrained.",
        "FCI, when computed, is exact only within the chosen active-space Hamiltonian and finite basis, subject to numerical solver convergence.",
        "The HF configuration is always included; recovered supplied samples need not span the full sector. Energy includes nuclear and frozen-core contributions.",
        "Synthetic uniform samples establish no quantum advantage; subspace and iteration limits can leave variational error. Reference observations are not central scientific acceptance."]


execute(compute)
