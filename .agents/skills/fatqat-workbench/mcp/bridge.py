"""Deterministic JSON bridge; MCP owns the public schema and process limits."""

import base64
import hashlib
import importlib.metadata
import io
import json
import math
import sys

import fatqat as fq
import fatqat.operations as ops
import numpy as np

REVISION = "39b75e30ae50ddb4a8c7b840847edce678aa814c"
VERSION = "0.1.0a1"
FIXED_GATES = {
    "h": ops.H, "x": ops.X, "y": ops.Y, "z": ops.Z,
    "s": ops.S, "sdg": ops.Sdg, "t": ops.T, "tdg": ops.Tdg,
    "sx": ops.SX, "cx": ops.CX, "cz": ops.CZ, "swap": ops.Swap,
    "pair": ops.Pair, "unpair": ops.Unpair,
}
ROTATIONS = {"rx": ops.RX, "ry": ops.RY, "rz": ops.RZ}


def digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(",", ":"), allow_nan=False).encode()).hexdigest()


def source(lock_hash):
    distribution = importlib.metadata.distribution("fatqat")
    origin = json.loads(distribution.read_text("direct_url.json") or "{}")
    if distribution.version != VERSION or origin.get("vcs_info", {}).get("commit_id") != REVISION:
        raise RuntimeError("Installed FatQat does not match the reviewed version and Git revision")
    return {"name": "FatQat", "version": distribution.version, "revision": REVISION, "dependencyLockSha256": lock_hash}


def amplitudes(state):
    return [{"real": float(value.real), "imag": float(value.imag)} for value in state]


def probabilities(state, dimensions):
    array = np.asarray(state)
    values = np.real(np.diag(array)) if array.ndim == 2 else np.abs(array) ** 2
    if values.shape != (math.prod(dimensions),) or not np.all(np.isfinite(values)):
        raise RuntimeError("Unexpected state shape or non-finite probability")
    if np.min(values) < -1e-8 or abs(float(values.sum()) - 1) > 1e-5:
        raise RuntimeError("Returned state failed probability consistency checks")
    labels = ["".join(str(digit) for digit in np.unravel_index(index, dimensions)) for index in range(len(values))]
    # Preserve numerical residuals rather than renormalizing away solver errors.
    return dict(zip(labels, map(float, values)))


def marginal_populations(values, dimensions):
    tensor = np.asarray(list(values.values())).reshape(dimensions)
    return [tensor.sum(axis=tuple(other for other in range(len(dimensions)) if other != site)).tolist() for site in range(len(dimensions))]


def plot_circuit(values, counts, shots):
    import matplotlib.pyplot as plt
    labels = [key for key, value in values.items() if value > 1e-8 or counts.get(key, 0)]
    labels = sorted(labels, key=lambda key: -values[key])[:32]
    figure, axis = plt.subplots(figsize=(7.2, 3.7))
    x = np.arange(len(labels))
    width = 0.38 if shots else 0.7
    axis.bar(x - (width / 2 if shots else 0), [values[key] for key in labels], width, label="Exact probability", color="#4263eb")
    if shots:
        axis.bar(x + width / 2, [counts.get(key, 0) / shots for key in labels], width, label=f"Observed frequency ({shots} shots)", color="#12b886")
    axis.set(xticks=x, xticklabels=labels, ylabel="Probability / frequency", xlabel="q0 first (most significant)", ylim=(0, 1.05))
    axis.set_title("FatQat circuit experiment (largest 32 outcomes)")
    if len(labels) > 8:
        axis.tick_params(axis="x", labelrotation=60)
    axis.legend()
    return encode_plot(figure)


def encode_plot(figure):
    import matplotlib.pyplot as plt
    buffer = io.BytesIO()
    figure.tight_layout()
    figure.savefig(buffer, format="png", dpi=110)
    plt.close(figure)
    return base64.b64encode(buffer.getvalue()).decode("ascii")


