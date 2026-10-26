import assert from "node:assert/strict";
import test from "node:test";
import { EventEmitter } from "node:events";
import { fork } from "node:child_process";
import { createServer } from "node:http";
import { mkdtemp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { setTimeout as wait } from "node:timers/promises";
import { waitForLearningUi } from "../src/learning/ui-readiness.mjs";
import { PassThrough, Writable } from "node:stream";
import { setImmediate as nextTurn } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const serviceUrl = new URL("../src/learning/ui-service.mjs", import.meta.url);
const fixtureKey = "__openquantumLearningServiceLifecycle";

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

async function until(predicate) {
  for (let attempt = 0; attempt < 30; attempt++) {
    if (predicate()) return;
    await nextTurn();
  }
  assert.ok(predicate(), "expected lifecycle transition did not occur");
}

async function loadService(fixture) {
  globalThis[fixtureKey] = fixture;
  const access = `globalThis.${fixtureKey}`;
  const modules = {
    "node:child_process": `export const fork = (...args) => ${access}.fork(...args); export const execFile = () => { throw new Error('Unexpected taskkill'); };`,
    "node:fs": `export const existsSync = () => true; export const createWriteStream = () => ${access}.log();`,
    "node:fs/promises": `export const readFile = file => ${access}.readFile(file); export const lstat = async () => { throw Object.assign(new Error('absent fixture data'), {code:'ENOENT'}); }; export const mkdir = async () => {}; export const appendFile = async () => {}; export const readlink = async () => {}; export const realpath = async () => {}; export const rename = async () => {}; export const symlink = async () => {}; export const chmod = async () => {};`,
    "../../runtime/openquantum/project-root.mjs": "export const nodeExecutable = process.execPath;",
    "../../scripts/lib/openmaic-ui-source.mjs": "export const OPENMAIC_REVISION = 'fixture-revision'; export const sourceDirectory = root => root + '/source';",
    "./database-service.mjs": `export const createLearningDatabase = () => ${access}.database();`,
    "./model-gateway.mjs": "export const createModelGateway = async () => ({url:'http://fixture.invalid',token:'fixture-token',dispose() {}});",
    "./ui-readiness.mjs": `export const waitForLearningUi = options => ${access}.readiness(options);`,
    "./ui-route-diagnostics.mjs": "export const createLearningUiDiagnosticObserver = () => () => {};",
  };
  const result = await build({
    entryPoints: [fileURLToPath(serviceUrl)], bundle: true, platform: "node", format: "esm",
    write: false, logLevel: "silent", define: { "import.meta.url": JSON.stringify(serviceUrl.href) },
    plugins: [{ name: "isolated-classroom-service", setup(builder) {
      builder.onResolve({ filter: /.*/ }, args => Object.hasOwn(modules, args.path)
        ? { path: args.path, namespace: "fixture" } : undefined);
      builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: modules[args.path], loader: "js" }));
    } }],
  });
  return import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString("base64")}`);
}

function serviceFixture() {
  const workers = [], logs = [], readiness = [];
  const fixture = {
    workers, logs, pendingReadiness: readiness,
    databases: 0, disposedDatabases: 0,
    fork() {
      const worker = new EventEmitter();
      Object.assign(worker, { exitCode: null, signalCode: null, killed: false, stdout: new PassThrough(), stderr: new PassThrough(), send() {} });
      workers.push(worker);
      return worker;
    },
    log() {
      const stream = new Writable({ write(_chunk, _encoding, callback) { callback(); } });
      logs.push(stream);
      return stream;
    },
    async readFile(file) {
      if (file.endsWith(".openquantum-ui.json")) return JSON.stringify({ revision: "fixture-revision", files: [] });
      return 'OPENQUANTUM_GENERATION_RESOURCE_DIR\nGenerated quiz does not match the declared count or question types.\nformulaHtml\nnormal: "p"\nchildren.length > 2\nwrap="none" lIns="0" tIns="0" rIns="0" bIns="0" anchor="ctr"\ntypeface="${encodeXmlEntities(opts.fontFace)}"';
    },
    async database() {
      fixture.databases++;
      return { url: "postgresql://fixture.invalid/fixture", async dispose() { fixture.disposedDatabases++; } };
    },
    readiness(options) {
      const pending = deferred();
      options.signal.addEventListener("abort", () => pending.reject(options.signal.reason), { once: true });
      if (options.signal.aborted) pending.reject(options.signal.reason);
      readiness.push(pending);
      return pending.promise;
    },
  };
  return fixture;
}

function closeWorker(worker, code = 0) {
  worker.exitCode = code;
  worker.emit("exit", code);
  worker.emit("close", code);
  worker.stdout.destroy(); worker.stderr.destroy();
}

test("a missing fork cwd rejects startup without an unhandled IPC error", { timeout: 5000 }, async t => {
  const fixture = serviceFixture();
  let sends = 0;
  fixture.fork = (file, args, options) => {
    const worker = fork(file, args, { ...options, cwd: path.join(tmpdir(), `oq-missing-${crypto.randomUUID()}`) });
    fixture.workers.push(worker);
    const send = worker.send.bind(worker);
    worker.send = (...args) => { sends++; return send(...args); };
    return worker;
  };
  const { createLearningUiService } = await loadService(fixture);
  const service = createLearningUiService("/virtual-classroom-fixture", { llm: {}, selection: {} });
  t.after(async () => { await service.dispose(); delete globalThis[fixtureKey]; });
  await assert.rejects(service.open("http://localhost:3000"), /进程启动失败/);
  assert.equal(sends, 0, "initial IPC waits for a successful spawn");
  assert.equal(fixture.disposedDatabases, 1);
});

test("IPC failure and repeated child errors leave the Host alive and finish cleanup", { timeout: 5000 }, async t => {
  const fixture = serviceFixture();
  const fork = fixture.fork;
  fixture.fork = () => {
    const worker = fork();
    worker.send = (_message, callback) => {
      assert.equal(typeof callback, "function");
      callback(Object.assign(new Error("closed IPC"), { code: "EPIPE" }));
      worker.emit("error", new Error("first child error"));
      worker.emit("error", new Error("second child error"));
      closeWorker(worker, 1);
    };
    queueMicrotask(() => worker.emit("spawn"));
    return worker;
  };
  const { createLearningUiService } = await loadService(fixture);
  const service = createLearningUiService("/virtual-classroom-fixture", { llm: {}, selection: {} });
  t.after(async () => { await service.dispose(); delete globalThis[fixtureKey]; });
  await assert.rejects(service.open("http://localhost:3000"), /进程启动失败/);
  assert.equal(fixture.disposedDatabases, 1);
});

test("only explicit reopen replaces an unhealthy instance and concurrent retries share cleanup", { timeout: 5000 }, async t => {
  const fixture = serviceFixture();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response("unavailable", { status: 503 });
  const { createLearningUiService } = await loadService(fixture);
  const service = createLearningUiService("/virtual-classroom-fixture", { llm: {}, selection: {} });
  t.after(async () => {
    fixture.workers.forEach(worker => closeWorker(worker));
    await service.dispose();
    globalThis.fetch = originalFetch;
    delete globalThis[fixtureKey];
  });
  const initial = service.open("http://localhost:3000");
  await until(() => fixture.pendingReadiness.length === 1);
  fixture.pendingReadiness[0].resolve();
  await initial;
  assert.deepEqual(await service.status("http://localhost:3000"), { state: "unavailable" });
  assert.equal(fixture.disposedDatabases, 0, "read-only status never replaces a service");
  const reopened = service.open("http://localhost:3000");
  const concurrent = service.open("http://localhost:3000");
  await until(() => fixture.disposedDatabases === 1);
  assert.equal(fixture.databases, 1);
  closeWorker(fixture.workers[0]);
  await until(() => fixture.pendingReadiness.length === 2);
  fixture.pendingReadiness[1].resolve();
  assert.deepEqual(await reopened, await concurrent);
  assert.equal(fixture.databases, 2);
  assert.equal(fixture.workers.length, 2);
});

test("Host reaps the reported Next group after supervisor SIGKILL without touching another listener", { timeout: 12_000, skip: process.platform === "win32" && "POSIX process group regression" }, async t => {
  const root = await mkdtemp(path.join(tmpdir(), "oq-supervisor-killed-"));
  const directory = path.join(root, "source");
  const bin = path.join(directory, "node_modules/next/dist/bin");
  await mkdir(bin, { recursive: true });
  const reserved = createServer();
  await new Promise(resolve => reserved.listen(0, "127.0.0.1", resolve));
  const port = reserved.address().port;
  await new Promise(resolve => reserved.close(resolve));
  const sibling = createServer((_request, response) => response.end("other instance"));
  await new Promise(resolve => sibling.listen(0, "127.0.0.1", resolve));
  const serverCode = `const {createServer}=require('node:http');process.on('SIGTERM',()=>{});createServer((q,r)=>{r.setHeader('content-type','application/json');r.end(JSON.stringify({instance:process.env.OPENQUANTUM_UI_INSTANCE,revision:'fixture-revision'}))}).listen(${port},'127.0.0.1');`;
  await writeFile(path.join(bin, "next"), `const {spawn}=require('node:child_process');const fs=require('node:fs');const child=spawn(process.execPath,['-e',${JSON.stringify(serverCode)}],{stdio:['ignore','inherit','inherit']});fs.writeFileSync(${JSON.stringify(path.join(root, "pids.json"))},JSON.stringify({next:process.pid,server:child.pid}));setInterval(()=>{},1000);`);
  const fixture = serviceFixture();
  fixture.fork = (...args) => { const worker = fork(...args); fixture.workers.push(worker); return worker; };
  fixture.readiness = options => waitForLearningUi({ ...options, timeoutMs: 5000, probeTimeoutMs: 200, pollMs: 20 });
  const { createLearningUiService } = await loadService(fixture);
  const service = createLearningUiService(root, { port, llm: {}, selection: {} });
  let pids;
  const alive = pid => { try { process.kill(pid, 0); return true; } catch (error) { if (error.code === "ESRCH") return false; throw error; } };
  t.after(async () => {
    if (pids) { try { process.kill(-pids.next, "SIGKILL"); } catch { /* Already reaped. */ } }
    await service.dispose();
    sibling.closeAllConnections(); await new Promise(resolve => sibling.close(resolve));
    await rm(root, { recursive: true, force: true });
    delete globalThis[fixtureKey];
  });
  await service.open("http://localhost:3000");
  pids = JSON.parse(await readFile(path.join(root, "pids.json"), "utf8"));
  fixture.workers[0].kill("SIGKILL");
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline && (alive(pids.next) || alive(pids.server))) await wait(20);
  assert.equal(alive(pids.next), false);
  assert.equal(alive(pids.server), false);
  assert.deepEqual(await service.status("http://localhost:3000"), { state: "unavailable" });
  const response = await fetch(`http://127.0.0.1:${sibling.address().port}`);
  assert.equal(await response.text(), "other instance");
});

