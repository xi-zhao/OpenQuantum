import sys
from pathlib import Path
from importlib.metadata import version
sys.path.insert(0, str(Path(__file__).resolve().parents[4] / "src/lib"))
from science_bridge import execute
from quantum_reference import circuit_unitary


def compute(v):
    import numpy as np
    import pyzx as zx
    if version("pyzx") != "0.10.6":
        raise ValueError("Unexpected PyZX version; restore the frozen environment")
    circuit = zx.Circuit(v["numQubits"])
    names = {"H": "HAD", "X": "NOT", "CX": "CNOT"}
    for instruction in v["gates"]:
        gate, targets = instruction["gate"], instruction["targets"]
        if gate == "Y":
            # ZX has X/Z primitives; ZX = iY, a harmless global phase here.
            circuit.add_gate("NOT", targets[0])
            circuit.add_gate("Z", targets[0])
        else:
            circuit.add_gate(names.get(gate, gate), *targets)
    graph = circuit.to_graph()
    zx.simplify.full_reduce(graph)
    optimized = zx.optimize.basic_optimization(zx.extract.extract_circuit(graph).to_basic_gates()).to_basic_gates()
    if optimized.qubits != v["numQubits"] or len(optimized.gates) > 8192:
        raise ValueError("Extracted circuit exceeds the output resource bound")
    converted = []
    for gate in optimized.gates:
        name = type(gate).__name__
        if isinstance(gate, zx.circuit.gates.ZPhase):
            converted.append({"gate": "RZ", "targets": [gate.target], "angle": float(gate.phase) * np.pi})
        elif isinstance(gate, zx.circuit.gates.XPhase):
            converted.append({"gate": "RX", "targets": [gate.target], "angle": float(gate.phase) * np.pi})
        elif name == "HAD":
            converted.append({"gate": "H", "targets": [gate.target]})
        elif name in ["CNOT", "CZ", "SWAP"]:
            converted.append({"gate": "CX" if name == "CNOT" else name, "targets": [gate.control, gate.target]})
        else:
            raise ValueError(f"Extracted gate lacks an independent reference: {name}")
    before = circuit_unitary(v["numQubits"], v["gates"])
    after = circuit_unitary(v["numQubits"], converted)
    overlap = np.vdot(after, before)
    phase = overlap / abs(overlap) if abs(overlap) > 1e-14 else 1
    error = float(np.max(abs(before - phase * after)))
    if error > 1e-8:
        raise ValueError(f"PyZX output failed independent unitary equivalence: {error}")
    def metrics(c):
        stats = c.stats_dict()
        return {"gates": stats["gates"], "twoQubitGates": stats["twoqubit"], "tCount": stats["tcount"]}
    return {"inputQasm": circuit.to_qasm(), "optimizedQasm": optimized.to_qasm(), "before": metrics(circuit), "after": metrics(optimized),
        "unitaryMaxError": error, "equivalenceTolerance": 1e-8, "equivalentUpToGlobalPhase": True, "bitOrder": "left-to-right q0,q1,..."}, [
        "Unitary Clifford+T circuits only; comparisons ignore global phase. Y is represented by X then Z in the emitted input QASM.",
        "Gate counts describe the emitted PyZX circuits; a rewrite may increase two-qubit gates or total gates. No hardware routing or performance guarantee.",
        "The dense comparison covers the supplied unitary, not arbitrary circuit families or central scientific acceptance."]


execute(compute)
