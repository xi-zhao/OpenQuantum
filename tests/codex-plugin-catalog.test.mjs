import assert from "node:assert/strict";
import test from "node:test";
import { createBackend } from "../runtime/chatgpt/backend.mjs";
import { Settings } from "../src/settings/codex/application.mjs";
import { fixture } from "./fixtures/codex-settings.mjs";
import { Environments } from "../src/settings/codex/environments.mjs";

test("every supported catalog setting persists independently without starting providers", async t => {
  const f = await fixture(t);
  let starts = 0;
  const backend = await createBackend({ connect: async () => { starts++; throw new Error("settings must not start a provider"); } });
  t.after(() => backend.close());
  // Exercise every declared ID with a prepared-environment fixture. This tests
  // settings, not installation or scientific execution of the actual SDKs.
  const environments = { snapshot: async () => [], status: async () => ({ ready: true, optionalSimulation: true }) };
  const options = { ...f.options, backend, environments };
  const settings = new Settings(options);
  const snapshot = await settings.snapshot();
  const tools = new Set(snapshot.tools.map(tool => tool.id));
  const providers = new Set(snapshot.providers.map(provider => provider.id));
  const sdkIds = new Set((await new Environments({ root: backend.root, directory: f.options.directory }).entries()).map(item => item.id));
  const services = new Set(snapshot.services.map(service => service.id));
  for (const skill of snapshot.skills) {
    for (const id of skill.relations.toolIds) assert.ok(tools.has(id), `${skill.id}: Tool ${id}`);
    for (const id of skill.relations.providerIds) assert.ok(providers.has(id), `${skill.id}: MCP ${id}`);
    for (const id of skill.relations.environmentIds) assert.ok(sdkIds.has(id), `${skill.id}: environment ${id}`);
    for (const id of skill.relations.credentialServiceIds) assert.ok(services.has(id), `${skill.id}: credentials ${id}`);
    for (const enabled of [false, true]) {
      await settings.command({ action: "skill.set", id: skill.id, enabled, revision: (await settings.read()).revision });
      const reopened = new Settings(options);
      assert.equal(reopened.skills((await reopened.read()).codex).find(value => value.id === skill.id).enabled, enabled, skill.id);
    }
  }
  assert.deepEqual((await settings.read()).config.disabledTools, []);
  assert.deepEqual((await settings.read()).config.disabledProviders, []);
  for (const provider of snapshot.providers) {
    for (const enabled of [false, true]) {
      await settings.command({ action: "provider.set", id: provider.id, enabled, revision: (await settings.read()).revision });
      const reopened = new Settings(options);
      assert.equal(reopened.providerEnabled((await reopened.read()).config, provider.id), enabled, provider.id);
    }
  }
  for (const tool of snapshot.tools) {
    for (const enabled of [false, true]) {
      await settings.command({ action: "tool.set", id: tool.id, enabled, revision: (await settings.read()).revision });
      const reopened = new Settings(options);
      assert.equal(reopened.toolEnabled((await reopened.read()).config, tool.id), enabled, tool.id);
    }
  }
  assert.equal(starts, 0);
  assert.equal(f.secrets.size, 0);
});
