"""Print deterministic MQT Bench corpus candidates without overwriting fixtures."""

from __future__ import annotations

import hashlib
import json
from importlib.metadata import version

from mqt.bench import BenchmarkLevel, get_benchmark
from qiskit import qasm2

SPECS = (
    ("ghz-3", "ghz", 3),
    ("qft-3", "qft", 3),
    ("bv-4", "bv", 4),
)


def generate() -> dict[str, object]:
    cases: list[dict[str, object]] = []
    for case_id, benchmark, circuit_size in SPECS:
        circuit = get_benchmark(
            benchmark,
            BenchmarkLevel.ALG,
            circuit_size=circuit_size,
            random_parameters=False,
        )
        qasm = f"{qasm2.dumps(circuit).rstrip()}\n"
        cases.append(
            {
                "id": case_id,
                "benchmark": benchmark,
                "circuitSize": circuit_size,
                "qubits": circuit.num_qubits,
                "depth": circuit.depth(),
                "gates": circuit.size(),
                "sha256": hashlib.sha256(qasm.encode("utf8")).hexdigest(),
                "qasm": qasm,
            }
        )
    return {
        "schemaVersion": "1.0",
        "packageVersion": version("mqt.bench"),
        "level": "ALG",
        "randomParameters": False,
        "cases": cases,
    }


if __name__ == "__main__":
    print(json.dumps(generate(), ensure_ascii=False, indent=2))
