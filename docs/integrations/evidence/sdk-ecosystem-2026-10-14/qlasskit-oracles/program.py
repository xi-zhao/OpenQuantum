import json
from qlasskit import qlassf, Qint
from qiskit import qasm2
@qlassf
def predicate(x: Qint[3]) -> bool:
    return x == 5
program = predicate.circuit().export("circuit", "qiskit")
assert program.num_qubits >= 4
with open("program.qasm", "w") as f:
    f.write(qasm2.dumps(program) + "\n")
with open("result.json", "w") as f:
    json.dump({"qubits": program.num_qubits, "operations": dict(program.count_ops()), "scientificValidation": "not_evaluated"}, f)
