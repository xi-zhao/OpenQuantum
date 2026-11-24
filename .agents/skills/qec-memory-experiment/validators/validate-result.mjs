import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";
import { validateJsonWithSchema } from "../../../skill-contracts/index.mjs";
import { preparedPythonLaunch } from "../../../../src/lib/prepared-python.mjs";
import { runLocalJsonProcess } from "../../../../src/lib/local-json-process.mjs";
import { localComputeEnvironment, localComputeProcessOptions } from "../../../../src/lib/local-compute-policy.mjs";

const skillRoot = fileURLToPath(new URL("..", import.meta.url));
const requestSchema = path.join(skillRoot, "inputs/request.schema.json");
const resultSchema = path.join(skillRoot, "artifacts/qec-memory-result.schema.json");
const digest = value => createHash("sha256").update(value).digest("hex");
const tolerance = 1e-15;
const observe = (id, status, detail) => ({ id, status, detail });
const checked = (id, condition, detail) => observe(id, condition ? "pass" : "fail", detail);

export function experimentDigest(request) {
  const p = Buffer.alloc(8);
  p.writeDoubleBE(request.physicalErrorRate === 0 ? 0 : request.physicalErrorRate);
  return digest(JSON.stringify([request.basis, String(request.distance), String(request.rounds),
    String(request.shots), p.toString("hex"), String(request.seed)]));
}

// Independent algebraic form of the Wilson score interval, not the worker's
// reported interval or its implementation. Zero/all failures have exact edges.
export function statistics(errors, shots) {
  const rate = errors / shots;
  const z = 1.959963984540054;
  const denominator = shots + z * z;
  const center = (errors + z * z / 2) / denominator;
  const radius = z * Math.sqrt(errors * (shots - errors) / shots + z * z / 4) / denominator;
  return {
    logicalErrorRate: rate,
    standardError: Math.sqrt(rate * (1 - rate) / shots),
    wilson95: { low: errors === 0 ? 0 : Math.max(0, center - radius), high: errors === shots ? 1 : Math.min(1, center + radius) },
  };
}

