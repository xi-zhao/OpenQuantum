import { isMainModule } from "../../../../src/lib/cli-entrypoint.mjs";
import { readFileSync } from "node:fs";
import { isDeepStrictEqual } from "node:util";
import { observationAudit } from "../../../../src/lib/independent-observations.mjs";
import { commutes, lieClosure, pauliProduct, pauliMatrix, matrixProduct, add, scale, inner, mul, abs2, near } from "../../../../src/lib/independent-quantum-math.mjs";

export function validateResult({ request, result }) {
  const audit = observationAudit(import.meta.url, request, result), { input, emit, missing } = audit;
  if (!audit.valid) return audit.finish();
  const { numQubits: n, generators } = input;
  const valid = generators.every(w => w.length === n && !/^I+$/.test(w)) && new Set(generators).size === generators.length;
  emit("generators.structure", valid, "Independent nonidentity, width and duplicate checks.");
  emit("reference.policy", result.reference.mode === input.referenceMode, "Reference mode binds to the input.");
  if (!valid) return audit.finish();
  if (n > 4 || generators.length > 64) { missing("algebra.closure", "Independent closure audit bounded to n<=4 and <=64 Pauli controls."); return audit.finish(); }
  const basis = lieClosure(generators), set = new Set(basis), center = basis.filter(w => basis.every(v => commutes(w, v)));
  emit("algebra.dimension", String(result.dimension) === String(basis.length), "Independently iterate all nested generator commutators to a fixed point.", { dimension: basis.length });
  emit("algebra.special-unitary", String(result.fullSpecialUnitaryDimension) === String(4 ** n - 1)
    && result.generatesFullSpecialUnitary === (basis.length === 4 ** n - 1), "Exact dimension of su(2^n), with identity excluded.");
  if (result.closure !== null) {
    const claimed = result.closure;
    emit("basis.independent", new Set(claimed).size === claimed.length && claimed.every(w => w.length === n && !/^I+$/.test(w)), "Distinct Pauli words are Hilbert-Schmidt orthogonal; symplectic vector rank is not the Lie algebra dimension.");
    emit("algebra.closure", isDeepStrictEqual([...claimed].sort(), basis), "Returned basis is exactly the independent nested-commutator closure, with no missing or extra words.");
    const claimedSet = new Set(claimed);
    emit("closure.complete", claimed.every(a => claimed.every(b => commutes(a, b) || claimedSet.has(pauliProduct(a, b))))
      && generators.every(g => claimedSet.has(g)), "Every pairwise basis commutator lies in the claimed span, which contains all controls.");
    emit("center.dimension", result.centerDimension === center.length, "Central basis words commute with the entire independent closure.", { centerDimension: center.length });
  } else { missing("algebra.closure", "Tool omitted the explicit basis; dimension was still independently computed."); missing("center.dimension", "Tool did not enumerate its center."); }
  if (result.reference.status === "computed") emit("dense.claims", String(result.referenceDimension) === String(basis.length)
    && near(result.maxSpanResidual, 0), "Self-reported dense dimension and residual agree with the independent exact Pauli span.");
  if (n <= 3) {
    let complete = true;
    const matrices = new Map(basis.map(w => [w, pauliMatrix(w)])), d = 2 ** n;
    for (const a of basis) for (const b of basis) {
      const ab = matrixProduct(matrices.get(a), matrices.get(b)), ba = matrixProduct(matrices.get(b), matrices.get(a));
      const bracket = ab.map((x, i) => add(x, scale(ba[i], -1)));
      if (commutes(a, b)) complete &&= bracket.every(x => abs2(x) < 1e-20);
      else {
        const product = pauliProduct(a, b), target = matrices.get(product);
        if (!set.has(product)) { complete = false; continue; }
        const coefficient = scale(inner(target, bracket), 1 / d);
        complete &&= near(abs2(coefficient), 4) && bracket.every((x, i) => abs2(add(x, scale(mul(coefficient, target[i]), -1))) < 1e-20);
      }
    }
    emit("dense.commutators", complete, "Small-system complex dense AB-BA independently agrees with every symplectic closure commutator.");
  } else missing("dense.commutators", "Additional dense pairwise cross-check bounded to n<=3; exact symplectic closure was checked.");
  return audit.finish();
}

if (isMainModule(import.meta.url)) {
  const bundle = JSON.parse(readFileSync(process.argv[2], "utf8"));
  const validation = validateResult(bundle);
  console.log(JSON.stringify(validation, null, 2));
  if (validation.observations.some(o => o.status === "fail")) process.exitCode = 1;
}
