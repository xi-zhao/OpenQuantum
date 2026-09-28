"""Generate only a fixed Guppy grammar from validated operations; no user code."""
import hashlib
import importlib.util
import math
import os
import sys
import tempfile
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
sys.path.insert(0, str(ROOT / "src/lib"))
from science_bridge import execute


def build_source(v):
    lines = ["from guppylang import guppy", "from guppylang.std.quantum import qubit, h, x, y, z, s, t, cx, rx, ry, rz, measure",
             "from guppylang.std.builtins import result", "from guppylang.std.angles import angle", "@guppy", "def main() -> None:"]
    lines.extend(f"    q{i} = qubit()" for i in range(v["numQubits"]))
    measured = 0
    gates = {g: g.lower() for g in ["H", "X", "Y", "Z", "S", "T", "CX", "RX", "RY", "RZ"]}
    for op in v["operations"]:
        targets = [f"q{int(q)}" for q in op["targets"]]
        if op["gate"] == "MEASURE_RESET":
            lines.extend([f"    c{measured} = measure({targets[0]}).read()", f"    {targets[0]} = qubit()", f'    result("m{measured}", c{measured})'])
            measured += 1
            continue
        args = targets
        if op["gate"] in ("RX", "RY", "RZ"):
            args += [f"angle({float(op['angleRadians']) / math.pi!r})"]
        indent = "    "
        if op["conditionMeasurement"] >= 0:
            negate = "" if op["conditionValue"] else "not "
            lines.append(f"    if {negate}c{int(op['conditionMeasurement'])}:")
            indent += "    "
        lines.append(f"{indent}{gates[op['gate']]}({', '.join(args)})")
    lines.extend(f'    result("q{i}", measure(q{i}).read())' for i in range(v["numQubits"]))
    return "\n".join(lines) + "\n", measured


def compute(v):
    from selene_sim import build, Quest
    from hugr.qsystem.result import QsysShot

    source, measured = build_source(v)
    cache = ROOT / ".openquantum/cache/guppy-programs"
    cache.mkdir(parents=True, exist_ok=True)
    # Keep the native compiler's global cache in the workspace as well.
    os.environ["ZIG_GLOBAL_CACHE_DIR"] = str(cache / "zig")
    counts = Counter()
    with tempfile.TemporaryDirectory(prefix="build-", dir=cache) as temporary:
        program_path = Path(temporary) / "program.py"
        program_path.write_text(source, encoding="utf-8")
        module_name = "openquantum_generated_guppy"
        spec = importlib.util.spec_from_file_location(module_name, program_path)
        module = importlib.util.module_from_spec(spec)
        sys.modules[module_name] = module
        try:
            # The file contains only the adapter's imports/template, whitelisted
            # gate names, integer identifiers and finite numeric literals.
            spec.loader.exec_module(module)
            compiled = module.main.compile()
            binary = compiled.to_bytes()
            runner = build(compiled, build_dir=Path(temporary) / "selene", progress_bar=False)
            for shot in runner.run_shots(simulator=Quest(), n_qubits=v["numQubits"], n_shots=v["shots"], random_seed=v["seed"], n_processes=1):
                values = QsysShot(shot).as_dict()
                classical = "".join(str(int(values[f"m{i}"])) for i in range(measured))
                final = "".join(str(int(values[f"q{i}"])) for i in range(v["numQubits"]))
                counts[(classical, final)] += 1
        finally:
            sys.modules.pop(module_name, None)
    if sum(counts.values()) != v["shots"]:
        raise ValueError("Selene returned an incomplete shot stream")
    return {"programSource": source, "hugrSha256": hashlib.sha256(binary).hexdigest(), "hugrBytes": len(binary),
            "measurementCount": measured, "shots": v["shots"],
            "counts": [{"measurementBits": m, "finalBits": q, "count": n} for (m, q), n in sorted(counts.items())],
            "simulator": "Selene QuEST ideal statevector", "networkUsed": False, "hardwareExecuted": False}, [
        "The adapter generates a fixed Guppy grammar from structured gates and compiles it to HUGR and a native Selene executable. User Python, QIR, library paths and arbitrary code are not accepted.",
        "MEASURE_RESET performs a destructive Z measurement and allocates a fresh |0> qubit. Measurement indices follow occurrence order; conditional gates read only earlier results.",
        "Counts are ideal statevector shot samples from Selene QuEST. They include classical feedback and quantum measurement randomness, but no noise, timing, hardware latency or calibrated device behavior.",
        "Guppy angles are internally half-turns; input radians are divided by pi before compilation. Bitstrings list q0 first, unlike little-endian display conventions of some circuit SDKs.",
        "Native build intermediates are deleted after each call; compiler caches stay in the workspace. Fixed seeds are reproducible only within the pinned simulator/compiler configuration.",
    ]


if __name__ == "__main__":
    execute(compute)
