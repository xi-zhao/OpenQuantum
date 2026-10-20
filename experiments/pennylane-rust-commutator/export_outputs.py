"""Replay saved inputs and preserve full Rust outputs separately from timing."""
import hashlib
import json
from pathlib import Path

import numpy as np
from case import canonical, compare, decode, rust_commutator

ROOT = Path(__file__).resolve().parent


def main():
    inputs = json.loads((ROOT / "results/inputs.json").read_text())
    measurements = json.loads((ROOT / "results/benchmark.json").read_text())
    expected_ids = [item["id"] for item in measurements["plan"]["cases"]]
    assert [item["id"] for item in inputs] == expected_ids, "saved input cases are incomplete or reordered"
    assert [item["id"] for item in measurements["cases"]] == expected_ids, "recorded benchmark cases are incomplete or reordered"
    expected = np.load(ROOT / "results/reference-outputs.npz")
    outputs, checks = {}, []
    for item, recorded in zip(inputs, measurements["cases"]):
        assert item["id"] == recorded["id"]
        digest = hashlib.sha256(json.dumps(item, sort_keys=True).encode()).hexdigest()
        assert digest == recorded["input_sha256"]
        wires = tuple(range(item["qubits"]))
        actual = canonical(rust_commutator(decode(item["left"], wires), decode(item["right"], wires)), wires)
        prefix = item["id"] + "_"
        reference = {(int(x), int(z)): complex(value) for x, z, value in zip(expected[prefix+"x"], expected[prefix+"z"], expected[prefix+"coefficients"])}
        check = compare(actual, reference)
        assert check["passed"], (item["id"], check)
        ordered = sorted(actual.items())
        outputs[prefix+"x"] = np.array([key[0] for key, _ in ordered], dtype=np.uint64)
        outputs[prefix+"z"] = np.array([key[1] for key, _ in ordered], dtype=np.uint64)
        outputs[prefix+"coefficients"] = np.array([value for _, value in ordered], dtype=np.complex128)
        checks.append({"case": item["id"], "input_sha256": digest, **check})
    np.savez_compressed(ROOT / "results/rust-outputs.npz", **outputs)
    (ROOT / "results/output-replay.json").write_text(json.dumps({"status": "passed", "cases": checks}, indent=2)+'\n')
    print(f"Replayed {len(checks)} saved inputs; full Rust output arrays match the retained reference.")

if __name__ == "__main__":
    main()
