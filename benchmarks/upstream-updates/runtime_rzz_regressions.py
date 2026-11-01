"""Offline Runtime compatibility check through the public transpiler interface."""
import json
from importlib.metadata import version

import numpy as np
from qiskit import QuantumCircuit
from qiskit.quantum_info import Operator
from qiskit.transpiler import PassManager
from qiskit.transpiler.preset_passmanagers import generate_preset_pass_manager
from qiskit_ibm_runtime.fake_provider import FakeFractionalBackend
from qiskit_ibm_runtime.transpiler.passes import FoldRzzAngle
from qiskit_ibm_runtime.utils.utils import is_isa_circuit

backend = FakeFractionalBackend()
angles = [3 * np.pi / 4, 0, np.pi / 2, -np.pi / 2, np.pi, -np.pi,
    3 * np.pi, -3 * np.pi, 5 * np.pi, -5 * np.pi, 7 * np.pi, -7 * np.pi,
    0.1, -0.1, np.pi / 2 + 0.1, -np.pi + 0.1, 2 * np.pi + 0.1,
    2 * np.pi - 0.1, -3 * np.pi / 2 + 0.1, np.pi + 0.1,
    -12 * np.pi + 0.1, 23 * np.pi / 2 + 0.1, 11 * np.pi + 0.1, -12 * np.pi - 0.1]
rows = []
for route in ("fold-pass", "backend-preset"):
    for angle in angles:
        circuit = QuantumCircuit(2)
        circuit.rzz(angle, 0, 1)
        if route == "fold-pass":
            folded = PassManager([FoldRzzAngle()]).run(circuit)
        else:
            manager = generate_preset_pass_manager(optimization_level=2,
                backend=backend, initial_layout=[0, 1], seed_transpiler=7)
            folded = manager.run(circuit)
        # RZZ(theta) = exp(-i theta Z tensor Z / 2). Ancillas are identities.
        # Do not align away a global phase: controlled use depends on it.
        expected = np.diag(np.exp(-0.5j * angle * np.array([1, -1, -1, 1])))
        expected = np.kron(np.eye(2 ** (folded.num_qubits - 2)), expected)
        error = float(np.max(np.abs(Operator.from_circuit(folded).data - expected)))
        unsupported = sorted(set(folded.count_ops()) - backend.target.operation_names)
        rzz_angles = [float(item.operation.params[0]) for item in folded.data
                      if item.operation.name == "rzz"]
        isa_error = is_isa_circuit(folded, backend.target) if route == "backend-preset" else None
        passed = not unsupported and error < 1e-12 and not isa_error and all(
            0 <= value <= np.pi / 2 for value in rzz_angles)
        rows.append({"route": route, "angleRadians": float(angle),
            "unsupportedInstructions": unsupported, "rzzAngles": rzz_angles,
            "completeUnitaryMaxError": error, "isaError": isa_error, "passed": passed})
print(json.dumps({"versions": {p: version(p) for p in ("qiskit", "qiskit-ibm-runtime")},
    "denominator": len(rows), "passed": sum(row["passed"] for row in rows),
    "cases": rows, "scientificValidation": "not_evaluated"}, indent=2))
assert all(row["passed"] for row in rows), "RZZ target or complete-unitary regression"
