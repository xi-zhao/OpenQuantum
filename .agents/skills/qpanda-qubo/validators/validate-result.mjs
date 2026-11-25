import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";
import { validateJsonWithSchema } from "../../../skill-contracts/index.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const tolerance = 1e-9;
const near = (a, b) => Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= tolerance;
const finite = x => { if (!Number.isFinite(x)) throw new TypeError("QUBO arithmetic must remain finite"); return x; };
const zeros = n => Array.from({ length: n }, () => Array(n).fill(0));
const dot = (a, b) => finite(a.reduce((s, x, i) => s + x * b[i], 0));
const canonical = v => Array.isArray(v) ? `[${v.map(canonical).join(",")}]` : v && typeof v === "object"
  ? `{${Object.keys(v).sort().map(k => `${JSON.stringify(k)}:${canonical(v[k])}`).join(",")}}` : JSON.stringify(v);
const digest = value => createHash("sha256").update(canonical(value)).digest("hex");
const validBits = (bits, n) => Array.isArray(bits) && bits.length === n && bits.every(x => x === 0 || x === 1);
const assignmentSet = rows => new Set(rows.map(bits => bits.join("")));
const sameAssignments = (a, b, n) => Array.isArray(a) && a.every(bits => validBits(bits, n))
  && assignmentSet(a).size === a.length && isDeepStrictEqual(assignmentSet(a), assignmentSet(b));

/** Independent algebra: Q is symmetric and includes the binary linear diagonal. */
export function assembleQubo(request) {
  const issues = validateJsonWithSchema(request, path.join(root, "inputs/request.schema.json"));
  if (issues.length) throw new TypeError(issues.join("; "));
  if (request.method === "qaoa" && (!Number.isSafeInteger(request.layer) || request.layer < 1)
    || request.method === "traversal" && request.layer !== undefined) throw new TypeError("Invalid method/layer combination");
  if (!request.model) {
    const n = request.quadratic.length, matrix = request.quadratic, linear = request.linear ?? Array(n).fill(0);
    if (matrix.some(row => row.length !== n) || linear.length !== n) throw new TypeError("QUBO matrix/vector dimensions disagree");
    const Q = matrix.map((row, i) => row.map((x, j) => finite(i === j ? x + linear[i] : (x + matrix[j][i]) / 2)));
    const constant = finite(request.constant ?? 0);
    return { n, Q, constant, variables: Array.from({ length: n }, (_, i) => `x${i}`), constraints: [], sense: 1,
      objective: bits => finite(constant + bits.reduce((s, x, i) => s + x * dot(Q[i], bits), 0)) };
  }
  const { variables, objective, constraints = [] } = request.model, n = variables.length;
  const index = new Map(variables.map((v, i) => [v, i]));
  const position = name => { if (!index.has(name)) throw new TypeError(`Undeclared variable ${name}`); return index.get(name); };
  const linear = Array(n).fill(0), quadratic = zeros(n);
  for (const term of objective.linear ?? []) linear[position(term.variable)] += finite(term.coefficient);
  for (const term of objective.quadratic ?? []) {
    const i = position(term.left), j = position(term.right);
    quadratic[Math.min(i, j)][Math.max(i, j)] += finite(term.coefficient);
  }
  const ids = new Set();
  const equations = constraints.map(c => {
    if (ids.has(c.id)) throw new TypeError("Duplicate equality id");
    ids.add(c.id);
    const a = Array(n).fill(0);
    for (const term of c.terms) a[position(term.variable)] += finite(term.coefficient);
    if (a.every(x => Math.abs(x) <= tolerance)) throw new TypeError("Equality needs a nonzero coefficient");
    return { id: c.id, coefficients: a, relation: "eq", rhs: finite(c.rhs), penalty: finite(c.penalty) };
  });
  const sense = objective.sense === "minimize" ? 1 : -1, c = finite(objective.constant ?? 0);
  const Q = zeros(n);
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    Q[i][j] = finite(sense * (i === j ? linear[i] + quadratic[i][i] : (quadratic[i][j] + quadratic[j][i]) / 2)
      + equations.reduce((s, e) => s + e.penalty * (i === j ? e.coefficients[i] ** 2 - 2 * e.rhs * e.coefficients[i] : e.coefficients[i] * e.coefficients[j]), 0));
  }
  const constant = finite(sense * c + equations.reduce((s, e) => s + e.penalty * e.rhs ** 2, 0));
  return { n, Q, constant, variables, constraints: equations, sense,
    normalizedModel: { variables, objective: { sense: objective.sense, linear, quadratic, constant: c }, constraints: equations },
    objective: bits => finite(c + dot(linear, bits) + bits.reduce((s, x, i) => s + x * dot(quadratic[i], bits), 0)) };
}

