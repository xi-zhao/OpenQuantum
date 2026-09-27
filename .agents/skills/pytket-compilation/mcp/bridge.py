"""Local pytket compiler; no execution backend or implicit qubit permutation."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[4] / "src/lib"))
from science_bridge import execute


def compute(v):
    import math
    from collections import Counter
    from pytket import Circuit
    from pytket.circuit import OpType
    from pytket.passes import FullPeepholeOptimise, AutoRebase
    from pytket.qasm import circuit_to_qasm_str

    circuit = Circuit(v["numQubits"])
    for gate in v["gates"]:
        name = {"RX": "Rx", "RY": "Ry", "RZ": "Rz"}.get(gate["gate"], gate["gate"])
        args = ([gate["angle"] / math.pi] if "angle" in gate else []) + gate["targets"]
        getattr(circuit, name)(*args)

    def resources(c):
        commands = c.get_commands()
        counts = Counter(command.op.type.name for command in commands)
        return {"gates": len(commands), "depth": c.depth(),
                "twoQubitGates": sum(len(command.qubits) == 2 for command in commands),
                "gateCounts": [{"gate": name, "count": count} for name, count in sorted(counts.items())]}

    before = resources(circuit)
    if v["optimize"]:
        FullPeepholeOptimise(allow_swaps=False).apply(circuit)
    AutoRebase({OpType.CX, OpType.Rx, OpType.Ry, OpType.Rz}).apply(circuit)
    if any(a != b for a, b in circuit.implicit_qubit_permutation().items()):
        raise ValueError("Compiler returned an unsupported implicit wire permutation")
    return {
        "numQubits": v["numQubits"], "before": before, "after": resources(circuit),
        "qasm": circuit_to_qasm_str(circuit), "globalPhaseRadians": float(circuit.phase) * math.pi,
        "nativeGates": ["CX", "Rx", "Ry", "Rz"],
        "backend": "pytket FullPeepholeOptimise + AutoRebase",
        "qubitMapping": "q[i] retains input qubit i; implicit swaps disabled",
    }, [
        "Unitary gate compilation only, without connectivity routing, calibrated error rates or hardware execution.",
        "OpenQASM 2 omits global phase. Multiply its unitary by exp(i*globalPhaseRadians) to reconstruct the compiled circuit's phase.",
        "Optimization does not guarantee fewer gates in every target basis, optimal depth, or better physical fidelity; before and after use different gate bases.",
        "No dense unitary is computed by this tool; numerical equivalence checks belong to development evidence, not scientific acceptance.",
    ]


if __name__ == "__main__":
    execute(compute)
