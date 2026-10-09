import importlib.metadata
import sys
from pathlib import Path

from database import database_directory, verify_database
from reference import second_order_reference

sys.path.insert(0, str(Path(__file__).resolve().parents[4] / "src/lib"))
from science_bridge import execute


def compute(v):
    if importlib.metadata.version("pairinteraction") != "2.7.0":
        raise ValueError("PairInteraction version mismatch; run the pinned setup")
    provenance = verify_database()
    import numpy as np
    import pairinteraction.real as pi
    from scipy.linalg import eigh

    pi.Database.initialize_global_database(download_missing=False, database_dir=database_directory())
    s = pi.KetAtom("Rb", n=v["nS"], l=0, j=0.5, m=0.5)
    exchange = v["channel"] == "sp_exchange"
    p = pi.KetAtom("Rb", n=v["nP"], l=1, j=1.5, m=0.5) if exchange else s
    targets = [(s, p), (p, s)] if exchange else [(s, s)]
    ns = [v["nS"], v["nP"]] if exchange else [v["nS"]]
    lmax = 2 if exchange else 1
    atom_basis = pi.BasisAtom("Rb", n=(min(ns) - v["deltaN"], max(ns) + v["deltaN"]), l=(0, lmax))
    if atom_basis.number_of_kets > 300:
        raise ValueError("Single-atom basis exceeds 300 states; reduce deltaN")
    atom = pi.SystemAtom(atom_basis)
    atom.set_magnetic_field([0, 0, v["magneticFieldG"]], "G").set_diamagnetism_enabled(False)
    atom.diagonalize()
    basis = pi.BasisPair.from_kets(targets, (atom, atom), delta_m=0, delta_energy=v["energyWindowGHz"], delta_energy_unit="GHz")
    if not 1 <= basis.number_of_kets <= 1024:
        raise ValueError("Pair basis exceeds 1024 states; reduce deltaN or energyWindowGHz")
    weights = [np.asarray(basis.get_overlaps(target)) for target in targets]
    indices = [int(np.argmax(weight)) for weight in weights]
    target_weights = [float(weight[index]) for weight, index in zip(weights, indices)]
    if len(set(indices)) != len(indices) or min(target_weights) < 0.99:
        raise ValueError("Target states are missing, ambiguous or strongly field-mixed; this model is out of scope")
    points = []
    reference_energy = None
    for distance in v["distancesUm"]:
        pair = pi.SystemPair(basis).set_distance_vector([0, 0, distance], "micrometer").set_interaction_order(3)
        raw = pair.get_hamiltonian(unit="MHz").toarray()
        if reference_energy is None:
            reference_energy = float(raw[indices[0], indices[0]])
        shifted = raw - np.eye(len(raw)) * reference_energy
        reference, correction, ratio, gap = second_order_reference(shifted, indices)
        effective = pi.EffectiveSystemPair(targets)
        effective.set_perturbation_order(2)
        effective.system_pair = pair
        heff = np.asarray(effective.get_effective_hamiltonian(unit="MHz")) - np.eye(len(targets)) * reference_energy
        reference_difference = float(np.max(abs(heff - reference)))
        hermiticity = float(np.max(abs(heff - heff.T)))
        if not np.isfinite(heff).all() or reference_difference > 2e-4 or hermiticity > 1e-8:
            raise ValueError("Effective Hamiltonian failed the independent matrix reference")
        # LAPACK on the shifted matrix is a numerical reference, sharing atomic matrix elements.
        ref_values, ref_vectors = eigh(shifted)
        projection_weights = np.sum(abs(ref_vectors[indices, :]) ** 2, axis=0)
        selected = np.argsort(projection_weights)[-len(targets):]
        selected = selected[np.argsort(ref_values[selected])]
        pair.diagonalize()
        exact = np.asarray(pair.get_eigenenergies("MHz")) - reference_energy
        diagonalization_error = float(np.max(abs(exact - ref_values)))
        if diagonalization_error > 2e-4:
            raise ValueError("Pair diagonalization disagrees with the shifted dense matrix reference")
        effective_values = np.linalg.eigvalsh(heff)
        actual_values = exact[selected]
        exact_weights = projection_weights[selected]
        deviation = float(np.max(abs(actual_values - effective_values)))
        points.append({
            "distanceUm": distance, "effectiveHamiltonianMHz": heff.tolist(),
            "effectiveEigenvaluesMHz": effective_values.tolist(), "exactEigenvaluesMHz": actual_values.tolist(),
            "exactTargetWeights": exact_weights.tolist(), "secondOrderShiftsMHz": np.diag(correction).tolist(),
            "exchangeMHz": float(shifted[indices[0], indices[1]]) if exchange else 0.0,
            "hermiticityErrorMHz": hermiticity, "referenceDifferenceMHz": reference_difference,
            "diagonalizationDifferenceMHz": diagonalization_error, "effectiveSpectrumDeviationMHz": deviation,
            "maxCouplingToGapRatio": ratio, "minCoupledGapMHz": gap,
            "perturbationStatus": "within_screen" if ratio <= 0.1 and min(exact_weights) >= 0.9 else "outside_screen",
        })
    return {"database": provenance, "model": {
        "species": "Rb", "targetStates": [f"{left}; {right}" for left, right in targets],
        "frequencyConvention": "H/h in MHz; ordinary frequency, not angular frequency",
        "energyReferenceMHz": reference_energy, "pairBasisSize": basis.number_of_kets,
        "atomBasisSize": atom_basis.number_of_kets, "lMax": lmax, "totalM": 1, "perturbationOrder": 2,
        "interaction": "electric dipole-dipole; R parallel B along z; diamagnetism disabled",
        "targetBasisWeights": target_weights,
    }, "points": points, "convergence": {"status": "not_evaluated", "reason": "One requested basis; compare increasing deltaN and energyWindowGHz before a convergence claim."}}, [
        "Only Rb SQDT, two atoms on z, zero electric field, Bz=1..30 G and electric dipole-dipole interactions. Hyperfine structure and diamagnetism are omitted.",
        "All matrices and energies are H/h in MHz relative to the reported common reference energy. They are not angular frequencies or FatQat inputs.",
        "Exact means diagonalized within the reported truncated pair basis, not an exact atomic-physics prediction.",
        "The effective basis is the field-dressed product basis most overlapping the listed target kets; targetBasisWeights reports that identification.",
        "The perturbation screen is only a heuristic (max coupling/gap <=0.1 and selected subspace weights >=0.9); spectrum error and basis convergence must also be assessed.",
        "Separate matrix references share PairInteraction atomic data and are not an independent validation of quantum defects, experiments, many-body dynamics or scientific acceptance.",
        "Each distance selects eigenstates by total target-subspace weight, then sorts by energy; labels do not assert adiabatic branch tracking."]


if __name__ == "__main__":
    execute(compute)