/** Pure observations only. The reference, if supplied, must come from replay.py. */
export function validateExperiment({ request, facts, reference }) {
  const observations = [];
  const emit = (id, condition, detail) => observations.push(checked(id, condition, detail));
  const inputIssues = validateJsonWithSchema(request, requestSchema);
  emit("request.scope", inputIssues.length === 0, inputIssues.join("; ") || "Bounded rotated-surface-code memory request.");
  const artifactIssues = validateJsonWithSchema(facts, resultSchema);
  emit("artifact.schema", artifactIssues.length === 0, artifactIssues.join("; ") || "Structured result matches the declared schema.");
  if (inputIssues.length === 0 && artifactIssues.length === 0) {
    request = { ...request, physicalErrorRate: request.physicalErrorRate === 0 ? 0 : request.physicalErrorRate };
    const { result, sampling } = facts;
    emit("experiment.digest", facts.requestDigestVersion === "qec-binary64-v1" && facts.experimentDigest === experimentDigest(request)
      && isDeepStrictEqual(facts.experiment, request), "Input binding is recomputed with the declared binary64 digest.");
    emit("experiment.seed-recorded", facts.experiment.seed === request.seed, "The artifact records the requested seed.");
    emit("experiment.task", facts.codeTask === `surface_code:rotated_memory_${request.basis}`, "Generated task agrees with the memory basis.");
    const bits = Buffer.from(sampling.failureBits, "base64");
    const padding = request.shots % 8;
    const packed = bits.length === Math.ceil(request.shots / 8) && bits.toString("base64") === sampling.failureBits
      && (padding === 0 || bits.at(-1) >> padding === 0);
    let failures = 0;
    // Count every recorded bit; the padding check forbids hidden extra shots.
    for (const byte of bits) for (let offset = 0; offset < 8; offset++) failures += (byte >> offset) & 1;
    const countsMatch = packed && result.shots === request.shots && sampling.batchShots === request.shots
      && result.logicalErrors === failures && result.successfulShots === request.shots - failures;
    emit("counts.replayed", countsMatch, "Failures are independently counted from the packed per-shot record, including length and padding checks.");
    const expected = statistics(failures, request.shots);
    const close = (left, right) => Number.isFinite(left) && Number.isFinite(right) && Math.abs(left - right) <= tolerance;
    emit("logical-error-rate.replayed", countsMatch && close(result.logicalErrorRate, expected.logicalErrorRate), "Point estimate is failures / shots, tolerance 1e-15.");
    emit("standard-error.replayed", countsMatch && close(result.standardError, expected.standardError), "Binomial standard error is independently recomputed, tolerance 1e-15.");
    emit("uncertainty.replayed", countsMatch && close(result.wilson95.low, expected.wilson95.low)
      && close(result.wilson95.high, expected.wilson95.high), "Wilson score 95% interval, z=1.959963984540054, tolerance 1e-15; not a Wald interval.");
    for (const key of ["circuit", "detectorModel"]) {
      emit(`${key}.digest`, digest(facts[key].text) === facts[key].sha256, "SHA-256 is recomputed from the serialized scientific artifact.");
      observations.push(reference === undefined ? observe(`${key}.replayed`, "not_checked", "Requires independently regenerated Stim circuit and DEM.")
        : checked(`${key}.replayed`, Object.entries(reference[key] ?? {}).length > 0
          && ["sha256", "detectors", "observables", ...(key === "circuit" ? ["qubits"] : [])].every(field => facts[key][field] === reference[key]?.[field]),
        "Regenerated from the original basis, distance, rounds and all four declared noise channels; no Tool code imported."));
    }
    if (reference === undefined) {
      observations.push(observe("seed.replayed", "not_checked", "Requires the prepared Stim/PyMatching environment and the same machine/build/batch convention."));
    } else {
      const compatible = isDeepStrictEqual(reference.packages, facts.packages)
        && isDeepStrictEqual(reference.sampling?.runtime, sampling.runtime);
      observations.push(compatible ? checked("seed.replayed", isDeepStrictEqual(reference.sampling, sampling)
        && reference.shots === request.shots && reference.logicalErrors === failures,
      "Fresh reference process regenerated, sampled and decoded the request; sample hashes and per-shot failures match.")
        : observe("seed.replayed", "not_checked", "Package versions, machine or Stim implementation differ; exact replay is outside this recorded scope."));
    }
    observations.push(request.physicalErrorRate === 0
      ? checked("zero-noise.invariant", countsMatch && failures === 0, "The noiseless memory experiment must have no logical failures.")
      : observe("zero-noise.invariant", "not_checked", "Not applicable to a nonzero noise experiment."));
  }
  observations.push(observe("provenance.complete", "not_checked", "L2 does not bind Session events or materialize a Result Package; no Acceptance is derived."));
  return { schemaVersion: "1.0", observations };
}

/** Uses only the prepared, locked interpreter; never installs or imports Tool code. */
export async function replayExperiment(request, signal) {
  const issues = validateJsonWithSchema(request, requestSchema);
  if (issues.length) throw new TypeError(`Invalid reference request: ${issues.join("; ")}`);
  const environment = Object.fromEntries(["HOME", "PATH", "SYSTEMROOT", "TEMP", "TMP", "TMPDIR", "WINDIR"]
    .flatMap(name => process.env[name] ? [[name, process.env[name]]] : []));
  return runLocalJsonProcess({
    ...await preparedPythonLaunch({ skillRoot, args: [path.join(skillRoot, "validators/replay.py")] }),
    cwd: skillRoot, env: localComputeEnvironment(environment), input: request, signal,
    ...localComputeProcessOptions(), label: "Independent QEC replay",
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [filename, option] = process.argv.slice(2);
  if (!filename || option !== undefined && option !== "--replay") throw new Error("Usage: node validate-result.mjs result.json [--replay]");
  const facts = JSON.parse(readFileSync(filename, "utf8"));
  let reference;
  let unavailable;
  if (option === "--replay") {
    try { reference = await replayExperiment(facts.experiment); }
    catch (error) { unavailable = error.message; }
  }
  const validation = validateExperiment({ request: facts.experiment, facts, reference });
  if (unavailable) validation.observations.push(observe("replay.available", "not_checked", unavailable));
  console.log(JSON.stringify(validation, null, 2));
  if (validation.observations.some(item => item.status === "fail")) process.exitCode = 1;
  else if (unavailable) process.exitCode = 2;
}
