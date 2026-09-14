import { createHash } from "node:crypto";

const VARIABLE_ID = /^[A-Za-z][A-Za-z0-9_]*$/;
const TOLERANCE = 1e-9;

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function finiteNumber(value, field) {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value)
  ) {
    throw new TypeError(
      `${field} must be a finite number`,
    );
  }
  return Object.is(value, -0) ? 0 : value;
}

function exactKeys(value, allowed, field) {
  if (!isRecord(value) || Object.keys(value).some((key) => !allowed.has(key))) {
    throw new TypeError(`${field} is invalid`);
  }
}

function variableIndex(value, indices, field) {
  if (typeof value !== "string" || !indices.has(value)) {
    throw new TypeError(`${field} must reference a declared variable`);
  }
  return indices.get(value);
}

function normalizeLinearTerms(value, indices, field) {
  if (value === undefined) return Array(indices.size).fill(0);
  if (!Array.isArray(value)) {
    throw new TypeError(`${field} must be an array`);
  }
  const coefficients = Array(indices.size).fill(0);
  for (const [termIndex, term] of value.entries()) {
    exactKeys(term, new Set(["variable", "coefficient"]), `${field}[${termIndex}]`);
    const index = variableIndex(term.variable, indices, `${field}[${termIndex}].variable`);
    coefficients[index] += finiteNumber(
      term.coefficient,
      `${field}[${termIndex}].coefficient`,
    );
  }
  return coefficients;
}

function normalizeObjective(value, variables, indices) {
  exactKeys(
    value,
    new Set(["sense", "linear", "quadratic", "constant"]),
    "model.objective",
  );
  if (!new Set(["minimize", "maximize"]).has(value.sense)) {
    throw new TypeError("model.objective.sense must be minimize or maximize");
  }
  const linear = normalizeLinearTerms(value.linear, indices, "model.objective.linear");
  const quadraticValue = value.quadratic ?? [];
  if (!Array.isArray(quadraticValue)) {
    throw new TypeError("model.objective.quadratic has too many terms");
  }
  const quadratic = Array.from({ length: variables.length }, () =>
    Array(variables.length).fill(0),
  );
  for (const [termIndex, term] of quadraticValue.entries()) {
    exactKeys(
      term,
      new Set(["left", "right", "coefficient"]),
      `model.objective.quadratic[${termIndex}]`,
    );
    let left = variableIndex(
      term.left,
      indices,
      `model.objective.quadratic[${termIndex}].left`,
    );
    let right = variableIndex(
      term.right,
      indices,
      `model.objective.quadratic[${termIndex}].right`,
    );
    if (left > right) [left, right] = [right, left];
    quadratic[left][right] += finiteNumber(
      term.coefficient,
      `model.objective.quadratic[${termIndex}].coefficient`,
    );
  }
  return {
    sense: value.sense,
    linear,
    quadratic,
    constant:
      value.constant === undefined ? 0 : finiteNumber(value.constant, "model.objective.constant"),
  };
}

function normalizeConstraints(value, variables, indices) {
  if (value === undefined) return [];
  if (!Array.isArray(value)) {
    throw new TypeError("model.constraints must be an array");
  }
  const ids = new Set();
  return value.map((constraint, constraintIndex) => {
    const field = `model.constraints[${constraintIndex}]`;
    exactKeys(
      constraint,
      new Set(["id", "terms", "relation", "rhs", "penalty"]),
      field,
    );
    if (
      typeof constraint.id !== "string" ||
      !VARIABLE_ID.test(constraint.id) ||
      ids.has(constraint.id)
    ) {
      throw new TypeError(`${field}.id must be unique and identifier-like`);
    }
    ids.add(constraint.id);
    if (constraint.relation !== "eq") {
      throw new TypeError(`${field}.relation must be eq; inequalities require explicit slack modeling`);
    }
    const coefficients = normalizeLinearTerms(constraint.terms, indices, `${field}.terms`);
    if (coefficients.every((coefficient) => Math.abs(coefficient) <= TOLERANCE)) {
      throw new TypeError(`${field}.terms must contain a non-zero coefficient`);
    }
    const penalty = finiteNumber(constraint.penalty, `${field}.penalty`);
    if (penalty <= 0) throw new TypeError(`${field}.penalty must be positive`);
    return {
      id: constraint.id,
      coefficients,
      relation: "eq",
      rhs: finiteNumber(constraint.rhs, `${field}.rhs`),
      penalty,
    };
  });
}

