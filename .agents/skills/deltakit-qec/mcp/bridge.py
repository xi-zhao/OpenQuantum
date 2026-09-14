import hashlib
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[4] / "src/lib"))
from science_bridge import execute


def canonicalize_independent_targets(circuit):
    """Stabilize set-derived target order without changing measurements or ticks."""
    import stim
    result = stim.Circuit()
    for instruction in circuit:
        if isinstance(instruction, stim.CircuitRepeatBlock):
            result.append(stim.CircuitRepeatBlock(instruction.repeat_count,
                canonicalize_independent_targets(instruction.body_copy())))
            continue
        targets = instruction.targets_copy()
        # These operations act independently on distinct qubits. In particular,
        # R emits no measurement records. Never reorder M/MR, detectors or CX.
        if instruction.name in {"R", "DEPOLARIZE1"} and all(t.is_qubit_target for t in targets):
            if len({t.value for t in targets}) == len(targets):
                targets = sorted(targets, key=lambda t: t.value)
        # Parity declarations XOR existing records; their operand order is
        # irrelevant. Preserve multiplicities and the measurement schedule.
        if instruction.name in {"DETECTOR", "OBSERVABLE_INCLUDE"} and all(t.is_measurement_record_target for t in targets):
            targets = sorted(targets, key=lambda t: t.value)
        result.append(instruction.name, targets, instruction.gate_args_copy())
    return result


def compute(v):
    import numpy as np
    import stim
    import pymatching
    from deltakit.circuit.gates import PauliBasis
    from deltakit.explorer.codes import RotatedPlanarCode, css_code_memory_circuit
    from deltakit.explorer.qpu import QPU, ToyNoise
    code = RotatedPlanarCode(width=v["width"], height=v["height"])
    clean = css_code_memory_circuit(code, num_rounds=v["rounds"], logical_basis=getattr(PauliBasis, v["basis"]))
    noisy = QPU(clean.qubits, noise_model=ToyNoise(p=v["noiseProbability"])).compile_and_add_noise_to_circuit(clean)
    circuit = canonicalize_independent_targets(stim.Circuit(str(noisy.as_stim_circuit())))
    detector_model = circuit.detector_error_model(decompose_errors=True)
    decoder = pymatching.Matching.from_detector_error_model(detector_model)
    detectors, actual = circuit.compile_detector_sampler(seed=v["seed"]).sample(v["shots"], separate_observables=True)
    predicted = decoder.decode_batch(detectors)
    if predicted.shape != actual.shape:
        raise ValueError("Decoded observables do not match the circuit observable shape")
    failures = int(np.count_nonzero(np.any(predicted != actual, axis=1)))
    shots = v["shots"]
    p = failures / shots
    z = 1.959963984540054
    centre = (p + z*z/(2*shots))/(1 + z*z/shots)
    half = z*np.sqrt(p*(1-p)/shots + z*z/(4*shots*shots))/(1 + z*z/shots)
    text = str(circuit)
    return {"numQubits": circuit.num_qubits, "numDetectors": circuit.num_detectors, "numObservables": circuit.num_observables,
        "shots": shots, "logicalFailures": failures, "logicalErrorRate": p, "wilson95": [max(0., centre-half), min(1., centre+half)],
        "detectionEventFraction": float(detectors.mean()), "circuit": text, "circuitSha256": hashlib.sha256(text.encode()).hexdigest(),
        "noiseModel": "Deltakit ToyNoise(p); synthetic local model", "decoder": "PyMatching 2.4.0 MWPM", "simulator": "Stim 1.16.0"}, [
        "Rectangular rotated planar-code memory experiment; X/Z basis, fixed shots and independent local stochastic noise.",
        "Wilson intervals describe binomial sampling uncertainty only; zero observed failures do not imply zero logical error probability.",
        "Independent R/DEPOLARIZE1 targets and pure record-parity operands are sorted; measurement and gate schedules are preserved. Seeds are reproducible within the fixed software and machine environment only.",
        "ToyNoise is not a calibrated QPU model. No cloud, proprietary decoder, leakage simulation, threshold or scientific acceptance."]


if __name__ == "__main__":
    execute(compute)
