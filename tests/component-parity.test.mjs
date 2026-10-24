import assert from "node:assert/strict";
import test from "node:test";
import { cp, mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { componentDirectory } from "../scripts/lib/component-directory.mjs";
import { readProjectSettings } from "../src/settings/server/project-settings.mjs";
import { fixture } from "./fixtures/codex-settings.mjs";
import { Settings } from "../src/settings/codex/application.mjs";

const root = path.resolve(import.meta.dirname, "..");

test("Codex directory retains every Desktop MCP and Skill with the same product content", async () => {
  const [desktop, directory] = await Promise.all([readProjectSettings(root), componentDirectory(root)]);
  assert.deepEqual(directory.skills.map(item => item.name), desktop.skills.map(item => item.name));
  assert.deepEqual(directory.mcpServers.map(item => item.serverName).sort(), desktop.mcpServers.map(item => item.serverName).sort());
  for (const [key, id] of [["skills", "name"], ["mcpServers", "serverName"]]) for (const item of directory[key]) {
    const original = desktop[key].find(value => value[id] === item[id]);
    for (const [field, value] of Object.entries(item)) assert.deepEqual(value, original[field], `${item[id]}: ${field}`);
    assert.ok(!("enabled" in item) && !("modelInvocable" in item) && !("revision" in item), "Desktop state must not be copied into Codex");
  }
  assert.ok(directory.skills.some(item => item.name === "platform-diagnostics"));
  assert.ok(directory.mcpServers.some(item => item.serverName === "qiskit_docs"));
  const source = JSON.parse(await readFile(path.join(root,"src/settings/locales/openquantum-source.json"), "utf8"));
  assert.deepEqual(directory.copy, source["settings.openquantumCapabilities"].zh);
});

test("complete presentation never enables unsupported entries or overwrites native configuration", async t => {
  const f = await fixture(t);
  const directory = await componentDirectory(root);
  f.backend.sourceCapabilities[0].id = "qec-memory-experiment";
  f.backend.sourceCapabilities[0].mcp = [];
  const settings = new Settings({ ...f.options, componentDirectory: directory });
  const before = await settings.snapshot();
  assert.equal(before.components.skills.length, directory.skills.length);
  assert.equal(before.components.mcpServers.length, directory.mcpServers.length);
  const unsupported = before.components.skills.find(item => item.id === "platform-diagnostics");
  assert.equal(unsupported.supported, false); assert.equal(unsupported.enabled, false);
  assert.match(unsupported.availabilityNote, /Desktop/);
  await assert.rejects(() => settings.command({ action: "skill.set", id: unsupported.id, enabled: true, revision: before.revision }), /未知/);
  const unsupportedMcp = before.components.mcpServers.find(item => item.id === "qiskit_docs");
  assert.equal(unsupportedMcp.supported, false);
  await assert.rejects(() => settings.command({ action: "provider.set", id: unsupportedMcp.id, enabled: true, revision: before.revision }), /未知/);
  assert.equal((await settings.snapshot()).revision, before.revision);
  const supported = before.components.skills.find(item => item.id === "qec-memory-experiment");
  assert.equal(supported.supported, true); assert.equal(supported.enabled, true);
  await settings.command({ action: "skill.set", id: supported.id, enabled: false, revision: before.revision });
  assert.equal((await settings.snapshot()).components.skills.find(item => item.id === supported.id).enabled, false);
  assert.equal((await settings.snapshot()).components.skills.find(item => item.id === unsupported.id).supported, false);
  assert.equal(f.calls(), 0);
});


test("plugin directory builds without a Desktop runtime, preset or user settings", async t => {
  const isolated = await mkdtemp(path.join(os.tmpdir(), "oq-directory-"));
  t.after(() => rm(isolated, { recursive: true, force: true }));
  await cp(path.join(root, ".agents"), path.join(isolated, ".agents"), { recursive: true });
  await mkdir(path.join(isolated, "src/settings/locales"), { recursive: true });
  await cp(path.join(root, "src/settings/locales/openquantum-source.json"), path.join(isolated, "src/settings/locales/openquantum-source.json"));
  const expected = await componentDirectory(root);
  assert.deepEqual(await componentDirectory(isolated), expected);
  await mkdir(path.join(isolated, "runtime/openquantum/agent-presets/openquantum"), { recursive: true });
  await writeFile(path.join(isolated, "runtime/openquantum/agent-presets/openquantum/agent.cordis.yml"), "invalid user configuration");
  assert.deepEqual(await componentDirectory(isolated), expected, "host-local settings cannot change plugin contents");
  for (const entry of expected.mcpServers) {
    for (const field of ["enabled", "target", "transport", "credentialRefs", "requiredCredentialRefs"]) assert.ok(!(field in entry));
  }
});