function normalizeModel(value) {
  exactKeys(value, new Set(["variables", "objective", "constraints"]), "model");
  if (
    !Array.isArray(value.variables) ||
    value.variables.length < 1 ||
    value.variables.some((variable) => typeof variable !== "string" || !VARIABLE_ID.test(variable)) ||
    new Set(value.variables).size !== value.variables.length
  ) {
    throw new TypeError(
      "model.variables must contain unique identifier-like names",
    );
  }
  const variables = [...value.variables];
  const indices = new Map(variables.map((variable, index) => [variable, index]));
  return {
    variables,
    objective: normalizeObjective(value.objective, variables, indices),
    constraints: normalizeConstraints(value.constraints, variables, indices),
  };
}

function objectiveValue(model, assignment) {
  let value = model.objective.constant;
  for (let i = 0; i < assignment.length; i += 1) {
    value += model.objective.linear[i] * assignment[i];
    for (let j = i; j < assignment.length; j += 1) {
      value += model.objective.quadratic[i][j] * assignment[i] * assignment[j];
    }
  }
  return value;
}

function residuals(model, assignment) {
  return model.constraints.map((constraint) => ({
    id: constraint.id,
    value:
      constraint.coefficients.reduce(
        (total, coefficient, index) => total + coefficient * assignment[index],
        0,
      ) - constraint.rhs,
  }));
}

