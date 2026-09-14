"""Cost-aware independent reference selection, without acceptance semantics."""


def reference_plan(mode, within_budget, method, budget_reason):
    if mode not in ("auto", "required", "skip"):
        raise ValueError("Unknown referenceMode")
    run = mode == "required" or (mode == "auto" and within_budget)
    return {
        "mode": mode,
        "status": "computed" if run else "not_run",
        "method": method,
        "reason": "Independent reference computed for this input." if run else (
            "Reference explicitly skipped by the caller." if mode == "skip" else budget_reason
        ),
    }
