"""Read-only SDK upgrade diagnostics; no product pins or scientific acceptance changes."""
import json
import sys
import platform
from fractions import Fraction
from importlib.metadata import version
from pathlib import Path
import numpy as np
import pyzx as zx

repo = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parents[2]
sys.path.insert(0, str(repo / "src/lib"))
from quantum_reference import circuit_unitary

TOLERANCE = 1e-8  # Existing PyZX bridge engineering reference tolerance.
def error(actual, expected):
    overlap = np.vdot(actual, expected)
    phase = overlap / abs(overlap) if abs(overlap) > 1e-14 else 1
    return float(np.max(np.abs(expected - phase * actual)))

records = []
def record(name, observed, expected, scope):
    delta = error(observed, expected)
    records.append(dict(name=name,unitaryMaxError=delta,passed=delta <= TOLERANCE,scope=scope))

# Independent dense reference, q0 is the left tensor factor.
expected = circuit_unitary(2, [
    {"gate":"CX","targets":[1,0]}, {"gate":"CX","targets":[0,1]},
    {"gate":"RX","targets":[1],"angle":np.pi/2},
])
original = zx.Circuit(2)
original.add_gate("CNOT",1,0)
original.add_gate("CNOT",0,1)
original.add_gate("XPhase",1,phase=Fraction(1,2))
record("optimizer-input-calibration",original.to_matrix(),expected,"SDK input against independent circuit_unitary")
optimized = zx.optimize.basic_optimization(original.copy())
record("swap-remapping-XPhase",optimized.to_matrix(),expected,"public pyzx.optimize.basic_optimization")
# U3 in the QASM convention; derive its matrix without PyZX.
theta,phi,lam = np.pi/3,np.pi/5,np.pi/7
u3 = np.array([
    [np.cos(theta/2),-np.exp(1j*lam)*np.sin(theta/2)],
    [np.exp(1j*phi)*np.sin(theta/2),np.exp(1j*(phi+lam))*np.cos(theta/2)],
], dtype=complex)
c = zx.Circuit(1)
c.add_gate("U3",0,Fraction(1,3),Fraction(1,5),Fraction(1,7))
record("U3-input-calibration",c.to_matrix(),u3,"analytic U3 matrix, up to global phase")
record("U3-adjoint",c.adjoint().to_matrix(),u3.conj().T,"public Circuit.adjoint")
# Same authorized gate vocabulary and public pipeline as the current bridge;
# this is SDK-only, not a claim that the version-guarded bridge accepts the new pin.
tool = zx.Circuit(2)
for gate,args in [("CNOT",(1,0)),("CNOT",(0,1)),("HAD",(1,)),("S",(1,)),("HAD",(1,))]:
    tool.add_gate(gate,*args)
graph=tool.to_graph()
zx.simplify.full_reduce(graph)
out=zx.optimize.basic_optimization(zx.extract.extract_circuit(graph).to_basic_gates()).to_basic_gates()
record("existing-bridge-public-pipeline",out.to_matrix(),expected,"SDK pipeline only; MCP/version guard not exercised")
payload=dict(pyzx=version("pyzx"),numpy=version("numpy"),python=platform.python_version(),
    platform=platform.platform(),reference="src/lib/quantum_reference.py plus analytic 2x2 U3",
    tolerance=TOLERANCE,records=records,scientificAcceptance="not_evaluated",
    productPinsChanged=False,upstreamUrl="https://github.com/zxcalc/pyzx/releases/tag/v0.10.8")
print(json.dumps(payload,indent=2))
sys.exit(0 if all(r["passed"] for r in records) else 1)
