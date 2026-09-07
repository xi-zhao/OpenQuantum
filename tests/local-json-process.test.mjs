import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import test from "node:test";

import { runLocalJsonProcess } from "../src/lib/local-json-process.mjs";

const fixtureSource = `
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
const chunks = [];
for await (const chunk of process.stdin) chunks.push(chunk);
const input = JSON.parse(Buffer.concat(chunks));
const inheritedPipe = input.mode === "inherited-pipe";
const child = spawn(process.execPath, ["-e", "setInterval(() => {}, 1000)"], {
  stdio: inheritedPipe ? ["ignore", "inherit", "inherit"] : "ignore",
});
writeFileSync(input.pidsPath, JSON.stringify({ parent: process.pid, child: child.pid }));
if (inheritedPipe) process.exit(0);
if (input.mode === "success") {
  process.stdout.write(JSON.stringify({ answer: 42 }));
  process.exit(0);
}
if (input.mode === "error") {
  process.stderr.write("fixture-secret failure");
  process.exit(4);
}
if (input.mode === "invalid") {
  process.stdout.write("not-json");
  process.exit(0);
}
if (input.mode === "overflow") process.stdout.write("x".repeat(4096));
setInterval(() => {}, 1000);
`;

async function waitFor(read, message) {
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    try {
      const result = await read();
      if (result) return result;
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    await delay(20);
  }
  assert.fail(message);
}

function isRunning(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if (error.code === "ESRCH") return false;
    throw error;
  }
}

async function fixture(t) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "openquantum-process-test-"));
  const script = path.join(directory, "bridge.mjs");
  const pidsPath = path.join(directory, "pids.json");
  await writeFile(script, fixtureSource);
  t.after(async () => {
    try {
      const pids = JSON.parse(await readFile(pidsPath, "utf8"));
      for (const pid of Object.values(pids)) {
        if (isRunning(pid)) process.kill(pid, "SIGKILL");
      }
    } catch (error) {
      if (error.code !== "ENOENT" && error.code !== "ESRCH") throw error;
    }
    await rm(directory, { recursive: true, force: true });
  });
  return {
    run: (mode, overrides = {}, internals) => runLocalJsonProcess({
      command: process.execPath,
      args: [script],
      cwd: directory,
      env: { ...process.env, FIXTURE_SECRET: "fixture-secret" },
      input: { mode, pidsPath },
      timeoutMs: 5000,
      maxOutputBytes: 1024,
      label: "Fixture computation",
      notFoundMessage: "Fixture command not found",
      ...overrides,
    }, internals),
    ready: () => waitFor(async () => JSON.parse(await readFile(pidsPath, "utf8")), "bridge did not start"),
    stopped: (pids) => waitFor(
      () => Object.values(pids).every((pid) => !isRunning(pid)),
      "bridge or descendant survived cleanup",
    ),
    pidsPath,
  };
}

test("an already cancelled bridge never starts a process", async (t) => {
  const current = await fixture(t);
  const controller = new AbortController();
  controller.abort(new Error("already stopped"));
  await assert.rejects(current.run("hang", { signal: controller.signal }), /already stopped/);
  await assert.rejects(readFile(current.pidsPath), { code: "ENOENT" });
});

test("cancellation stops the bridge and its computing descendant", async (t) => {
  const current = await fixture(t);
  const controller = new AbortController();
  const result = current.run("hang", { signal: controller.signal });
  const rejected = assert.rejects(result, { name: "AbortError" });
  const pids = await current.ready();
  controller.abort();
  await rejected;
  await current.stopped(pids);
});

test("timeout and output overflow stop the entire invocation", async (t) => {
  for (const [mode, overrides, error] of [
    ["hang", { timeoutMs: 1200 }, /timed out/],
    ["overflow", {}, /returned too much data/],
  ]) {
    await t.test(mode, async (t) => {
      const current = await fixture(t);
      await assert.rejects(current.run(mode, overrides), error);
      await current.stopped(await current.ready());
    });
  }
});

test("normal and failing POSIX exits cannot leave computing descendants", { skip: process.platform === "win32" }, async (t) => {
  for (const mode of ["success", "error", "invalid"]) {
    await t.test(mode, async (t) => {
      const current = await fixture(t);
      if (mode === "success") {
        assert.deepEqual(await current.run(mode), { answer: 42 });
      } else {
        await assert.rejects(current.run(mode), mode === "error" ? /\[REDACTED\] failure/ : /invalid JSON/);
      }
      await current.stopped(await current.ready());
    });
  }
});

test("spawn failures preserve the actionable install error", async (t) => {
  const current = await fixture(t);
  await assert.rejects(current.run("hang", { command: path.join(os.tmpdir(), "nonexistent-openquantum-test-command") }), /Fixture command not found/);
});

test("stdin failure stops a process that closes its input early", async (t) => {
  const current = await fixture(t);
  await assert.rejects(current.run("hang", {
    args: ["-e", "process.stdin.destroy(); process.exit(1)"],
    input: { payload: "x".repeat(1024 * 1024) },
  }), /EPIPE|exited with code 1/);
});

test("POSIX bridge exit closes inherited descendant pipes by stopping the owned group", { skip: process.platform === "win32" }, async (t) => {
  const current = await fixture(t);
  await assert.rejects(current.run("inherited-pipe"), /invalid JSON/);
  await current.stopped(await current.ready());
});

test("Windows cancellation and timeout stay bounded after the root exits with inherited pipes", async (t) => {
  for (const cause of ["cancel", "timeout"]) {
    await t.test(cause, { timeout: 6000 }, async (t) => {
      const current = await fixture(t);
      const controller = new AbortController();
      // Exercise Windows signalling policy with real local processes. The
      // parent exits first, so neither taskkill nor a stale PID kill is safe.
      const result = current.run("inherited-pipe", {
        signal: controller.signal,
        timeoutMs: cause === "timeout" ? 1200 : 5000,
      }, { platform: "win32" });
      const rejected = assert.rejects(result, (error) => {
        assert.ok(error instanceof AggregateError);
        assert.match(error.message, /descendant termination could not be confirmed/);
        assert.match(error.errors[0].message, cause === "timeout" ? /timed out/ : /cancelled/);
        return true;
      });
      const pids = await current.ready();
      await waitFor(() => !isRunning(pids.parent), "bridge parent did not exit");
      assert.ok(isRunning(pids.child));
      if (cause === "cancel") controller.abort();
      await rejected;
      // This branch must report the unconfirmed cleanup, not pretend that
      // closing a pipe terminated a detached computation. Fixture cleanup owns it.
      assert.ok(isRunning(pids.child));
    });
  }
});
