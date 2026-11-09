import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs/promises";
import vm from "node:vm";
import { parse } from "acorn";
import { PreparationPoller } from "../runtime/chatgpt/ui/preparation-poller.mjs";

const preparing = { environments: [{ id: "sdk", state: "preparing" }] };
const completed = { environments: [{ id: "sdk", state: "ready" }] };
const flush = () => new Promise(resolve => setImmediate(resolve));

function setup(t, options) {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const poller = new PreparationPoller({ canPoll: () => true, onError: () => {}, ...options });
  t.after(() => poller.setSuspended(true));
  return poller;
}

test("repeated snapshots and slow reads cannot create overlapping polls", async t => {
  const finish = Promise.withResolvers();
  let reads = 0;
  const poller = setup(t, { refresh: async () => { reads++; await finish.promise; poller.update(completed); } });
  poller.update(preparing); poller.update(preparing);
  t.mock.timers.tick(1500);
  assert.equal(reads, 1);
  poller.update(preparing);
  t.mock.timers.tick(6000);
  assert.equal(reads, 1, "a host update during a slow read must not schedule a second read");
  finish.resolve(); await flush();
  t.mock.timers.tick(6000);
  assert.equal(reads, 1, "a completed snapshot stops polling");
});

test("editing, pending writes and recovery defer reads without losing the polling loop", async t => {
  let paused = true, reads = 0;
  const poller = setup(t, { canPoll: () => !paused, refresh: async () => { reads++; } });
  poller.update(preparing);
  t.mock.timers.tick(1500);
  assert.equal(reads, 0);
  paused = false;
  t.mock.timers.tick(1500); await flush();
  assert.equal(reads, 1);
  paused = true;
  t.mock.timers.tick(1500);
  assert.equal(reads, 1);
});

test("hidden pages stop scheduling even when an in-flight read completes, then resume on return", async t => {
  const finish = Promise.withResolvers();
  let reads = 0;
  const poller = setup(t, { refresh: async () => { reads++; await finish.promise; poller.update(preparing); } });
  poller.update(preparing);
  t.mock.timers.tick(1500);
  poller.setSuspended(true);
  finish.resolve(); await flush();
  t.mock.timers.tick(6000);
  assert.equal(reads, 1);
  poller.setSuspended(false);
  t.mock.timers.tick(1500); await flush();
  assert.equal(reads, 2);
});

test("a transient read failure reports once and the next read can finish cancellation", async t => {
  let reads = 0;
  const messages = [];
  const poller = setup(t, { onError: error => messages.push(error.message), refresh: async () => {
    if (++reads === 1) throw new Error("offline");
    poller.update({ environments: [{ id: "sdk", state: "cancelled" }] });
  } });
  poller.update({ environments: [{ id: "sdk", state: "cancelling" }] });
  t.mock.timers.tick(1500); await flush();
  assert.deepEqual(messages, ["offline"]);
  t.mock.timers.tick(1500); await flush();
  t.mock.timers.tick(6000);
  assert.equal(reads, 2);
});

const source = await fs.readFile(new URL("../runtime/chatgpt/ui/app.mjs", import.meta.url), "utf8");
const declaration = parse(source, { ecmaVersion: "latest", sourceType: "module" }).body
  .find(node => node.type === "FunctionDeclaration" && node.id.name === "updateSnapshot");

test("every fresh settings snapshot drives preparation polling, including host notifications", async () => {
  let result = { snapshot: preparing };
  const seen = [];
  const update = vm.runInNewContext(`let snapshot; ${source.slice(declaration.start, declaration.end)}; updateSnapshot`, {
    settingsSession: { update: async () => result },
    preparationPoller: { update: value => seen.push(value) },
  });
  await update({ action: "snapshot" });
  assert.deepEqual(seen, [preparing], "a host-triggered read must start polling without going through a UI button");
  // Even an unconfirmed save can return a fresh snapshot. The warning must not
  // strand an ongoing preparation job or keep polling a completed one.
  result = { snapshot: completed, save: { action: "skill.set" }, confirmed: false };
  await assert.rejects(update({ action: "skill.set" }), /无法确认/);
  assert.deepEqual(seen, [preparing, completed]);
});
