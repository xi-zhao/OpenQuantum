import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { createHash, randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { execFileSync } from "node:child_process";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { Environments, runningJob } from "../src/settings/codex/environments.mjs";
import { EXECUTE_TOOL } from "../runtime/chatgpt/agent-tools.mjs";
import { DISCOVER_TOOL, PREPARE_TOOL } from "../src/settings/codex/preparation.mjs";

const root = path.resolve(import.meta.dirname, "..");
const selection = { skillId: "braket-simulation", toolName: "simulate_braket_circuit" };
// Includes an idle wire so that this checks the actual adapter's wire and bit
// conventions as well as the installation/continuation protocol.
const input = { numQubits: 3, gates: [{ gate: "H", targets: [0] }, { gate: "CX", targets: [0, 1] }] };
const hash = bytes => createHash("sha256").update(bytes).digest("hex");

test("real Braket cold install, same-conversation continuation, reuse and reconnect", {
  skip: process.env.OPENQUANTUM_REAL_ON_DEMAND !== "1", timeout: 300000,
}, async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "oq-on-demand-live-"));
  const settingsHome = path.join(directory, "settings");
  const environment = Object.fromEntries(["HOME", "PATH", "TMPDIR", "SYSTEMROOT", "WINDIR", "HTTP_PROXY", "HTTPS_PROXY", "ALL_PROXY", "NO_PROXY", "SSL_CERT_FILE", "SSL_CERT_DIR", "UV_CACHE_DIR", "UV_PYTHON_INSTALL_DIR"].filter(key => process.env[key]).map(key => [key, process.env[key]]));
  environment.PATH = `${path.dirname(process.execPath)}${path.delimiter}${environment.PATH ?? ""}`;
  Object.assign(environment, { CODEX_HOME: path.join(directory, "codex"), OPENQUANTUM_PLUGIN_SETTINGS_HOME: settingsHome,
    OPENQUANTUM_PLUGIN_CREDENTIAL_SERVICE: `org.openquantum.test.${randomUUID()}` });
  const manager = new Environments({ root, directory: settingsHome, environment });
  const sourceFiles = ["runtime/chatgpt/agent-tools.mjs", "runtime/chatgpt/server.mjs", "src/settings/codex/application.mjs", "src/settings/codex/preparation.mjs", "src/settings/codex/environments.mjs", "tests/codex-plugin-on-demand-live.test.mjs"];
  const sourceHashes = () => Promise.all(sourceFiles.map(async file => [file, hash(await fs.readFile(path.join(root, file)))]));
  const sourceSha256 = Object.fromEntries(await sourceHashes());
  const clients = [];
  t.after(async () => {
    await Promise.all(clients.map(client => client.close()));
    const record = await manager.read(selection.skillId).catch(() => null);
    if (runningJob(record?.job)) {
      await manager.cancel(selection.skillId, record.job.id);
      const until = Date.now() + 10000;
      while (runningJob((await manager.status(selection.skillId)).job) && Date.now() < until) await delay(50);
    }
    await fs.rm(directory, { recursive: true, force: true });
  });
  const connect = async () => {
    const client = new Client({ name: "on-demand-acceptance", version: "1" });
    clients.push(client);
    const transport = new StdioClientTransport({ command: process.execPath, args: [path.join(root, "runtime/chatgpt/main.mjs"), "--stdio"], cwd: root, env: environment, stderr: "pipe" });
    transport.stderr?.resume();
    await client.connect(transport, { timeout: 60000 });
    return client;
  };
  const call = async (client, name, args) => {
    const result = await client.callTool({ name, arguments: args }, undefined, { timeout: 180000 });
    assert.ok(!result.isError, result.content?.find(item => item.type === "text")?.text);
    return result.structuredContent ?? JSON.parse(result.content[0].text);
  };
  const surface = async client => (await client.listTools()).tools.filter(tool => !tool._meta?.ui?.visibility || tool._meta.ui.visibility.includes("model")).map(tool => tool.name).sort();
  const expectedSurface = [DISCOVER_TOOL, PREPARE_TOOL, EXECUTE_TOOL].sort();
  const client = await connect();
  assert.deepEqual(await surface(client), expectedSurface);
  assert.equal((await manager.status(selection.skillId)).installation, "missing");
  const search = await call(client, DISCOVER_TOOL, { query: "Braket 本地仿真" });
  assert.ok(search.matches.some(item => item.skillId === selection.skillId));
  const discovered = await call(client, DISCOVER_TOOL, selection);
  assert.equal(discovered.state, "environment_required");
  assert.ok(discovered.tool.inputSchema.properties.numQubits);
  assert.equal(discovered.execution.name, EXECUTE_TOOL);
  await assert.rejects(fs.access(manager.file(selection.skillId)), { code: "ENOENT" });
  assert.equal((await manager.status(selection.skillId)).installation, "missing", "discovery must not install");
  const invalid = await client.callTool({ name: EXECUTE_TOOL, arguments: { ...selection, arguments: { ...input, numQubits: 0 } } });
  assert.equal(invalid.isError, true);
  assert.equal((await manager.status(selection.skillId)).installation, "missing", "execution must not install implicitly");

  const started = performance.now();
  const first = await call(client, PREPARE_TOOL, selection);
  assert.ok(["preparing", "ready"].includes(first.state));
  const jobId = first.environment.job.id;
  const repeated = await call(client, PREPARE_TOOL, selection);
  assert.equal(repeated.environment.job.id, jobId, "one selected environment installs only once");
  let ready = repeated;
  const until = Date.now() + 240000;
  while (ready.state === "preparing" && Date.now() < until) {
    await delay(250);
    ready = await call(client, DISCOVER_TOOL, selection);
  }
  assert.equal(ready.state, "ready", JSON.stringify(ready.environment));
  const installMs = performance.now() - started;
  const run = async current => {
    const result = await call(current, ready.execution.name, { ...ready.execution.arguments, arguments: input });
    assert.equal(result.source.version, "1.127.2");
    assert.equal(result.scientificValidation, "not_evaluated");
    assert.ok(result.result.normError < 1e-12);
    assert.equal(result.result.bitOrder, "leftmost bit is qubit 0");
    assert.equal(result.result.outcomes.length, 8);
    for (const outcome of result.result.outcomes) assert.ok(Math.abs(outcome.probability - (["000", "110"].includes(outcome.bits) ? 0.5 : 0)) < 1e-12);
    return result;
  };
  const result = await run(client);
  assert.deepEqual(await surface(client), expectedSurface, "no catalog refresh is required after installation");
  const receipt = await manager.read(selection.skillId);
  const marker = path.join(manager.environment.OPENQUANTUM_PYTHON_ENV_ROOT, selection.skillId, "openquantum-lock.sha256");
  const markerBefore = await fs.stat(marker);
  const markerHash = hash(await fs.readFile(marker));
  const reuseStarted = performance.now();
  assert.equal((await call(client, PREPARE_TOOL, selection)).state, "ready");
  assert.deepEqual((await run(client)).result, result.result);
  const reuseMs = performance.now() - reuseStarted;
  const second = await connect();
  assert.deepEqual(await surface(second), expectedSurface);
  assert.equal((await call(second, PREPARE_TOOL, selection)).state, "ready");
  assert.deepEqual((await run(second)).result, result.result);
  const reusedReceipt = await manager.read(selection.skillId);
  assert.equal(reusedReceipt.job.id, receipt.job.id);
  assert.equal(reusedReceipt.check.checkedAt, receipt.check.checkedAt);
  assert.equal((await fs.stat(marker)).mtimeMs, markerBefore.mtimeMs);
  assert.equal(hash(await fs.readFile(marker)), markerHash);
  assert.deepEqual(await fs.readdir(manager.environment.OPENQUANTUM_PYTHON_ENV_ROOT), [selection.skillId]);

  assert.deepEqual(Object.fromEntries(await sourceHashes()), sourceSha256, "source must not change while its acceptance is running");
  const report = { schemaVersion: 1, checkedAt: new Date().toISOString(), nodeVersion: process.version, platform: process.platform, arch: process.arch,
    sourceCommit: execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(),
    sourceDirty: Boolean(execFileSync("git", ["status", "--porcelain"], { cwd: root, encoding: "utf8" }).trim()),
    selection, input, inputSha256: hash(JSON.stringify(input)), modelTools: expectedSurface,
    checks: { discoveryWithoutInstall: true, selectedInputContract: true, invalidInputRejectedWithoutInstall: true,
      coldEnvironmentInstallation: true, selectedEnvironmentOnly: true, duplicatePreparationDeduplicated: true,
      sameConversationExecution: true, noCatalogReload: true, existingEnvironmentReused: true, newConnectionReused: true,
      installationJobUnchanged: true, dependencyMarkerUnchanged: true, idleQubitPreserved: true, bitOrderChecked: true, probabilitiesChecked: true },
    installation: { operation: receipt.job.operation, status: receipt.job.status, jobId, startedAt: receipt.job.startedAt, finishedAt: receipt.job.finishedAt, installMs, reuseAndExecutionMs: reuseMs,
      dependencyMarkerSha256: markerHash, fingerprint: receipt.check.fingerprint },
    sourceSha256,
    result, scientificValidation: "not_evaluated", nativeHostModelAutonomy: "not_checked", isolatedUserConfiguration: true };
  if (process.env.OPENQUANTUM_ON_DEMAND_EVIDENCE) {
    await fs.mkdir(process.env.OPENQUANTUM_ON_DEMAND_EVIDENCE, { recursive: true });
    await fs.writeFile(path.join(process.env.OPENQUANTUM_ON_DEMAND_EVIDENCE, "braket-on-demand.json"), JSON.stringify(report, null, 2) + "\n");
  }
  t.diagnostic(`Fresh Braket environment: ${Math.round(installMs)} ms; reuse and execution: ${Math.round(reuseMs)} ms; one installation, three actual calculations.`);
});
