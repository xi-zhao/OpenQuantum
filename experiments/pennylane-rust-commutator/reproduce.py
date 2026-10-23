"""Run with the interpreter and permissions reported by the installed OpenQuantum Skill."""
import argparse
import json
import os
from pathlib import Path
import shutil
import subprocess

ROOT = Path(__file__).resolve().parent


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--locator", type=Path, required=True,
                        help="Installed pennylane-differentiable/scripts/sdk-access.mjs")
    parser.add_argument("--node", default=shutil.which("node"))
    parser.add_argument("--steps", nargs="+", choices=["build", "validate", "benchmark", "export_outputs"],
                        default=["build", "validate", "benchmark", "export_outputs"])
    args = parser.parse_args()
    result = subprocess.run([args.node, str(args.locator), "inspect", "pennylane-differentiable"],
                            check=True, capture_output=True, text=True)
    sdk = json.loads(result.stdout)
    if sdk["environmentState"] != "prepared":
        raise SystemExit("Prepare the selected SDK with OpenQuantum first. This runner does not install or change permissions.")
    (ROOT / "results").mkdir(exist_ok=True)
    (ROOT / "results/openquantum-sdk.json").write_text(json.dumps(sdk, indent=2, ensure_ascii=False) + "\n")
    environment = {**os.environ, **sdk["run"]["environment"], "OMP_NUM_THREADS": "1",
                   "OPENBLAS_NUM_THREADS": "1", "MKL_NUM_THREADS": "1"}
    for step in args.steps:
        command = [sdk["run"]["command"], "-B", str(ROOT / (step + ".py"))]
        with (ROOT / "results" / (step + ".log")).open("w") as log:
            process = subprocess.Popen(command, cwd=ROOT, env=environment, stdout=subprocess.PIPE,
                                       stderr=subprocess.STDOUT, text=True)
            try:
                for line in process.stdout:
                    print(line, end="", flush=True)
                    log.write(line)
                    log.flush()
                code = process.wait()
            except BaseException:
                process.terminate()
                process.wait(timeout=10)
                raise
            if code:
                raise SystemExit(code)

if __name__ == "__main__":
    main()
