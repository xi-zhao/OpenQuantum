import json
from pecos import Qasm, sim, state_vector
text = 'OPENQASM 2.0; include "qelib1.inc"; qreg q[2]; creg c[2]; x q[0]; cx q[0],q[1]; measure q -> c;'
results = sim(Qasm(text)).qubits(2).quantum(state_vector()).seed(17).run(12)
records = results.to_dict()
assert records["c"] == [3]*12
with open("program.qasm", "w") as f:
    f.write(text + "\n")
with open("result.json", "w") as f:
    json.dump({"records": records, "scientificValidation": "not_evaluated"}, f)