function evaluate(problem, bits) {
  if (!validBits(bits, problem.n)) throw new TypeError("Solution is not a binary vector with n entries");
  const objectiveValue = problem.objective(bits);
  const residuals = problem.constraints.map(c => ({ id: c.id, value: finite(dot(c.coefficients, bits) - c.rhs) }));
  const penalty = finite(residuals.reduce((s, r, i) => s + problem.constraints[i].penalty * r.value ** 2, 0));
  return { bitVector: bits, objectiveValue, residuals, feasible: residuals.every(r => Math.abs(r.value) <= tolerance),
    penalty, penalizedEnergy: finite(problem.sense * objectiveValue + penalty) };
}
const matrixEnergy = (q, bits) => finite(q.constant + dot(q.linear, bits) + bits.reduce((s, x, i) => s + x * dot(q.quadratic[i], bits), 0));
function enumerate(problem) {
  const rows = [];
  let minimum = Infinity, feasibleCost = Infinity, feasibleCount = 0;
  for (let mask = 0; mask < 2 ** problem.n; mask++) {
    const row = evaluate(problem, Array.from({ length: problem.n }, (_, i) => Math.floor(mask / 2 ** (problem.n - i - 1)) % 2));
    minimum = Math.min(minimum, row.penalizedEnergy);
    if (row.feasible) { feasibleCount++; feasibleCost = Math.min(feasibleCost, problem.sense * row.objectiveValue); }
    rows.push(row);
  }
  const optimal = rows.filter(row => near(row.penalizedEnergy, minimum));
  const feasibleOptimal = rows.filter(row => row.feasible && near(problem.sense * row.objectiveValue, feasibleCost));
  return { rows, minimum, optimal, feasibleCount, feasibleOptimal,
    feasibleValue: feasibleCount ? problem.sense * feasibleCost : null,
    penaltySufficient: feasibleCount > 0 && optimal.every(row => row.feasible) };
}

