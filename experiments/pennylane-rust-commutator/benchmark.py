"""Reproducible, interleaved timing with all warm raw samples retained."""
import csv
import gc
import hashlib
import importlib.metadata
import json
import math
import os
from pathlib import Path
import platform
import random
import statistics
import subprocess
import sys
import time

import numpy as np
from case import canonical, compare, encode, prepare_python, python_kernel, python_commutator, rust_commutator
from pauli_rust import Operator
from workloads import make_case

ROOT = Path(__file__).resolve().parent


def sample(function, loops):
    start = time.perf_counter_ns()
    for _ in range(loops):
        result = function()
    elapsed = (time.perf_counter_ns() - start) / 1e9 / loops
    del result
    return elapsed


def main():
    plan = json.loads((ROOT / "plan.json").read_text())
    order_rng = random.Random(plan["seed"])
    raw, rows, inputs, outputs = [], [], [], {}
    thread_keys = ["OMP_NUM_THREADS", "OPENBLAS_NUM_THREADS", "MKL_NUM_THREADS"]
    assert all(os.environ.get(key) == "1" for key in thread_keys), "Run with documented single-thread environment"
    for case_index, config in enumerate(plan["cases"]):
        seed = plan["seed"] + case_index
        left, right = make_case(config, seed)
        wires = tuple(range(config["qubits"]))
        a, b = encode(left, wires), encode(right, wires)
        ra, rb = Operator(a), Operator(b)
        pa, pb = prepare_python(a), prepare_python(b)
        functions = {"pennylane": lambda: left.commutator(right),
                     "python_mask_kernel": lambda: python_kernel(pa, pb),
                     "rust_kernel": lambda: ra.commutator(rb),
                     "python_end_to_end": lambda: python_commutator(left, right),
                     "rust_end_to_end": lambda: rust_commutator(left, right)}
        reference = canonical(functions["pennylane"](), wires)
        correctness = {}
        for name in ("python_end_to_end", "rust_end_to_end"):
            correctness[name] = compare(canonical(functions[name](), wires), reference)
        for name, value in [("python_mask_kernel", functions["python_mask_kernel"]()),
                            ("rust_kernel", functions["rust_kernel"]().rows())]:
            actual = {(x, z): complex(re, im) for x, z, re, im in value}
            correctness[name] = compare(actual, reference)
        assert all(result["passed"] for result in correctness.values()), (config, correctness)
        input_record = {**config, "seed": seed, "left": a, "right": b}
        payload = json.dumps(input_record, sort_keys=True).encode()
        inputs.append(input_record)
        sorted_output = sorted(reference.items())
        for label, value in [("x", np.array([key[0] for key, _ in sorted_output], dtype=np.uint64)),
                             ("z", np.array([key[1] for key, _ in sorted_output], dtype=np.uint64)),
                             ("coefficients", np.array([value for _, value in sorted_output], dtype=np.complex128))]:
            outputs[config["id"] + "_" + label] = value
        timings = {name: [] for name in functions}
        loops = {}
        for name, function in functions.items():
            for _ in range(plan["warmups"]):
                function()
            probe = sample(function, 1)
            loops[name] = max(1, min(16384, math.ceil(0.005 / max(probe, 1e-9))))
        gc.collect()
        enabled = gc.isenabled()
        gc.disable()
        try:
            for repeat in range(plan["repeats"]):
                names = list(functions)
                order_rng.shuffle(names)
                for position, name in enumerate(names):
                    seconds = sample(functions[name], loops[name])
                    timings[name].append(seconds)
                    raw.append({"case": config["id"], "repeat": repeat, "position": position,
                                "method": name, "calls": loops[name], "seconds_per_call": seconds})
        finally:
            if enabled:
                gc.enable()
        summary = {name: {"median_seconds": statistics.median(values),
                          "min_seconds": min(values), "max_seconds": max(values),
                          "q25_seconds": float(np.percentile(values, 25)),
                          "q75_seconds": float(np.percentile(values, 75)),
                          "samples_seconds": values, "calls_per_sample": loops[name]}
                   for name, values in timings.items()}
        baseline = summary["pennylane"]["median_seconds"]
        row = {**config, "actual_left_terms": len(left), "actual_right_terms": len(right),
               "output_terms": len(reference), "input_sha256": hashlib.sha256(payload).hexdigest(),
               "correctness": correctness, "timings": summary,
               "end_to_end_speedup": baseline / summary["rust_end_to_end"]["median_seconds"],
               "kernel_vs_pennylane": baseline / summary["rust_kernel"]["median_seconds"],
               "matched_mask_kernel_speedup": summary["python_mask_kernel"]["median_seconds"] / summary["rust_kernel"]["median_seconds"]}
        rows.append(row)
        print(json.dumps({"case": row["id"], "pennylane_ms": baseline * 1000,
                          "rust_total_ms": summary["rust_end_to_end"]["median_seconds"] * 1000,
                          "speedup": row["end_to_end_speedup"], "output_terms": row["output_terms"]}), flush=True)
    versions = {name: importlib.metadata.version(name) for name in ("pennylane", "numpy", "scipy")}
    report = {"plan": plan, "versions": versions, "python": sys.version,
              "interpreter": sys.executable, "platform": platform.platform(),
              "cpu": subprocess.check_output(["sysctl", "-n", "machdep.cpu.brand_string"], text=True).strip() if sys.platform == "darwin" else platform.processor(),
              "thread_environment": {key: os.environ[key] for key in thread_keys},
              "clock": "perf_counter_ns", "gc": "disabled during timed rounds",
              "scope": plan["scope"], "memory_measurement": "not performed",
              "cases": rows, "scientific_acceptance": "not_evaluated_by_central_Acceptance_Builder"}
    (ROOT / "results/benchmark.json").write_text(json.dumps(report, indent=2) + "\n")
    (ROOT / "results/inputs.json").write_text(json.dumps(inputs, separators=(",", ":")) + "\n")
    np.savez_compressed(ROOT / "results/reference-outputs.npz", **outputs)
    with (ROOT / "results/raw-timings.csv").open("w", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(raw[0]))
        writer.writeheader()
        writer.writerows(raw)

if __name__ == "__main__":
    main()
