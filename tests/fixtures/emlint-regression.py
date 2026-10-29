"""Real public-API compatibility checks; no decoder or scientific acceptance claim."""
import hashlib
import importlib.metadata
import json
from pathlib import Path
import subprocess
import sys

import emlint
from emlint.frontends import from_stim_dem
import stim


def audit(text, names=None, **options):
    checks = {name: emlint.ALL_CHECKS[name] for name in names} if names else None
    return json.loads(emlint.format_json(emlint.check(stim.DetectorErrorModel(text), checks=checks, **options)))


def mechanisms(text):
    return [{
        "probability": item.probability,
        "detectors": sorted(item.detectors),
        "observables": sorted(item.observables),
        "decomposition_hints": [[sorted(d), sorted(o)] for d, o in item.decomposition_hints],
        "repeated_targets": list(item.repeated_targets),
    } for item in from_stim_dem(stim.DetectorErrorModel(text)).flattened()]


results = {"versions": {name: importlib.metadata.version(name) for name in ("emlint", "stim", "numpy")},
           "scientificValidation": "not_evaluated"}
duplicate_text = "error(0.1) D0 L0\nerror(0.2) D0 L0"
duplicates = audit(duplicate_text, ["duplicates"])
assert duplicates["results"][0]["passed"] is False
assert duplicates["results"][0]["severity"] == "warning"
assert duplicates["results"][0]["counter_example"]
assert duplicates["num_error_mechanisms"] == 2
results["duplicates"] = {"dem": duplicate_text, "report": duplicates}

context = {"circuit_role": "state_preparation"}
skipped = audit("error(0.1) L0", ["detectability"], context=context)
assert skipped["results"][0]["status"] == "skipped"
assert skipped["any_skipped"] is True
results["explicitly_inapplicable"] = {"context": context, "report": skipped}

input_errors = {}
for name, source in [("invalid", "error(2) D0"), ("missing_file", Path("absent.dem"))]:
    try:
        emlint.check(source)
    except (ValueError, FileNotFoundError) as error:
        input_errors[name] = {"type": type(error).__name__, "message": str(error)}
    else:
        raise AssertionError(f"{name} must not produce a successful report")
results["input_errors"] = input_errors

# Expected absolute supports are written explicitly, independently of emlint.
repeat = "repeat 2 {\n error(0.1) D0 L0\n shift_detectors 1\n}"
expanded = "error(0.1) D0 L0\nerror(0.1) D1 L0"
expected = [{"probability": 0.1, "detectors": [i], "observables": [0],
             "decomposition_hints": [], "repeated_targets": []} for i in (0, 1)]
assert mechanisms(repeat) == mechanisms(expanded) == expected
repeat_report = audit(repeat, ["detectability", "duplicates"])
expanded_report = audit(expanded, ["detectability", "duplicates"])
assert [(r["name"], r["passed"], r["status"]) for r in repeat_report["results"]] == [
    (r["name"], r["passed"], r["status"]) for r in expanded_report["results"]]
results["repeat"] = {"dem": repeat, "hand_expansion": expanded, "mechanisms": expected,
                     "report": repeat_report, "expanded_report": expanded_report}
xor_text = "error(0.1) D0 D0 D1 L0 L0"
xor = mechanisms(xor_text)
assert xor[0]["detectors"] == [1] and xor[0]["observables"] == []
assert set(xor[0]["repeated_targets"]) == {"D0", "L0"}
decomposed_text = "error(0.1) D0 ^ D1 L0"
decomposed = mechanisms(decomposed_text)
assert decomposed[0]["decomposition_hints"] == [[[0], []], [[1], [0]]]
assert decomposed[0]["detectors"] == [0, 1] and decomposed[0]["observables"] == [0]
results["target_semantics"] = {"xor_dem": xor_text, "xor": xor,
                               "decomposed_dem": decomposed_text, "decomposed": decomposed}

# Exercise every default check on an actual Stim-generated model. Warnings are
# evidence to interpret, not a zero-warning criterion or a decoding benchmark.
parameters = {"distance": 3, "rounds": 3, "after_clifford_depolarization": 0.001,
              "before_measure_flip_probability": 0.001, "after_reset_flip_probability": 0.001}
circuit = stim.Circuit.generated("surface_code:rotated_memory_x", **parameters)
surface = {"generator": "surface_code:rotated_memory_x", "parameters": parameters,
           "circuit_sha256": hashlib.sha256(str(circuit).encode()).hexdigest(), "context": {}, "models": {}}
Path("surface-code.stim").write_text(str(circuit), encoding="utf-8")
for name, decompose in [("raw", False), ("decomposed", True)]:
    text = str(circuit.detector_error_model(decompose_errors=decompose))
    Path(f"surface-code-{name}.dem").write_text(text, encoding="utf-8")
    report = audit(text)
    assert report["num_detectors"] == 24 and report["num_observables"] == 1
    assert len(report["results"]) == 10 and report["is_vacuous"] is False
    assert report["unknown_instructions"] == []
    surface["models"][name] = {"sha256": hashlib.sha256(text.encode()).hexdigest(), "report": report}
results["surface_code"] = surface

cli_cases = {
    "clean": ("error(0.1) D0 L0", ["--only", "detectability"], 0),
    "logical_fault": ("error(0.1) L0", ["--only", "detectability"], 1),
    "duplicates": (duplicate_text, ["--only", "duplicates"], 2),
    "missing_context": ("error(0.1) D0 L0", ["--only", "detectability", "--profile", "graphlike-decoder"], 2),
    "invalid": ("error(2) D0", [], 3),
    "missing_file": ("absent.dem", [], 3),
    "disabled": ("error(0.1) L0", ["--only", "detectability", "--ignore", "detectability"], 0),
}
results["cli"] = {}
for name, (source, args, expected_code) in cli_cases.items():
    completed = subprocess.run([sys.executable, "-B", "-m", "emlint.cli", "check", source,
                                "--format", "json", *args], capture_output=True, text=True, timeout=15)
    results["cli"][name] = {"input": source, "args": args, "exit_code": completed.returncode,
                            "stdout": completed.stdout, "stderr": completed.stderr}
    assert completed.returncode == expected_code, (name, completed.stdout, completed.stderr)
    if expected_code == 3:
        assert not completed.stdout.strip() and completed.stderr.strip()
    else:
        report = json.loads(completed.stdout)
        assert "disabled_checks" in report and "applied_overrides" in report
        if name == "disabled":
            assert "detectability" in report["disabled_checks"] and not report["results"]

Path("regression.json").write_text(json.dumps(results, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
