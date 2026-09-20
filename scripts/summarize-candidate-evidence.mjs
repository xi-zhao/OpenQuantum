import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const raw = path.join(root, ".openquantum/candidate-tools-evidence");
const digest = value => createHash("sha256").update(value).digest("hex");
const readJson = async name => JSON.parse(await readFile(path.join(raw, name), "utf8"));
const groups = {
  "qcut-knitting": ["phase-bell", "reverse-automatic", "reverse-explicit", "skip-reference"],
  "compact-optimization": ["phase-gadget", "reverse-wire", "skip-reference", "identity"],
  "openqarp-excited-states": ["complex-Y", "asymmetric-with-offset", "budget-exhausted", "skip-spectrum"],
  "cqlib-kernel": ["held-out-angle", "changed-test-only", "signed-angle-duplicates"],
};
const cases = [];
for (const [id, labels] of Object.entries(groups)) {
  const { definition } = await import(`../.agents/skills/${id}/mcp/contracts.mjs`);
  const lock = digest(await readFile(path.join(root, ".agents/skills", id, "uv.lock")));
  for (const label of labels) {
    const artifact = `${id}-${label}.json`;
    const { verifiedAt, ...output } = await readJson(artifact);
    assert.ok(definition.validateOutput(output), `${artifact}: result schema changed; rerun live verification`);
    assert.equal(output.scientificValidation, "not_evaluated");
    assert.equal(output.inputSha256, digest(JSON.stringify(output.input)));
    assert.equal(output.dependencyLockSha256, lock);
    if (id === "cqlib-kernel") assert.equal(output.result.sourceTreeSha256, digest(await readFile(path.join(root, ".agents/skills/cqlib-kernel/upstream/provenance.json"))));
    cases.push({ artifact, verifiedAt, artifactSha256: digest(await readFile(path.join(raw, artifact))), ...output });
  }
}
const session = await readJson("harness-session.json");
const results = session.events.filter(event => event.type === "tool/result").map(event => event.data.message.content.find(block => block.type === "tool-result"));
assert.equal(results.length, 6);
assert.equal(results.filter(result => result.isError).length, 1);
const flag = await readJson("flagquantum-live.json");
assert.equal(flag.analysis.structuredContent.status, "success");
assert.equal(flag.simulation.structuredContent.status, "success");
assert.equal(flag.invalid.structuredContent.status, "error");
const regressions = await Promise.all(["compiler_regressions.py.json", "qec_burst_regression.py.json"].map(readJson));
for (const result of regressions) assert.equal(result.passed, result.denominator);
const tracked = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" }).split("\0").filter(Boolean);
const sourcePaths = tracked.filter(file =>
  /^(\.agents\/skills\/(qcut-knitting|compact-optimization|openqarp-excited-states|cqlib-kernel|flagquantum-workbench)\/|benchmarks\/candidate-libraries\/)/.test(file) ||
  /^(src\/lib\/(candidate-circuit.mjs|candidate_science.py|bounded-science-mcp.mjs)|tests\/(candidate-|flagquantum-|harness-candidate-|fixtures\/candidate-))/.test(file) ||
  [".agents/skills/qec-memory-experiment/uv.lock", ".agents/capability-packages.yml", "runtime/openquantum/agent-presets/openquantum/agent.cordis.yml", "scripts/setup-paper-tools.mjs", "scripts/summarize-candidate-evidence.mjs"].includes(file));
const sourceMap = Object.fromEntries(await Promise.all(sourcePaths.map(async file => [file, digest(await readFile(path.join(root, file)))])));
const summary = {
  schemaVersion: "1.0", verifiedAt: new Date().toISOString(), implementationBase: "3f43b6e",
  scope: "Local dependency, MCP, numerical and Harness integration evidence; no external model, hardware or final scientific Acceptance",
  scientificValidation: "not_evaluated",
  liveMcp: { expectedCases: 15, deliveredCases: cases.length, cases },
  upstreamMcp: { name: "FlagQuantum", version: "0.3.0", sdkVersion: "0.2.0", declaredTools: 17, scope: "Full schema snapshot compared; numerical smoke covers Bell probabilities and analysis, not all upstream algorithms", results: flag },
  harness: { sessionId: session.sessionId, model: session.model, externalModelTested: false, toolResults: results.length, successes: 5, expectedInputRejections: 1, eventArtifactSha256: digest(await readFile(path.join(raw, "harness-session.json"))) },
  developmentRegressions: regressions,
  limitations: ["QCut wire/sample/consolidated cuts are outside this adapter", "Compact upstream tiers are not independently trusted; unverified candidates remain unverified", "cqlib gradient/amplitude/training paths are excluded; Rust beta SDK and audited source adaptation required", "Stim 1.16.0 unfinished tag EOF is a known parser defect, observed only in a bounded subprocess", "Four local-burst samples showed no difference between baseline and informed decoders", "The original checkout's staged Graphix/PyZX/Symmer/PauLie work is not included"],
  independentReview: "candidate-domain-review-2026-09-20.json",
  sourceMap,
};
const destination = path.join(root, "docs/integrations/evidence/candidates-2026-09-20.json");
await mkdir(path.dirname(destination), { recursive: true });
await writeFile(destination, `${JSON.stringify(summary, null, 2)}\n`);
console.log(JSON.stringify({ destination: path.relative(root, destination), liveCases: cases.length, harnessResults: results.length, regressionCases: regressions.map(r => r.denominator) }));
