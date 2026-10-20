"""Run this case with the interpreter and permissions selected by OpenQuantum."""
import argparse
import json
import os
from pathlib import Path
import shutil
import subprocess

ROOT = Path(__file__).resolve().parent


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--locator", type=Path, required=True)
    parser.add_argument("--node", default=shutil.which("node"))
    parser.add_argument("--phase", choices=["all", "build", "probe", "validate", "benchmark"], default="all")
    parser.add_argument("--output", type=Path, default=ROOT / "results")
    args = parser.parse_args()
    sdk = json.loads(subprocess.check_output([args.node, str(args.locator), "inspect", "fatqat-workbench"], text=True))
    if sdk["environmentState"] != "prepared" or sdk.get("bootstrap"):
        raise SystemExit("Prepare the selected SDK through OpenQuantum, and review any bootstrap first.")
    output = args.output.resolve()
    output.mkdir(parents=True, exist_ok=True)
    (output / "openquantum-sdk.json").write_text(json.dumps(sdk, indent=2)+"\n")
    environment = {**os.environ, **sdk["run"]["environment"], "OMP_NUM_THREADS": "1", "OPENBLAS_NUM_THREADS": "1", "MKL_NUM_THREADS": "1"}
    phases = ["build", "validate", "benchmark"] if args.phase == "all" else [args.phase]
    for phase in phases:
        command = [sdk["run"]["command"], "-B", str(ROOT / (phase+".py"))]
        if phase != "build":
            command += ["--output", str(output)]
        with (output / (phase+"-execution.log")).open("w") as log:
            process = subprocess.Popen(command, cwd=ROOT, env=environment, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
            try:
                for line in process.stdout:
                    print(line, end="", flush=True)
                    log.write(line)
                code = process.wait()
            except BaseException:
                process.terminate()
                process.wait(timeout=10)
                raise
            if code:
                raise SystemExit(code)


if __name__ == "__main__":
    main()
