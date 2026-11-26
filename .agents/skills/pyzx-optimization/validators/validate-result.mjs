import { isMainModule } from "../../../../src/lib/cli-entrypoint.mjs";
import { readFileSync } from "node:fs";
import { isDeepStrictEqual } from "node:util";
import { observationAudit } from "../../../../src/lib/independent-observations.mjs";
import { checkGates, parseQasm, circuitMetrics, circuitUnitary, phaseComparison, near } from "../../../../src/lib/independent-quantum-math.mjs";

export function validateResult({ request, result }) {
  const audit = observationAudit(import.meta.url, request, result), { input, emit, missing } = audit;
  if (!audit.valid) return audit.finish();
  try {
    checkGates(input.numQubits, input.gates);
    const before = parseQasm(result.inputQasm), after = parseQasm(result.optimizedQasm);
    emit("circuit.structure", before.n === input.numQubits && after.n === input.numQubits, "Independently parse every emitted gate, angle, arity and wire.");
    const expectedInput = input.gates.flatMap(g => g.gate === "Y"
      ? [{ gate: "X", targets: g.targets }, { gate: "Z", targets: g.targets }] : [g]);
    emit("input.structure", before.n === input.numQubits && isDeepStrictEqual(before.gates, expectedInput),
      "Input gate table exactly binds to the request, with the declared Y-to-X-then-Z expansion; cancelling gates cannot inflate the pre-optimization resources.");
    emit("resources.replayed", isDeepStrictEqual(result.before, circuitMetrics(before.n, before.gates))
      && isDeepStrictEqual(result.after, circuitMetrics(after.n, after.gates)), "Gate, T, two-qubit counts and dependency depth recomputed from emitted QASM.");
    emit("reference.policy", result.reference.mode === input.referenceMode, "Reference policy binds to input.");
    if (before.n !== input.numQubits || after.n !== input.numQubits) return audit.finish();
    if (input.numQubits > 6 || input.gates.length > 512 || before.gates.length > 2048 || after.gates.length > 2048 || input.referenceMode === "skip") {
      missing("unitary.equivalence", "Independent dense unitary audit requires <=6 qubits, <=512 input gates, <=2048 emitted gates and an enabled reference.");
    } else {
      const original = circuitUnitary(input.numQubits, input.gates), emitted = circuitUnitary(before.n, before.gates), optimized = circuitUnitary(after.n, after.gates);
      const binding = phaseComparison(original, emitted), comparison = phaseComparison(original, optimized);
      emit("input.binding", binding.maxError <= 1e-8, "Emitted input QASM reproduces original gates up to global phase, including Y expansion.", binding);
      emit("unitary.equivalence", comparison.maxError <= 1e-8 && near(comparison.overlap / 2 ** input.numQubits, 1), "Complete independent matrix multiplication, global phase aligned; normalized trace overlap must equal one.", comparison);
      if (result.reference.status === "computed") emit("unitary.claims", result.equivalentUpToGlobalPhase === (comparison.maxError <= 1e-8)
        && near(result.unitaryMaxError, comparison.maxError), "Do not trust the Tool's equivalence flag or self-reported error.");
    }
  } catch (error) { emit("circuit.structure", false, error.message); }
  return audit.finish();
}

if (isMainModule(import.meta.url)) {
  const bundle = JSON.parse(readFileSync(process.argv[2], "utf8"));
  const validation = validateResult(bundle);
  console.log(JSON.stringify(validation, null, 2));
  if (validation.observations.some(o => o.status === "fail")) process.exitCode = 1;
}
