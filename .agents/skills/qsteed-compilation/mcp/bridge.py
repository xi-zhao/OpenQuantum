"""QSteed basis compilation without its database-backed compiler service."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[4] / "src/lib"))
from science_bridge import execute


def compute(v):
    from quafu import QuantumCircuit
    from qsteed import Backend, Model, PassFlow, Transpiler, UnrollToBasis
    circuit = QuantumCircuit(v["numQubits"])
    for item in v["gates"]:
        args = item["targets"] + ([item["angle"]] if "angle" in item else [])
        getattr(circuit, item["gate"].lower())(*args)
    basis = ["cx", "rx", "ry", "rz"]
    backend = Backend(name="OpenQuantumOffline", qubits_num=v["numQubits"], basis_gates=basis)
    unroll = UnrollToBasis(basis_gates=basis)
    output = Transpiler(PassFlow([unroll]), Model(backend=backend)).transpile(circuit)
    gates = []
    for gate in output.gates:
        if gate.name.upper() not in ["CX", "RX", "RY", "RZ"]:
            raise ValueError("QSteed emitted a gate outside the requested basis")
        record = {"gate": gate.name.upper(), "targets": [int(q) for q in gate.pos]}
        if gate.paras:
            record["angle"] = float(gate.paras[0])
        gates.append(record)
    return {"numQubits": v["numQubits"], "inputGateCount": len(circuit.gates), "outputGateCount": len(gates),
            "gates": gates, "qasm": output.to_openqasm(), "globalPhaseRadians": float(unroll.global_phase),
            "backend": "QSteed Transpiler + UnrollToBasis; PyQuafu QuantumCircuit",
            "qubitMapping": "input qubit i remains output qubit i; no layout or routing"}, [
        "Basis decomposition only: it does not optimize a calibrated device layout, route connectivity or use the resource database.",
        "OpenQASM 2 cannot encode global phase. U_input = exp(i*globalPhaseRadians) * U_output; retain that phase when composing controlled blocks.",
        "Compiler resources are structural counts, not hardware time, fidelity or optimality claims. No scientific acceptance is declared.",
        "Uses only UnrollToBasis; the legacy 0.2.3 OneQubitGateOptimization pass is not invoked because mixed DAG node labels can fail.",
    ]


if __name__ == "__main__":
    execute(compute)
