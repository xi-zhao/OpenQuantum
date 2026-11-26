import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { validateJsonWithSchema } from "../../.agents/skill-contracts/index.mjs";

export function observationAudit(moduleUrl, request, result) {
  const base = new URL("..", moduleUrl), observations = [];
  const emit = (id, ok, detail, observed) => {
    const item = { id, status: ok ? "pass" : "fail", detail, ...(observed === undefined ? {} : { observed }) };
    const index = observations.findIndex(o => o.id === id);
    if (index < 0) observations.push(item); else observations[index] = item;
  };
  const missing = (id, detail) => observations.push({ id, status: "not_checked", detail });
  const requestPath = fileURLToPath(new URL("inputs/request.schema.json", base));
  const schema = JSON.parse(readFileSync(requestPath));
  const input = { ...Object.fromEntries(Object.entries(schema.properties).filter(([, p]) => Object.hasOwn(p, "default")).map(([k, p]) => [k, structuredClone(p.default)])), ...structuredClone(request) };
  const requestIssues = validateJsonWithSchema(input, requestPath);
  emit("request.schema", !requestIssues.length, requestIssues.join("; ") || "Independently checked input contract.");
  const resultIssues = validateJsonWithSchema(result, fileURLToPath(new URL("artifacts/result.schema.json", base)));
  emit("artifact.schema", !resultIssues.length, resultIssues.join("; ") || "Independent result schema check.");
  return { input, emit, missing, valid: !requestIssues.length && !resultIssues.length,
    finish() { missing("provenance.complete", "Execution observations only; no materialized Session provenance or final Acceptance."); return { schemaVersion: "1.0", observations }; } };
}
