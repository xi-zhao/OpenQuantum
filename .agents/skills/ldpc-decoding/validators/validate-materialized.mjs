import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { normalizeRequest, validateDecoding, replayDecoding } from "./validate-result.mjs";
import auditProfile from "../acceptance-profiles/ldpc-syndrome-replay-audit-v1.json" with { type: "json" };

export function normalizeAuditRequest(request) {
  const input = normalizeRequest(request);
  if (input.parityCheck.length > 256 || input.parityCheck[0].length > 256 || input.syndromes.length > 1024) throw new TypeError("LDPC audit requires H<=256x256 and <=1024 samples");
  return input;
}
function matchesBytes(value, ref) {
  const bytes = `${JSON.stringify(value, null, 2)}\n`;
  return ref?.bytes === Buffer.byteLength(bytes) && ref.sha256 === createHash("sha256").update(bytes).digest("hex");
}

/** Consumes only the Materializer's re-read bytes and checked provenance. */
export async function validateMaterializedResult({ request, result, resultPackage, profile, signal, runReferenceProcess }) {
  normalizeAuditRequest(request);
  signal?.throwIfAborted();
  if (!profile || !Object.entries(auditProfile).every(([key, value]) => isDeepStrictEqual(profile[key], value))) throw new Error("Validator and Acceptance Profile differ");
  let reference;
  try {
    if (typeof runReferenceProcess !== "function") throw new Error("Full-sandbox reference runner is required");
    reference = await replayDecoding(request, signal, runReferenceProcess);
  } catch (error) { if (signal?.aborted) throw error; }
  signal?.throwIfAborted();
  const computation = validateDecoding({ request, result, reference });
  const value = resultPackage?.value, input = value?.inputs?.[0], artifact = value?.artifacts?.[0];
  const complete = resultPackage?.kind === "openquantum-result-package-v1.1"
    && value.capability?.id === "ldpc-decoding" && value.inputs?.length === 1 && value.artifacts?.length === 1
    && input?.type === "experiment-request" && artifact?.type === "ldpc-result"
    && typeof value.executionRef?.sessionId === "string" && value.executionRef.sessionId.length > 0
    && Number.isSafeInteger(value.executionRef.eventRange?.from) && Number.isSafeInteger(value.executionRef.eventRange?.to)
    && value.executionRef.eventRange.from >= 0 && value.executionRef.eventRange.from < value.executionRef.eventRange.to
    && matchesBytes(request, input) && matchesBytes(result, artifact);
  const refs = [...(input ? [{ kind: "input", id: input.id }] : []), ...(artifact ? [{ kind: "artifact", id: artifact.id }] : [])];
  const byId = new Map(computation.observations.map(item => [item.id, item]));
  const observations = auditProfile.checks.map(check => {
    let item = byId.get(check.id) ?? { status: "not_checked", detail: "Independent evidence unavailable." };
    if (!request.logicalObservables && check.id === "logical.replayed") item = { status: "pass", detail: "No logical success claim; parity alone is not logical correction." };
    if (check.id === "observations.integrity") item = { status: computation.observations.some(o => o.status === "fail") ? "fail" : "pass", detail: "Any independently detected contradiction fails the audit, including optional checks." };
    if (check.id === "provenance.complete") item = { status: complete ? "pass" : "fail", detail: "Re-read bytes bind to the actual input, artifact and Harness event range." };
    return { id: check.id, status: item.status, observed: { detail: item.detail }, evidenceRefs: refs,
      ...(item.status === "pass" ? {} : { nextAction: "Inspect the saved evidence and rerun all missing checks in the pinned environment." }) };
  });
  return { scopeMatch: { status: "in_scope", statement: auditProfile.checks[0].criterion, evidenceRefs: refs.slice(0, 1) },
    observations, limitations: auditProfile.scope.outOfScope,
    statement: "Only the central Acceptance Builder derives scientific Acceptance from these persisted observations." };
}
