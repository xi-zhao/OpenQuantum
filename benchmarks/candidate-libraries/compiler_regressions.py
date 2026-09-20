"""Finite development regressions, not a runtime Validator or compiler proof."""
import hashlib
import json
from pathlib import Path
from unittest.mock import patch
import runpy
import sys
import numpy as np
import compactq as cq
from qiskit import QuantumCircuit, transpile
from qiskit.quantum_info import Operator
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "src/lib"))
rows = []
source = Path(__file__).parent / "cleitonforge"
provenance = json.loads((source / "provenance.json").read_text())
for filename, record in provenance["files"].items():
    assert hashlib.sha256((source/filename).read_bytes()).hexdigest() == record["sha256"]
    if not filename.endswith(".json"): continue
    case = json.loads((source/filename).read_text())
    circuit = QuantumCircuit(case["num_qubits"])
    for gate in case["gates"]:
        getattr(circuit, gate["gate"])(*gate["params"], *gate["qubits"])
    for level in [2,3]:
        candidate = transpile(circuit, basis_gates=["rz","sx","x","cx"], optimization_level=level, seed_transpiler=11)
        a,b=Operator(circuit).data,Operator(candidate).data
        fidelity=float(abs(np.vdot(a,b)/len(a))**2)
        infidelity=abs(1-fidelity)
        # Small-CP fixture is documented numerical tolerance, not a soundness failure.
        tolerance=1e-8 if "small-angle" in filename else 1e-12
        assert infidelity <= tolerance, (filename, level, infidelity)
        rows.append({"case":case["id"],"level":level,"processInfidelity":infidelity,"tolerance":tolerance})
# Positive and negative controls for the independent complete-unitary oracle.
a=QuantumCircuit(2);a.cz(0,1)
b=QuantumCircuit(2)
assert not Operator(a).equiv(Operator(b))  # Same |00> output, different complete operation.
phase=a.copy();phase.global_phase=0.7
assert Operator(a).equiv(Operator(phase))
rows.append({"case":"oracle-controls","detectsHiddenCZ":True,"ignoresGlobalPhase":True})
for gate in ["ecr","iswap"]:
    a=QuantumCircuit(3);getattr(a,gate)(0,1)
    b=QuantumCircuit(3);getattr(b,gate)(1,2)
    reported=cq.verify(cq.from_qiskit(a),cq.from_qiskit(b))
    assert reported["equivalent"] is True  # Known defect in the deliberately pinned upstream.
    assert not Operator(a).equiv(Operator(b))
    rows.append({"case":f"compact-{gate}-wire-false-positive","upstreamTier":reported["tier"],"independentEquivalent":False})
# Exercise the actual adapter's rejection, even when the upstream reports success.
captured={}
with patch("science_bridge.execute",lambda function:captured.update(compute=function)):
    runpy.run_path(str(ROOT/".agents/skills/compact-optimization/mcp/bridge.py"))
wrong=QuantumCircuit(2);wrong.cz(0,1)
with patch.object(cq,"optimize_search",return_value=cq.from_qiskit(wrong)), patch.object(cq,"verify",return_value={"equivalent":True,"tier":2,"method":"injected-upstream-false-positive"}):
    try:
        captured["compute"]({"numQubits":2,"gates":[],"searchDepth":2,"objective":"2q","referenceMode":"required"})
        raise AssertionError("Adapter accepted a wrong candidate")
    except ValueError as error:
        assert "verification rejected" in str(error)
rows.append({"case":"adapter-independent-rejection","rejectedWrongUnitary":True})
print(json.dumps({"scope":"fixed development regression corpus","denominator":len(rows),"passed":len(rows),"scientificValidation":"not_evaluated","cases":rows},indent=2))
