"""Generate a candidate v2 corpus on stdout; never overwrite accepted fixtures."""
import hashlib
import importlib
import inspect
import json
from importlib.metadata import version

from mqt.bench import BenchmarkLevel, get_benchmark
from qiskit import qasm2
from qiskit.quantum_info import Operator

FAMILIES = ("ghz", "qft", "bv", "wstate", "dj", "grover", "qaoa")
SIZES = (3, 5, 7)


def generate():
    cases = []
    for family in FAMILIES:
        for size in SIZES:
            factory = importlib.import_module(f"mqt.bench.benchmarks.{family}").create_circuit
            options = {"seed": 17} if "seed" in inspect.signature(factory).parameters else {}
            circuit = get_benchmark(family, BenchmarkLevel.ALG, circuit_size=size, random_parameters=False, **options)
            assignments = {parameter: 0.17 * (index + 1) for index, parameter in enumerate(sorted(circuit.parameters, key=str))}
            if assignments:
                circuit = circuit.assign_parameters(assignments)
            qasm = qasm2.dumps(circuit).rstrip() + "\n"
            # Parsing must preserve the program's native numerical unitary (up to
            # the separately recorded global phase) after final measurements.
            restored = qasm2.loads(qasm, custom_instructions=qasm2.LEGACY_CUSTOM_INSTRUCTIONS)
            assert restored.num_qubits == circuit.num_qubits
            assert Operator(circuit.remove_final_measurements(inplace=False)).equiv(Operator(restored.remove_final_measurements(inplace=False)))
            cases.append({"id": f"{family}-{size}", "benchmark": family, "circuitSize": size,
                          "fixture": f"fixtures/{family}-{size}.qasm", "sha256": hashlib.sha256(qasm.encode()).hexdigest(),
                          "expected": {"qubits": circuit.num_qubits, "depth": circuit.depth(), "gates": circuit.size()},
                          "globalPhase": float(circuit.global_phase), "parameterAssignments": {str(p): value for p, value in assignments.items()}, "qasm": qasm})
    return {"schemaVersion": "1.0", "id": "openquantum-mqtbench-corpus", "version": "2.0.0",
            "generator": {"package": "mqt.bench", "packageVersion": version("mqt.bench"), "pythonVersion": "3.12", "level": "ALG", "randomParameters": False, "seed": 17, "serialization": "OpenQASM 2"},
            "denominator": {"caseCount": len(cases), "caseIds": [item["id"] for item in cases]}, "cases": cases}


if __name__ == "__main__":
    print(json.dumps(generate(), indent=2))
