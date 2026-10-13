import json
import numpy as np
from mqt.qecc.codes import CSSCode
parity = np.array([[1,1,1,1,0,0,0], [1,1,0,0,1,1,0], [1,0,1,0,1,0,1]], dtype=np.int8)
code = CSSCode(Hx=parity, Hz=parity, distance=3)
assert not np.any(parity @ parity.T % 2)
assert code.n == 7
error = np.array([1,0,0,0,0,0,0], dtype=np.int8)
syndrome = code.get_z_syndrome(error)
assert np.array_equal(syndrome, parity @ error % 2)
with open("result.json", "w") as f:
    json.dump({"physicalQubits": code.n, "syndrome": syndrome.tolist(), "scientificValidation": "not_evaluated"}, f)
