// Independent audit arithmetic. Never imports Tool bridges or SDK numerical helpers.
export const tolerance = 1e-8;
export const near = (a, b, tol = tolerance) => Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= tol;
export const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
export const mul = (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
export const scale = (a, s) => [a[0] * s, a[1] * s];
export const conjugate = a => [a[0], -a[1]];
export const abs2 = a => a[0] ** 2 + a[1] ** 2;
export const inner = (a, b) => a.reduce((s, x, i) => add(s, mul(conjugate(x), b[i])), [0, 0]);
export const norm = a => a.reduce((s, x) => s + abs2(x), 0);
export const closeArray = (a, b, tol = tolerance) => Array.isArray(a) && a.length === b.length && a.every((v, i) => near(v, b[i], tol));
const phase = a => [Math.cos(a), Math.sin(a)];
const I = [[1, 0], [0, 0], [0, 0], [1, 0]];
export function gateMatrix(gate, angle) {
  const h = Math.SQRT1_2, c = Math.cos(angle / 2), s = Math.sin(angle / 2);
  const matrices = {
    I, H: [[h, 0], [h, 0], [h, 0], [-h, 0]],
    X: [[0, 0], [1, 0], [1, 0], [0, 0]], Y: [[0, 0], [0, -1], [0, 1], [0, 0]], Z: [[1, 0], [0, 0], [0, 0], [-1, 0]],
    S: [[1, 0], [0, 0], [0, 0], [0, 1]], SDG: [[1, 0], [0, 0], [0, 0], [0, -1]],
    T: [[1, 0], [0, 0], [0, 0], phase(Math.PI / 4)], TDG: [[1, 0], [0, 0], [0, 0], phase(-Math.PI / 4)],
    RZ: [phase(-angle / 2), [0, 0], [0, 0], phase(angle / 2)],
    RX: [[c, 0], [0, -s], [0, -s], [c, 0]], RY: [[c, 0], [-s, 0], [s, 0], [c, 0]],
  };
  if (!matrices[gate]) throw new TypeError(`Unsupported independent gate ${gate}`);
  return matrices[gate];
}
export function checkGates(n, gates) {
  for (const { gate, targets, angle } of gates) {
    const two = ["CX", "CZ", "SWAP"].includes(gate);
    if (!Array.isArray(targets) || targets.length !== (two ? 2 : 1) || new Set(targets).size !== targets.length
      || targets.some(q => !Number.isSafeInteger(q) || q < 0 || q >= n)) throw new TypeError("Invalid gate arity, targets or width");
    if (["RX", "RY", "RZ"].includes(gate) !== (angle !== undefined) || angle !== undefined && !Number.isFinite(angle)) throw new TypeError("Invalid rotation angle");
    if (!two) gateMatrix(gate, angle);
  }
}
export function applyGate(state, n, { gate, targets, angle }) {
  const output = state.map(x => [...x]), bit = q => 2 ** (n - 1 - q), has = (i, q) => Math.floor(i / bit(q)) % 2;
  if (["CX", "CZ", "SWAP"].includes(gate)) {
    const [a, b] = targets;
    for (let i = 0; i < state.length; i++) {
      if (gate === "CZ") output[i] = scale(state[i], has(i, a) && has(i, b) ? -1 : 1);
      else if (gate === "CX") output[i ^ (has(i, a) ? bit(b) : 0)] = state[i];
      else output[i ^ (has(i, a) !== has(i, b) ? bit(a) + bit(b) : 0)] = state[i];
    }
  } else {
    const m = gateMatrix(gate, angle), b = bit(targets[0]);
    for (let i = 0; i < state.length; i++) if (!has(i, targets[0])) {
      output[i] = add(mul(m[0], state[i]), mul(m[1], state[i + b]));
      output[i + b] = add(mul(m[2], state[i]), mul(m[3], state[i + b]));
    }
  }
  return output;
}
export function circuitState(n, gates, initial = "zero", column = 0) {
  let state = Array.from({ length: 2 ** n }, (_, i) => [initial === "plus" ? 2 ** (-n / 2) : Number(i === column), 0]);
  for (const gate of gates) state = applyGate(state, n, gate);
  return state;
}
export const circuitUnitary = (n, gates) => Array.from({ length: 2 ** n }, (_, c) => circuitState(n, gates, "zero", c)).flat();
export function phaseComparison(a, b) {
  const overlap = inner(b, a), magnitude = Math.sqrt(abs2(overlap));
  const p = magnitude > 1e-14 ? scale(overlap, 1 / magnitude) : [1, 0];
  const errors = a.map((x, i) => abs2(add(x, scale(mul(p, b[i]), -1))));
  return { maxError: Math.sqrt(Math.max(...errors)), frobenius: Math.sqrt(errors.reduce((s, x) => s + x, 0)), overlap: magnitude };
}
// Safe parser for emitted numeric QASM angles; no eval or executable input.
export function scalar(text) {
  const tokens = text.replaceAll(" ", "").match(/pi|(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?|[+*/()-]/g) ?? [];
  if (tokens.join("") !== text.replaceAll(" ", "")) throw new TypeError("Unsupported numeric expression");
  let i = 0;
  function atom() {
    const t = tokens[i++];
    if (t === "-") return -atom();
    if (t === "+") return atom();
    if (t === "(") { const v = sum(); if (tokens[i++] !== ")") throw new TypeError("Unbalanced angle"); return v; }
    if (t === "pi") return Math.PI;
    if (!t || !Number.isFinite(Number(t))) throw new TypeError("Invalid angle");
    return Number(t);
  }
  function product() { let v = atom(); while (["*", "/"].includes(tokens[i])) { const op = tokens[i++], b = atom(); v = op === "*" ? v * b : v / b; } return v; }
  function sum() { let v = product(); while (["+", "-"].includes(tokens[i])) { const op = tokens[i++], b = product(); v = op === "+" ? v + b : v - b; } return v; }
  const value = sum();
  if (i !== tokens.length || !Number.isFinite(value)) throw new TypeError("Invalid angle expression");
  return value;
}
export function parseQasm(text) {
  const statements = text.replace(/\/\/[^\n]*/g, "").split(";").map(s => s.trim()).filter(Boolean);
  if (statements.shift() !== "OPENQASM 2.0" || statements.shift() !== 'include "qelib1.inc"') throw new TypeError("Expected bounded OpenQASM 2");
  const q = /^qreg q\[(\d+)\]$/.exec(statements.shift()), n = Number(q?.[1]);
  if (!Number.isSafeInteger(n) || n < 1) throw new TypeError("Invalid QASM register");
  const gates = statements.map(s => {
    const m = /^(h|x|y|z|s|sdg|t|tdg|cx|cz|swap|rx|ry|rz)(?:\((.+)\))?\s+(q\[\d+\](?:\s*,\s*q\[\d+\])?)$/.exec(s);
    if (!m) throw new TypeError("Unsupported QASM statement");
    return { gate: m[1].toUpperCase(), targets: [...m[3].matchAll(/q\[(\d+)\]/g)].map(m => Number(m[1])), ...(m[2] ? { angle: scalar(m[2]) } : {}) };
  });
  checkGates(n, gates);
  return { n, gates };
}
export function circuitMetrics(n, gates) {
  const depth = Array(n).fill(0);
  for (const g of gates) { const next = Math.max(...g.targets.map(q => depth[q])) + 1; for (const q of g.targets) depth[q] = next; }
  return { gates: gates.length, twoQubitGates: gates.filter(g => g.targets.length === 2).length,
    tCount: gates.filter(g => ["T", "TDG"].includes(g.gate) || ["RZ", "RX"].includes(g.gate) && !near(g.angle / (Math.PI / 2), Math.round(g.angle / (Math.PI / 2)), 1e-10)).length,
    depth: Math.max(...depth) };
}
export const pauliBits = word => [...word].flatMap(p => [Number("XY".includes(p)), Number("YZ".includes(p))]);
export const commutes = (a, b) => [...a].reduce((s, p, i) => s ^ Number(p !== "I" && b[i] !== "I" && p !== b[i]), 0) === 0;
export function gf2Rank(rows) {
  const matrix = rows.map(r => [...r]); let rank = 0;
  for (let col = 0; col < (matrix[0]?.length ?? 0) && rank < matrix.length; col++) {
    const pivot = matrix.findIndex((row, i) => i >= rank && row[col]);
    if (pivot < 0) continue;
    [matrix[rank], matrix[pivot]] = [matrix[pivot], matrix[rank]];
    for (let i = rank + 1; i < matrix.length; i++) if (matrix[i][col]) matrix[i] = matrix[i].map((v, j) => v ^ matrix[rank][j]);
    rank++;
  }
  return rank;
}
const code = { I: 0, X: 1, Y: 3, Z: 2 }, symbol = ["I", "X", "Z", "Y"];
export const pauliProduct = (a, b) => [...a].map((p, i) => symbol[code[p] ^ code[b[i]]]).join("");
export function lieClosure(generators) {
  const basis = [...new Set(generators)], seen = new Set(basis);
  for (const word of basis) for (const g of generators) if (!commutes(word, g)) {
    const product = pauliProduct(word, g);
    if (!seen.has(product)) { basis.push(product); seen.add(product); }
  }
  return basis.sort();
}
export function pauliMatrix(word) {
  return circuitUnitary(word.length, [...word].flatMap((gate, q) => gate === "I" ? [] : [{ gate, targets: [q] }]));
}
// Matrices are column-major to match circuitUnitary.
export function matrixProduct(a, b) {
  const d = Math.sqrt(a.length), c = a.map(() => [0, 0]);
  for (let col = 0; col < d; col++) for (let row = 0; row < d; row++) for (let k = 0; k < d; k++) c[col * d + row] = add(c[col * d + row], mul(a[k * d + row], b[col * d + k]));
  return c;
}
