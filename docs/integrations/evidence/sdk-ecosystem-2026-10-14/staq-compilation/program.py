import json
import pystaq
text = 'OPENQASM 2.0; include "qelib1.inc"; qreg q[2]; h q[0]; cx q[0],q[1]; s q[0]; sdg q[0];'
program = pystaq.parse_str(text)
pystaq.simplify(program)
result = str(program)
assert "OPENQASM" in result
with open("result.qasm", "w") as f:
    f.write(result)
with open("result.json", "w") as f:
    json.dump({"program": result, "scientificValidation": "not_evaluated"}, f)
