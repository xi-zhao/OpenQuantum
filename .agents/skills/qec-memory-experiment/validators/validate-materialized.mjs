import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { validateJsonWithSchema } from "../../../skill-contracts/index.mjs";
import { validateExperiment, replayExperiment } from "./validate-result.mjs";
import auditProfile from "../acceptance-profiles/rotated-surface-memory-audit-v1.json" with { type: "json" };

export function normalizeAuditRequest(request) {
  const issues = validateJsonWithSchema(request, fileURLToPath(new URL("../inputs/request.schema.json", import.meta.url)));
  if (issues.length || request.distance > 11 || request.rounds > 100 || request.shots > 100000) {
    throw new TypeError("QEC acceptance scope requires valid input, distance <=11, rounds <=100 and shots <=100000");
  }
  return { ...request, physicalErrorRate: request.physicalErrorRate === 0 ? 0 : request.physicalErrorRate };
}

function matchesBytes(value, ref) {
  const text = `${JSON.stringify(value, null, 2)}\n`;
  return ref?.bytes === Buffer.byteLength(text)
    && ref.sha256 === createHash("sha256").update(text).digest("hex");
}

/** Only the Materializer supplies persisted bytes and a centrally loaded package. */
export async function validateMaterializedResult({ request, facts, resultPackage, profile, signal, runReferenceProcess,
  referenceImplementation = replayExperiment }) {
  normalizeAuditRequest(request);
  if (profile?.id !== auditProfile.id || profile.version !== auditProfile.version
    || !isDeepStrictEqual(profile.checks, auditProfile.checks)) throw new Error("Validator and Acceptance Profile differ");
  let reference;
  try { reference = await referenceImplementation(request, signal, runReferenceProcess); } catch (error) {
    if (signal?.aborted) throw error;
    // Missing prepared runtime is explicit uncertainty, never automatic installation.
  }
  signal?.throwIfAborted();
  const computation = validateExperiment({ request, facts, reference });
  const value = resultPackage?.value;
  const input = value?.inputs?.[0], artifact = value?.artifacts?.[0];
  const complete = resultPackage?.kind === "openquantum-result-package-v1.1"
    && value.capability?.id === "qec-memory-experiment" && value.inputs?.length === 1
    && input?.type === "experiment-request" && value.artifacts?.length === 1 && artifact?.type === "memory-result"
    && typeof value.executionRef?.sessionId === "string" && value.executionRef.sessionId.length > 0
    && Number.isSafeInteger(value.executionRef.eventRange?.from) && Number.isSafeInteger(value.executionRef.eventRange?.to)
    && value.executionRef.eventRange.from >= 0 && value.executionRef.eventRange.from < value.executionRef.eventRange.to
    && matchesBytes(request, input) && matchesBytes(facts, artifact);
  const refs = [...(input ? [{ kind: "input", id: input.id }] : []), ...(artifact ? [{ kind: "artifact", id: artifact.id }] : [])];
  const byId = new Map(computation.observations.map(item => [item.id, item]));
  const observations = auditProfile.checks.map(check => {
    let item = byId.get(check.id.replace("detector-model.", "detectorModel.")) ?? { id: check.id, status: "not_checked", detail: "Required independent reference is unavailable." };
    if (check.id === "zero-noise.invariant" && request.physicalErrorRate !== 0) {
      item = { ...item, status: "pass", detail: "Nonzero-noise input: the conditional zero-noise invariant does not apply; no zero-noise claim." };
    }
    if (check.id === "provenance.complete") item = { ...item, status: complete ? "pass" : "fail", detail: "Re-read canonical bytes bind to input/artifact digests and the actual Harness execution range." };
    const status = item.status === "not_checked" ? "warn" : item.status;
    return { id: check.id, status, observed: { detail: item.detail }, evidenceRefs: refs,
      ...(status === "pass" ? {} : { nextAction: "Inspect persisted evidence and rerun the independent reference in the recorded pinned environment." }) };
  });
  return {
    scopeMatch: { status: "in_scope", statement: auditProfile.checks[0].criterion, evidenceRefs: refs.slice(0, 1) },
    observations, limitations: auditProfile.scope.outOfScope,
    statement: "Independent observations use persisted input and artifacts; only the central Acceptance Builder derives the final status.",
  };
}