def circuit(request):
    n = request["numQubits"]
    # These internal guards also bound accidental direct bridge use.
    if not 1 <= n <= 8 or len(request["operations"]) > 64 or not 0 <= request["shots"] <= 4096:
        raise ValueError("Circuit exceeds local limits")
    noise_spec = request.get("noise")
    if noise_spec and n > 5:
        raise ValueError("Noisy circuits are limited to 5 qubits")
    program = fq.Program(n, n)
    if request["backend"] == "atom_array":
        if n > 6:
            raise ValueError("Atom arrays are limited to 6 sites")
        program.add(ops.Put, tuple(range(n)))
    noise = fq.NoiseModel() if noise_spec else None
    noise_operations = set()
    for instruction in request["operations"]:
        name = instruction["gate"]
        operation = ROTATIONS[name](instruction["angle"]) if name in ROTATIONS else FIXED_GATES[name]
        program.add(operation, tuple(instruction["qubits"]))
        if noise is not None and name not in ("pair", "unpair") and name not in noise_operations:
            channel = {"depolarizing": fq.noise.Depolarizing, "amplitude_damping": fq.noise.AmplitudeDamping, "phase_damping": fq.noise.PhaseDamping}[noise_spec["channel"]]
            selector = ROTATIONS[name] if name in ROTATIONS else FIXED_GATES[name]
            for position in range(len(instruction["qubits"])):
                noise.add(channel(p=noise_spec["probability"]), operation=selector, target_positions=position)
            noise_operations.add(name)
    method = "density_matrix" if noise else "statevector"
    options = {"method": method, "runtime": "numpy", "noise": noise}
    if request["backend"] == "general":
        backend = fq.simulator.Simulator(**options)
    elif request["backend"] == "superconducting":
        backend = fq.simulator.SCQubitSimulator(num_qubits=n, couplings=tuple(map(tuple, request["couplings"])), **options)
    elif request["backend"] == "atom_array":
        backend = fq.simulator.AtomArraySimulator(**options)
    else:
        raise ValueError("Unsupported circuit backend")
    simulation = {"seed": request["seed"], "shot_parallelism": "serial"}
    exact = backend.run(program, shots=0, simulation_config=simulation, result_config={"counts": False, "final_state": True}).result()
    state = exact.get_density_matrix() if noise else exact.get_statevector()
    values = probabilities(state, (2,) * n)
    counts = {}
    if request["shots"]:
        measured = program.copy()
        measured.measure_all()
        counts = backend.run(measured, shots=request["shots"], simulation_config=simulation, result_config={"counts": True, "final_state": False}).result().get_counts()
        if sum(counts.values()) != request["shots"] or any(key not in values for key in counts):
            raise RuntimeError("Measurement count contract failed")
    output = {
        "probabilities": values, "counts": counts,
        "statevector": [] if noise else amplitudes(state),
        "densityMatrix": [amplitudes(row) for row in state] if noise else [],
        "zExpectations": [float(sum(value * (1 if key[site] == "0" else -1) for key, value in values.items())) for site in range(n)],
    }
    execution = {"backend": request["backend"], "method": method, "runtime": "numpy", "shots": request["shots"], "seed": request["seed"], "wireOrder": "q0_first_most_significant", "localDimensions": [2] * n, "noise": noise_spec, "noisePlacement": "independent per operand after each unitary instruction; no noise on loading/pairing", "compilation": "not_requested_native_operations_only"}
    checks = {"normalizationError": abs(sum(values.values()) - 1), "countsMatchShots": sum(counts.values()) == request["shots"] if request["shots"] else None}
    return execution, output, checks, plot_circuit(values, counts, request["shots"])


