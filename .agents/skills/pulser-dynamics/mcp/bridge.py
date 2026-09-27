"""Construct and simulate a local Pulser Sequence."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[4] / "src/lib"))
from science_bridge import execute
from sdk_device_models import virtual_device, simulate_sequence, ANALOG_LIMITATIONS


def build_sequence(v):
    from pulser import Register, Sequence, Pulse
    from pulser.waveforms import ConstantWaveform, RampWaveform
    sequence = Sequence(Register({f"q{i}": tuple(p) for i, p in enumerate(v["atomPositionsUm"])}), virtual_device())
    sequence.declare_channel("global", "rydberg_global")
    boundaries = [0]
    for p in v["pulses"]:
        def waveform(endpoints):
            return (ConstantWaveform(p["durationNs"], endpoints[0]) if endpoints[0] == endpoints[1]
                    else RampWaveform(p["durationNs"], *endpoints))
        sequence.add(Pulse(waveform(p["amplitudeRadPerUs"]), waveform(p["detuningRadPerUs"]), p["phaseRad"]), "global", protocol="no-delay")
        boundaries.append(boundaries[-1] + p["durationNs"])
    return sequence, boundaries


def compute(v):
    sequence, boundaries = build_sequence(v)
    return simulate_sequence(sequence, v, boundaries), ANALOG_LIMITATIONS


if __name__ == "__main__":
    execute(compute)
