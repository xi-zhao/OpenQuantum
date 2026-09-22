"""CPU-only contract checks for an isolated, fixed FlagQuantum SDK commit."""
import json
from importlib.metadata import version
import flagquantum as fq

rows = []
def rejected(label, action, expected_type, message):
    try:
        action()
    except expected_type as error:
        assert message in str(error), (label, str(error))
        rows.append({"case": label, "status": "rejected", "errorType": type(error).__name__,
                     "message": str(error)})
    else:
        raise AssertionError(label + " was accepted")

for label, value in (("bool", True), ("string", "0.3"), ("complex", 0.3j)):
    rejected("angle-" + label, lambda: fq.Circuit(1).ry(0, value), TypeError, "real number")
for label, value in (("bool", True), ("empty-string", ""), ("bytes", b"0"), ("float", 0.5)):
    rejected("wire-" + label, lambda: fq.probabilities(wires=value), TypeError, "wire")
ir = fq.Circuit(1).to_ir()
payload = ir.to_dict()
payload["dtype"] = "float32"
rejected("ir-real-dtype", lambda: type(ir).from_dict(payload), ValueError, "complex64")
bell = fq.Circuit(2).h(0).cx(0, 1)
result = fq.run(bell, options=fq.ExecutionOptions(device="cpu"), outputs=fq.probabilities())
values = result.measurements[0].value.flatten().tolist()
assert max(abs(a-b) for a,b in zip(values, [0.5, 0, 0, 0.5])) < 1e-6
assert result.accuracy.metric == "not_measured"
rows.append({"case": "bell-probabilities", "values": values, "accuracyMetric": result.accuracy.metric})
# A deliberately impossible budget must be refused. This is a public budget
# rejection check, not a measurement of the native contraction's peak memory.
try:
    fq.run(bell, options=fq.ExecutionOptions(mode="tensor_network", device="cpu", memory_limit_bytes=1),
           outputs=fq.probabilities())
except ValueError as error:
    message = str(error)
    assert "max_intermediate_bytes=1" in message and "cannot hold" in message, message
    rows.append({"case": "impossible-tn-budget", "status": "rejected",
                 "errorType": type(error).__name__, "message": message})
else:
    raise AssertionError("A one-byte tensor-network budget was accepted")
print(json.dumps({"versions": {p: version(p) for p in ("flagquantum", "flagquantum-mcp-server", "torch")},
    "denominator": len(rows), "passed": len(rows), "cases": rows,
    "scope": "isolated SDK commit; CPU contract checks, no native peak-memory measurement or hardware submission",
    "scientificValidation": "not_evaluated"}, indent=2))
