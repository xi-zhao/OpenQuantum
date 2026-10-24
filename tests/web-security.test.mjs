import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test from "node:test";
import { BrowserAuth } from "../packages/openquantum-web-security/browser-auth.mjs";
import { originRejection } from "../packages/openquantum-web-security/index.mjs";

function exchange(auth, url, headers = {}, method = "GET") {
  const response = { writeHead(status, values) { this.status = status; this.headers = values; }, end() {} };
  const request = { method, url: new URL(url).pathname + new URL(url).search, headers: { host: "127.0.0.1:3080", ...headers } };
  auth.authorizeIndex(request, response);
  return response;
}

test("launch exchange preserves Desktop hints without permitting a redirect or token leak", () => {
  const auth = new BrowserAuth({}, randomBytes(32), 1);
  const launch = auth.authenticatedUrl("http://127.0.0.1:3080/?dsh-desktop-mode=compatibility&dsh-desktop-platform=darwin&return=https://evil.example");
  const result = exchange(auth, launch);
  assert.equal(result.status, 303);
  assert.equal(result.headers.location, "/?dsh-desktop-mode=compatibility&dsh-desktop-platform=darwin");
  assert.match(result.headers["set-cookie"], /HttpOnly; SameSite=Strict$/);
  assert.equal(result.headers["referrer-policy"], "no-referrer");
  assert.equal(result.headers["cache-control"], "no-store");
  assert.equal(exchange(auth, launch + "&token=duplicate").status, 401);
  assert.equal(exchange(auth, launch, {}, "POST").status, 401);
  assert.equal(exchange(auth, launch.replace("/?", "/api/action?")).status, 401);
});

test("cookies reject tampering, another authority, expiry and another process", () => {
  const auth = new BrowserAuth({}, randomBytes(32), 1);
  const result = exchange(auth, auth.authenticatedUrl("http://127.0.0.1:3080"));
  const cookie = result.headers["set-cookie"].split(";")[0];
  const request = { headers: { host: "127.0.0.1:3080", cookie } };
  assert.equal(auth.isAuthenticated(request), true);
  assert.equal(auth.isAuthenticated({ headers: { ...request.headers, host: "127.0.0.1:3081" } }), false);
  assert.equal(auth.isAuthenticated({ headers: { ...request.headers, cookie: cookie + "invalid" } }), false);
  assert.equal(new BrowserAuth({}, randomBytes(32), 1).isAuthenticated(request), false);
  const clock = Date.now;
  try {
    Date.now = () => clock() + 2 * 86400000;
    assert.equal(auth.isAuthenticated(request), false);
  } finally { Date.now = clock; }
});

test("same-origin checks reject foreign origins and malformed authorities", () => {
  assert.equal(originRejection({ headers: { host: "127.0.0.1:3080", origin: "http://127.0.0.1:3080" } }), undefined);
  for (const headers of [
    { host: "127.0.0.1:3080", origin: "https://foreign.example" },
    { host: "127.0.0.1:3080", "sec-fetch-site": "cross-site" },
    { host: "user@127.0.0.1:3080" }, { host: "127.0.0.1:3080/path" },
    { host: "127.0.0.1:3080", origin: "null" }, {},
  ]) assert.equal(originRejection({ headers }), 403);
});
