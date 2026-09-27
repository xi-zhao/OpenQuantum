"""Kaiwu Community symbolic model construction, without the enterprise package."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[4] / "src/lib"))
from science_bridge import execute


def compute(v):
    import numpy as np
    from kaiwu.core import Binary, BinaryExpression, QuboModel, get_val, qubo_matrix_to_ising_matrix

    names = [f"x_{i}" for i in range(len(v["linear"]))]
    variables = [Binary(name) for name in names]
    objective = BinaryExpression({}, v["offset"])
    for variable, bias in zip(variables, v["linear"]):
        objective += bias * variable
    for pair in v["quadratic"]:
        objective += pair["bias"] * variables[pair["i"]] * variables[pair["j"]]
    residuals, expression = [], objective
    for constraint in v["constraints"]:
        residual = BinaryExpression({}, -constraint["rhs"])
        for variable, coefficient in zip(variables, constraint["coefficients"]):
            residual += coefficient * variable
        residuals.append(residual)
        expression = expression + constraint["penalty"] * residual**2
    model = QuboModel(expression)
    active_matrix = model.get_matrix()
    active_variables = model.get_variables()
    # Preserve caller variable order and unused variables; SDK drops zero coefficients.
    matrix = np.zeros((len(names), len(names)))
    lookup = {name: i for i, name in enumerate(names)}
    for first, i in active_variables.items():
        for second, j in active_variables.items():
            matrix[lookup[first], lookup[second]] = active_matrix[i, j]
    offset = float(model.make().offset)
    ising, conversion_bias = qubo_matrix_to_ising_matrix(matrix)
    if not np.isfinite(matrix).all() or not np.isfinite(ising).all() or not np.isfinite(offset + conversion_bias):
        raise ValueError("Kaiwu model coefficients overflowed finite arithmetic")
    evaluations = []
    for values in v["assignments"]:
        assignment = dict(zip(names, values))
        residual_values = [float(get_val(item, assignment)) for item in residuals]
        evaluations.append({
            "values": values, "objective": float(get_val(objective, assignment)),
            "constraintResiduals": residual_values,
            "penaltyEnergy": sum(c["penalty"] * r**2 for c, r in zip(v["constraints"], residual_values)),
            "energy": float(get_val(model.make(), assignment)),
        })
    return {
        "variableNames": names, "quboMatrix": matrix.tolist(), "quboOffset": offset,
        "isingMatrix": ising.tolist(), "isingOffset": offset + float(conversion_bias),
        "isingConvention": "E(x) = -s^T J s + isingOffset; s_i=2*x_i-1, final auxiliary spin=+1",
        "evaluations": evaluations, "backend": "kaiwu.core.QuboModel + qubo_matrix_to_ising_matrix",
    }, [
        "Only the Apache-2.0 Kaiwu Community modeling package is used. No enterprise license, proprietary optimizer, telemetry or hardware submission is invoked.",
        "QUBO energy is x^T Q x + quboOffset; off-diagonal Q entries are counted exactly as returned, without an extra factor of two.",
        "The SDK uses an augmented symmetric Ising matrix and a negative Hamiltonian sign. Fix the final auxiliary spin to +1 and use s_i=2*x_i-1.",
        "Equality constraints contribute penalty*(a.x-rhs)^2. Caller chooses penalty strengths; finite penalties do not prove that an optimum is feasible.",
        "This action constructs and evaluates models, it does not solve them or certify scientific acceptance.",
    ]


if __name__ == "__main__":
    execute(compute)
