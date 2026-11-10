"""Editable public PPVM program; run in a new task directory after explicit setup."""
import importlib.metadata
import json
import math
from pathlib import Path

from ppvm import GeneralizedTableau, MeasurementResult, PauliSum

theta, gamma, seed = 0.73, 0.23, 20261110
# Physical order: Rx(theta), then amplitude damping. Heisenberg order reverses both.
observable = PauliSum.new(1, ["Z"])
observable.amplitude_damping(0, gamma)
observable.rx(0, theta)
expectation = observable.overlap_with_zero()
reference = gamma + (1 - gamma) * math.cos(theta)
assert abs(expectation - reference) < 1e-10

state = GeneralizedTableau(2, seed=seed)
state.h(0)
state.cnot(0, 1)
bell_zz = state.expectation("ZZ")
assert abs(bell_zz - 1) < 1e-10
state.loss_channel(1, 1.0)
state.reset_state(1)
lost = state.measure(1)
assert lost == MeasurementResult.LOST
state.reset(1)
restored = state.measure(1)
assert restored == MeasurementResult.ZERO

result = {
    "upstreamVersion": importlib.metadata.version("bloqade-ppvm"),
    "parameters": {"theta": theta, "amplitudeDamping": gamma, "seed": seed},
    "zAfterRxAndDamping": expectation,
    "analyticReference": reference,
    "bellZZ": bell_zz,
    "afterStateOnlyReset": lost.name,
    "afterFullReset": restored.name,
    "scope": "small public-API checks; not a hardware or performance benchmark",
    "scientificValidation": "not_evaluated",
}
with Path("result.json").open("x", encoding="utf-8") as output:
    output.write(json.dumps(result, indent=2) + "\n")