export function validateQubo({ request, result }) {
  const observations = [], solutionEvaluations = [];
  const emit = (id, condition, detail) => observations.push({ id, status: condition ? "pass" : "fail", detail });
  const missing = (id, detail) => observations.push({ id, status: "not_checked", detail });
  let problem;
  try { problem = assembleQubo(request); emit("request.scope", true, "Independently parsed finite objective and A x = b; Q represents x^T Q x with a symmetric part and binary diagonal."); }
  catch (error) { emit("request.scope", false, error.message); }
  const issues = validateJsonWithSchema(result, path.join(root, "artifacts/qubo-result.schema.json"));
  emit("artifact.schema", issues.length === 0, issues.join("; ") || "Structured QUBO result.");
  if (problem && issues.length === 0) {
    if (Boolean(request.model) !== Boolean(result.modeling)) {
      emit("request.result-kind", false, "The result belongs to a different Tool/input kind.");
      missing("provenance.complete", "L2 observations only.");
      return { schemaVersion: "1.0", observations, solutionEvaluations };
    }
    const solver = request.model ? result.solver : result;
    emit("solver.shape", solver?.problem?.size === problem.n && solver.packageVersion === "2.0.0", "Solver dimension and pinned package agree.");
    const traversal = request.method === "traversal", hasClassical = solver.classical !== null;
    const referenceMode = request.referenceMode ?? "auto";
    emit("solver.request-binding", (traversal ? hasClassical && solver.quantum === null : solver.quantum?.layer === request.layer)
      && solver.classicalRole === (traversal ? "main" : hasClassical ? "reference" : "not_run")
      && solver.reference?.mode === referenceMode
      && solver.reference?.status === (!traversal && hasClassical ? "computed" : "not_run")
      && (traversal || referenceMode === "auto" || hasClassical === (referenceMode === "required")),
    "Primary method and QAOA layer match the request; classical results retain their main/reference role and obey required/skip without substituting for QAOA.");
    let q, matrixValid = true;
    if (request.model) {
      q = result.modeling?.qubo;
      matrixValid = q?.linear?.length === problem.n && q.quadratic?.length === problem.n && q.quadratic.every(row => row.length === problem.n)
        && isDeepStrictEqual(q.variableOrder, problem.variables) && near(q.constant, problem.constant)
        && q.quadratic.every((row, i) => row.every((x, j) => near(i === j ? x + q.linear[i] : (x + q.quadratic[j][i]) / 2, problem.Q[i][j])));
      emit("compilation.matrix", matrixValid, "Independent symmetric Q and constant include each rho*(A x-b)^2 offset; no Tool compilation imported.");
      emit("compilation.model", isDeepStrictEqual(result.modeling?.model, problem.normalizedModel), "Normalized objective, variable order and every equality match the original model.");
      emit("compilation.digest", q?.sha256 === digest({ variableOrder: q.variableOrder, quadratic: q.quadratic, linear: q.linear, constant: q.constant }), "Compilation SHA-256 matches actual fields.");
    }
    const candidates = [...(solver?.classical?.optimalAssignments ?? [])];
    if (solver?.quantum) {
      const distribution = solver.quantum.distribution;
      const entries = Object.entries(distribution), total = entries.reduce((s, [, p]) => s + p, 0);
      const valid = entries.length > 0 && entries.every(([b, p]) => /^[01]+$/.test(b) && b.length === problem.n && Number.isFinite(p) && p >= 0) && near(total, 1);
      emit("quantum.distribution", valid && Object.hasOwn(distribution, solver.quantum.topBitstring)
        && near(distribution[solver.quantum.topBitstring], Math.max(...Object.values(distribution))), "Distribution is normalized; topBitstring is its maximum, not an optimality certificate.");
      if (valid) candidates.push(...entries.map(([bits]) => [...bits].map(Number)));
    }
    let solutionsValid = candidates.length > 0;
    for (const bits of candidates) {
      try { solutionEvaluations.push(evaluate(problem, bits)); } catch { solutionsValid = false; }
    }
    emit("solutions.replayed", solutionsValid, "Each returned candidate is independently evaluated for raw objective, every equality residual, feasibility, penalty and total energy.");
    if (solver?.classical) emit("solver.solution-energy", solutionsValid && solver.classical.optimalAssignments.length > 0
      && solver.classical.optimalAssignments.every(bits => validBits(bits, problem.n) && near(evaluate(problem, bits).penalizedEnergy, solver.classical.minimumValue)), "Every claimed optimum has the independently recomputed penalized energy, including the constant.");
    if (problem.n <= 16) {
      const reference = enumerate(problem);
      if (solver?.classical) emit("solver.classical-reference", near(solver.classical.minimumValue, reference.minimum)
        && sameAssignments(solver.classical.optimalAssignments, reference.optimal.map(r => r.bitVector), problem.n), "JS exhaustively enumerated every one of 2^n assignments; optimum energy and complete minimizing set agree.");
      else missing("solver.classical-reference", "The QAOA output makes no classical global optimum claim.");
      if (request.model) {
        const maxError = matrixValid ? Math.max(...reference.rows.map(row => Math.abs(matrixEnergy(q, row.bitVector) - row.penalizedEnergy))) : Infinity;
        emit("compilation.exhaustive-replay", maxError <= tolerance, "Every compiled energy matches original signed objective plus squared equality penalties within 1e-9.");
        emit("constraints.feasible", reference.feasibleCount > 0, `Independent feasible assignment count: ${reference.feasibleCount}.`);
        emit("penalty.sufficient", reference.penaltySufficient, "Every penalized global minimizer must be feasible; otherwise caller penalty is insufficient.");
        const supplied = result.modeling.reference;
        if (supplied.status === "computed") {
          const assignmentsMatch = (records, rows, value) => Array.isArray(records)
            && sameAssignments(records.map(r => r.bitVector), rows.map(r => r.bitVector), problem.n)
            && records.every(r => near(r.value, value) && isDeepStrictEqual(r.values, Object.fromEntries(problem.variables.map((name, i) => [name, r.bitVector[i]]))));
          emit("reference.optimum", supplied.assignmentCount === reference.rows.length && supplied.feasibleAssignmentCount === reference.feasibleCount
            && near(supplied.compiledMinimum, reference.minimum) && supplied.penaltySufficient === reference.penaltySufficient
            && near(supplied.compilationMaxError, maxError) && assignmentsMatch(supplied.compiledAssignments, reference.optimal, reference.minimum)
            && (reference.feasibleCount === 0 ? supplied.feasibleOptimum === null : near(supplied.feasibleOptimum?.objectiveValue, reference.feasibleValue)
              && assignmentsMatch(supplied.feasibleOptimum?.assignments, reference.feasibleOptimal, reference.feasibleValue)), "Self-reported enumeration, feasible optimum, minimizing assignments and penalty claims are cross-checked against independent exhaustive JS results.");
        } else missing("reference.optimum", "Tool omitted its optional reference; independent small-n enumeration still ran.");
      }
    } else {
      for (const id of ["solver.classical-reference", ...(request.model ? ["compilation.exhaustive-replay", "constraints.feasible", "penalty.sufficient", "reference.optimum"] : [])]) missing(id, "Independent enumeration is bounded to n<=16; larger problems retain candidate checks without global optimality claims.");
    }
  }
  missing("provenance.complete", "L2 observations only; no materialized Session provenance or final Acceptance.");
  return { schemaVersion: "1.0", observations, solutionEvaluations };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const value = JSON.parse(readFileSync(process.argv[2], "utf8"));
  const validation = validateQubo(value);
  console.log(JSON.stringify(validation, null, 2));
  if (validation.observations.some(o => o.status === "fail")) process.exitCode = 1;
}
