"""Real dimensionless QoolQit compilation followed by local Pulser simulation."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[4] / "src/lib"))
from science_bridge import execute
from sdk_device_models import virtual_device, simulate_sequence, ANALOG_LIMITATIONS


def compile_program(v):
    import math
    import qoolqit as qq
    from qoolqit.devices.unit_converter import UnitConverter
    from qoolqit.waveforms.utils import round_to_sum
    physical = virtual_device()
    converter = UnitConverter.from_energy(physical.interaction_coeff, v["energyScaleRadPerUs"])
    if not all(math.isfinite(float(x)) and x > 0 for x in converter.factors):
        raise ValueError("Unit conversion factors are not numerically representable")
    device = qq.Device(physical, default_converter=converter)
    def waveform(values):
        if len(v["durations"]) == 1:
            if values[0] == values[1]:
                return qq.ConstantWaveform(v["durations"][0], values[0])
            return qq.RampWaveform(v["durations"][0], *values)
        return qq.PiecewiseLinearWaveform(v["durations"], values)
    program = qq.QuantumProgram(
        qq.Register({f"q{i}": tuple(p) for i, p in enumerate(v["atomPositions"])}),
        qq.Drive(amplitude=waveform(v["rabiAmplitude"]), detuning=waveform(v["detuning"]), phase=v["phaseRad"]),
    )
    total_duration = sum(v["durations"])
    physical_duration = total_duration * float(converter.factors[0])
    if not math.isfinite(physical_duration) or round(physical_duration) < 4:
        raise ValueError("Compiled pulse duration must be representable and at least 4 ns")
    rounded_total = round(physical_duration)
    # Use the pinned SDK's own duration apportionment instead of approximating
    # it. Upstream otherwise silently discards segments that round to zero.
    segments = round_to_sum([rounded_total / total_duration * dt for dt in v["durations"]])
    if any(dt < 1 for dt in segments):
        raise ValueError("A positive input segment rounds to 0 ns; choose a representable duration or energy scale")
    for i, dt in enumerate(segments):
        if dt == 1 and any(v[key][i] != v[key][i + 1] for key in ["rabiAmplitude", "detuning"]):
            raise ValueError("One nanosecond cannot represent unequal waveform endpoints")
    program.compile_to(device, profile="default")
    if program.compiled_sequence.get_duration() != sum(segments):
        raise ValueError("QoolQit compiled duration differs from its waveform duration allocation")
    return program, device, segments


def compute(v):
    from itertools import accumulate
    program, device, segments = compile_program(v)
    result = simulate_sequence(program.compiled_sequence, v, [0, *accumulate(segments)])
    time, energy, distance = map(float, device.converter.factors)
    result.update(qoolqitCompiled=program.is_compiled, compilerProfile="default",
                  conversionFactors={"timeNs": time, "energyRadPerUs": energy, "distanceUm": distance},
                  dimensionlessDuration=sum(v["durations"]), compiledSegmentDurationsNs=segments)
    return result, [
        "Actual QoolQit QuantumProgram.compile_to(default) performs conversion to a virtual Pulser device. Dimensionless durations, drives and positions scale by the returned factors; compiled ns rounding can break exact scale invariance.",
        "QoolQit uses a PASQAL MIT-derived license with a patent grant restricted to internal research and academic purposes; this integration is explicitly opt-in.",
        *ANALOG_LIMITATIONS,
    ]


if __name__ == "__main__":
    execute(compute)
