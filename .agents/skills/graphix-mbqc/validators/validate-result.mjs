import { isMainModule } from "../../../../src/lib/cli-entrypoint.mjs";
import { readFileSync } from "node:fs";
import { isDeepStrictEqual } from "node:util";
import { observationAudit } from "../../../../src/lib/independent-observations.mjs";
import { checkGates, circuitState, applyGate, inner, abs2, norm, near, add, mul, scale, scalar, phaseComparison } from "../../../../src/lib/independent-quantum-math.mjs";

const sorted = values => [...values].sort((a, b) => a - b);
const domain = text => !text || text === "set()" ? [] : text.slice(1, -1).split(",").map(s => s.trim()).filter(Boolean).map(Number);
export function parsePattern(text) {
  return text.split("\n").filter(Boolean).map(line => {
    let m;
    if ((m = /^N\((\d+)\)$/.exec(line))) return { kind: "N", node: Number(m[1]) };
    if ((m = /^E\(\((\d+), (\d+)\)\)$/.exec(line))) return { kind: "E", nodes: [Number(m[1]), Number(m[2])] };
    if ((m = /^([XZ])\((\d+), (\{[\d, ]*\}|set\(\))\)$/.exec(line))) return { kind: m[1], node: Number(m[2]), domain: domain(m[3]) };
    if ((m = /^M\((\d+), Measurement\.XY\(([^)]+)\)(?:, (\{[\d, ]*\}|set\(\)))?(?:, (\{[\d, ]*\}|set\(\)))?\)$/.exec(line))) {
      return { kind: "M", node: Number(m[1]), angle: scalar(m[2]), s: domain(m[3]), t: domain(m[4]) };
    }
    throw new TypeError(`Unsupported independent MBQC command: ${line.slice(0, 100)}`);
  });
}
function structure(result, n, commands) {
  const inputs = Array.from({ length: n }, (_, i) => i), prepared = new Set(inputs), active = new Set(inputs), measured = new Set(), edges = new Set();
  let maxSpace = n, xCorrections = 0, zCorrections = 0;
  if (!isDeepStrictEqual(result.inputNodes, inputs)) throw new TypeError("Input nodes must bind logical input wires");
  for (const c of commands) {
    if (c.kind === "N") {
      if (prepared.has(c.node)) throw new TypeError("Duplicate preparation");
      prepared.add(c.node); active.add(c.node); maxSpace = Math.max(maxSpace, active.size);
    } else if (c.kind === "E") {
      if (c.nodes[0] === c.nodes[1] || !c.nodes.every(q => active.has(q))) throw new TypeError("Invalid resource edge");
      const key = sorted(c.nodes).join(",");
      if (edges.has(key)) throw new TypeError("Duplicate resource edge");
      edges.add(key);
    } else {
      if (!active.has(c.node)) throw new TypeError("Measurement or correction targets inactive node");
      for (const d of c.kind === "M" ? [c.s, c.t] : [c.domain]) {
        if (new Set(d).size !== d.length || !d.every(q => measured.has(q))) throw new TypeError("Correction depends on missing or future measurement");
      }
      if (c.kind === "M") { measured.add(c.node); active.delete(c.node); }
      else if (c.kind === "X") xCorrections++;
      else zCorrections++;
    }
  }
  const returnedEdges = result.edges.map(e => sorted(e).join(","));
  if (!isDeepStrictEqual(sorted(prepared), result.nodes) || !isDeepStrictEqual([...edges].sort(), returnedEdges.sort())
    || new Set(result.outputNodes).size !== n || !isDeepStrictEqual(sorted(active), sorted(result.outputNodes)) || result.maxSpace !== maxSpace) throw new TypeError("Resource graph, outputs or peak live qubits disagree with the command sequence");
  return { measured: sorted(measured), nodes: prepared.size, edges: edges.size, measurements: measured.size, xCorrections, zCorrections, maxSpace };
}
function patternState(input, result, commands, branch) {
  let wires = [...result.inputNodes], state = circuitState(input.numQubits, [], input.initialState);
  const outcomes = new Map(branch.measurements.map(m => [m.node, m.outcome]));
  const parity = d => d.reduce((s, node) => s ^ outcomes.get(node), 0);
  for (const c of commands) {
    if (c.kind === "N") { state = state.flatMap(a => [scale(a, Math.SQRT1_2), scale(a, Math.SQRT1_2)]); wires.push(c.node); }
    else if (c.kind === "E") state = applyGate(state, wires.length, { gate: "CZ", targets: c.nodes.map(q => wires.indexOf(q)) });
    else if (c.kind === "M") {
      const q = wires.indexOf(c.node), b = 2 ** (wires.length - q - 1), outcome = outcomes.get(c.node);
      const angle = ((parity(c.s) ? -1 : 1) * c.angle + parity(c.t)) * Math.PI;
      const factor = [(outcome ? -1 : 1) * Math.cos(angle), -(outcome ? -1 : 1) * Math.sin(angle)];
      const reduced = [];
      for (let i = 0; i < state.length; i++) if (Math.floor(i / b) % 2 === 0) reduced.push(scale(add(state[i], mul(factor, state[i + b])), Math.SQRT1_2));
      const probability = norm(reduced);
      if (probability < 1e-14) throw new TypeError("Reported impossible measurement branch");
      state = reduced.map(a => scale(a, 1 / Math.sqrt(probability))); wires.splice(q, 1);
    } else if (parity(c.domain)) state = applyGate(state, wires.length, { gate: c.kind, targets: [wires.indexOf(c.node)] });
  }
  return state.map((_, index) => {
    let source = 0;
    for (const [q, node] of result.outputNodes.entries()) source += (Math.floor(index / 2 ** (wires.length - q - 1)) % 2) * 2 ** (wires.length - wires.indexOf(node) - 1);
    return state[source];
  });
}
export function validateResult({ request, result }) {
  const audit = observationAudit(import.meta.url, request, result), { input, emit, missing } = audit;
  if (!audit.valid) return audit.finish();
  try {
    checkGates(input.numQubits, input.gates);
    const commands = parsePattern(result.pattern), resources = structure(result, input.numQubits, commands);
    emit("pattern.structure", true, "Recompute preparations, graph edges, measurements, causal X/Z domains, outputs and peak live space.", resources);
    const expected = input.simulate ? input.branches : 0;
    emit("branches.binding", result.branches.length === expected && result.branches.every((b, i) => b.seed === input.seed + i
      && b.statevector.length === 2 ** input.numQubits && new Set(b.measurements.map(m => m.node)).size === b.measurements.length
      && isDeepStrictEqual(sorted(b.measurements.map(m => m.node)), resources.measured)), "Every branch binds its seed, final dimension and exactly one outcome per measured node.");
    emit("reference.policy", result.reference.mode === input.referenceMode && (result.simulation.status === "computed") === input.simulate, "Simulation and reference policy match input.");
    for (const [i, branch] of result.branches.entries()) {
      const normalization = Math.abs(norm(branch.statevector) - 1);
      emit(`branch-${i}.normalization`, normalization <= 1e-8 && near(branch.normError, normalization), "Normalization is checked even when the optional circuit reference is skipped.");
    }
    if (!input.simulate || input.numQubits > 10 || resources.maxSpace > 10 || commands.length > 4096 || input.gates.length > 512 || input.referenceMode === "skip") {
      missing("state.reference", "Independent circuit and adaptive pattern replay require simulation, <=10 logical/live qubits, <=512 gates, <=4096 commands and an enabled reference.");
      return audit.finish();
    }
    const reference = circuitState(input.numQubits, input.gates, input.initialState), infidelities = [];
    for (const [i, branch] of result.branches.entries()) {
      if (branch.statevector.length !== reference.length) continue;
      const fidelity = abs2(inner(reference, branch.statevector)), normalization = Math.abs(norm(branch.statevector) - 1);
      const probabilities = reference.map(abs2), actual = branch.statevector.map(abs2), error = Math.max(...actual.map((p, k) => Math.abs(p - probabilities[k])));
      emit(`branch-${i}.state`, normalization <= 1e-8 && near(fidelity, 1) && error <= 1e-8, "Independent gate-model state, Born probabilities and global-phase invariant fidelity.", { fidelity, normalization, probabilityError: error });
      emit(`branch-${i}.claims`, near(branch.normError, normalization) && (branch.fidelity === null || near(branch.fidelity, fidelity)), "Reported fidelity and norm error cannot substitute for recomputation.");
      const replay = patternState(input, result, commands, branch), compared = phaseComparison(replay, branch.statevector);
      emit(`branch-${i}.corrections`, compared.maxError <= 1e-8, "Independently replay preparations, entanglement, adaptive XY projections and X/Z byproducts for the supplied outcomes.", compared);
      infidelities.push(Math.max(0, 1 - fidelity));
    }
    if (result.reference.status === "computed") emit("reference.claims", result.referenceStatevector?.length === reference.length
      && phaseComparison(reference, result.referenceStatevector).maxError <= 1e-8 && near(result.maxInfidelity, Math.max(...infidelities)), "Self-reported reference state and worst branch infidelity independently checked.");
  } catch (error) { emit("pattern.structure", false, error.message); }
  return audit.finish();
}

if (isMainModule(import.meta.url)) {
  const bundle = JSON.parse(readFileSync(process.argv[2], "utf8"));
  const validation = validateResult(bundle);
  console.log(JSON.stringify(validation, null, 2));
  if (validation.observations.some(o => o.status === "fail")) process.exitCode = 1;
}
