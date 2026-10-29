"""Editable DEM diagnostics example; findings are not scientific acceptance."""
import hashlib
import importlib.metadata
import json
from pathlib import Path

import emlint
import stim


def run_example():
    cases = {}
    for name, (text, profile, context) in {
        "detected": ("error(0.1) D0 L0", None, {}),
        "logical_fault": ("error(0.1) L0", None, {}),
        "empty": ("detector D0\nlogical_observable L0", None, {}),
        # Missing decoder metadata is deliberate: expose the inconclusive result.
        "missing_context": ("error(0.1) D0 L0", "graphlike-decoder", {}),
    }.items():
        report = emlint.check(
            stim.DetectorErrorModel(text),
            checks={"detectability": emlint.ALL_CHECKS["detectability"]},
            profile=profile,
            context=context,
        )
        cases[name] = {
            "dem": text,
            "sha256": hashlib.sha256(text.encode()).hexdigest(),
            "context": context,
            "report": json.loads(emlint.format_json(report)),
        }
    return {
        "scope": "Small DEM structural diagnostics; not circuit or decoder verification",
        "versions": {name: importlib.metadata.version(name) for name in ("emlint", "stim", "numpy")},
        "cases": cases,
        "scientificValidation": "not_evaluated",
    }


if __name__ == "__main__":
    # Preserve existing results; run in a fresh task directory.
    with Path("result.json").open("x", encoding="utf-8") as output:
        output.write(json.dumps(run_example(), ensure_ascii=False, indent=2) + "\n")
