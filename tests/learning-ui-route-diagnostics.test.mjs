import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp, mkdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { createLearningUiDiagnosticObserver, inspectLearningUiRoutes } from "../src/learning/ui-route-diagnostics.mjs";
import { waitForLearningUi } from "../src/learning/ui-readiness.mjs";

async function fixture(t) {
  const directory = await mkdtemp(path.join(tmpdir(), "oq-route-diagnostic-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const output = path.join(directory, ".next/dev/server");
  await mkdir(output, { recursive: true });
  return { directory, output, manifest: path.join(output, "app-paths-manifest.json") };
}

test("route metadata distinguishes missing source, missing manifest and missing compiled entry", async (t) => {
  const f = await fixture(t);
  const missing = await inspectLearningUiRoutes(f.directory);
  assert.equal(missing.sourceStatusRoute, "missing");
  assert.equal(missing.manifest, "missing");
  await writeFile(f.manifest, JSON.stringify({ "/api/openquantum/status/route": "app/api/openquantum/status/route.js" }));
  const expected = await inspectLearningUiRoutes(f.directory);
  assert.equal(expected.manifest, "available");
  assert.equal(expected.manifestEntries, 1);
  assert.equal(expected.statusManifestEntry, "expected");
  assert.equal(expected.compiledStatusRoute, "missing");
  await mkdir(path.join(f.output, "app/api/openquantum/status"), { recursive: true });
  await writeFile(path.join(f.output, "app/api/openquantum/status/route.js"), "export const GET = () => {};");
  assert.equal((await inspectLearningUiRoutes(f.directory)).compiledStatusRoute, "file");
});

test("invalid or unexpected manifest values are never included or followed", async (t) => {
  const f = await fixture(t);
  const secret = "Bearer sk-private-route-fixture";
  for (const contents of ["not JSON " + secret, "[]", JSON.stringify({ "/api/openquantum/status/route": "../../" + secret })]) {
    await writeFile(f.manifest, contents);
    const report = await inspectLearningUiRoutes(f.directory);
    assert.ok(!JSON.stringify(report).includes(secret));
    assert.equal(report.compiledStatusRoute, "not_listed");
    assert.ok(["invalid", "available"].includes(report.manifest));
  }
  const unexpected = await inspectLearningUiRoutes(f.directory);
  assert.equal(unexpected.statusManifestEntry, "unexpected");
  assert.deepEqual(Object.keys(unexpected).sort(), ["phase", "sourceStatusRoute", "buildDirectory", "manifest", "manifestEntries", "statusManifestEntry", "compiledStatusRoute"].sort());
});

test("the primary environment's relocated build directory is observed without changing it", { skip: process.platform === "win32" ? "Directory symlink needs a platform-specific Windows fixture" : false }, async (t) => {
  const directory = await mkdtemp(path.join(tmpdir(), "oq-relocated-route-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const source = path.join(directory, "source"), output = path.join(directory, "cache");
  await mkdir(source); await mkdir(path.join(output, "dev/server"), { recursive: true });
  await symlink(output, path.join(source, ".next"), "dir");
  await writeFile(path.join(output, "dev/server/app-paths-manifest.json"), "{}");
  const report = await inspectLearningUiRoutes(source);
  assert.equal(report.buildDirectory, "symlink");
  assert.equal(report.manifest, "available");
  assert.equal(report.manifestEntries, 0);
});

test("a real repeated HTTP 404 schedules one route observation and preserves owned readiness", async (t) => {
  const f = await fixture(t);
  await writeFile(f.manifest, "{}");
  let requests = 0, inspected = 0;
  const identity = { instance: "owned", revision: "pinned" };
  const http = createServer((_request, response) => {
    requests++;
    if (requests <= 2) { response.writeHead(404); response.end("no compiled route"); }
    else response.end(JSON.stringify(identity));
  });
  await new Promise(resolve => http.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise(resolve => http.close(resolve)));
  const reports = [];
  let observed, release;
  const blocked = new Promise(resolve => { release = resolve; });
  const pending = new Promise(resolve => { observed = resolve; });
  const observe = createLearningUiDiagnosticObserver(f.directory, {
    inspect: async directory => { inspected++; await blocked; return inspectLearningUiRoutes(directory); },
    report: value => { reports.push(value); if (value.phase === "ui-route-diagnostic") observed(); },
  });
  await waitForLearningUi({ url: `http://127.0.0.1:${http.address().port}/api/openquantum/status`, ...identity, signal: new AbortController().signal, observe, timeoutMs: 1000, pollMs: 1 });
  assert.equal(reports.at(-1).state, "ready", "route inspection must not delay owned readiness");
  release();
  await pending;
  assert.equal(requests, 3);
  assert.equal(inspected, 1);
  assert.equal(reports.filter(row => row.phase === "ui-route-diagnostic").length, 1);
  assert.ok(reports.some(row => row.phase === "ui-readiness" && row.state === "ready"));
});

test("a late route observation is discarded after its owning service closes", async () => {
  let active = true, finish;
  const reports = [];
  const observe = createLearningUiDiagnosticObserver("unused", { report: value => reports.push(value), isActive: () => active, inspect: () => new Promise(resolve => { finish = resolve; }) });
  observe({ phase: "ui-readiness", state: "http_error", httpStatus: 404 });
  await Promise.resolve();
  active = false;
  finish({ phase: "ui-route-diagnostic", manifest: "available" });
  await Promise.resolve(); await Promise.resolve();
  assert.equal(reports.length, 1);
});

test("diagnostic exceptions cannot become startup failures or unhandled rejections", async () => {
  const observe = createLearningUiDiagnosticObserver("unused", { report() { throw new Error("closed log"); }, inspect() { throw new Error("unreadable manifest"); } });
  assert.doesNotThrow(() => observe({ phase: "ui-readiness", state: "http_error", httpStatus: 404 }));
  await new Promise(resolve => setImmediate(resolve));
});
