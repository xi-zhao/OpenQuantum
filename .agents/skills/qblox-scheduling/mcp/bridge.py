"""Pinned Qblox schedule/timing operations; never instantiate HardwareAgent."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[4] / "src/lib"))
from science_bridge import execute


def compute(v):
    import numpy as np
    from qblox_scheduler.schedules.schedule import TimeableSchedule
    from qblox_scheduler.operations import SquarePulse, IdlePulse
    from qblox_scheduler.compilation import _determine_absolute_timing
    from qblox_scheduler.helpers.waveforms import get_waveform

    schedule = TimeableSchedule("OpenQuantum baseband pulse train", repetitions=v["repetitions"])
    for i, pulse in enumerate(v["pulses"]):
        schedule.add(SquarePulse(amplitude=pulse["amplitude"], duration=pulse["durationSeconds"], port="drive"), label=f"p{i}")
        if pulse["gapAfterSeconds"]:
            schedule.add(IdlePulse(duration=pulse["gapAfterSeconds"]), label=f"gap{i}")
    # This pinned SDK pass is also used by SerialCompiler. HardwareAgent.compile
    # tries device discovery, so deliberately do not construct that wrapper.
    schedule = _determine_absolute_timing(schedule)
    pulses = []
    for i, pulse in enumerate(v["pulses"]):
        scheduled = schedule.schedulables[f"p{i}"]
        operation = schedule.operations[scheduled["operation_id"]]
        waveform = np.asarray(get_waveform(operation.data["pulse_info"], v["sampleRateHz"]), dtype=float)
        if not np.all(np.isfinite(waveform)):
            raise ValueError("Qblox waveform generator returned non-finite samples")
        pulses.append({"index": i, "startSeconds": float(scheduled["abs_time"]), "durationSeconds": float(operation.duration),
                       "sampleRateHz": v["sampleRateHz"], "samples": waveform.tolist()})
    return {"scheduleJson": schedule.to_json(), "durationSeconds": float(schedule.get_schedule_duration()),
            "pulses": pulses, "networkUsed": False, "hardwareExecuted": False}, [
        "Qblox Scheduler 1.0.0b8 is a public beta. The adapter calls its pinned internal timing pass and public schedule/waveform types; upgrades require compatibility tests.",
        "The schedule is a sequential train on one baseband port. The final gap is included in schedule duration; pulse samples describe one repetition only.",
        "Amplitude is a dimensionless mathematical envelope. No device gain, clipping, sample-grid constraint, modulation or calibration is applied.",
        "No HardwareAgent, instrument connection, Q1ASM hardware compilation, acquisition or qubit dynamics is performed.",
    ]


if __name__ == "__main__":
    execute(compute)
