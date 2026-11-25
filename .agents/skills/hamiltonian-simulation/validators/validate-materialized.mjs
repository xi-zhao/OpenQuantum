import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { validateSimulation, referenceSimulation, normalizeRequest } from "./validate-result.mjs";
import auditProfile from "../acceptance-profiles/pauli-evolution-reference-audit-v1.json" with { type: "json" };

export function normalizeAuditRequest(request) {
  const value = normalizeRequest(request);
  if (value.numQubits > 6 || value.terms.length > 64 || value.steps > 1024
    || value.method === "trotter" && ![1, 2, 4].includes(value.order)
    || value.outputMode !== "statevector" || value.referenceMode === "skip") {
    throw new TypeError("Hamiltonian acceptance scope requires <=6 qubits, <=64 terms, <=1024 steps, order 1/2/4 and dense statevector reference");
  }
  return value;
}

function matchesBytes(value, ref) {
  const text = `${JSON.stringify(value, null, 2)}\n`;
  return ref?.bytes === Buffer.byteLength(text)
    && ref.sha256 === createHash("sha256").update(text).digest("hex");
}

/** Only the Materializer supplies persisted bytes and a centrally loaded package. */
export async function validateMaterializedResult({ request, result, resultPackage, profile, signal,
  referenceImplementation = referenceSimulation }) {
  normalizeAuditRequest(request);
  if (profile?.id !== auditProfile.id || profile.version !== auditProfile.version
    || !isDeepStrictEqual(profile.checks, auditProfile.checks)) throw new Error("Validator and Acceptance Profile differ");
  let reference;
  try { reference = await referenceImplementation(request, signal); } catch (error) {
    if (signal?.aborted) throw error;
    // Missing prepared runtime is explicit uncertainty, never automatic installation.
  }
  signal?.throwIfAborted();
  const computation = validateSimulation({ request, result, reference });
  const value = resultPackage?.value;
  const input = value?.inputs?.[0], artifact = value?.artifacts?.[0];
  const complete = resultPackage?.kind === "openquantum-result-package-v1.1"
    && value.capability?.id === "hamiltonian-simulation" && value.inputs?.length === 1
    && input?.type === "experiment-request" && value.artifacts?.length === 1 && artifact?.type === "hamiltonian-result"
    && typeof value.executionRef?.sessionId === "string" && value.executionRef.sessionId.length > 0
    && Number.isSafeInteger(value.executionRef.eventRange?.from) && Number.isSafeInteger(value.executionRef.eventRange?.to)
    && value.executionRef.eventRange.from >= 0 && value.executionRef.eventRange.from < value.executionRef.eventRange.to
    && matchesBytes(request, input) && matchesBytes(result, artifact);
  const refs = [...(input ? [{ kind: "input", id: input.id }] : []), ...(artifact ? [{ kind: "artifact", id: artifact.id }] : [])];
  const byId = new Map(computation.observations.map(item => [item.id, item]));
  const observations = auditProfile.checks.map(check => {
    let item = byId.get(check.id) ?? { id: check.id, status: "not_checked", detail: "Required independent reference is unavailable." };
    if (check.id === "seed.replayed" && request.method === "trotter"
      || check.id === "trotter.error-bound" && request.method === "qdrift") {
      item = { ...item, status: "pass", detail: "This method does not assert this method-specific claim." };
    }
    if (byId.get("reference.structure")?.status === "fail" && check.id === "reference.binding") {
      item = { ...item, status: "fail", detail: "Independent reference has invalid structure." };
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