function quboValue(qubo, assignment) {
  let value = qubo.constant;
  for (let i = 0; i < assignment.length; i += 1) {
    value += qubo.linear[i] * assignment[i];
    for (let j = 0; j < assignment.length; j += 1) {
      value += qubo.quadratic[i][j] * assignment[i] * assignment[j];
    }
  }
  return value;
}

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (isRecord(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function assignmentRecord(model, bits, value) {
  return {
    values: Object.fromEntries(model.variables.map((variable, index) => [variable, bits[index]])),
    bitVector: bits,
    value,
  };
}

const exactInteger = value => value <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(value) : value.toString();

function enumerate(model, qubo) {
  let assignmentCount = 0n, feasibleAssignmentCount = 0n;
  let compilationMaxError = 0, compiledMinimum = Infinity, bestFeasibleCost = Infinity;
  let compiledRows = [], feasibleRows = [];
  const scale = model.objective.sense === "minimize" ? 1 : -1;
  for (let mask = 0n; mask < (1n << BigInt(model.variables.length)); mask += 1n) {
    const bits = model.variables.map((_, i) => Number((mask >> BigInt(model.variables.length - i - 1)) & 1n));
    const objective = objectiveValue(model, bits);
    const constraintResiduals = residuals(model, bits);
    const expected = scale * objective + model.constraints.reduce((sum, constraint, i) => sum + constraint.penalty * constraintResiduals[i].value ** 2, 0);
    const compiled = quboValue(qubo, bits);
    if (![objective, expected, compiled].every(Number.isFinite)) throw new Error("QUBO arithmetic exceeded finite numeric representation");
    compilationMaxError = Math.max(compilationMaxError, Math.abs(compiled - expected));
    assignmentCount += 1n;
    const row = { bits, objective, compiled, constraintResiduals };
    if (compiled < compiledMinimum) {
      if (compiledMinimum - compiled > TOLERANCE) compiledRows = [];
      compiledMinimum = compiled;
    }
    if (Math.abs(compiled - compiledMinimum) <= TOLERANCE) compiledRows.push(row);
    if (constraintResiduals.every(item => Math.abs(item.value) <= TOLERANCE)) {
      feasibleAssignmentCount += 1n;
      const cost = scale * objective;
      if (cost < bestFeasibleCost) {
        if (bestFeasibleCost - cost > TOLERANCE) feasibleRows = [];
        bestFeasibleCost = cost;
      }
      if (Math.abs(cost - bestFeasibleCost) <= TOLERANCE) feasibleRows.push(row);
    }
  }
  compiledRows = compiledRows.filter(row => Math.abs(row.compiled - compiledMinimum) <= TOLERANCE);
  feasibleRows = feasibleRows.filter(row => Math.abs(scale * row.objective - bestFeasibleCost) <= TOLERANCE);
  return {
    assignmentCount: exactInteger(assignmentCount), feasibleAssignmentCount: exactInteger(feasibleAssignmentCount), compiledMinimum,
    compiledAssignments: compiledRows.map(row => assignmentRecord(model, row.bits, row.compiled)),
    feasibleOptimum: feasibleRows.length ? { objectiveValue: scale * bestFeasibleCost, assignments: feasibleRows.map(row => assignmentRecord(model, row.bits, row.objective)) } : null,
    penaltySufficient: feasibleRows.length > 0 && compiledRows.every(row => row.constraintResiduals.every(item => Math.abs(item.value) <= TOLERANCE)),
    compilationMaxError,
  };
}

function buildQubo(model) {
  const scale = model.objective.sense === "minimize" ? 1 : -1;
  const quadratic = model.objective.quadratic.map((row) =>
    row.map((coefficient) => scale * coefficient),
  );
  const linear = model.objective.linear.map((coefficient) => scale * coefficient);
  let constant = scale * model.objective.constant;
  for (const constraint of model.constraints) {
    constant += constraint.penalty * constraint.rhs ** 2;
    for (let i = 0; i < model.variables.length; i += 1) {
      const left = constraint.coefficients[i];
      linear[i] +=
        constraint.penalty * (left ** 2 - 2 * constraint.rhs * left);
      for (let j = i + 1; j < model.variables.length; j += 1) {
        quadratic[i][j] +=
          2 * constraint.penalty * left * constraint.coefficients[j];
      }
    }
  }
  for (const [field, values] of [
    ["quadratic", quadratic.flat()],
    ["linear", linear],
    ["constant", [constant]],
  ]) {
    if (values.some((value) => !Number.isFinite(value))) {
      throw new TypeError(`compiled ${field} exceeds finite numeric representation`);
    }
  }
  return { quadratic, linear, constant };
}

export function compileBinaryLinearModel(value, { referenceMode = "auto" } = {}) {
  if (!["auto", "required", "skip"].includes(referenceMode)) throw new TypeError("Invalid referenceMode");
  const model = normalizeModel(value);
  const coefficients = buildQubo(model);
  const qubo = {
    variableOrder: [...model.variables],
    ...coefficients,
  };
  const runReference = referenceMode === "required" || (referenceMode === "auto" && model.variables.length <= 12);
  const reference = {
    mode: referenceMode, status: runReference ? "computed" : "not_run",
    reason: runReference ? "All binary assignments independently replayed." : "Exhaustive replay omitted; required attempts it at the requested size.",
    ...(runReference ? enumerate(model, qubo) : { assignmentCount: null, feasibleAssignmentCount: null, compiledMinimum: null, compiledAssignments: null, feasibleOptimum: null, penaltySufficient: null, compilationMaxError: null }),
  };
  return {
    schemaVersion: "1.0",
    model,
    qubo: {
      ...qubo,
      sha256: createHash("sha256").update(canonicalJson(qubo)).digest("hex"),
    },
    reference,
  };
}
