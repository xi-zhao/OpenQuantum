import json
from mqt import debugger
program = 'OPENQASM 2.0; include "qelib1.inc"; qreg q[3]; h q[0]; cx q[0],q[1]; rz(0.31) q[2];'
state = debugger.create_ddsim_simulation_state()
state.load_code(program)
state.run_simulation()
assert state.get_num_qubits() == 3
vector = state.get_state_vector_full()
assert vector.num_states == 8
assert abs(sum(v.real**2 + v.imaginary**2 for v in vector.amplitudes) - 1) < 1e-10
with open("program.qasm", "w") as f:
    f.write(program + "\n")
with open("result.json", "w") as f:
    json.dump({"amplitudes": [[v.real,v.imaginary] for v in vector.amplitudes], "scientificValidation": "not_evaluated"}, f)
