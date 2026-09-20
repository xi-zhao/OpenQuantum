import assert from "node:assert/strict";
import { harnessHttpCookie } from "./lib/harness-http-auth.mjs";

// Accept launch output through stdin so the authentication token never enters
// command arguments or the smoke-test report. No model request is performed.
const baseUrl = process.argv[2] ?? "http://127.0.0.1:3000";
let output = "";
for await (const chunk of process.stdin) output += chunk;
const cookie = await harnessHttpCookie(baseUrl, output);
const page = await fetch(baseUrl, { headers: { cookie }, signal: AbortSignal.timeout(5000) });
assert.equal(page.status, 200);
assert.match(await page.text(), /<title>OpenQuantum<\/title>/);
const method = "session/modelCatalog";
const response = await fetch(`${baseUrl}/api/${method}`, {
  method: "POST", headers: { "content-type": "application/json", cookie },
  body: JSON.stringify({ type: "client-request", rpcId: "host-smoke", method, payload: { args: {} } }),
  signal: AbortSignal.timeout(5000),
});
assert.equal(response.status, 200);
assert.equal((await response.json()).result?.ok, true);
const updates = await fetch(`${baseUrl}/openquantum/api/updates`, {
  method: "POST", headers: { "content-type": "application/json", origin: new URL(baseUrl).origin, cookie },
  body: JSON.stringify({ action: "snapshot" }), signal: AbortSignal.timeout(5000),
});
assert.equal(updates.status, 200);
const updateSnapshot = await updates.json();
assert.equal(updateSnapshot.channel, "stable");
assert.equal(typeof updateSnapshot.currentVersion, "string");
console.log(JSON.stringify({ status: "pass", branding: "OpenQuantum", authenticatedRpc: true, updateService: true, modelRequests: 0 }));
