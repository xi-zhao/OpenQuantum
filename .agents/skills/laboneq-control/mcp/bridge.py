"""Offline standalone HDAWG compiler and output simulator; no Session.connect/run."""
import contextlib
import json
import sys


def compute(v):
    import numpy as np
    from laboneq.simple import DeviceSetup, Experiment, ExperimentSignal, Session, pulse_library
    from laboneq.simulator.output_simulator import OutputSimulator
    setup = DeviceSetup.from_descriptor("""instruments:
  HDAWG:
  - address: DEV8000
    uid: hdawg
    options: HDAWG8/CNT/MF/ME/PC/SKW/IQ
connections:
  hdawg:
    - rf_signal: q0/drive
      ports: [SIGOUTS/0]
""", server_host="127.0.0.1", server_port=8004)
    experiment = Experiment(uid="openquantum_pulses", signals=[ExperimentSignal("drive")])
    with experiment.acquire_loop_rt(count=v["repetitions"]):
        with experiment.section(uid="sequential_control"):
            for i, pulse in enumerate(v["pulses"]):
                builder = pulse_library.const if pulse["shape"] == "constant" else pulse_library.gaussian
                waveform = builder(uid=f"pulse{i}", length=pulse["lengthSeconds"], amplitude=pulse["amplitude"])
                experiment.play(signal="drive", pulse=waveform)
                if pulse["delayAfterSeconds"]:
                    experiment.delay(signal="drive", time=pulse["delayAfterSeconds"])
    experiment.set_signal_map({"drive": setup.logical_signal_groups["q0"].logical_signals["drive"]})
    # In the pinned release Session.compile delegates to the offline compiler.
    # No Session.connect() is needed; keep device connection APIs out of the call.
    session = Session(setup, configure_logging=False)
    compiled = session.compile(experiment)
    simulator = OutputSimulator(compiled, max_simulation_length=v["snippetStartSeconds"] + v["snippetLengthSeconds"])
    snippet = simulator.get_snippet(setup.physical_channel_groups["hdawg"].channels["sigouts_0"],
                                    start=v["snippetStartSeconds"], output_length=v["snippetLengthSeconds"])
    times = np.asarray(snippet.time, dtype=float)
    wave = np.asarray(snippet.wave, dtype=complex)
    if wave.shape != times.shape or not np.all(np.isfinite(wave)):
        raise ValueError("LabOne Q returned inconsistent waveform samples")
    return {
        "sequencers": [{"filename": item["filename"], "source": item["text"]} for item in compiled.scheduled_experiment.artifacts.src],
        "totalExecutionSeconds": float(compiled.estimated_runtime), "sampleRateHz": 2.4e9,
        "timeSeconds": times.tolist(), "real": wave.real.tolist(), "imag": wave.imag.tolist(),
        "networkUsed": False, "hardwareExecuted": False, "simulationKind": "instrument-output-waveforms",
    }, [
        "The fixed emulated setup is a standalone HDAWG RF signal at 2.4 GSa/s. No data-server connection, instrument programming, acquisition or hardware execution occurs.",
        "The SDK compiler applies hardware sample-grid constraints and may round requested timings. Returned sequencer code and output samples describe the compiled instrument program.",
        "Waveform simulation is an instrument-output calculation. It is not a qubit dynamics calculation, measured signal, or verification of laboratory calibration.",
    ]


if __name__ == "__main__":
    request = json.load(sys.stdin)
    with contextlib.redirect_stdout(sys.stderr):
        result, limitations = compute(request["input"])
    json.dump({**request, "schemaVersion": "1.0", "result": result, "scientificValidation": "not_evaluated", "limitations": limitations}, sys.stdout, allow_nan=False)
