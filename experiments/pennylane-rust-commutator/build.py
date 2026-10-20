"""Build the local PyO3 module without changing the OpenQuantum SDK environment."""
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import sysconfig
import time

ROOT = Path(__file__).resolve().parent

def main():
    environment = {**os.environ, "PYO3_PYTHON": sys.executable,
                   "PYO3_BUILD_EXTENSION_MODULE": "1", "CARGO_BUILD_JOBS": "2"}
    start = time.perf_counter()
    result = subprocess.run(["cargo", "build", "--release", "--locked"], cwd=ROOT,
                            env=environment, capture_output=True, text=True)
    (ROOT / "results/build.log").write_text(result.stdout + result.stderr)
    result.check_returncode()
    extension = ".dylib" if sys.platform == "darwin" else ".dll" if sys.platform == "win32" else ".so"
    source = ROOT / "target/release" / (("" if sys.platform == "win32" else "lib") + "pauli_rust" + extension)
    destination = ROOT / ("pauli_rust" + sysconfig.get_config_var("EXT_SUFFIX"))
    shutil.copy2(source, destination)
    report = {"build_seconds": time.perf_counter() - start, "python": sys.executable,
              "command": ["cargo", "build", "--release", "--locked"],
              "build_jobs": 2, "extension": destination.name, "profile": "release",
              "rustc": subprocess.check_output(["rustc", "--version"], text=True).strip()}
    (ROOT / "results/build.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report))

if __name__ == "__main__":
    main()
