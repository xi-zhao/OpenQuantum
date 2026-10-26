import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs/promises";
import vm from "node:vm";
import { parse } from "acorn";
import { SettingsSession, sameConnectionDestination } from "../runtime/chatgpt/ui/settings-recovery.mjs";
import { fixture } from "./fixtures/codex-settings.mjs";
import { Connections } from "../src/settings/codex/connections.mjs";

async function setup(t, intercept = async (_input, next) => next()) {
  const f = await fixture(t);
  const commands = [];
  const session = new SettingsSession(input => intercept(input, async () => {
    if (input.action === "snapshot") return f.settings.snapshot();
    commands.push(input);
    return f.settings.command(input);
  }));
  await session.update({ action: "snapshot" });
  return { ...f, session, commands };
}

test("a lost save reply is reconciled by reading persisted state, never by resending", async t => {
  const f = await setup(t, async (input, next) => {
    const value = await next();
    if (input.action !== "snapshot") throw new Error("lost reply");
    return value;
  });
  const result = await f.session.update({ action: "skill.set", id: "example", enabled: false });
  assert.equal(result.confirmed, true); assert.equal(result.recovered, true);
  assert.equal(result.snapshot.skills[0].enabled, false);
  assert.equal(f.commands.length, 1);
});

test("unreadable save outcomes block later writes until a fresh read confirms the result", async t => {
  let offline = false;
  const f = await setup(t, async (input, next) => {
    if (offline) throw new Error("offline");
    const value = await next();
    if (input.action !== "snapshot") { offline = true; throw new Error("lost reply"); }
    return value;
  });
  await assert.rejects(f.session.update({ action: "tool.set", id: "calculate", enabled: false }), /草稿已保留/);
  await assert.rejects(f.session.update({ action: "provider.set", id: "local", enabled: false }), /先刷新/);
  assert.equal(f.commands.length, 1);
  offline = false;
  const result = await f.session.update({ action: "snapshot" });
  assert.equal(result.confirmed, true); assert.equal(f.session.pending, null);
  assert.equal(result.snapshot.tools[0].enabled, false);
});

test("queued commands retain the revision the user saw and cannot overwrite a concurrent change", async t => {
  const f = await setup(t);
  await f.settings.command({ action: "provider.set", id: "local", enabled: false, revision: f.session.snapshot.revision });
  const refresh = f.session.update({ action: "snapshot" });
  const stale = f.session.update({ action: "provider.set", id: "local", enabled: true });
  await refresh;
  const result = await stale;
  assert.equal(result.confirmed, false);
  assert.match(result.error, /其他操作更新/);
  assert.equal((await f.settings.snapshot()).providers[0].enabled, false);
});

const connection = { id: "fixture", transport: "http", authentication: "none", url: "https://example.invalid/mcp" };

test("a reply for a replaced connection cannot confirm the replacement's settings", async t => {
  let replace = false;
  const f = await setup(t, async (input, next) => {
    const result = await next();
    if (replace && input.action === "connection.update") {
      for (const command of [{ action: "connection.remove", id: connection.id }, { action: "connection.add", connection: input.connection }]) {
        await f.settings.command({ ...command, revision: (await f.settings.read()).revision });
      }
    }
    return result;
  });
  assert.equal((await f.session.update({ action: "connection.add", connection })).confirmed, true);
  replace = true;
  const result = await f.session.update({ action: "connection.update", id: connection.id, connection: { ...connection, url: "https://example.invalid/changed" } });
  assert.equal(result.confirmed, false);
  assert.equal(result.snapshot.connections[0].url, "https://example.invalid/changed");
});

test("add and edit with lost receipts retain uncertainty even if another owner has identical destination", async t => {
  let loseReply = false;
  const f = await setup(t, async (input, next) => {
    const result = await next();
    if (loseReply && input.action !== "snapshot") throw new Error("lost reply");
    return result;
  });
  loseReply = true;
  const added = await f.session.update({ action: "connection.add", connection });
  assert.equal(added.confirmed, false); assert.equal(added.snapshot.connections.length, 1);
  const edited = await f.session.update({ action: "connection.update", id: connection.id, connection: { ...connection, url: "https://example.invalid/changed" } });
  assert.equal(edited.confirmed, false); assert.equal(f.commands.length, 2);
});

test("stale connection actions and probes cannot target a replacement even using a fresh revision", async t => {
  const f = await setup(t);
  await f.session.update({ action: "connection.add", connection });
  const instance = f.session.snapshot.connections[0].instance;
  await f.session.update({ action: "connection.update", id: connection.id, connection: { ...connection, url: "https://example.invalid/replaced" } });
  for (const action of ["connection.set", "connection.remove", "connection.update"]) {
    await assert.rejects(f.settings.command({ action, id: connection.id, connectionInstance: instance,
      enabled: true, connection, revision: f.session.snapshot.revision }), /已被替换/);
  }
  const staleSave = await f.session.update({ action: "connection.set", id: connection.id, connectionInstance: instance, enabled: false });
  assert.equal(staleSave.confirmed, false, "matching state on a replacement cannot confirm a stale form");
  let resolves = 0;
  const connections = new Connections({ settings: f.settings, credentials: { resolve: async () => { resolves++; } } });
  t.after(() => connections.close());
  await assert.rejects(connections.probe(connection.id, instance), /已被替换/);
  assert.equal(resolves, 0);
});

const source = await fs.readFile(new URL("../runtime/chatgpt/ui/app.mjs", import.meta.url), "utf8");
const declaration = parse(source, { ecmaVersion: "latest", sourceType: "module" }).body.find(node => node.type === "FunctionDeclaration" && node.id.name === "connectionForm");
function element(tag, text) {
  return { tag, text, value: "", dataset: {}, children: [], setAttribute() {},
    addEventListener(type, fn) { this[type] = fn; },
    append(...children) { for (const child of children) { child.parentElement = this; this.children.push(child); } } };
}

test("the actual edit form preserves untouched arguments, ignores no-ops and isolates replacement drafts", () => {
  const requests = [], drafts = new Map(), messages = [];
  const formFor = vm.runInNewContext(`${source.slice(declaration.start, declaration.end)}; connectionForm`, {
    element, connectionDrafts: drafts, expandedGroups: new Map(), sameConnectionDestination, render() {},
    notice: text => messages.push(text), run: input => requests.push(input), button: (text, action) => ({ text, onclick: action }),
  });
  const original = { id: "local", instance: "first", transport: "stdio", command: "node", args: [" value with spaces ", "", "line\nbreak"], authentication: "none" };
  let form = formFor(original);
  form.onsubmit({ preventDefault() {} });
  assert.equal(requests.length, 0); assert.match(messages[0], /没有变化/);
  const fields = Object.fromEntries(form.children[0].children.map(label => [label.children[0].name, label.children[0]]));
  fields.target.value = "another-command"; fields.target.input();
  form.onsubmit({ preventDefault() {} });
  assert.deepEqual(requests[0].connection.args, original.args);
  assert.equal(requests[0].connectionInstance, "first");
  form = formFor({ ...original, instance: "replacement", command: "new-command" });
  assert.equal(form.children[0].children.find(label => label.children[0].name === "target").children[0].value, "new-command");
  assert.equal(drafts.size, 1, "the original draft is retained, never applied to the replacement");
});
