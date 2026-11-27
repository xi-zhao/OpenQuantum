import json
import runpy
import subprocess
import sys
from pathlib import Path


def run_case(checker, path):
    process = subprocess.run([sys.executable, "-B", str(checker), str(path)], capture_output=True, text=True)
    if process.returncode not in (0, 1) or not process.stdout.strip():
        raise RuntimeError(f"Readback failed for {path.name}: {process.stderr}")
    return process.returncode, json.loads(process.stdout)


def verify(folder):
    checker = Path(__file__).resolve().parents[2] / ".agents/skills/quantum-metal-layout/references/verify-positive.py"
    reference = runpy.run_path(str(checker))
    manifest = json.loads((folder / "geometry-inputs.json").read_text())
    layout = folder / manifest["sourceOutput"]
    diagnostic = reference["read_design"](layout / "diagnostic.gds", "diagnostic")
    negative = reference["read_design"](folder / "upstream-negative.gds", "negative")
    report = {"diagnostic": diagnostic,
              "unsupportedNegativeMask": {"measurements": negative, "failures": reference["geometry_failures"](negative)},
              "cases": {}, "scientificValidation": "not_evaluated"}
    failures = reference["geometry_failures"](diagnostic)
    if {p.name for p in layout.glob("*.gds")} != {"diagnostic.gds", "positive.gds", "junction.gds"}:
        failures.append("Unexpected product example output files")
    for path, expected_status, expected_reason in [
        (layout / "positive.gds", 0, None),
        (folder / "missing-junction.gds", 1, "expected one placed junction, found 0"),
        (folder / "duplicate.gds", 1, "expected one placed junction, found 2"),
        (folder / "dangling.gds", 1, "Undefined cell: UNDEFINED_CELL"),
    ]:
        status, result = run_case(checker, path)
        report["cases"][path.name] = {"exitCode": status, **result}
        if status != expected_status or (expected_reason and expected_reason not in result["failures"]):
            failures.append(f"{path.name}: got exit {status} with {result['failures']}")
    report["failures"] = failures
    raw = json.dumps(report, indent=2)
    (folder / "geometry-readback.json").write_text(raw + "\n")
    print(raw)
    return bool(failures)


if __name__ == "__main__":
    sys.exit(verify(Path(sys.argv[1])))
