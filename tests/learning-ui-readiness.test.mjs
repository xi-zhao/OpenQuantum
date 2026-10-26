import assert from "node:assert/strict";
import test from "node:test";
import { createServer } from "node:http";
import { setTimeout as wait } from "node:timers/promises";
import { waitForLearningUi } from "../src/learning/ui-readiness.mjs";

async function server(t, handle) {
  const http = createServer(handle);
  await new Promise((resolve) => http.listen(0, "127.0.0.1", resolve));
  t.after(() => { http.closeAllConnections(); return new Promise((resolve) => http.close(resolve)); });
  return `http://127.0.0.1:${http.address().port}/api/openquantum/status`;
}

const identity = { instance: "owned-launch", revision: "pinned-revision" };
const options = (url, extra = {}) => ({ url, ...identity, signal: new AbortController().signal, timeoutMs: 1000, probeTimeoutMs: 500, pollMs: 5, ...extra });

test("a cold route can finish its first compile before a successful owned readiness response", async (t) => {
  let requests = 0;
  const url = await server(t, async (_, response) => {
    requests++;
    await wait(60);
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify(identity));
  });
  await waitForLearningUi(options(url));
  assert.equal(requests, 1, "do not repeatedly interrupt a still-compiling route");
});

test("HTTP failures, invalid JSON and unrelated processes do not become ready", async (t) => {
  let request = 0;
  const reports = [];
  const url = await server(t, (_, response) => {
    request++;
    if (request === 1) { response.writeHead(404); response.end("not compiled"); }
    else if (request === 2) response.end("Bearer sk-private-fixture incomplete JSON");
    else response.end(JSON.stringify(request === 3 ? { ...identity, instance: "another-process" } : request === 4 ? { ...identity, revision: "old-version" } : identity));
  });
  await waitForLearningUi(options(url, { observe: (value) => reports.push(value) }));
  assert.equal(request, 5);
  assert.deepEqual(reports.map(value => [value.state, value.httpStatus]), [["http_error", 404], ["request_failed", null], ["identity_mismatch", 200], ["ready", 200]]);
  assert.ok(!JSON.stringify(reports).includes("sk-private-fixture"));
  assert.ok(!JSON.stringify(reports).includes("another-process"));
  assert.ok(reports.every(value => Object.keys(value).sort().join(",") === "attempt,elapsedMs,httpStatus,phase,state"));
});

test("an unrelated listener reaches the bounded timeout instead of being adopted", async (t) => {
  const url = await server(t, (_, response) => response.end(JSON.stringify({ ...identity, instance: "another-process" })));
  const start = Date.now();
  const reports = [];
  await assert.rejects(waitForLearningUi(options(url, { timeoutMs: 80, observe: value => reports.push(value) })), /启动超时/);
  assert.ok(Date.now() - start < 500);
  assert.equal(reports[0].state, "identity_mismatch");
  assert.equal(reports.at(-1).state, "timeout");
  assert.ok(reports.length <= 3, "unchanged retry states do not produce one log entry per poll");
});

test("stopping the application interrupts an outstanding readiness request immediately", async (t) => {
  const abort = new AbortController();
  const reason = new TypeError("owned child exited");
  let entered;
  const requested = new Promise((resolve) => { entered = resolve; });
  const url = await server(t, () => entered());
  const result = waitForLearningUi(options(url, { signal: abort.signal, observe: () => assert.fail("canceled request must not report after process exit") }));
  await requested;
  abort.abort(reason);
  await assert.rejects(result, (error) => error === reason);
});

test("a hanging status body is bounded by the total startup deadline", async (t) => {
  const url = await server(t, (_, response) => {
    response.writeHead(200, { "content-type": "application/json" });
    response.write('{"instance":');
  });
  const start = Date.now();
  await assert.rejects(waitForLearningUi(options(url, { timeoutMs: 80 })), /启动超时/);
  assert.ok(Date.now() - start < 500);
});

test("a diagnostic sink cannot reject an otherwise ready owned process", async (t) => {
  const url = await server(t, (_, response) => response.end(JSON.stringify(identity)));
  await waitForLearningUi(options(url, { observe() { throw new Error("diagnostic sink closed"); } }));
});
