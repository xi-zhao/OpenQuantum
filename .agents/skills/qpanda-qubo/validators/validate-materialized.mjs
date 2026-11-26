import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { assembleQubo, validateQubo } from "./validate-result.mjs";
import auditProfile from "../acceptance-profiles/qubo-algebraic-optimality-audit-v1.json" with { type: "json" };

export function normalizeAuditRequest(request) {
  assembleQubo(request);
  return structuredClone(request);
}
function matchesBytes(value, ref) {
  const bytes = `${JSON.stringify(value, null, 2)}\n`;
  return ref?.bytes === Buffer.byteLength(bytes) && ref.sha256 === createHash("sha256").update(bytes).digest("hex");
}

/** Consumes only the Materializer's re-read bytes and checked provenance. */
export async function validateMaterializedResult({ request, result, resultPackage, profile, signal }) {
  normalizeAuditRequest(request);
  signal?.throwIfAborted();
  if (!profile || !Object.entries(auditProfile).every(([key, value]) => isDeepStrictEqual(profile[key], value))) throw new Error("Validator and Acceptance Profile differ");
  const computation = validateQubo({ request, result });
  const value = resultPackage?.value, input = value?.inputs?.[0], artifact = value?.artifacts?.[0];
  const complete = resultPackage?.kind === "openquantum-result-package-v1.1"
    && value.capability?.id === "qpanda-qubo" && value.inputs?.length === 1 && value.artifacts?.length === 1
    && input?.type === "experiment-request" && artifact?.type === "qubo-result"
    && typeof value.executionRef?.sessionId === "string" && value.executionRef.sessionId.length > 0
    && Number.isSafeInteger(value.executionRef.eventRange?.from) && Number.isSafeInteger(value.executionRef.eventRange?.to)
    && value.executionRef.eventRange.from >= 0 && value.executionRef.eventRange.from < value.executionRef.eventRange.to
    && matchesBytes(request, input) && matchesBytes(result, artifact);
  const refs = [...(input ? [{ kind: "input", id: input.id }] : []), ...(artifact ? [{ kind: "artifact", id: artifact.id }] : [])];
  const byId = new Map(computation.observations.map(item => [item.id, item]));
  const observations = auditProfile.checks.map(check => {
    let item = byId.get(check.id) ?? { status: "not_checked", detail: "Independent evidence unavailable." };
    if ((!request.model && /^(compilation\.|constraints\.|penalty\.|reference\.)/.test(check.id))
      || (!result.quantum && !result.solver?.quantum && check.id === "quantum.distribution")
      || (!(result.solver ?? result).classical && check.id === "solver.solution-energy")) {
      item = { status: "pass", detail: "This input does not assert this method-specific claim." };
    }
    if (check.id === "observations.integrity") item = { status: computation.observations.some(o => o.status === "fail") ? "fail" : "pass", detail: "Any independently detected contradiction fails the audit, including optional checks." };
    if (check.id === "provenance.complete") item = { status: complete ? "pass" : "fail", detail: "Re-read bytes bind to the actual input, artifact and Harness event range." };
    return { id: check.id, status: item.status, observed: { detail: item.detail }, evidenceRefs: refs,
      ...(item.status === "pass" ? {} : { nextAction: "Inspect the saved evidence and rerun all missing checks in the pinned environment." }) };
  });
  return { scopeMatch: { status: "in_scope", statement: auditProfile.checks[0].criterion, evidenceRefs: refs.slice(0, 1) },
    observations, limitations: auditProfile.scope.outOfScope,
    statement: "Only the central Acceptance Builder derives scientific Acceptance from these persisted observations." };
}
