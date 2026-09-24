import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { parse } from "yaml";
import { Context } from "@deepseek-ai/cordis";
import { createScope, scopeTarget } from "@deepseek-ai/dsh-scope";
import { SystemPrompt } from "@deepseek-ai/dsh-system-prompt";
import { ToolRuntime } from "@deepseek-ai/dsh-tools";
import * as plugin from "../runtime/openquantum/agent-presets/openquantum/optional-tool-profiles.mjs";

const policy = parse(readFileSync(new URL("../.agents/capability-packages.yml", import.meta.url), "utf8"));
const servers = policy.packages.flatMap(row => row.execution?.mcpServers ?? []).filter(row => Object.hasOwn(plugin.profiles, row.name));
const names = servers.flatMap(server => server.tools.map(tool => `mcp__${server.name}__${tool.name}`));
const definition = name => ({ name, description: name, parameters: { type: "object", properties: {}, additionalProperties: false },
  output: { schema: { type: "object", properties: {}, additionalProperties: false }, render: () => [{ type: "text", text: "fixture" }] }, execute: async () => ({}) });

test("optional profiles classify every existing Tool without renaming or inventing names", () => {
  assert.equal(names.length, 107);
  for (const server of servers) {
    const all = new Set(server.tools.map(tool => tool.name));
    const covered = new Set(Object.values(plugin.profiles[server.name]).flat());
    assert.deepEqual([...covered].sort(), [...all].sort(), server.name);
    for (const selected of Object.values(plugin.profiles[server.name])) assert.ok(selected.length < all.size);
  }
  assert.throws(() => plugin.apply({}, { qiskit_gym: "typo" }), /unknown Tool profile/);
});

async function fixture(t, config) {
  const context = new Context();
  const prompt = await context.plugin(SystemPrompt, {});
  const runtime = await context.plugin(ToolRuntime, { mode: "native" });
  const presetKey = {};
  let preset, ownerContext;
  const owner = await context.plugin({ name: "profile-fixture", inject: ["tools"], apply(ctx) {
    ownerContext = ctx;
    preset = createScope(ctx, presetKey);
    for (const name of [...names, "bash"]) preset.ctx.tools.register(definition(name));
  } });
  const profile = await preset.ctx.plugin(plugin, config);
  const agents = [];
  const agent = () => {
    const agent = {};
    const scope = createScope(ownerContext, agent, { parent: presetKey });
    agent.ctx = scope.ctx;
    agents.push({ agent, scope });
    context.emit(scopeTarget(agent, agent), "agent/created", { agent });
    return agent;
  };
  t.after(async () => {
    for (const entry of agents) {
      context.emit(scopeTarget(entry.agent, entry.agent), "agent/disposed", { agent: entry.agent });
      await entry.scope.dispose();
    }
    await profile.dispose(); await preset.dispose(); await owner.dispose(); await runtime.dispose(); await prompt.dispose();
  });
  return { context, preset, profile, agent };
}

test("full profile preserves all original names in the very first Harness prompt", async t => {
  const f = await fixture(t, {});
  const agent = f.agent();
  const assembly = await f.context.systemPrompt.assemble({ scope: agent });
  assert.deepEqual(assembly.tools.map(tool => tool.name).sort(), [...names, "bash"].sort());
});

test("Harness masks first prompt and dispatch, refreshes reconnects, keeps scopes and disposes cleanly", async t => {
  const selected = { qiskit_gym: "synthesis", quantum_hardware: "devices", flagquantum: "simulate" };
  const f = await fixture(t, selected);
  const first = f.agent(); const second = f.agent();
  const expected = ["bash", ...Object.entries(selected).flatMap(([server, profile]) => plugin.profiles[server][profile].map(tool => `mcp__${server}__${tool}`))].sort();
  assert.deepEqual((await f.context.systemPrompt.assemble({ scope: first })).tools.map(tool => tool.name).sort(), expected);
  assert.deepEqual(f.context.tools.schemas(second).map(tool => tool.name).sort(), expected);
  const blocked = await f.context.tools.execute({ callId: "no-job", name: "mcp__quantum_hardware__submit_job", arguments: {}, agent: first, signal: new AbortController().signal });
  assert.equal(blocked.isError, true);
  const allowed = await f.context.tools.execute({ callId: "devices", name: "mcp__quantum_hardware__list_devices", arguments: {}, agent: first, signal: new AbortController().signal });
  assert.equal(allowed.isError, false);
  // An unrelated restriction remains effective and does not leak to another task.
  const extra = first.ctx.tools.restrict({ deny: ["bash"] });
  assert.ok(!f.context.tools.schemas(first).some(tool => tool.name === "bash"));
  assert.ok(f.context.tools.schemas(second).some(tool => tool.name === "bash"));
  const late = f.preset.ctx.tools.register(definition("mcp__quantum_hardware__future_job"));
  assert.ok(!f.context.tools.schemas(first).some(tool => tool.name.endsWith("future_job")));
  late();
  assert.equal(f.context.tools.schemas(second).length, expected.length);
  await f.profile.dispose();
  assert.equal(f.context.tools.schemas(second).length, names.length + 1);
  assert.equal(f.context.tools.schemas(first).length, names.length);
  extra();
});
