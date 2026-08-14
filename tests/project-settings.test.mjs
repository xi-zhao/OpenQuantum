import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { parseDocument } from "yaml";

import {
  ProjectSettingsConflictError,
  readProjectSettings,
  updateMcpSettings,
  updateSkillSettings,
} from "../src/settings/server/project-settings.mjs";

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), "openquantum-settings-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, ".agents/skills/demo-skill"), { recursive: true });
  await mkdir(path.join(root, "runtime/openquantum/agent-presets/openquantum"), {
    recursive: true,
  });
  await writeFile(
    path.join(root, ".agents/skills/demo-skill/SKILL.md"),
    `---\nname: demo-skill\ndescription: Demo scientific skill\n---\n\n# Demo\n`,
  );
  await writeFile(
    path.join(root, ".agents/skills/demo-skill/capability.yaml"),
    `schemaVersion: "1.0"\nid: demo-skill\nversion: 1.2.3\ndisplayName: Demo Skill\nmaturity:\n  status: stable\n`,
  );
  await writeFile(
    path.join(root, "runtime/openquantum/agent-presets/openquantum/agent.cordis.yml"),
    `- id: demo-mcp\n  name: '@deepseek-ai/dsh-mcp-client'\n  config:\n    serverName: demo_quantum\n    transport: stdio\n    command: !!js process.execPath\n    args:\n      - !!js process.cwd() + '/.agents/skills/demo-skill/mcp/server.mjs'\n    toolCallTimeoutMs: 60000\n    failOnStartupError: true\n    reconnect:\n      enabled: true\n      initialDelayMs: 500\n      maxDelayMs: 30000\n      maxAttempts: 10\n`,
  );
  return root;
}

test("project settings exposes safe Skill and MCP projections", async (t) => {
  const root = await fixture(t);
  const snapshot = await readProjectSettings(root);

  assert.deepEqual(snapshot.skills, [
    {
      name: "demo-skill",
      displayName: "Demo Skill",
      description: "Demo scientific skill",
      version: "1.2.3",
      maturity: "stable",
      modelInvocable: true,
      userInvocable: true,
      revision: snapshot.skills[0].revision,
    },
  ]);
  assert.deepEqual(snapshot.mcpServers, [
    {
      serverName: "demo_quantum",
      transport: "stdio",
      target: "./.agents/skills/demo-skill/mcp/server.mjs",
      enabled: true,
      toolCallTimeoutMs: 60000,
      failOnStartupError: true,
      reconnect: {
        enabled: true,
        initialDelayMs: 500,
        maxDelayMs: 30000,
        maxAttempts: 10,
      },
    },
  ]);
  assert.match(snapshot.mcpRevision, /^[a-f0-9]{64}$/);
});

test("Skill invocation settings use revision CAS and official frontmatter", async (t) => {
  const root = await fixture(t);
  const before = await readProjectSettings(root);
  const updated = await updateSkillSettings(root, {
    name: "demo-skill",
    revision: before.skills[0].revision,
    modelInvocable: false,
    userInvocable: false,
  });

  assert.equal(updated.skills[0].modelInvocable, false);
  assert.equal(updated.skills[0].userInvocable, false);
  const raw = await readFile(
    path.join(root, ".agents/skills/demo-skill/SKILL.md"),
    "utf8",
  );
  assert.match(raw, /disable-model-invocation: true/);
  assert.match(raw, /user-invocable: false/);
  await assert.rejects(
    updateSkillSettings(root, {
      name: "demo-skill",
      revision: before.skills[0].revision,
      modelInvocable: true,
      userInvocable: true,
    }),
    ProjectSettingsConflictError,
  );
});

test("MCP settings update only bounded Harness connection policy", async (t) => {
  const root = await fixture(t);
  const before = await readProjectSettings(root);
  const updated = await updateMcpSettings(root, {
    serverName: "demo_quantum",
    revision: before.mcpRevision,
    enabled: false,
    toolCallTimeoutMs: 90000,
    reconnect: {
      enabled: false,
      initialDelayMs: 750,
      maxDelayMs: 45000,
      maxAttempts: 7,
    },
  });
  assert.equal(updated.mcpServers[0].enabled, false);
  assert.equal(updated.mcpServers[0].toolCallTimeoutMs, 90000);
  assert.equal(updated.mcpServers[0].reconnect.maxAttempts, 7);

  const raw = await readFile(
    path.join(root, "runtime/openquantum/agent-presets/openquantum/agent.cordis.yml"),
    "utf8",
  );
  const value = parseDocument(raw).toJS();
  assert.equal(value[0].disabled, true);
  assert.equal(value[0].config.serverName, "demo_quantum");
  assert.equal(value[0].config.toolCallTimeoutMs, 90000);
  assert.equal(value[0].config.reconnect.enabled, false);
});

test("project settings rejects a symlinked Skill file", async (t) => {
  const root = await fixture(t);
  await mkdir(path.join(root, ".agents/skills/linked-skill"));
  await symlink(
    path.join(root, ".agents/skills/demo-skill/SKILL.md"),
    path.join(root, ".agents/skills/linked-skill/SKILL.md"),
  );
  await assert.rejects(readProjectSettings(root), /普通文件/);
});
