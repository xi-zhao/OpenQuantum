"""Structured QUA generation. Never construct a QuantumMachinesManager."""
import base64
import contextlib
import importlib.abc
import importlib.machinery
import json
import sys
from unittest.mock import patch


@contextlib.contextmanager
def offline_user_config():
    # qm.__init__ loads user configuration before exposing its offline API.
    # Wrap only that module's factory, preserving HOME and every SDK operation.
    with contextlib.ExitStack() as stack:
        def replace_factory(module):
            stack.enter_context(patch.object(module.UserConfig, "create_from_file", classmethod(lambda cls: cls())))
            stack.enter_context(patch.object(module.UserConfig, "enable_user_stdout", property(lambda _: False)))

        class ConfigLoader(importlib.abc.Loader):
            def __init__(self, original):
                self.original = original

            def create_module(self, spec):
                return self.original.create_module(spec)

            def exec_module(self, module):
                self.original.exec_module(module)
                replace_factory(module)

        class ConfigFinder(importlib.abc.MetaPathFinder):
            def find_spec(self, fullname, path, target=None):
                if fullname != "qm.user_config":
                    return None
                spec = importlib.machinery.PathFinder.find_spec(fullname, path, target)
                if spec is None or spec.loader is None:
                    raise ImportError("Pinned QM SDK user configuration module is missing")
                spec.loader = ConfigLoader(spec.loader)
                return spec

        if "qm.user_config" in sys.modules:
            replace_factory(sys.modules["qm.user_config"])
        finder = ConfigFinder()
        sys.meta_path.insert(0, finder)
        try:
            yield
        finally:
            sys.meta_path.remove(finder)


def compute(v):
    with offline_user_config():
        return prepare(v)


def prepare(v):
    from qm import QuantumMachinesManager, generate_qua_script
    from qm.qua import declare, for_, play, program, wait
    # Public offline capability setup is a static call; no manager is created.
    # Empty capability set selects baseline OPX1 features used by this adapter.
    QuantumMachinesManager.set_capabilities_offline([])
    config = {
        "version": 1,
        "controllers": {"con1": {"type": "opx1", "analog_outputs": {1: {"offset": 0.0}}}},
        "elements": {"drive": {"singleInput": {"port": ("con1", 1)}, "intermediate_frequency": 0,
                                "operations": {f"p{i}": f"pulse{i}" for i in range(len(v["pulses"]))}}},
        "pulses": {f"pulse{i}": {"operation": "control", "length": p["durationNs"], "waveforms": {"single": f"wave{i}"}} for i, p in enumerate(v["pulses"])},
        "waveforms": {f"wave{i}": {"type": "constant", "sample": p["amplitudeVolts"]} for i, p in enumerate(v["pulses"])},
    }
    with program() as prog:
        iteration = declare(int)
        with for_(iteration, 0, iteration < v["repetitions"], iteration + 1):
            for i, pulse in enumerate(v["pulses"]):
                play(f"p{i}", "drive")
                if pulse["waitAfterNs"]:
                    wait(pulse["waitAfterNs"] // 4, "drive")
    binary = prog.to_protobuf(config)
    return {
        "quaSource": generate_qua_script(prog, config), "configurationJson": json.dumps(config),
        "programBase64": base64.b64encode(binary).decode(), "programBytes": len(binary),
        "pulsesPerRepetition": len(v["pulses"]),
        "nominalDurationNs": sum(p["durationNs"] + p["waitAfterNs"] for p in v["pulses"]) * v["repetitions"],
        "networkUsed": False, "hardwareExecuted": False,
    }, [
        "QUA AST and configuration were serialized by qm-qua; no QuantumMachinesManager, QOP server, cloud simulator or device was contacted.",
        "The configuration targets one OPX1 single analog output at zero intermediate frequency. Voltages lie in [-0.5, 0.5); pulse durations and nonzero waits use the 4 ns clock and are at least 16 ns. A zero wait omits the wait instruction.",
        "Nominal duration sums requested pulses and waits; it excludes compiler scheduling and loop overhead. Local serialization does not prove real-time execution timing or device readiness.",
    ]


if __name__ == "__main__":
    request = json.load(sys.stdin)
    with contextlib.redirect_stdout(sys.stderr):
        result, limitations = compute(request["input"])
    json.dump({**request, "schemaVersion": "1.0", "result": result, "scientificValidation": "not_evaluated", "limitations": limitations}, sys.stdout, allow_nan=False)
