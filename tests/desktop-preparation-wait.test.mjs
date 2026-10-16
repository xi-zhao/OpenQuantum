import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { setTimeout as delay } from "node:timers/promises";
import { createDesktopApplication } from "../src/settings/desktop/application.mjs";
import { prepareDesktopSkill } from "../src/settings/desktop/preparation.mjs";
import { Environments } from "../src/settings/codex/environments.mjs";

const root = path.resolve(import.meta.dirname, "..");
const selection = { skillId: "simqn-network", toolName: "simulate_simqn_link" };
const id = "simqn-network";
const credentials = { resolve: async () => undefined, describe: async () => ({ configured: false, writable: true }) };
async function fixture(t, control = {}) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "oq-desktop-wait-"));
  const app = await createDesktopApplication({ root, directory, credentials, environment: { PATH: process.env.PATH, HOME: os.homedir() } });
  app.settings.environments.worker = path.join(root, "tests/fixtures/environment-worker.mjs");
  app.settings.backend.call = () => assert.fail("Preparing must not execute a scientific Tool");
  await fs.writeFile(path.join(directory, "control.json"), JSON.stringify(control));
  t.after(async () => { await app.close(); await fs.rm(directory, { recursive: true, force: true }); });
  return { app, directory, manager: app.settings.environments,
    prepare: (signal, options) => prepareDesktopSkill(app.settings, selection, signal, { intervalMs: 20, ...options }) };
}
async function waitFor(read, match = Boolean) {
  const until = Date.now() + 10000;
  do { const value = await read(); if (match(value)) return value; await delay(20); } while (Date.now() < until);
  assert.fail("Fixture did not reach the expected state");
}
const childPid = f => waitFor(() => fs.readFile(path.join(f.directory, "child.pid"), "utf8").catch(() => "")).then(Number);

test("one prepare call waits for installation and checks, returns ready and reuses it without another job", async t => {
  const f = await fixture(t);
  assert.equal((await f.app.discover(selection)).state, "environment_required");
  const result = await f.prepare();
  assert.equal(result.state, "ready");
  assert.equal(result.environment.job.status, "completed");
  const receipt = await f.manager.read(id);
  assert.throws(() => process.kill(receipt.job.pid, 0), { code: "ESRCH" });
  assert.equal(f.manager.ownedJobs.size, 0);
  assert.equal((await f.prepare()).state, "ready");
  assert.equal((await fs.readFile(path.join(f.directory, "started"), "utf8")).trim().split("\n").length, 1);
  assert.deepEqual(receipt.leases, []);
});

test("a failed check returns a terminal retry state without retrying or executing", async t => {
  const f = await fixture(t, { fail: true });
  const result = await f.prepare();
  assert.equal(result.state, "retry_required");
  assert.equal(result.environment.ready, false);
  assert.equal(result.environment.job.status, "failed");
  assert.equal((await f.prepare()).state, "retry_required");
  assert.equal((await fs.readFile(path.join(f.directory, "started"), "utf8")).trim().split("\n").length, 1);
});

test("cancelling the owning prepare waits for the installer child to exit before returning", { skip: process.platform === "win32", timeout: 15000 }, async t => {
  const f = await fixture(t, { slow: true }), controller = new AbortController();
  const pending = f.prepare(controller.signal);
  const rejected = assert.rejects(pending, /fixture cancellation/);
  const pid = await childPid(f);
  controller.abort(new Error("fixture cancellation"));
  await rejected;
  assert.throws(() => process.kill(pid, 0), { code: "ESRCH" });
  assert.equal((await f.manager.status(id)).job.status, "cancelled");
  assert.equal(f.manager.ownedJobs.size, 0);
});

test("cancelling a concurrent waiter never cancels the original preparation", { skip: process.platform === "win32", timeout: 15000 }, async t => {
  const f = await fixture(t, { slow: true }), owner = new AbortController(), waiter = new AbortController();
  const pending = f.prepare(owner.signal);
  const ownerRejected = assert.rejects(pending, /owner stopped/);
  const pid = await childPid(f);
  const joined = f.prepare(waiter.signal);
  const waiterRejected = assert.rejects(joined, /waiter stopped/);
  await delay(60); waiter.abort(new Error("waiter stopped"));
  await waiterRejected;
  assert.equal((await f.manager.status(id)).job.status, "running");
  assert.doesNotThrow(() => process.kill(pid, 0));
  owner.abort(new Error("owner stopped")); await ownerRejected;
  assert.throws(() => process.kill(pid, 0), { code: "ESRCH" });
  assert.equal((await fs.readFile(path.join(f.directory, "started"), "utf8")).trim().split("\n").length, 1);
});

test("a prohibition added while waiting cancels only the owned installation and remains blocked", { skip: process.platform === "win32", timeout: 15000 }, async t => {
  const f = await fixture(t, { slow: true });
  const pending = f.prepare();
  const pid = await childPid(f);
  await f.app.request({ action: "provider.set", id: "simqn_local", enabled: false, revision: (await f.app.settings.read()).revision });
  const result = await pending;
  assert.equal(result.state, "blocked");
  assert.deepEqual(result.blockedProviders, ["simqn_local"]);
  assert.throws(() => process.kill(pid, 0), { code: "ESRCH" });
  assert.equal((await f.prepare()).state, "blocked");
  assert.equal((await fs.readFile(path.join(f.directory, "started"), "utf8")).trim().split("\n").length, 1);
});

test("deadline cancels the owned worker and missing credentials return immediately without installing", { timeout: 15000 }, async t => {
  const f = await fixture(t, { slow: true });
  await assert.rejects(f.prepare(undefined, { timeoutMs: 700 }), /准备超时/);
  assert.equal((await f.manager.status(id)).job.status, "cancelled");
  assert.equal(f.manager.ownedJobs.size, 0);
  const result = await prepareDesktopSkill(f.app.settings, { skillId: "pasqal-experiments", serviceId: "pasqal_cloud" });
  assert.equal(result.state, "credentials_required");
  assert.deepEqual(await fs.readdir(path.join(f.directory, "installations")), [`${id}.json`]);
});

test("disposing a native Agent cancels its pending preparation and drains the installer", { skip: process.platform === "win32", timeout: 15000 }, async t => {
  const f = await fixture(t, { slow: true });
  const start = Environments.prototype.startOwned;
  // Only replace the worker executable; keep the actual Application Interface,
  // per-Agent ownership, installation manager and process cleanup in this test.
  t.mock.method(Environments.prototype, "startOwned", function (...args) {
    this.worker = path.join(root, "tests/fixtures/environment-worker.mjs");
    return start.apply(this, args);
  });
  const agent = {};
  const pending = f.app.prepare(selection, { agent, signal: new AbortController().signal });
  const rejected = assert.rejects(pending, { name: "AbortError" });
  const pid = await childPid(f);
  await f.app.closeAgent(agent); await rejected;
  assert.throws(() => process.kill(pid, 0), { code: "ESRCH" });
  assert.equal((await f.manager.status(id)).job.status, "cancelled");
});
