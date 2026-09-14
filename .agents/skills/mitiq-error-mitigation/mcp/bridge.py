# SPDX-License-Identifier: GPL-3.0-only
"""Bounded Mitiq experiments; classical references never replace sampled data."""
import hashlib
import sys
import warnings
from pathlib import Path

import cirq
import numpy as np
from mitiq import cdr, pec, rem, zne
from mitiq.cdr.clifford_utils import is_clifford
from mitiq.pec.representations import represent_operation_with_local_depolarizing_noise
from mitiq.zne.inference import RichardsonFactory
from mitiq.zne.scaling import fold_global

sys.path.insert(0, str(Path(__file__).resolve().parents[4] / "src/lib"))
from science_bridge import execute  # noqa: E402

ORIGINAL = "openquantum-original-gate"


def allocate(total, count):
    """Use every shot, including remainders, without exceeding the arm budget."""
    return [total // count + (i < total % count) for i in range(count)]


def build_circuit(v, tagged=False):
    qubits = cirq.LineQubit.range(v["numQubits"])
    gates = {"H": cirq.H, "X": cirq.X, "Y": cirq.Y, "Z": cirq.Z,
             "S": cirq.S, "CX": cirq.CNOT, "CZ": cirq.CZ}
    operations = []
    for item in v["gates"]:
        gate = cirq.rz(item["angle"]) if item["name"] == "RZ" else gates[item["name"]]
        op = gate.on(*(qubits[i] for i in item["targets"]))
        operations.append(op.with_tags(ORIGINAL) if tagged else op)
    return cirq.Circuit(cirq.Moment([op]) for op in operations)


def noisy_circuit(circuit, probability, tagged=False):
    operations = []
    for op in circuit.all_operations():
        operations.append(op.untagged)
        if probability and (not tagged or ORIGINAL in op.tags):
            operations.extend(cirq.depolarize(probability).on(q) for q in op.qubits)
    return cirq.Circuit(cirq.Moment([op]) for op in operations)


def density(circuit, qubits, probability=0, tagged=False):
    return cirq.DensityMatrixSimulator(dtype=np.complex128).simulate(
        noisy_circuit(circuit, probability, tagged), qubit_order=qubits,
    ).final_density_matrix


def expectation(rho, observable, qubits):
    paulis = {"X": cirq.X, "Y": cirq.Y, "Z": cirq.Z}
    operator = cirq.PauliString({qubits[i]: paulis[p] for i, p in enumerate(observable) if p != "I"})
    return float(operator.expectation_from_density_matrix(rho, {q: i for i, q in enumerate(qubits)}).real)


def record(circuit, stage, shots, estimate, coefficient=None):
    value = {"stage": stage, "shots": int(shots), "estimate": float(estimate),
             "gateCount": len(list(circuit.all_operations())), "depth": len(circuit),
             "circuitSha256": hashlib.sha256(cirq.to_json(circuit).encode()).hexdigest()}
    if coefficient is not None:
        value["coefficient"] = float(coefficient)
    return value


def summarize(values, ideal):
    a = np.asarray(values, dtype=float)
    return {"mean": float(a.mean()), "bias": float(a.mean() - ideal),
            "variance": float(a.var()), "rmse": float(np.sqrt(np.mean((a - ideal) ** 2))),
            "meanStandardError": float(a.std(ddof=1) / np.sqrt(len(a)))}


def readout_distribution(rho, observable, qubits, probability):
    # Terminal measurement-basis rotations are ideal in this bounded model.
    rotations = cirq.Circuit()
    for q, p in zip(qubits, observable):
        if p == "X":
            rotations.append(cirq.H(q))
        elif p == "Y":
            rotations.append([cirq.S(q) ** -1, cirq.H(q)])
    unitary = rotations.unitary(qubit_order=qubits)
    diagonal = np.diag(unitary @ rho @ unitary.conj().T).real
    confusion = np.array([[1 - probability, probability], [probability, 1 - probability]])
    matrix = np.array([[1.0]])
    for _ in qubits:
        matrix = np.kron(matrix, confusion)
    probabilities = np.clip(matrix @ diagonal, 0, None)
    return probabilities / probabilities.sum()


def parity_values(observable):
    n = len(observable)
    return np.array([(-1) ** sum((state >> (n - 1 - i)) & 1
                               for i, p in enumerate(observable) if p != "I")
                     for state in range(2 ** n)])


def run_rem(v, circuit, rho, qubits, rng, circuits):
    budget = v["shotsBudget"]
    # Half for two tensor-product calibration settings, half for the target.
    calibration = allocate(budget // 2, 2)
    matrices = [np.zeros((2, 2)) for _ in qubits]
    for prepared, shots in enumerate(calibration):
        flips = rng.random((shots, len(qubits))) < v["readoutProbability"]
        observed = np.bitwise_xor(prepared, flips.astype(int))
        for i in range(len(qubits)):
            matrices[i][:, prepared] = np.bincount(observed[:, i], minlength=2) / shots
        calibration_circuit = cirq.Circuit(cirq.X(q) for q in qubits) if prepared else cirq.Circuit()
        circuits.append(record(calibration_circuit, "calibration", shots, 1 - 2 * observed[:, 0].mean()))
    if any(np.linalg.cond(matrix) > 100 for matrix in matrices):
        raise ValueError("Readout calibration is ill-conditioned; increase the budget or reduce readout noise")
    inverse = rem.generate_tensored_inverse_confusion_matrix(len(qubits), matrices)
    shots = budget - sum(calibration)
    counts = rng.multinomial(shots, readout_distribution(rho, v["observable"], qubits, v["readoutProbability"]))
    raw = float(parity_values(v["observable"]) @ counts / shots)
    circuits.append(record(circuit, "evaluation", shots, raw))
    # Use Mitiq's inverse directly: no positive projection, clipping or resampling.
    corrected = float(parity_values(v["observable"]) @ inverse @ (counts / shots))
    return corrected, {"confusionMatrices": [m.tolist() for m in matrices], "targetCounts": counts.tolist()}, 0


def run_trial(v, circuit, qubits, ideal, noisy_rho, seed):
    baseline_rng, mitigation_rng = [np.random.default_rng(s) for s in np.random.SeedSequence(seed).spawn(2)]
    p = v["depolarizingProbability"]
    method = v["method"]
    budget = v["shotsBudget"]
    circuits = []
    baseline_exact = expectation(noisy_rho, v["observable"], qubits)
    if method == "rem":
        baseline_exact *= (1 - 2 * v["readoutProbability"]) ** sum(c != "I" for c in v["observable"])
    baseline = float(2 * baseline_rng.binomial(budget, np.clip((1 + baseline_exact) / 2, 0, 1)) / budget - 1)
    circuits.append(record(circuit, "baseline", budget, baseline))

    def sample(candidate, shots, stage="evaluation", coefficient=None):
        rho = density(candidate, qubits, p, tagged=method == "pec")
        mean = expectation(rho, v["observable"], qubits)
        estimate = 2 * mitigation_rng.binomial(shots, np.clip((1 + mean) / 2, 0, 1)) / shots - 1
        circuits.append(record(candidate, stage, shots, estimate, coefficient))
        return float(estimate)

    references = 0
    if method == "zne":
        scales = [1.0, 3.0, 5.0]
        candidates = zne.construct_circuits(circuit, scales, fold_global)
        coefficients = [zne.combine_results(scales, row, RichardsonFactory.extrapolate) for row in np.eye(3)]
        estimates = [sample(c, shots, coefficient=weight) for c, shots, weight in zip(candidates, allocate(budget, 3), coefficients)]
        mitigated = zne.combine_results(scales, estimates, RichardsonFactory.extrapolate)
        details = {"scaleFactors": scales}
    elif method == "pec":
        tagged = build_circuit(v, tagged=True)
        representations = [represent_operation_with_local_depolarizing_noise(cirq.Circuit(op), p)
                           for op in dict.fromkeys(tagged.all_operations())]
        # Missing representations must not silently fall back to unmitigated gates.
        with warnings.catch_warnings():
            warnings.filterwarnings("error", message=".*representation.*", category=UserWarning)
            candidates, signs, norm = pec.construct_circuits(tagged, representations, num_samples=v["pecSamples"], random_state=seed, full_output=True)
        if any(sum(ORIGINAL in op.tags for op in c.all_operations()) != len(v["gates"]) for c in candidates):
            raise ValueError("PEC transformation lost the original-gate noise boundary")
        estimates = [sample(c, shots, coefficient=norm * sign / len(candidates))
                     for c, shots, sign in zip(candidates, allocate(budget, len(candidates)), signs)]
        mitigated = pec.combine_results(estimates, norm, signs)
        details = {"pecOneNorm": float(norm), "sampledSigns": signs}
    elif method == "rem":
        mitigated, details, references = run_rem(v, circuit, noisy_rho, qubits, mitigation_rng, circuits)
    else:
        if is_clifford(circuit):
            raise ValueError("CDR requires a non-Clifford target; ideal-simulator shortcuts are unsupported")
        allocation = allocate(budget, v["trainingCircuits"] + 1)
        noisy_values, ideal_values = [], []

        def noisy_executor(candidate) -> float:
            index = len(noisy_values)
            if index >= len(allocation):
                raise ValueError("CDR exceeded the planned circuit budget")
            value = sample(candidate, allocation[index], "evaluation" if index == 0 else "training")
            noisy_values.append(value)
            return value

        def ideal_executor(candidate) -> float:
            value = expectation(density(candidate, qubits), v["observable"], qubits)
            ideal_values.append(value)
            if len(ideal_values) == v["trainingCircuits"]:
                design = np.column_stack([noisy_values[1:], np.ones(len(ideal_values))])
                if np.ptp(ideal_values) < 1e-8 or np.linalg.matrix_rank(design) < 2 or np.linalg.cond(design) > 1e6:
                    raise ValueError("CDR training responses are degenerate; choose a different circuit/observable or increase trainingCircuits")
            return value

        mitigated = cdr.execute_with_cdr(
            circuit, noisy_executor, simulator=ideal_executor,
            num_training_circuits=v["trainingCircuits"], fraction_non_clifford=0.0,
            method_replace="uniform", random_state=seed, scale_factors=[1.0],
            scale_noise=lambda c, _: c,
        )
        if len(noisy_values) != len(allocation) or len(ideal_values) != v["trainingCircuits"]:
            raise ValueError("CDR did not execute the complete planned training budget")
        references = len(ideal_values)
        details = {"trainingIdeal": ideal_values, "trainingNoisy": noisy_values[1:],
                   "regressionConditionNumber": float(np.linalg.cond(np.column_stack([noisy_values[1:], np.ones(references)])))}

    totals = {stage: sum(c["shots"] for c in circuits if c["stage"] == stage)
              for stage in ["baseline", "evaluation", "training", "calibration"]}
    if totals["baseline"] != budget or sum(totals[s] for s in ["evaluation", "training", "calibration"]) != budget:
        raise ValueError("Actual shot accounting does not match the fixed comparison budget")
    return {"seed": seed, "unmitigated": baseline, "mitigated": float(mitigated),
            "baselineShots": budget, "mitigationShots": budget, "calibrationShots": totals["calibration"],
            "trainingShots": totals["training"], "evaluationShots": totals["evaluation"],
            "classicalReferenceEvaluations": references, "circuits": circuits, "details": details}


def compute(v):
    qubits = cirq.LineQubit.range(v["numQubits"])
    circuit = build_circuit(v)
    ideal = expectation(density(circuit, qubits), v["observable"], qubits)
    noisy_rho = density(circuit, qubits, v["depolarizingProbability"])
    exact_noisy = expectation(noisy_rho, v["observable"], qubits)
    if v["method"] == "rem":
        exact_noisy *= (1 - 2 * v["readoutProbability"]) ** sum(p != "I" for p in v["observable"])
    seeds = [int(s.generate_state(1)[0]) for s in np.random.SeedSequence(v["seed"]).spawn(v["replicates"])]
    trials = [run_trial(v, circuit, qubits, ideal, noisy_rho, seed) for seed in seeds]
    before = summarize([t["unmitigated"] for t in trials], ideal)
    after = summarize([t["mitigated"] for t in trials], ideal)
    return {"method": v["method"], "backend": "cirq-density-matrix-local", "idealExpectation": ideal,
            "exactNoisyExpectation": exact_noisy,
            "noiseConvention": "After each original gate, independent Cirq depolarize(p) on each touched qubit: (1-p)rho + p/3*(XrhoX+YrhoY+ZrhoZ). PEC compensation Paulis are ideal. REM additionally has independent symmetric readout flips; calibration preparation and terminal measurement rotations are ideal.",
            "statistics": {"unmitigated": before, "mitigated": after, "rmseDifference": after["rmse"] - before["rmse"]},
            "totalShotsIncludingBaseline": 2 * v["shotsBudget"] * v["replicates"], "trials": trials}, [
        "Local synthetic noise only. No measured hardware noise, QPU jobs, or quantum advantage claims.",
        "Each arm has the same total shots per replicate; all REM calibration and CDR training shots are charged to the mitigation arm. Shot equality does not imply equal circuit depth, gate count or wall time.",
        "Bias, population variance and RMSE are empirical across independent full-procedure replicates; meanStandardError uses sample variance. They are not guaranteed error bounds or scientific acceptance.",
        "Circuit gateCount/depth refer to computational and mitigation gates, including PEC corrections, but exclude ideal terminal basis rotations, measurements and classical postprocessing; they are not complete hardware costs.",
        "All mitigated estimates are retained without clipping, including values outside [-1,1] and cases worse than baseline.",
        "ZNE uses global folds at [1,3,5] and quadratic Richardson extrapolation. PEC assumes exactly known local depolarizing noise and noiseless compensation Paulis; its model characterization cost is not measured.",
        "REM uses Mitiq tensor-confusion pseudoinversion and direct quasi-probability expectation, not positive projection/resampling; it corrects only independent readout flips and assumes ideal calibration preparation.",
        "CDR uses uniform Clifford replacements of all non-Clifford RZ gates with sampled noisy training data and exact classical labels. Degenerate training and the upstream all-Clifford shortcut are rejected.",
    ]


if __name__ == "__main__":
    try:
        execute(compute)
    except (ValueError, UserWarning) as error:
        print(f"Mitiq experiment rejected: {error}", file=sys.stderr)
        sys.exit(2)
