"""Local arithmetic bloq accounting with explicit T-equivalent weights."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[4] / "src/lib"))
from science_bridge import execute, json_integer


def make_bloq(v):
    from qualtran import QUInt
    from qualtran.bloqs.arithmetic import Add, LessThanConstant
    from qualtran.bloqs.basic_gates import CSwap
    if v["operation"] == "add":
        return Add(QUInt(v["bitsize"]))
    if v["operation"] == "less_than_constant":
        return LessThanConstant(v["bitsize"], v["constant"])
    return CSwap(v["bitsize"])


def compute(v):
    import attrs
    from qualtran.resource_counting import get_cost_value, QECGatesCost, QubitCount
    bloq = make_bloq(v)
    gates = get_cost_value(bloq, QECGatesCost())
    costs = v["tCosts"]
    total = gates.total_t_count(ts_per_toffoli=costs["toffoli"], ts_per_cswap=costs["controlledSwap"], ts_per_and_bloq=costs["temporaryAnd"], ts_per_rotation=costs["rotation"])
    return {
        "operation": v["operation"], "bitsize": v["bitsize"], "qubitCount": json_integer(get_cost_value(bloq, QubitCount())),
        "tEquivalentCount": json_integer(total), "gateCounts": {k: json_integer(n) for k, n in attrs.asdict(gates).items()},
        "model": "Qualtran QECGatesCost and QubitCount",
    }, [
        "Qualtran is beta software; these counts depend on its pinned library decomposition and accounting conventions.",
        "T-equivalent cost is a weighted accounting model. Default 4-T Toffoli/controlled-swap/temporary-AND costs are not an ancilla-free unitary 7-T synthesis claim.",
        "QubitCount is Qualtran's decomposition resource metric, including workspace where modeled; it is not a physical qubit estimate or a schedule optimization.",
        "No dense circuit, physical error-correction model, magic-state-factory layout or hardware execution is computed.",
    ]


if __name__ == "__main__":
    execute(compute)
