"""Check the complete two-qubit unitary of a small exported RZZ circuit."""
import json
from importlib.metadata import version

import numpy as np
from graphix.qasm3_exporter import circuit_to_qasm3
from graphix.transpiler import Circuit

angle = np.pi / 4
circuit = Circuit(2)
circuit.rzz(0, 1, 0.25)  # Graphix angles are multiples of pi.
qasm = circuit_to_qasm3(circuit)
unitary = np.eye(4, dtype=complex)
rz = np.diag(np.exp([-0.5j * angle, 0.5j * angle]))
cx = np.array([[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 0, 1], [0, 0, 1, 0]])
# This independent interpreter accepts only this fixture's QASM subset.
# In particular, old CRZ output must be interpreted as CRZ, not as RZZ.
gates = {
    "cx q[0], q[1];": cx,
    "rz(pi/4) q[1];": np.kron(np.eye(2), rz),
    "crz(pi/4) q[0], q[1];": np.diag([1, 1, rz[0, 0], rz[1, 1]]),
}
headers = {"OPENQASM 3;", 'include "stdgates.inc";', "qubit[2] q;"}
for line in qasm.splitlines():
    line = line.strip()
    if not line or line in headers:
        continue
    if line not in gates:
        raise ValueError(f"Unsupported QASM fixture instruction: {line}")
    unitary = gates[line] @ unitary
expected = np.diag(np.exp(-0.5j * angle * np.array([1, -1, -1, 1])))
phase = np.vdot(expected, unitary)
phase /= abs(phase)
error = float(np.max(np.abs(unitary - phase * expected)))
print(json.dumps({"graphix": version("graphix"), "numpy": version("numpy"),
                  "qasm": qasm, "angleRadians": angle, "basisStatesChecked": 4,
                  "unitaryMaxErrorUpToGlobalPhase": error,
                  "scientificValidation": "not_evaluated"}, indent=2))
assert error < 1e-12, f"Exported RZZ unitary differs: {error}"
