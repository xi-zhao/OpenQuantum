import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";
import { validateJsonWithSchema } from "../../../skill-contracts/index.mjs";
import { checkGates } from "../../../../src/lib/independent-quantum-math.mjs";
import { validateResult } from "./validate-result.mjs";
import requestSchema from "../inputs/request.schema.json" with { type: "json" };
import auditProfile from "../acceptance-profiles/pyzx-unitary-optimization-audit-v1.json" with { type: "json" };

const requestSchemaPath = fileURLToPath(new URL("../inputs/request.schema.json", import.meta.url));
const defaults = Object.fromEntries(
  Object.entries(requestSchema.properties).filter(([, prop]) => Object.hasOwn(prop, "default")).map(([key, prop]) => [key, prop.default]),
);

export function normalizeAuditRequest(request) {
  if (!request || typeof request !== "object" || Array.isArray(request)) throw new TypeError("PyZX audit request must be an object");
  const input = { ...structuredClone(defaults), ...structuredClone(request) };
  const issues = validateJsonWithSchema(input, requestSchemaPath);
  if (issues.length) throw new TypeError(issues.join("; "));
  checkGates(input.numQubits, input.gates);
  return input;
}

function matchesBytes(value, ref) {
  const bytes = `${JSON.stringify(value, null, 2)}\n`;
  return ref?.bytes === Buffer.byteLength(bytes) && ref.sha256 === createHash("sha256").update(bytes).digest("hex");
}

/** Consumes only the Materializer's re-read bytes and checked provenance. */
export async function validateMaterializedResult({ request, result, resultPackage, profile, signal }) {
  normalizeAuditRequest(request);
  signal?.throwIfAborted();
  if (!profile || !Object.entries(auditProfile).every(([key, value]) => isDeepStrictEqual(profile[key], value))) {
    throw new Error("Validator and Acceptance Profile differ");
  }
  const computation = validateResult({ request, result });
  const value = resultPackage?.value, input = value?.inputs?.[0], artifact = value?.artifacts?.[0];
  const complete = resultPackage?.kind === "openquantum-result-package-v1.1"
    && value.capability?.id === "pyzx-optimization" && value.inputs?.length === 1 && value.artifacts?.length === 1
    && input?.type === "experiment-request" && artifact?.type === "numerical-result"
    && typeof value.executionRef?.sessionId === "string" && value.executionRef.sessionId.length > 0
    && Number.isSafeInteger(value.executionRef.eventRange?.from) && Number.isSafeInteger(value.executionRef.eventRange?.to)
    && value.executionRef.eventRange.from >= 0 && value.executionRef.eventRange.from < value.executionRef.eventRange.to
    && matchesBytes(request, input) && matchesBytes(result, artifact);
  const refs = [...(input ? [{ kind: "input", id: input.id }] : []), ...(artifact ? [{ kind: "artifact", id: artifact.id }] : [])];
  const byId = new Map(computation.observations.map(item => [item.id, item]));
  const densePassed = byId.get("unitary.equivalence")?.status === "pass";
  const observations = auditProfile.checks.map(check => {
    let item = byId.get(check.id) ?? { status: "not_checked", detail: "Independent evidence unavailable." };
    if (check.id === "unitary.claims" && !byId.has("unitary.claims") && densePassed && result?.reference?.status !== "computed") {
      item = { status: "pass", detail: "Tool did not assert a computed unitary reference error claim." };
    }
    if (check.id === "observations.integrity") {
      item = { status: computation.observations.some(o => o.status === "fail") ? "fail" : "pass", detail: "Any independently detected contradiction fails the audit, including optional checks." };
    }
    if (check.id === "provenance.complete") {
      item = { status: complete ? "pass" : "fail", detail: "Re-read bytes bind to the actual input, artifact and Harness event range." };
    }
    return { id: check.id, status: item.status, observed: { detail: item.detail }, evidenceRefs: refs,
      ...(item.status === "pass" ? {} : { nextAction: "Inspect the saved evidence and rerun all missing checks in the pinned environment." }) };
  });
  return { scopeMatch: { status: "in_scope", statement: auditProfile.checks[0].criterion, evidenceRefs: refs.slice(0, 1) },
    observations, limitations: auditProfile.scope.outOfScope,
    statement: "Only the central Acceptance Builder derives scientific Acceptance from these persisted observations." };
}
