import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[4] / "src/lib"))
from science_bridge import execute
from science_reference import reference_plan
from candidate_science import qiskit_circuit


def cirq_circuit(v):
    import cirq
    q = cirq.LineQubit.range(v["numQubits"])
    # Explicit identities preserve all idle wires across the conversion.
    circuit = cirq.Circuit(cirq.I.on_each(q))
    fixed = {"H": cirq.H, "X": cirq.X, "Y": cirq.Y, "Z": cirq.Z,
             "S": cirq.S, "SDG": cirq.S**-1, "T": cirq.T, "TDG": cirq.T**-1,
             "CX": cirq.CNOT, "CZ": cirq.CZ, "SWAP": cirq.SWAP}
    for g in v["gates"]:
        gate = getattr(cirq, g["gate"].lower())(g["angle"]) if "angle" in g else fixed[g["gate"]]
        circuit.append(gate.on(*(q[i] for i in g["targets"])))
    return circuit


def compute(v):
    import cirq
    import numpy as np
    from qbraid import transpile as convert, Conversion, ConversionGraph
    from qbraid.transpiler.conversions.qiskit import qiskit_to_qasm2
    from qbraid.transpiler.conversions.cirq import cirq_to_qasm2
    from qbraid.transpiler.conversions.qasm2 import qasm2_to_cirq, qasm2_to_qiskit
    from qiskit import qasm2, transpile
    from qiskit.quantum_info import Operator
    n = v["numQubits"]
    original_qiskit = qiskit_circuit(v)
    reference = reference_plan(v["referenceMode"], n <= 8,
        "Independent Qiskit and Cirq full unitaries plus parsed OpenQASM 2; fixed wires, global phase ignored",
        "Auto full-unitary reference selects up to 8 qubits; required runs at caller cost.")
    matrices = []
    if v["direction"] == "qiskit-to-cirq":
        source, target = "qiskit", "cirq"
        converters = [Conversion(source, "qasm2", qiskit_to_qasm2), Conversion("qasm2", target, qasm2_to_cirq)]
        # qBraid's QASM route otherwise drops idle qubits.
        original_qiskit.id(range(n))
        converted = convert(original_qiskit, target,
            conversion_graph=ConversionGraph(conversions=converters))
        wires = [cirq.NamedQubit("q_" + str(i)) for i in range(n)]
        if set(converted.all_qubits()) != set(wires):
            raise ValueError("Converted circuit did not preserve the expected q[i] wire mapping")
        raw_export = str(cirq.QasmOutput(converted.all_operations(), qubits=wires, precision=17))
        parsed_export = qasm2.loads(raw_export, custom_instructions=qasm2.LEGACY_CUSTOM_INSTRUCTIONS)
        exported = qasm2.dumps(transpile(parsed_export, basis_gates=["u3", "cx"], optimization_level=0, seed_transpiler=0))
        if reference["status"] == "computed":
            matrices.append(converted.unitary(qubit_order=list(reversed(wires))))
    else:
        source, target = "cirq", "qiskit"
        def precise_cirq_to_qasm2(circuit):
            return cirq_to_qasm2(circuit, precision=17, qubit_order=cirq.LineQubit.range(n))
        converters = [Conversion(source, "qasm2", precise_cirq_to_qasm2), Conversion("qasm2", target, qasm2_to_qiskit)]
        original_cirq = cirq_circuit(v)
        converted = convert(original_cirq, target,
            conversion_graph=ConversionGraph(conversions=converters))
        if converted.num_qubits != n:
            raise ValueError("Converted circuit changed the qubit count")
        exported = qasm2.dumps(transpile(converted, basis_gates=["u3", "cx"], optimization_level=0, seed_transpiler=0))
        if reference["status"] == "computed":
            matrices.extend([original_cirq.unitary(qubit_order=list(reversed(cirq.LineQubit.range(n)))),
                             Operator(converted).data])
    equivalent = deviation = None
    if reference["status"] == "computed":
        expected = Operator(original_qiskit).data
        matrices.append(Operator(qasm2.loads(exported)).data)
        deviation = 0.0
        for actual in matrices:
            if actual.shape != expected.shape:
                raise ValueError("Exported or converted circuit changed the Hilbert space")
            overlap = np.vdot(expected, actual)
            phase = overlap / abs(overlap) if abs(overlap) > 1e-15 else 1
            deviation = max(deviation, float(np.max(np.abs(expected - actual / phase))))
        equivalent = deviation <= 1e-8
        if not equivalent:
            raise ValueError(f"Independent unitary comparison rejected conversion (deviation {deviation})")
    return {
        "numQubits": n, "direction": v["direction"], "conversionPath": [source, "qasm2", target],
        "openQasm2": exported, "wireOrder": "q[i] preserves input qubit i; comparison uses q0 as least significant bit",
        "reference": reference, "independentEquivalent": equivalent, "maxUnitaryDeviation": deviation,
        "globalPhaseIgnored": True, "cloudSubmitted": False,
    }, [
        "Only the documented unitary gate list is accepted; no measurement, reset, noise, dynamic control or arbitrary code.",
        "Only the pinned Qiskit/QASM2/Cirq conversion path is enabled; this does not establish universal format compatibility.",
        "Full-unitary comparisons cover this input up to global phase; skipped references leave equivalence unchecked.",
        "No provider is instantiated and no cloud job is submitted. Scientific acceptance remains not_evaluated."]


execute(compute)
