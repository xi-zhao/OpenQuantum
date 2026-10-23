"""Qililab compilation only; no Platform, instrument or experiment executor."""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[4] / "src/lib"))
from science_bridge import execute


def compute(v):
    from qililab.qprogram import QProgram, QbloxCompiler
    from qililab.waveforms import Square, IQPair
    program = QProgram()
    for pulse in v["pulses"]:
        waveform = IQPair(I=Square(amplitude=pulse["iAmplitude"], duration=pulse["durationNs"]),
                          Q=Square(amplitude=pulse["qAmplitude"], duration=pulse["durationNs"]))
        program.play(bus="drive", waveform=waveform)
        if pulse["waitAfterNs"]:
            program.wait(bus="drive", duration=pulse["waitAfterNs"])
    compiled = QbloxCompiler().compile(program)
    sequence = compiled.sequences["drive"].todict()
    waveforms = [{"name": name, "index": data["index"], "samples": data["data"]}
                 for name, data in sequence["waveforms"].items()]
    return {"program": sequence["program"], "sequenceJson": json.dumps(sequence), "waveforms": waveforms,
            "requestedDurationNs": sum(p["durationNs"] + p["waitAfterNs"] for p in v["pulses"]), "sampleRateHz": 1e9,
            "networkUsed": False, "hardwareExecuted": False}, [
        "The Qililab QbloxCompiler compiles one IQ bus with square pulses and no acquisitions. No Platform, instrument controller, runcard or credentials are loaded.",
        "Input amplitudes are normalized I/Q DAC values, not volts, Rabi rates or calibrated rotation angles. The sample grid is 1 ns; instruction timings use multiples of 4 ns.",
        "Qililab may optimize constant pulses into gain instructions and shared unit waveforms. Waveform tables must be interpreted together with the returned Q1ASM program.",
        "Requested duration excludes compiler prologue/epilogue overhead. Compilation does not establish hardware readiness, measured behavior or qubit dynamics.",
    ]


if __name__ == "__main__":
    execute(compute)
