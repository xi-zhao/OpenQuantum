import json
import numpy as np
import cirq
import qsimcirq
qubits = cirq.LineQubit.range(3)
program = cirq.Circuit(cirq.ry(0.37)(qubits[0]), cirq.CNOT(qubits[0],qubits[2]), cirq.rz(-0.19)(qubits[1]))
simulator = qsimcirq.QSimSimulator(qsim_options=qsimcirq.QSimOptions(cpu_threads=2))
state = simulator.simulate(program, qubit_order=qubits).final_state_vector
reference = cirq.Simulator(dtype=np.complex128).simulate(program, qubit_order=qubits).final_state_vector
assert np.allclose(state, reference, atol=2e-7)
with open("result.json", "w") as f:
    json.dump({"amplitudes": [[float(v.real),float(v.imag)] for v in state], "qubitOrder": list(map(str,qubits)), "scientificValidation": "not_evaluated"}, f)
