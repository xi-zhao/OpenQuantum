"""Modern qdk.qre on Q# synthesized exclusively from validated gate data."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[4] / "src/lib"))
from science_bridge import execute


def qsharp_source(v):
    statements = [f"use q = Qubit[{v['numQubits']}];"]
    for gate in v["gates"]:
        targets = [f"q[{i}]" for i in gate["targets"]]
        name = gate["gate"]
        if name == "CZ":
            statements.append(f"Controlled Z([{targets[0]}], {targets[1]});")
            continue
        name = {"CX": "CNOT", "RX": "Rx", "RY": "Ry", "RZ": "Rz"}.get(name, name)
        if "angle" in gate:
            targets.insert(0, repr(float(gate["angle"])))
        statements.append(f"{name}({', '.join(targets)});")
    statements.append("ResetAll(q);")
    return "operation OpenQuantumProgram() : Unit { " + " ".join(statements) + " }"


def compute(v):
    import qdk
    from qdk import qsharp
    from qdk.qre import estimate
    from qdk.qre.application import QSharpApplication
    from qdk.qre.models import GateBased, SurfaceCode, RoundBasedFactory

    qsharp.init()
    qsharp.eval(qsharp_source(v))
    application = QSharpApplication(qdk.code.OpenQuantumProgram)
    hardware = GateBased(error_rate=v["physicalErrorRate"], gate_time=v["gateTimeNs"], measurement_time=v["measurementTimeNs"])
    table = estimate(application, hardware, isa_query=SurfaceCode.q() * RoundBasedFactory.q(), max_error=v["maxError"])
    frontier = sorted([{"physicalQubits": int(row.qubits), "runtimeNs": float(row.runtime), "errorProbability": float(row.error)} for row in table], key=lambda r: (r["physicalQubits"], r["runtimeNs"]))
    stats = table.stats
    return {
        "numQubits": v["numQubits"], "feasible": bool(frontier), "frontier": frontier,
        "search": {"traces": stats.num_traces, "instructionSets": stats.num_isas, "jobs": stats.total_jobs, "successfulEstimates": stats.successful_estimates},
        "architecture": "GateBased + SurfaceCode + RoundBasedFactory", "application": "QSharpApplication with terminal ResetAll",
    }, [
        "Model-based physical resource estimates, not measured hardware performance or a guarantee that the proposed architecture exists.",
        "Uses qdk.qre 1.32.3 default trace transforms and SurfaceCode/RoundBasedFactory query domains; the frontier is Pareto-optimal only within this enumerated design space.",
        "A terminal ResetAll is appended to release the Q# qubits; its measurement/reset work is part of the estimated application.",
        "An empty frontier means no feasible result was found in the selected model and error budget, not a proof that no implementation exists.",
    ]


if __name__ == "__main__":
    execute(compute)