test("classroom retry and disposal wait for worker close after database disposal", { timeout: 5000 }, async t => {
  const workers = [], readiness = [], logs = [];
  let databases = 0, disposedDatabases = 0;
  const fixture = {
    fork() {
      const worker = new EventEmitter();
      // No PID: the real stopApp cannot send a signal to any operating-system process.
      Object.assign(worker, { exitCode: null, killed: false, stdout: new PassThrough(), stderr: new PassThrough(), send() {} });
      workers.push(worker);
      return worker;
    },
    log() {
      const stream = new Writable({ write(_chunk, _encoding, callback) { callback(); } });
      logs.push(stream);
      return stream;
    },
    async readFile(file) {
      if (file.endsWith(".openquantum-ui.json")) return JSON.stringify({ revision: "fixture-revision", files: [] });
      return 'OPENQUANTUM_GENERATION_RESOURCE_DIR\nGenerated quiz does not match the declared count or question types.\nformulaHtml\nnormal: "p"\nchildren.length > 2\nwrap="none" lIns="0" tIns="0" rIns="0" bIns="0" anchor="ctr"\ntypeface="${encodeXmlEntities(opts.fontFace)}"';
    },
    async database() {
      databases++;
      return { url: "postgresql://fixture.invalid/fixture", async dispose() { disposedDatabases++; } };
    },
    readiness() {
      const pending = deferred();
      readiness.push(pending);
      return pending.promise;
    },
  };
  const { createLearningUiService } = await loadService(fixture);
  const service = createLearningUiService("/virtual-classroom-fixture", { llm: {}, selection: {} });
  t.after(async () => {
    for (const worker of workers) {
      worker.exitCode = 0;
      worker.emit("exit", 0);
      worker.emit("close", 0);
      worker.stdout.destroy(); worker.stderr.destroy();
    }
    await service.dispose();
    for (const log of logs) log.destroy();
    delete globalThis[fixtureKey];
  });

  const failure = new Error("fixture readiness failure");
  let firstSettled = false;
  const first = service.open("http://localhost:3000").then(
    () => { firstSettled = true; return undefined; },
    error => { firstSettled = true; return error; },
  );
  await until(() => readiness.length === 1);
  readiness[0].reject(failure);
  await until(() => disposedDatabases === 1);
  await nextTurn();
  assert.equal(firstSettled, false, "startup failure must wait for the worker to release its resources");

  // A click during cleanup must not create a second database or worker.
  const earlyRetry = service.open("http://localhost:3000").catch(error => error);
  await nextTurn();
  assert.equal(databases, 1);
  assert.equal(workers.length, 1);
  workers[0].exitCode = 1;
  workers[0].emit("exit", 1);
  await nextTurn();
  assert.equal(firstSettled, false, "exit alone is not close; stdio and descendants can still be draining");
  workers[0].emit("close", 1);
  assert.equal(await first, failure);
  assert.equal(await earlyRetry, failure);

  const reopened = service.open("http://localhost:3000");
  await until(() => readiness.length === 2);
  assert.equal(databases, 2);
  assert.equal(workers.length, 2);
  readiness[1].resolve();
  assert.equal((await reopened).url, "http://localhost:3037/");

  let disposed = false;
  const shutdown = service.dispose().then(() => { disposed = true; });
  await until(() => disposedDatabases === 2);
  await nextTurn();
  assert.equal(disposed, false, "database disposal alone must not finish service disposal");
  workers[1].exitCode = 0;
  workers[1].emit("exit", 0);
  await nextTurn();
  assert.equal(disposed, false);
  workers[1].emit("close", 0);
  await shutdown;
  assert.equal(disposed, true);
});
