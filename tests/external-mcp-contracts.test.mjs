import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { parseDocument } from "yaml";

import { readExternalMcpReview, inspectReviewedMcpSource } from "../scripts/check-reviewed-mcp-source.mjs";
import { auditCapabilityPackages } from "../scripts/lib/capability-package-audit.mjs";
import { qpandaRuntimeMcpIntegration } from "../src/settings/server/qpanda-runtime-mcp.mjs";
import { quantumHardwareMcpIntegration } from "../src/settings/server/quantum-hardware-mcp.mjs";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const review = readExternalMcpReview();

test("every opt-in external MCP contract matches reviewed Tools, effects and deployment pins", async () => {
  const report = await auditCapabilityPackages({ projectRoot });
  assert.equal(report.status, "pass", report.issues.join("\n"));
  const externalServers = report.packages.flatMap((capability) =>
    capability.execution.mcpServers
      .filter((server) => server.source === "external" && server.activation === "opt-in")
      .map((server) => ({ ...server, capabilityId: capability.id })),
  );
  assert.equal(review.schemaVersion, "1.0");
  assert.equal(review.scope, "reviewed-source");
  assert.deepEqual(externalServers.map((s) => s.name).sort(), review.servers.map((s) => s.serverName).sort());
  const preset = parseDocument(await fs.readFile(path.join(projectRoot, "runtime/openquantum/agent-presets/openquantum/agent.cordis.yml"), "utf8")).toJS();
  const gitSources = { qpanda_runtime: qpandaRuntimeMcpIntegration, quantum_hardware: quantumHardwareMcpIntegration };
  for (const server of externalServers) {
    const evidence = review.servers.find((s) => s.serverName === server.name);
    assert.equal(server.capabilityId, evidence.capabilityId);
    assert.equal(server.effectEvidence, "reviewed-source");
    assert.deepEqual(server.tools, evidence.tools.map(({ name, effect }) => ({ name, effect })));
    assert.equal(new Set(evidence.tools.map((t) => t.name)).size, evidence.tools.length);
    const entry = preset.find((p) => p.config?.serverName === server.name);
    assert.equal(entry.disabled, true, `${server.name} must remain opt-in`);
    if (evidence.pin.kind === "pypi") {
      assert.deepEqual(entry.config.args, ["--from", evidence.pin.packageSpec, evidence.pin.packageSpec.split("==")[0]]);
    } else {
      assert.equal(evidence.pin.kind, "git");
      const source = gitSources[server.name];
      assert.equal(source.revision, evidence.pin.revision);
      assert.equal(entry.config.command, "uv");
      assert.equal(entry.config.cwd, `process.cwd() + '/${source.relativeRoot}'`);
      assert.deepEqual(entry.config.args, server.name === "quantum_hardware"
        ? ["run", "--with-requirements", `process.cwd() + '/${source.relativeRoot}/requirements.txt'`, "python", `process.cwd() + '/${source.entry}'`]
        : ["run", "--project", `process.cwd() + '/${source.relativeRoot}'`, "python", "-m", "qpanda3_runtime_mcp_server"]);
    }
    for (const tool of evidence.tools) {
      assert.ok(review.effectReasons[tool.reason], `${tool.name} lacks effect rationale`);
      assert.ok(evidence.files.some((file) => file.path === tool.file && /^[a-f0-9]{64}$/.test(file.sha256)));
      assert.ok(Number.isSafeInteger(tool.line) && tool.line > 0);
    }
  }
});

test("source review checks fail closed for tampering, missing files and unsafe references", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "openquantum-source-review-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const source = "raise RuntimeError('must never be executed by the reviewer')\n";
  await fs.writeFile(path.join(root, "server.py"), source);
  const record = { serverName: "fixture", files: [{ path: "server.py", sha256: createHash("sha256").update(source).digest("hex") }] };
  assert.equal(inspectReviewedMcpSource(record, root).status, "pass");
  assert.equal(inspectReviewedMcpSource(record, root).runtimeExecuted, false);
  await fs.writeFile(path.join(root, "server.py"), `${source}# unreviewed change\n`);
  assert.match(inspectReviewedMcpSource(record, root).issues[0], /hash mismatch/);
  for (const filePath of ["missing.py", "../server.py", "/server.py", "./server.py"]) {
    const changed = { ...record, files: [{ ...record.files[0], path: filePath }] };
    assert.equal(inspectReviewedMcpSource(changed, root).status, "fail");
  }
  await fs.symlink("server.py", path.join(root, "linked.py"));
  assert.equal(inspectReviewedMcpSource({ ...record, files: [{ ...record.files[0], path: "linked.py" }] }, root).status, "fail");
});
