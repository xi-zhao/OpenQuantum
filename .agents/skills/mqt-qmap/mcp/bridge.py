"""MQT native permutations are returned explicitly alongside routed QASM."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[4] / "src/lib"))
from science_bridge import execute


def compute(v):
    from qiskit import QuantumCircuit, transpile, qasm2
    from mqt.core import load
    from mqt.core.plugins.qiskit import mqt_to_qiskit
    from mqt.qmap.sc import Architecture, Configuration, InitialLayout, map_

    # QMAP strips idle logical wires and renumbers the remaining ones. Perform
    # that compaction explicitly so original labels survive in our contract.
    active = sorted({target for gate in v["gates"] for target in gate["targets"]})
    order = active + [q for q in range(v["numQubits"]) if q not in active]
    compact = {logical: index for index, logical in enumerate(active)}
    circuit = QuantumCircuit(len(active))
    for gate in v["gates"]:
        args = ([gate["angle"]] if "angle" in gate else []) + [compact[q] for q in gate["targets"]]
        getattr(circuit, gate["gate"].lower())(*args)
    rebased = transpile(circuit, basis_gates=["u", "cx"], optimization_level=0)
    config = Configuration()
    config.initial_layout = InitialLayout.identity
    config.add_measurements_to_mapped_circuit = False
    config.pre_mapping_optimizations = False
    config.post_mapping_optimizations = False
    architecture = Architecture(v["numPhysicalQubits"], {tuple(edge) for edge in v["coupling"]})
    native = load(rebased)
    # QMAP maps gate operations but does not retain the input global phase.
    input_phase = float(native.global_phase)
    native.global_phase = 0
    mapped, info = map_(native, architecture, config)
    if info.timeout:
        raise RuntimeError("MQT QMAP reported an incomplete mapping")
    details = info.json()

    initial = {p: mapped.initial_layout[p] for p in mapped.initial_layout}
    final = dict(initial)
    for operation in mapped:
        if operation.name == "swap":
            a, b = operation.targets
            final[a], final[b] = final[b], final[a]
    for physical in mapped.output_permutation:
        if final[physical] != mapped.output_permutation[physical]:
            raise RuntimeError("MQT output permutation disagrees with the routed SWAP network")

    def logical_mapping(permutation):
        answer = sorted([{"physical": p, "logical": order[permutation[p]]} for p in permutation if permutation[p] < v["numQubits"]], key=lambda item: item["logical"])
        if [item["logical"] for item in answer] != list(range(v["numQubits"])):
            raise RuntimeError("MQT QMAP omitted or duplicated a logical qubit in its permutation")
        return answer

    # The upstream OpenQASM 2 exporter can emit non-qelib1 names such as p.
    # Rebase single-qubit gates only, preserving the physical routing SWAPs.
    physical = transpile(mqt_to_qiskit(mapped, set_layout=False), basis_gates=["u3", "cx", "swap"], optimization_level=0)
    qasm = qasm2.dumps(physical)
    if any(line.startswith("swap ") for line in qasm.splitlines()):
        qasm = qasm.replace('include "qelib1.inc";', 'include "qelib1.inc";\ngate oq_swap a,b { cx a,b; cx b,a; cx a,b; }')
        qasm = "\n".join("oq_" + line if line.startswith("swap ") else line for line in qasm.splitlines())
    return {
        "numLogicalQubits": v["numQubits"], "numPhysicalQubits": mapped.num_qubits,
        "qasm": qasm, "globalPhaseRadians": input_phase + float(physical.global_phase),
        "initialMapping": logical_mapping(initial), "finalMapping": logical_mapping(final),
        "resources": {"inputGates": details["circuit"]["gates"], "mappedGates": details["mapped_circuit"]["gates"], "mappedCXCount": details["mapped_circuit"]["cnots"], "insertedSwaps": details["statistics"]["swaps"]},
        "method": "MQT QMAP heuristic, compacted identity placement, no pre/post optimization",
        "mappingConvention": "logical input/output qubit -> physical QASM wire; extra physical wires start in zero",
    }, [
        "QASM wires are physical wires. Apply initialMapping and finalMapping when comparing with the logical input circuit; the output permutation is not an additional executed SWAP network.",
        "Active logical wires are compacted before identity placement; idle input wires are preserved in the explicit mappings. OpenQASM 2 omits global phase; multiply its unitary by exp(i*globalPhaseRadians).",
        "Input gates are rebased to U/CX before mapping. QMAP resource counts expand routing SWAPs to CX costs, while QASM retains oq_swap macros on undirected coupling edges; lowering their internal reverse-CX direction is a subsequent hardware-basis step.",
        "Heuristic routing does not guarantee optimal gate count, latency or fidelity; the graph contains connectivity only, with no hardware calibration or execution.",
    ]


if __name__ == "__main__":
    execute(compute)