def dynamics(request):
    is_transmon = request["model"] == "transmon"
    samples = request["samples"]
    if not 2 <= samples <= 51:
        raise ValueError("Time series is limited to 51 samples")
    if is_transmon:
        duration = request["durationNs"]
        if not 0 < duration <= 200 or not 0 <= request["amplitudeRadPerNs"] <= 0.5:
            raise ValueError("Transmon pulse exceeds local limits")
        document = fq.emulator.load_model_document("transmon.reference")
        model = fq.emulator.TransmonModel.from_document(document)
        backend = fq.emulator.TransmonEmulator(model)
        dimensions = (3, 3)
        n = 2
        selectors = [(model.control.drive(f"q{request['target']}"), request["amplitudeRadPerNs"] * np.exp(1j * request["phaseRad"]))]
        units = {"time": "ns", "drive": "rad/ns", "modelFrequency": "GHz"}
        arrangement_info = None
    elif request["model"] == "rydberg":
        n = request["numAtoms"]
        duration = request["durationUs"]
        if not 1 <= n <= 6 or not 0 < duration <= 5 or not 4 <= request["spacingUm"] <= 20:
            raise ValueError("Rydberg experiment exceeds local limits")
        document = fq.emulator.load_model_document("atom2level.reference")
        document["parameters"]["c6"] = request["c6RadPerUsUm6"]
        document["model"]["id"] = "openquantum-configured-rb87-two-level"
        model = fq.emulator.Atom2LevelModel.from_document(document)
        arrangement = fq.emulator.AtomArrangement.chain(num_sites=n, spacing=request["spacingUm"])
        backend = fq.emulator.Atom2LevelEmulator(model, arrangement=arrangement)
        dimensions = (2,) * n
        selectors = [(model.control.drive(), request["omegaRadPerUs"]), (model.control.detuning(), request["detuningRadPerUs"])]
        units = {"time": "us", "drive": "rad/us", "detuning": "rad/us", "distance": "um", "c6": "rad/us*um^6"}
        arrangement_info = {"kind": "chain", "positionsUm": [[index * request["spacingUm"], 0, 0] for index in range(n)]}
    else:
        raise ValueError("Unsupported dynamics model")
    times = np.linspace(0, duration, samples)
    series = []
    normalization_errors = []
    for time in times:
        if time == 0:
            state = np.zeros(math.prod(dimensions), dtype=complex)
            state[0] = 1
        else:
            program = fq.Program(n)
            controls = tuple(fq.emulator.PulseControl(selector, fq.emulator.SampledWaveform((0.0, float(time)), (value, value))) for selector, value in selectors)
            program.add(ops.PulseOperation(float(time), controls))
            state = backend.run(program, shots=0, result_config={"counts": False, "final_state": True}).result().get_statevector()
        values = probabilities(state, dimensions)
        series.append(marginal_populations(values, dimensions))
        normalization_errors.append(abs(sum(values.values()) - 1))
    import matplotlib.pyplot as plt
    if is_transmon:
        figure, axes = plt.subplots(1, 2, figsize=(9, 3.7))
        for site in range(n):
            axes[0].plot(times, [point[site][1] for point in series], label=f"site {site}: |1>")
            axes[1].plot(times, [100 * point[site][2] for point in series], label=f"site {site}: |2>")
        axes[0].set(ylabel="Excited-state population", ylim=(-0.01, 1.01), title="Transmon excitation")
        axes[1].set(ylabel="Leakage population (%)", title="Physical level |2>")
    else:
        figure, axis = plt.subplots(figsize=(7.2, 3.7))
        axes = [axis]
        for site in range(n):
            axis.plot(times, [point[site][1] for point in series], label=f"site {site}: |r>")
        axis.set(ylabel="Rydberg population", ylim=(-0.01, 1.01), title="FatQat Rydberg constant-drive experiment")
    for axis in axes:
        axis.set_xlabel(f"Time ({units['time']})")
        axis.legend(fontsize=8, ncols=2)
        axis.grid(alpha=0.2)
    execution = {"backend": request["model"], "method": "statevector", "runtime": "qutip", "units": units, "localDimensions": list(dimensions), "initialState": "all_ground", "noise": None, "modelDocument": document, "modelDocumentSha256": digest(document), "arrangement": arrangement_info, "wireOrder": "site0_first_most_significant"}
    output = {"times": times.tolist(), "sitePopulations": series, "probabilities": values, "statevector": amplitudes(state)}
    return execution, output, {"maxNormalizationError": max(normalization_errors)}, encode_plot(figure)


def main():
    raw = sys.stdin.buffer.read(65537)
    if len(raw) > 65536:
        raise ValueError("Bridge input exceeds 64 KiB")
    envelope = json.loads(raw)
    provenance = source(envelope["dependencyLockSha256"])
    request = envelope["input"]
    if envelope["tool"] == "simulate_fatqat_circuit":
        execution, result, checks, plot = circuit(request)
    elif envelope["tool"] == "simulate_fatqat_dynamics":
        execution, result, checks, plot = dynamics(request)
    else:
        raise ValueError("Unknown FatQat bridge action")
    payload = {
        "schemaVersion": "1.0", "source": provenance, "input": request,
        "inputSha256": digest(request), "execution": execution, "result": result,
        "checks": checks, "plotPng": plot, "scientificValidation": "not_evaluated",
        "limitations": ["Bounded local simulation; no QPU execution.", "Model and noise assumptions are not current hardware calibration.", "Numerical consistency checks are not independent scientific acceptance."],
    }
    print(json.dumps(payload, allow_nan=False, separators=(",", ":")))


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(f"{type(error).__name__}: {error}", file=sys.stderr)
        sys.exit(1)
