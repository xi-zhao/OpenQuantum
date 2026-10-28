import assert from "node:assert/strict";
import test from "node:test";
import { fork } from "node:child_process";
import { once, EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import { build } from "esbuild";
import { createServer } from "node:http";
import { mkdtemp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as wait } from "node:timers/promises";
import { watchLearningUi } from "../src/learning/ui-connection.mjs";

test("connection checks tolerate transient failure and clear the count after recovery", async () => {
  const controller = new AbortController();
  const replies = ["unavailable", "ready", "throw", "ready", "unavailable", "unavailable", "unavailable"];
  let checked = 0, notified = 0;
  await watchLearningUi({ signal: controller.signal, intervalMs: 1,
    check: async () => { const reply = replies[checked++]; if (reply === "throw") throw new Error("temporary"); return { state: reply }; },
    onUnavailable: () => { notified++; },
  });
  assert.equal(checked, replies.length);
  assert.equal(notified, 1);
});

test("closing a classroom ignores a late failed check and removes future polling", async () => {
  const controller = new AbortController();
  let finish, started = 0, notified = 0;
  const pending = watchLearningUi({ signal: controller.signal, intervalMs: 1, failureLimit: 1,
    check: (signal) => { assert.equal(signal, controller.signal); started++; return new Promise((resolve) => { finish = resolve; }); },
    onUnavailable: () => { notified++; },
  });
  controller.abort(); finish({ state: "unavailable" }); await pending;
  assert.equal(started, 1); assert.equal(notified, 0);
  const sleeping = new AbortController();
  const monitoring = watchLearningUi({ signal: sleeping.signal, intervalMs: 60_000,
    check: async () => ({ state: "ready" }), onUnavailable: () => assert.fail("closed classroom notified"),
  });
  await wait(1); sleeping.abort(); await monitoring;
});

const supervisor = fileURLToPath(new URL("../src/learning/ui-worker.mjs", import.meta.url));

test("Windows root exit still requests tree cleanup and closes inherited pipes (simulation)", async () => {
  const key = "__learningWindowsWorker";
  const processFixture = new EventEmitter();
  const child = new EventEmitter();
  const commands = [], reports = [], exits = [];
  Object.assign(processFixture, { platform: "win32", execPath: "fixture-node", env: {}, connected: true,
    stdout: new PassThrough(), stderr: new PassThrough(),
    send(message, callback) { reports.push(message); callback(); }, exit(code) { exits.push(code); },
  });
  Object.assign(child, { pid: 71234, exitCode: null, signalCode: null, stdout: new PassThrough(), stderr: new PassThrough() });
  globalThis[key] = {
    process: processFixture,
    spawn: () => child,
    execFile(command, args, options, callback) { commands.push({ command, args, options, callback }); },
  };
  try {
    const output = await build({
      entryPoints: [supervisor], bundle: true, platform: "node", format: "esm", write: false, logLevel: "silent",
      define: { process: `globalThis.${key}.process` },
      plugins: [{ name: "windows-process-fixture", setup(builder) {
        builder.onResolve({ filter: /^node:child_process$/ }, () => ({ path: "process", namespace: "fixture" }));
        builder.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({ contents: `export const spawn=(...args)=>globalThis.${key}.spawn(...args);export const execFile=(...args)=>globalThis.${key}.execFile(...args);`, loader: "js" }));
      } }],
    });
    await import(`data:text/javascript;base64,${Buffer.from(output.outputFiles[0].text).toString("base64")}`);
    processFixture.emit("message", { directory: path.resolve("/fixture"), port: 3037 });
    child.emit("spawn");
    assert.deepEqual(reports, [{ type: "app-started", pid: child.pid }]);
    child.exitCode = 1;
    child.emit("exit", 1);
    assert.equal(commands.length, 1, "an exited root must not skip taskkill");
    assert.deepEqual(commands[0].args, ["/PID", String(child.pid), "/T", "/F"]);
    assert.equal(commands[0].options.timeout, 5000);
    commands[0].callback(new Error("root already gone"));
    assert.equal(child.stdout.destroyed, true);
    assert.equal(child.stderr.destroyed, true);
    child.emit("close", 1);
    assert.deepEqual(exits, [1]);
    assert.deepEqual(reports.at(-1), { type: "app-stopped", pid: child.pid });
  } finally {
    processFixture.stdout.destroy(); processFixture.stderr.destroy();
    child.stdout.destroy(); child.stderr.destroy();
    delete globalThis[key];
  }
});

