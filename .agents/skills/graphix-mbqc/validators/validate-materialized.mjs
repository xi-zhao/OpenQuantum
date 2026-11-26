import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";
import { validateJsonWithSchema } from "../../../skill-contracts/index.mjs";
import { checkGates } from "../../../../src/lib/independent-quantum-math.mjs";
import { validateResult } from "./validate-result.mjs";
import requestSchema from "../inputs/request.schema.json" with { type: "json" };
import auditProfile from "../acceptance-profiles/graphix-mbqc-pattern-audit-v1.json" with { type: "json" };

const requestSchemaPath = fileURLToPath(new URL("../inputs/request.schema.json", import.meta.url));
const defaults = Object.fromEntries(
  Object.entries(requestSchema.properties).filter(([, prop]) => Object.hasOwn(prop, "default")).map(([key, prop]) => [key, prop.default]),
);

export function normalizeAuditRequest(request) {
  if (!request || typeof request !== "object" || Array.isArray(request)) throw new TypeError("Graphix audit request must be an object");
  const input = { ...structuredClone(defaults), ...structuredClone(request) };
  const issues = validateJsonWithSchema(input, requestSchemaPath);
  if (issues.length) throw new TypeError(issues.join("; "));
  checkGates(input.numQubits, input.gates);
  if (!Number.isSafeInteger(input.seed + input.branches - 1)) throw new TypeError("Branch seeds must be exactly representable integers");
  if (!input.simulate && input.referenceMode === "required") throw new TypeError("An output-state reference requires simulate=true");
  return input;
}

function matchesBytes(value, ref) {
  const bytes = `${JSON.stringify(value, null, 2)}\n`;
  return ref?.bytes === Buffer.byteLength(bytes) && ref.sha256 === createHash("sha256").update(bytes).digest("hex");
}

function aggregateBranches(observations, pattern, expectedBranches, missingRef, emptyPassDetail, passDetail) {
  const matched = observations.filter(o => pattern.test(o.id));
  if (matched.some(o => o.status === "fail")) {
    return { status: "fail", detail: matched.find(o => o.status === "fail").detail };
  }
  if (missingRef) return { status: "not_checked", detail: missingRef.detail };
  if (expectedBranches === 0 && emptyPassDetail) return { status: "pass", detail: emptyPassDetail };
  if (matched.length >= expectedBranches && expectedBranches > 0 && matched.every(o => o.status === "pass")) {
    return { status: "pass", detail: passDetail };
  }
  return { status: "not_checked", detail: "Independent branch replay unavailable for this input." };
}

/** Consumes only the Materializer's re-read bytes and checked provenance. */
export async function validateMaterializedResult({ request, result, resultPackage, profile, signal }) {
  const inputReq = normalizeAuditRequest(request);
  signal?.throwIfAborted();
  if (!profile || !Object.entries(auditProfile).every(([key, value]) => isDeepStrictEqual(profile[key], value))) {
    throw new Error("Validator and Acceptance Profile differ");
  }
  const computation = validateResult({ request, result });
  const value = resultPackage?.value, input = value?.inputs?.[0], artifact = value?.artifacts?.[0];
  const complete = resultPackage?.kind === "openquantum-result-package-v1.1"
    && value.capability?.id === "graphix-mbqc" && value.inputs?.length === 1 && value.artifacts?.length === 1
    && input?.type === "experiment-request" && artifact?.type === "numerical-result"
    && typeof value.executionRef?.sessionId === "string" && value.executionRef.sessionId.length > 0
    && Number.isSafeInteger(value.executionRef.eventRange?.from) && Number.isSafeInteger(value.executionRef.eventRange?.to)
    && value.executionRef.eventRange.from >= 0 && value.executionRef.eventRange.from < value.executionRef.eventRange.to
    && matchesBytes(request, input) && matchesBytes(result, artifact);
  const refs = [...(input ? [{ kind: "input", id: input.id }] : []), ...(artifact ? [{ kind: "artifact", id: artifact.id }] : [])];
  const byId = new Map(computation.observations.map(item => [item.id, item]));
  const missingRef = byId.get("state.reference")?.status === "not_checked" ? byId.get("state.reference") : undefined;
  const expectedBranches = inputReq.simulate ? inputReq.branches : 0;
  const branchNorm = aggregateBranches(
    computation.observations, /^branch-\d+\.normalization$/, expectedBranches, undefined,
    "Pattern-only generation mode (simulate=false) has no simulated branches.",
    `All ${expectedBranches} simulated branch statevectors are normalized and match reported normError.`,
  );
  const branchState = aggregateBranches(
    computation.observations, /^branch-\d+\.(?:state|claims)$/, expectedBranches * 2, missingRef,
    undefined,
    `All ${expectedBranches} sampled branches match independent gate-model statevector, Born probabilities and reported fidelity.`,
  );
  const branchCorrections = aggregateBranches(
    computation.observations, /^branch-\d+\.corrections$/, expectedBranches, missingRef,
    undefined,
    `All ${expectedBranches} sampled branches match independent adaptive XY projection and X/Z byproduct replay.`,
  );
  const observations = auditProfile.checks.map(check => {
    let item = byId.get(check.id) ?? { status: "not_checked", detail: "Independent evidence unavailable." };
    if (check.id === "branches.normalization") item = branchNorm;
    if (check.id === "branches.state") item = branchState;
    if (check.id === "branches.corrections") item = branchCorrections;
    if (check.id === "reference.claims" && !byId.has("reference.claims") && branchState.status === "pass" && result?.reference?.status !== "computed") {
      item = { status: "pass", detail: "Tool did not assert a computed gate-model reference claim." };
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
