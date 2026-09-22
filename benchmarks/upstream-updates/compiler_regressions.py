"""Bounded upgrade checks; not a runtime Validator or a compiler proof."""
import json
import runpy
import sys
from importlib.metadata import version
from pathlib import Path
from unittest.mock import patch

import numpy as np
from qiskit import QuantumCircuit
from qiskit.quantum_info import Operator
from qiskit.transpiler.preset_passmanagers import generate_preset_clifford_t_pass_manager

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "src/lib"))
captured = {}
with patch("science_bridge.execute", lambda f: captured.update(compute=f)):
    runpy.run_path(str(ROOT / ".agents/skills/compact-optimization/mcp/bridge.py"))
rows = []
# Regression mechanism documented by Qiskit PR #16735: a non-Clifford angle
# in a Clifford+T target that cannot use sx/sxdg. Check the whole operation.
input_circuit = QuantumCircuit(2)
input_circuit.h(0)
input_circuit.cx(0, 1)
input_circuit.t(0)
input_circuit.t(1)
input_circuit.x(0)
input_circuit.rz(0.3, 0)
basis = ["cx", "s", "sdg", "h", "t", "tdg", "x", "y", "z"]
for level in range(4):
    pm = generate_preset_clifford_t_pass_manager(basis_gates=basis, optimization_level=level)
    result = pm.run(input_circuit)
    assert set(result.count_ops()) <= set(basis)
    # Arbitrary-angle synthesis is approximate, using Qiskit's documented
    # equivalence tolerance, not an exact identity or hardware fidelity claim.
    assert Operator(input_circuit).equiv(Operator(result))
    rows.append({"case": "qiskit-clifford-t-no-sx", "level": level,
                 "processInfidelity": float(abs(1 - abs(np.vdot(Operator(input_circuit).data,
                     Operator(result).data) / 4) ** 2))})

# Both sides of Compact's small-circuit fast path, each supported objective,
# nonadjacent/reversed wires, signed angles and serialized QASM round trips.
for size in (16, 24, 48):
    for objective in ("2q", "depth", "gate_count"):
        rng = np.random.default_rng(2209 + size)
        gates = []
        for _ in range(size):
            gate = str(rng.choice(["H", "S", "T", "RX", "RY", "RZ", "CX", "CZ", "SWAP"]))
            targets = list(map(int, rng.choice(3, 2 if gate in ("CX", "CZ", "SWAP") else 1, replace=False)))
            instruction = {"gate": gate, "targets": targets}
            if gate in ("RX", "RY", "RZ"):
                instruction["angle"] = float(rng.uniform(-np.pi, np.pi))
            gates.append(instruction)
        result, _ = captured["compute"]({"numQubits": 3, "gates": gates,
            "searchDepth": 2, "objective": objective, "referenceMode": "required"})
        assert result["independentEquivalent"]
        assert result["maxUnitaryDeviation"] <= 1e-8
        rows.append({"case": "compact-search-roundtrip", "inputGates": size,
            "objective": objective, "maxUnitaryDeviation": result["maxUnitaryDeviation"]})
result, _ = captured["compute"]({"numQubits": 9, "gates": [],
    "searchDepth": 1, "objective": "2q", "referenceMode": "auto"})
assert result["reference"]["status"] == "not_run"
assert result["independentEquivalent"] is None
assert result["upstreamVerification"]["status"] == "not_run"
rows.append({"case": "compact-auto-reference-scope", "logicalQubits": 9,
             "reference": "not_run", "independentEquivalent": None})
print(json.dumps({"versions": {p: version(p) for p in ("compactq", "qiskit", "numpy")},
    "denominator": len(rows), "passed": len(rows), "cases": rows,
    "scientificValidation": "not_evaluated"}, indent=2))
