"""OQC QAT waveform construction for a fixed virtual baseband drive channel."""
import contextlib
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
sys.path.insert(0, str(ROOT / "src/lib"))
from science_bridge import execute


def compute(v):
    cache = ROOT / ".openquantum/cache/oqc-qat"
    cache.mkdir(parents=True, exist_ok=True)
    # QAT initializes its local logger on import. Keep log/config discovery
    # inside this capability's workspace cache, never the user's working dir.
    with contextlib.chdir(cache):
        return compile_pulses(v)


def compile_pulses(v):
    import numpy as np
    from qat.purr.backends.echo import get_default_echo_hardware
    from qat.purr.compiler.devices import PulseShapeType
    from qat.purr.compiler.instructions import Pulse

    model = get_default_echo_hardware(qubit_count=1)
    channel = model.get_qubit(0).get_drive_channel()
    builder = model.create_builder()
    for pulse in v["pulses"]:
        shape = PulseShapeType.SQUARE if pulse["shape"] == "square" else PulseShapeType.GAUSSIAN_ZERO_EDGE
        builder.pulse(channel, shape, width=pulse["durationNs"] * 1e-9,
                      amp=pulse["amplitude"], phase=pulse["phaseRadians"],
                      std_dev=pulse["sigmaNs"] * 1e-9, zero_at_edges=False, ignore_channel_scale=True)
        if pulse["waitAfterNs"]:
            builder.delay(channel, pulse["waitAfterNs"] * 1e-9)
    engine = model.create_engine()
    timeline = engine.create_duration_timeline(builder.instructions)
    buffers = engine.build_pulse_channel_buffers(timeline, do_upconvert=False)
    waveform = np.asarray(buffers[channel], dtype=complex)
    if not np.all(np.isfinite(waveform)):
        raise ValueError("QAT returned non-finite waveform samples")
    return {"instructions": [str(i) for i in builder.instructions],
            "timeline": [{"kind": "pulse" if isinstance(p.instruction, Pulse) else "wait", "startSample": int(p.start), "endSample": int(p.end)} for p in timeline[channel]],
            "sampleRateHz": 1e9, "durationNs": len(waveform), "real": waveform.real.tolist(), "imag": waveform.imag.tolist(),
            "networkUsed": False, "hardwareExecuted": False}, [
        "QAT EchoEngine's timeline and pulse-buffer stages are used on a fixed virtual drive channel sampled at 1 GHz. No engine execute, hardware driver or QCaaS client is called.",
        "Waveforms are complex baseband envelopes with channel gain bypassed, no upconversion and no clipping. Square amplitude is dimensionless; phase is radians.",
        "Gaussian samples use A exp(-t^2/(2 sigma^2)) exp(i phase), sampled at bin midpoints about the pulse center and truncated without forcing edge values to zero.",
        "Echo waveform construction does not simulate a qubit state, decoherence or measured quantum outcomes. It is not a hardware-target binary compiler or calibration verification.",
    ]


if __name__ == "__main__":
    execute(compute)
