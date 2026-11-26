"""Editable five-qubit erasure recovery example using the upstream Python API."""
from dataclasses import asdict
import json
import os
from pathlib import Path
import sys

root = Path(os.environ.get("OPENQUANTUM_ROOT") or Path(__file__).resolve().parents[4])
sys.path.insert(0, str(root / "src/lib"))
from sdk_bootstrap import prepare_sdk

prepare_sdk("erasure-recovery")
from verification import compiler

CHOI = ("+IXZZXI", "+IIXZZX", "+IXIXZZ", "+IZXIXZ", "+XXXXXX", "+ZZZZZZ")
LINE = [(0, 1, 1), (1, 2, 1), (2, 3, 1), (3, 4, 1)]


def main():
    cases = [
        ("line", (0, 4), LINE, ()),
        ("triangle", (0, 4), [*LINE, (1, 3, 1)], ()),
        ("uncorrectable", (0, 1, 3), LINE, ()),
        ("removed", (1, 3), LINE, ()),
        ("fresh_relays", (1, 3), LINE, (1, 3)),
    ]
    results = {}
    for name, erased, hardware, relays in cases:
        case = {"erased": erased, "hardware": hardware, "output": 2, "relay_erased": relays}
        try:
            recovery = compiler.compile_recovery(CHOI, **case)
        except compiler.NoRecovery as error:
            case["no_recovery"] = str(error)
        else:
            case["recovery"] = asdict(recovery)
        results[name] = case
    source = Path(compiler.__file__).resolve().parents[1] / "openquantum-source.json"
    record = json.loads(source.read_text(encoding="utf-8"))
    payload = {"choi": CHOI, "cases": results, "upstreamRevision": record["revision"],
               "compilerSha256": record["files"]["verification/compiler.py"], "scientificValidation": "not_evaluated"}
    with Path("result.json").open("x", encoding="utf-8") as output:
        json.dump(payload, output, indent=2, default=str)
        output.write("\n")


if __name__ == "__main__":
    main()