async function eventually(read, expected = true) {
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) { if (await read() === expected) return; await wait(20); }
  assert.equal(await read(), expected);
}
async function responds(port) {
  try { const response = await fetch(`http://127.0.0.1:${port}`, { signal: AbortSignal.timeout(200) }); await response.body?.cancel(); return response.ok; }
  catch { return false; }
}
function alive(pid) { try { process.kill(pid, 0); return true; } catch (error) { if (error.code === "ESRCH") return false; throw error; } }

for (const mode of ["graceful_stop", "next_exit", "host_killed", "output_closed"]) {
  test(`real process lease reaps Next descendants after ${mode} and preserves another listener`, { skip: process.platform === "win32" ? "POSIX process group regression; Windows needs a real machine" : false }, async (t) => {
    const directory = await mkdtemp(path.join(tmpdir(), "oq-classroom-lease-"));
    const location = path.join(directory, "node_modules/next/dist/bin");
    await mkdir(location, { recursive: true });
    const reserved = createServer(); await new Promise((resolve) => reserved.listen(0, "127.0.0.1", resolve));
    const port = reserved.address().port; await new Promise((resolve) => reserved.close(resolve));
    const sibling = createServer((_request, response) => response.end("other service"));
    await new Promise((resolve) => sibling.listen(0, "127.0.0.1", resolve));
    const siblingPort = sibling.address().port;
    let owner, worker, pids;
    t.after(async () => {
      if (owner?.exitCode === null && owner?.signalCode === null) owner.kill("SIGTERM");
      if (worker?.exitCode === null && worker?.signalCode === null) worker.kill("SIGTERM");
      if (pids && alive(pids.next)) process.kill(-pids.next, "SIGKILL");
      await new Promise((resolve) => sibling.close(resolve)); await rm(directory, { recursive: true, force: true });
    });
    const child = path.join(directory, "server.cjs");
    await writeFile(child, `const {createServer}=require('node:http'); process.on('SIGTERM',()=>{}); createServer((q,r)=>r.end('classroom')).listen(${port},'127.0.0.1');`);
    await writeFile(path.join(location, "next"), `const {spawn}=require('node:child_process'); const fs=require('node:fs'); const child=spawn(process.execPath,[${JSON.stringify(child)}],{stdio:'ignore'}); fs.writeFileSync(${JSON.stringify(path.join(directory, "pids.json"))},JSON.stringify({next:process.pid,server:child.pid}));process.on('SIGTERM',()=>process.exit(0));setInterval(()=>process.stdout.write('pulse\\n'),5);`);
    if (mode === "host_killed") {
      const ownerScript = path.join(directory, "owner.mjs");
      await writeFile(ownerScript, `import {fork} from 'node:child_process';import fs from 'node:fs';const worker=fork(${JSON.stringify(supervisor)},[],{execArgv:[],detached:true,stdio:['ignore','ignore','ignore','ipc']});worker.send({directory:${JSON.stringify(directory)},port:${port}});fs.writeFileSync(${JSON.stringify(path.join(directory, "worker.json"))},JSON.stringify({pid:worker.pid}));`);
      owner = fork(ownerScript, [], { execArgv: [], stdio: "ignore" });
    } else {
      worker = fork(supervisor, [], { execArgv: [], detached: true, stdio: ["ignore", "pipe", "pipe", "ipc"] });
      worker.stdout.resume(); worker.stderr.resume();
      worker.send({ directory, port });
    }
    await eventually(() => responds(port));
    pids = JSON.parse(await readFile(path.join(directory, "pids.json"), "utf8"));
    const workerPid = worker?.pid ?? JSON.parse(await readFile(path.join(directory, "worker.json"), "utf8")).pid;
    if (mode === "host_killed") { const exited = once(owner, "exit"); owner.kill("SIGKILL"); await exited; }
    else if (mode === "output_closed") { const exited = once(worker, "exit"); worker.stdout.destroy(); worker.stderr.destroy(); await exited; }
    else if (mode === "next_exit") { const exited = once(worker, "exit"); process.kill(pids.next, "SIGKILL"); await exited; }
    else { const exited = once(worker, "exit"); worker.kill("SIGTERM"); await exited; }
    await eventually(() => responds(port), false);
    for (const pid of [pids.next, pids.server, workerPid]) await eventually(() => alive(pid), false);
    assert.equal(await responds(siblingPort), true);
  });
}
