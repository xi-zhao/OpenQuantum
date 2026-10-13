import json
from tqec import Basis, compile_block_graph, NoiseModel
from tqec.gallery import memory
def main():
    records = []
    for basis in (Basis.X, Basis.Z):
        graph = memory(observable_basis=basis)
        compiled = compile_block_graph(graph)
        for k in (1,2):
            circuit = compiled.generate_stim_circuit(k=k, noise_model=NoiseModel.uniform_depolarizing(0.001))
            assert circuit.num_detectors > 0
            assert circuit.num_observables == 1
            filename = f"memory-{basis.value}-{k}.stim"
            with open(filename, "w") as f:
                f.write(str(circuit))
            records.append({"basis": str(basis), "k": k, "detectors": circuit.num_detectors, "qubits": circuit.num_qubits})
    with open("result.json", "w") as f:
        json.dump({"circuits": records, "scientificValidation": "not_evaluated"}, f)

if __name__ == "__main__":
    main()
