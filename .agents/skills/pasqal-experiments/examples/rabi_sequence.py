"""Analytic single-atom engineering example; not a device calibration."""
from pulser import Pulse, Register, Sequence
from pulser.devices import AnalogDevice, Device


def build_sequence(device=None, duration_ns=200, omega_rad_us=3.141592653589793):
    device = device or AnalogDevice
    register = Register({"q0": (0, 0)})
    if isinstance(device, Device):
        register = register.with_automatic_layout(device)
    sequence = Sequence(register, device)
    sequence.declare_channel("drive", "rydberg_global")
    sequence.add(Pulse.ConstantPulse(duration_ns, omega_rad_us, 0, 0), "drive")
    sequence.measure("ground-rydberg")
    return sequence


def compute_observable(counts):
    return sum(count for bits, count in counts.items() if bits[0] == "1") / sum(counts.values())
