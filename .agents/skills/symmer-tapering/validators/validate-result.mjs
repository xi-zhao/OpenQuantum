import { readFileSync } from "node:fs";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";
import { fileURLToPath } from "node:url";
import { observationAudit } from "../../../../src/lib/independent-observations.mjs";
import { commutes, pauliBits, gf2Rank, closeArray, near } from "../../../../src/lib/independent-quantum-math.mjs";
import { preparedPythonLaunch } from "../../../../src/lib/prepared-python.mjs";
import { runLocalJsonProcess } from "../../../../src/lib/local-json-process.mjs";
import { localComputeEnvironment, localComputeProcessOptions } from "../../../../src/lib/local-compute-policy.mjs";

export function validateResult({ request, result, reference }) {
  const audit = observationAudit(import.meta.url, request, result), { input, emit, missing } = audit;
  if (!audit.valid) return audit.finish();
  const { numQubits: n, symmetries, terms } = input, words = symmetries.map(s => s.pauli), k = gf2Rank(words.map(pauliBits));
  const width = [...words, ...terms.map(t => t.pauli)].every(w => w.length === n);
  emit("symmetry.independent", width && k === words.length && k <= n, "Independent GF(2) row elimination on binary symplectic generators.", { rank: k });
  emit("symmetry.commutes", words.every(a => words.every(b => commutes(a, b))), "Pairwise symplectic products vanish.");
  const invariant = width && words.every(w => terms.every(t => t.coefficient === 0 || commutes(w, t.pauli)));
  emit("hamiltonian.symmetry", invariant, "Every supplied symmetry commutes with every nonzero original Hamiltonian term.");
  emit("reduction.structure", result.reducedQubits === n - k && String(result.sectorDimension) === String(2n ** BigInt(Math.max(0, n - k)))
    && result.reducedTerms.every(t => t.pauli.length === n - k && Number.isFinite(t.coefficient))
    && new Set(result.reducedTerms.map(t => t.pauli)).size === result.reducedTerms.length,
  "Reduced width n-k, sector dimension, distinct real Pauli coefficients and Hermiticity.");
  emit("reference.policy", result.reference.mode === input.referenceMode, "Reference mode binds to the input.");
  if (!invariant || k !== words.length || n > 6 || terms.length > 256 || input.referenceMode === "skip") {
    missing("sector.spectrum", "Dense sector audit requires valid commuting independent generators, n<=6, <=256 terms and an enabled reference.");
  } else if (!reference) missing("sector.spectrum", "Prepared independent NumPy reference unavailable; no installation attempted.");
  else {
    const d = 2 ** (n - k), valid = isDeepStrictEqual(reference.request, input) && isDeepStrictEqual(reference.reducedTerms, result.reducedTerms)
      && [reference.spectrum, reference.sectorSpectrum].every(a => Array.isArray(a) && a.length === d && a.every(Number.isFinite)) && Number.isFinite(reference.projectorError);
    emit("reference.binding", valid, "Separate projection process binds original input and candidate reduced operator.");
    if (valid) {
      emit("sector.spectrum", closeArray(reference.spectrum, reference.sectorSpectrum) && near(reference.projectorError, 0), "Compare every eigenvalue after independent target-sector projection, including its ground energy.", { maxError: Math.max(...reference.spectrum.map((v, i) => Math.abs(v - reference.sectorSpectrum[i]))), groundEnergy: reference.sectorSpectrum[0] });
      if (result.reference.status === "computed") emit("spectrum.claims", closeArray(result.reducedSpectrum, reference.spectrum)
        && closeArray(result.referenceSectorSpectrum, reference.sectorSpectrum)
        && near(result.maxSpectrumError, Math.max(...reference.spectrum.map((v, i) => Math.abs(v - reference.sectorSpectrum[i]))))
        && near(result.projectorIdempotenceError, reference.projectorError), "Self-reported spectra and errors are independently recomputed.");
    }
  }
  return audit.finish();
}
export async function referenceSpectrum(request, result, signal) {
  const audit = observationAudit(import.meta.url, request, result), input = audit.input;
  if (!audit.valid || input.numQubits > 6 || input.terms.length > 256 || input.referenceMode === "skip") return undefined;
  const root = fileURLToPath(new URL("..", import.meta.url));
  const env = Object.fromEntries(["HOME", "PATH", "SYSTEMROOT", "TEMP", "TMP", "TMPDIR", "WINDIR"].flatMap(k => process.env[k] ? [[k, process.env[k]]] : []));
  return runLocalJsonProcess({ ...await preparedPythonLaunch({ skillRoot: root, args: [fileURLToPath(new URL("./reference.py", import.meta.url))] }),
    cwd: root, env: localComputeEnvironment(env, input.execution), input: { request: input, reducedTerms: result.reducedTerms }, signal,
    ...localComputeProcessOptions(input.execution), label: "Independent symmetry-sector eigenspectrum" });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const bundle = JSON.parse(readFileSync(process.argv[2], "utf8"));
  if (process.argv.includes("--replay")) {
    try { bundle.reference = await referenceSpectrum(bundle.request, bundle.result); } catch { delete bundle.reference; }
  }
  const validation = validateResult(bundle);
  console.log(JSON.stringify(validation, null, 2));
  if (validation.observations.some(o => o.status === "fail")) process.exitCode = 1;
}
