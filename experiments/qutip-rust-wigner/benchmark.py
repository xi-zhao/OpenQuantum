"""Nine interleaved rounds; include all conversions and complete writable outputs."""
import argparse
import csv
import hashlib
import json
from pathlib import Path

import numpy as np
import qutip_wigner_rust

from common import PLAN, file_sha, measure, metadata, save_json
from workloads import make_case, methods


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=Path(__file__).resolve().parent / "results")
    args = parser.parse_args()
    root = Path(__file__).resolve().parent
    validation = json.loads((args.output / "validation.json").read_text())
    for name, digest in validation["sources_sha256"].items():
        assert file_sha(root / name) == digest, f"Source changed after validation: {name}"
    assert validation["extension_sha256"] == file_sha(Path(qutip_wigner_rust.__file__))
    rows, raw = [], []
    for index, spec in enumerate(PLAN["cases"]):
        state, x, y, g = make_case(spec, index)
        path = args.output / (spec["id"]+"-inputs-outputs.npz")
        assert file_sha(path) == validation["full_input_output_sha256"][path.name]
        with np.load(path) as saved:
            for name, actual in [("rho", state.full()), ("x", x), ("y", y), ("g", np.array(g))]:
                assert np.array_equal(actual, saved[name])
            expected = saved["independent"].copy()
        def check_output(name, result):
            assert result.shape == expected.shape and result.dtype == np.float64
            assert result.flags.writeable and np.isfinite(result).all()
            error = float(np.max(np.abs(result-expected)))
            passed = bool(np.allclose(result, expected, atol=1e-12, rtol=1e-12))
            if name != "qutip_iterative":
                assert passed, (name, error)
            return {"max_independent_error": error, "accuracy_passed": passed,
                    "output_sha256": hashlib.sha256(result.tobytes()).hexdigest()}
        timings, samples = measure(methods(state, x, y, g), PLAN["seed"]+index, check_output)
        accurate = {row["method"]: row["accuracy_passed"] for row in validation["method_observations"] if row["case"] == spec["id"]}
        applicable = [name for name in timings if name.startswith("qutip_") and accurate[name]]
        fastest = min(applicable, key=lambda name: timings[name]["median_seconds"])
        rust = timings["rust_clenshaw"]["median_seconds"]
        row = {**spec, "timings": timings, "method_accuracy_passed": accurate,
               "speedup_vs_default": timings["qutip_clenshaw"]["median_seconds"]/rust,
               "fastest_accurate_qutip": fastest,
               "speedup_vs_fastest_accurate_qutip": timings[fastest]["median_seconds"]/rust}
        rows.append(row)
        raw += [{"case": spec["id"], **sample} for sample in samples]
        print(f'{spec["id"]}: QuTiP {timings["qutip_clenshaw"]["median_seconds"]*1000:.4f} -> Rust {rust*1000:.4f} ms; {row["speedup_vs_default"]:.3f}x; fastest accurate QuTiP {fastest}', flush=True)
    fields = ["case", "repeat", "position", "method", "calls", "seconds_per_call", "max_independent_error", "accuracy_passed", "output_sha256"]
    with (args.output / "raw-timings.csv").open("w", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields, lineterminator="\n")
        writer.writeheader()
        writer.writerows(raw)
    record = {**metadata(["qutip", "numpy", "scipy"]), "cases": rows,
              "raw_samples": len(raw), "raw_csv_sha256": file_sha(args.output / "raw-timings.csv"),
              "extension_sha256": file_sha(Path(qutip_wigner_rust.__file__)),
              "timing_scope": "Qobj and coordinates to complete writable float64 W[y,x], including validation, conversion, coefficient preparation, FFI and output construction; setup/compilation/input generation/result checking excluded"}
    save_json(args.output / "benchmark.json", record)
    print(f"Saved {len(raw)} raw samples; each sample's final complete output checked and hashed.", flush=True)


if __name__ == "__main__":
    main()
