"""Exploratory timings; excluded from the formal benchmark's nine-round medians."""
import argparse
from pathlib import Path
import time

from common import PLAN, close_check, save_json
from workloads import make_case, methods


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=Path(__file__).resolve().parent / "results")
    args = parser.parse_args()
    records = []
    for index, spec in enumerate(PLAN["cases"]):
        state, x, y, g = make_case(spec, index)
        outputs = {}
        row = {"case": spec, "seconds": {}}
        for name, function in methods(state, x, y, g).items():
            start = time.perf_counter()
            outputs[name] = function()
            row["seconds"][name] = time.perf_counter()-start
        row["errors"] = {name: float(abs(out-outputs["qutip_clenshaw"]).max()) for name, out in outputs.items()}
        close_check(outputs["rust_clenshaw"], outputs["qutip_clenshaw"])
        records.append(row)
        print(spec["id"], row["seconds"], "max error", max(row["errors"].values()), flush=True)
    save_json(args.output / "exploration.json", {"purpose": "exploration_only_not_formal_samples", "records": records})


if __name__ == "__main__":
    main()
