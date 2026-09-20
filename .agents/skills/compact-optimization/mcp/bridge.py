import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[4] / "src/lib"))
from science_bridge import execute
from science_reference import reference_plan
from candidate_science import qiskit_circuit, metrics


def compute(v):
    import numpy as np
    import compactq as cq
    from qiskit import qasm2, transpile
    from qiskit.quantum_info import Operator
    original = qiskit_circuit(v)
    ir = cq.from_qiskit(original)
    # Never use Compact's own verifier as the independent acceptance gate.
    optimized_ir = cq.optimize_search(ir, verify=False, depth=v["searchDepth"], objective=v["objective"])
    optimized = cq.to_qiskit(optimized_ir)
    exported = qasm2.dumps(transpile(optimized, basis_gates=["u3", "cx"], optimization_level=0, seed_transpiler=0))
    roundtrip = qasm2.loads(exported)
    reference = reference_plan(v["referenceMode"], v["numQubits"] <= 8,
        "Independent Qiskit full unitary, fixed wire order, global phase ignored",
        "Auto full-unitary comparison selects up to 8 qubits; required requests the full reference at caller cost.")
    reported = cq.verify(ir, optimized_ir) if reference["status"] == "computed" else {"equivalent": None, "tier": None, "method": "not_run: reference policy skips upstream diagnostic too"}
    equivalent = fidelity = deviation = None
    if reference["status"] == "computed":
        a = Operator(original).data
        fidelity, deviation = float("inf"), 0.
        for candidate in (optimized, roundtrip):
            b = Operator(candidate).data
            overlap = np.vdot(a, b) / len(a)
            fidelity = min(fidelity, float(abs(overlap)**2))
            phase = overlap / abs(overlap) if abs(overlap) > 1e-15 else 1
            deviation = max(deviation, float(np.max(np.abs(a - b / phase))))
        equivalent = deviation <= 1e-8
        if not equivalent:
            raise ValueError(f"Independent full-unitary verification rejected Compact candidate (max deviation {deviation})")
    return {"original": metrics(original), "optimized": metrics(optimized),
        "optimizedOpenQasm": exported, "exportedBasis": "OpenQASM 2 u3,cx; independently checked after parsing when reference runs",
        "upstreamVerification": {"status": reference["status"], "equivalent": reported["equivalent"], "tier": reported["tier"], "method": reported["method"]},
        "reference": reference, "independentEquivalent": equivalent, "processFidelity": fidelity,
        "maxUnitaryDeviation": deviation, "commonBasis": "u,cx; optimization_level=0; no hardware routing", "globalPhaseIgnored": True}, [
        "Only unitary gates are accepted; measurements, resets, dynamic control and noise are outside this contract.",
        "Compact verification tiers are upstream diagnostics, not formal proof or OpenQuantum scientific acceptance. Known ECR/iSWAP verifier regressions are tracked separately; these gates are not exposed.",
        "The independent numerical comparison covers this complete unitary with fixed wire order up to global phase; skipped references leave an unchecked candidate.",
        "Native two-qubit gate reductions need not reduce common-basis CX count or hardware execution cost."]


execute(compute)
