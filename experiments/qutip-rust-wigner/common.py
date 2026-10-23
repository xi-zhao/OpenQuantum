"""Measurement and evidence helpers; no dependency installation or model calls."""
import argparse
import csv
from datetime import datetime, timezone
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

ROOT = Path(__file__).resolve().parent
PLAN = json.loads((ROOT / "plan.json").read_text())


def arguments(name):
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=ROOT / "results" / name)
    parser.add_argument("--validate-only", action="store_true")
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    return args


def save_json(path, value):
    path.write_text(json.dumps(value, indent=2, allow_nan=False) + "\n")


def file_sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def metadata(packages):
    cpu = platform.processor()
    if sys.platform == "darwin":
        cpu = subprocess.check_output(["sysctl", "-n", "machdep.cpu.brand_string"], text=True).strip()
    return {
        "measured_at_utc": datetime.now(timezone.utc).isoformat(),
        "cpu": cpu,
        "platform": platform.platform(),
        "interpreter": sys.executable,
        "python": sys.version,
        "versions": {p: importlib.metadata.version(p) for p in packages},
        "thread_environment": {key: os.environ.get(key) for key in ["OMP_NUM_THREADS", "OPENBLAS_NUM_THREADS", "MKL_NUM_THREADS"]},
        "sources_sha256": {str(p.relative_to(ROOT)): file_sha(p) for p in [*sorted(ROOT.glob("*.py")), ROOT / "plan.json", ROOT / "Cargo.toml", ROOT / "Cargo.lock", ROOT / "build.rs", ROOT / "rust/lib.rs"]},
        "plan": PLAN,
        "scientific_acceptance": "not_evaluated_by_central_Acceptance_Builder",
    }


def measure(methods, seed, check_output=None):
    samples = {name: [] for name in methods}
    counts = {}
    raw = []
    for name, function in methods.items():
        for _ in range(PLAN["warmups"]):
            function()
        start = time.perf_counter_ns()
        function()
        seconds = max((time.perf_counter_ns() - start) / 1e9, 1e-9)
        counts[name] = max(1, min(PLAN["max_calls_per_sample"], math.ceil(PLAN["target_sample_seconds"] / seconds)))
    rng = random.Random(seed)
    previous_gc = gc.isenabled()
    gc.disable()
    try:
        for repeat in range(PLAN["repeats"]):
            order = list(methods)
            rng.shuffle(order)
            for position, name in enumerate(order):
                start = time.perf_counter_ns()
                for _ in range(counts[name]):
                    result = methods[name]()
                elapsed = (time.perf_counter_ns() - start) / 1e9 / counts[name]
                checked = check_output(name, result) if check_output else {}
                del result
                samples[name].append(elapsed)
                raw.append({"repeat": repeat, "position": position, "method": name, "calls": counts[name], "seconds_per_call": elapsed, **checked})
    finally:
        if previous_gc:
            gc.enable()
    summary = {name: {
        "median_seconds": statistics.median(values),
        "q25_seconds": float(np.quantile(values, 0.25)),
        "q75_seconds": float(np.quantile(values, 0.75)),
        "samples_seconds": values,
        "calls_per_sample": counts[name],
    } for name, values in samples.items()}
    return summary, raw


def close_check(actual, expected, *, atol=1e-12, rtol=1e-12):
    actual, expected = np.asarray(actual), np.asarray(expected)
    if actual.shape != expected.shape or not np.isfinite(actual).all() or not np.isfinite(expected).all():
        raise AssertionError("Shape mismatch or non-finite output")
    error = float(np.max(np.abs(actual - expected), initial=0))
    if not np.allclose(actual, expected, atol=atol, rtol=rtol):
        raise AssertionError(f"Numerical mismatch: {error}")
    return error


def finish(args, name, packages, rows, checks, raw):
    value = {**metadata(packages), "case": name, "validation": checks, "cases": rows}
    save_json(args.output / "results.json", value)
    if raw:
        with (args.output / "raw-timings.csv").open("w", newline="") as handle:
            writer = csv.DictWriter(handle, fieldnames=["case", "repeat", "position", "method", "calls", "seconds_per_call"], lineterminator="\n")
            writer.writeheader()
            writer.writerows(raw)
    for row in rows:
        if "timings" in row:
            baseline = row["timings"]["baseline"]["median_seconds"]
            optimized = row["timings"]["optimized"]["median_seconds"]
            print(f'{name}/{row["id"]}: {baseline*1000:.4f} -> {optimized*1000:.4f} ms, {baseline/optimized:.3f}x', flush=True)
    print(f"{name}: {len(checks)} validation records passed", flush=True)
