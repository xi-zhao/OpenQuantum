import json
from monoprop import PauliPropagator, ExpGate, Circuit, PauliOperator, Pauli
observable = PauliOperator({"ZZ": 1.0}, num_qubits=2)
generator = PauliOperator({Pauli("X", 0): 1.0}, num_qubits=2)
program = Circuit(gates=[ExpGate(generator)], system_size=2, parameters=[0.23])
propagator = PauliPropagator.from_circuit(program, observable, cutoff=16)
evolved = propagator.evolved_operator()
with open("result.json", "w") as f:
    json.dump({"evolvedOperator": str(evolved), "parameter": 0.23, "scientificValidation": "not_evaluated"}, f)
