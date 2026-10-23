"""Qrisp's actual quantum arithmetic and local simulator, with exact bit labels."""
import os
import sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[4]
sys.path.insert(0, str(ROOT / "src/lib"))
from science_bridge import execute


def compute(v):
    # Keep Numba compilation caches inside the workspace, not the prepared SDK.
    os.environ["NUMBA_CACHE_DIR"] = str(ROOT / ".openquantum/cache/qrisp-numba")
    os.environ["JAX_PLATFORMS"] = "cpu"
    from qrisp import QuantumFloat, gidney_adder, h, x
    from qrisp.default_backend import QrispSimulatorBackend
    width = v["bitWidth"]
    register = QuantumFloat(width, exponent=0, signed=False)
    if v["preparation"] == "uniform":
        h(register)
    else:
        # Avoid QuantumFloat.encoder, which converts integer inputs through float64.
        for bit, value in enumerate(reversed(v["initialBits"])):
            if value == "1":
                x(register[bit])
    # The public static Gidney path extracts Python-int bits without float conversion.
    addend = int(v["addendBits"], 2)
    if addend:
        gidney_adder(addend, register)
    compiled = register.qs.compile(intended_measurements=register.reg)
    # Qrisp removes untouched |0> wires; restore them for explicit full-register measurement.
    for qubit in register.reg:
        if qubit not in compiled.qubits:
            compiled.add_qubit(qubit)
    # The public decoder hook keeps integer labels exact without floating decoding.
    register.decoder = lambda index: format(int(index), f"0{width}b")
    measurements = register.get_measurement(precompiled_qc=compiled, backend=QrispSimulatorBackend())
    outcomes = [{"bits": bits, "probability": float(probability)} for bits, probability in sorted(measurements.items())]
    return {"bitWidth": width, "outcomes": outcomes,
            "totalProbability": sum(row["probability"] for row in outcomes),
            "compiledQubits": len(compiled.qubits), "compiledDepth": int(compiled.depth()),
            "gateCounts": [{"gate": str(gate), "count": int(count)} for gate, count in sorted(compiled.count_ops().items())],
            "backend": "Qrisp QuantumFloat local simulator",
            "arithmetic": "unsigned addition modulo 2^bitWidth; most-significant bit first"}, [
        "Per-bit X preparation and the static Python-integer Gidney adder avoid QuantumFloat floating-point encoding. Addition is modular and silently wraps overflow by design. The addend is classical; this interface does not expose arbitrary user quantum programs.",
        "Uniform preparation starts from zero and applies Hadamards to all data qubits; output reports numerical local probabilities, not sampled hardware counts.",
        "Compiled counts include composite operations and are not fully decomposed hardware resource estimates. No scientific acceptance is evaluated.",
        "Qrisp is installed separately under EPL-2.0 OR GPL-2.0 WITH Classpath-exception-2.0; local compilation may write numerical-library caches.",
    ]


if __name__ == "__main__":
    execute(compute)
