import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  executeProjectSettingsCommand,
  ProjectSettingsConflictError,
  readProjectSettings,
} from "../src/settings/server/project-settings.mjs";

const configPath = "runtime/openquantum/agent-presets/openquantum/agent.cordis.yml";

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), "openquantum-settings-concurrency-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, path.dirname(configPath)), { recursive: true });
  await mkdir(path.join(root, ".agents/skills/demo"), { recursive: true });
  await writeFile(path.join(root, ".agents/skills/demo/SKILL.md"),
    "---\nname: demo\ndescription: Local concurrency fixture\n---\n\n# Demo\n");
  const entries = Array.from({ length: 5 }, (_, index) => ({
    id: `mcp-user-audit_${index}`,
    name: "@deepseek-ai/dsh-mcp-client",
    disabled: true,
    config: {
      serverName: `audit_${index}`,
      transport: "stdio",
      command: "unused-fixture-command",
      toolCallTimeoutMs: 60000,
    },
  }));
  await writeFile(path.join(root, configPath), JSON.stringify(entries));
  return root;
}

function update(serverName, revision, toolCallTimeoutMs) {
  return {
    action: "mcp.update", serverName, revision, toolCallTimeoutMs, enabled: false,
    reconnect: { enabled: true, initialDelayMs: 500, maxDelayMs: 30000, maxAttempts: 10 },
  };
}

function assertSingleCommit(outcomes) {
  assert.equal(outcomes.filter((outcome) => outcome.status === "fulfilled").length, 1);
  for (const outcome of outcomes.filter((item) => item.status === "rejected")) {
    assert.ok(outcome.reason instanceof ProjectSettingsConflictError);
  }
}

test("concurrent MCP edits preserve every acknowledged update and reject stale writers", async (t) => {
  const root = await fixture(t);
  const before = await readProjectSettings(root);
  const commands = before.mcpServers.map((server, index) =>
    update(server.serverName, before.mcpRevision, 61000 + index * 1000));
  const outcomes = await Promise.allSettled(commands.map((command) =>
    executeProjectSettingsCommand(root, command)));
  assertSingleCommit(outcomes);
  let current = await readProjectSettings(root);
  for (const [index, outcome] of outcomes.entries()) {
    assert.equal(current.mcpServers[index].toolCallTimeoutMs,
      outcome.status === "fulfilled" ? commands[index].toolCallTimeoutMs : 60000);
  }

  // A refreshed retry keeps the earlier commit and applies the remaining edits.
  for (const [index, outcome] of outcomes.entries()) {
    if (outcome.status === "rejected") {
      current = await executeProjectSettingsCommand(root, {
        ...commands[index], revision: current.mcpRevision,
      });
    }
  }
  assert.deepEqual(current.mcpServers.map((server) => server.toolCallTimeoutMs),
    commands.map((command) => command.toolCallTimeoutMs));
});

test("MCP registration, removal and update share the same revision boundary", async (t) => {
  const root = await fixture(t);
  const { mcpRevision: revision } = await readProjectSettings(root);
  const outcomes = await Promise.allSettled([
    executeProjectSettingsCommand(root, update("audit_0", revision, 61000)),
    executeProjectSettingsCommand(root, { action: "mcp.remove", serverName: "audit_1", revision }),
    executeProjectSettingsCommand(root, {
      action: "mcp.register", serverName: "new_audit", revision,
      transport: "stdio", command: "unused-fixture-command", args: [],
    }),
  ]);
  assertSingleCommit(outcomes);
  const current = await readProjectSettings(root);
  assert.equal(current.mcpServers[0].toolCallTimeoutMs,
    outcomes[0].status === "fulfilled" ? 61000 : 60000);
  assert.equal(current.mcpServers.some((server) => server.serverName === "audit_1"),
    outcomes[1].status !== "fulfilled");
  assert.equal(current.mcpServers.some((server) => server.serverName === "new_audit"),
    outcomes[2].status === "fulfilled");
});

test("concurrent Skill policy edits conflict and a failed mutation releases the writer lock", async (t) => {
  const root = await fixture(t);
  const before = await readProjectSettings(root);
  await assert.rejects(executeProjectSettingsCommand(root, {
    ...update("audit_0", before.mcpRevision, 1),
  }), /toolCallTimeoutMs/);

  const commands = [
    { modelInvocable: false, userInvocable: true },
    { modelInvocable: true, userInvocable: false },
  ].map((policy) => ({
    action: "skill.update", name: "demo", revision: before.skills[0].revision, ...policy,
  }));
  const outcomes = await Promise.allSettled(commands.map((command) =>
    executeProjectSettingsCommand(root, command)));
  assertSingleCommit(outcomes);
  const committed = commands[outcomes.findIndex((outcome) => outcome.status === "fulfilled")];
  const { skills: [skill] } = await readProjectSettings(root);
  assert.equal(skill.modelInvocable, committed.modelInvocable);
  assert.equal(skill.userInvocable, committed.userInvocable);
  assert.match(await readFile(path.join(root, ".agents/skills/demo/SKILL.md"), "utf8"), /# Demo/);
  await assert.rejects(readFile(path.join(root, `${configPath}.lock`)), { code: "ENOENT" });
});

test("independent processes cannot both acknowledge writes from the same revision", { timeout: 10000 }, async (t) => {
  const root = await fixture(t);
  const { mcpRevision } = await readProjectSettings(root);
  const moduleUrl = new URL("../src/settings/server/project-settings.mjs", import.meta.url).href;
  const source = `
    import { executeProjectSettingsCommand } from ${JSON.stringify(moduleUrl)};
    process.once('message', async ({ root, command }) => {
      try {
        await executeProjectSettingsCommand(root, command);
        process.send({ status: 'fulfilled' });
      } catch (error) {
        process.send({ status: 'rejected', name: error.name });
      } finally { process.disconnect(); }
    });
    process.send({ ready: true });
  `;
  const workers = Array.from({ length: 2 }, () => {
    const child = spawn(process.execPath, ["--input-type=module", "--eval", source], {
      stdio: ["ignore", "ignore", "pipe", "ipc"],
    });
    t.after(() => { if (child.exitCode === null) child.kill(); });
    let stderr = "";
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    const ready = new Promise((resolve, reject) => {
      child.once("message", (message) => message.ready ? resolve() : reject(new Error("Worker was not ready")));
      child.once("error", reject);
      child.once("exit", (code) => { if (code !== 0) reject(new Error(stderr || `Worker exited ${code}`)); });
    });
    const result = new Promise((resolve, reject) => {
      let outcome;
      child.on("message", (message) => { if (!message.ready) outcome = message; });
      child.once("error", reject);
      child.once("exit", (code) => {
        if (code === 0 && outcome) resolve(outcome);
        else reject(new Error(stderr || `Worker exited ${code} without a result`));
      });
    });
    return { child, ready, result };
  });
  const results = Promise.all(workers.map((worker) => worker.result));
  await Promise.all(workers.map((worker) => worker.ready));
  workers.forEach((worker, index) => worker.child.send({
    root, command: update(`audit_${index}`, mcpRevision, 61000 + index * 1000),
  }));
  const outcomes = await results;
  assert.equal(outcomes.filter((outcome) => outcome.status === "fulfilled").length, 1);
  assert.equal(outcomes.find((outcome) => outcome.status === "rejected").name,
    "ProjectSettingsConflictError");
  const current = await readProjectSettings(root);
  outcomes.forEach((outcome, index) => assert.equal(current.mcpServers[index].toolCallTimeoutMs,
    outcome.status === "fulfilled" ? 61000 + index * 1000 : 60000));
});
