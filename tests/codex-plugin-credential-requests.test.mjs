import assert from "node:assert/strict";
import test from "node:test";
import { createCredentialRequests } from "../src/settings/codex/credential-requests.mjs";

const scope = { kind: "field", id: "fieldqkit", field: "QUAFU_API_TOKEN", operation: "set", origin: "https://plugin.example.test" };

test("credential permissions are scoped and consumed synchronously only once", async () => {
  const requests = createCredentialRequests();
  const input = { ...scope };
  const nonce = requests.issue(input);
  input.id = "replacement";
  assert.match(nonce, /^[a-f0-9]{64}$/);
  assert.equal(requests.peek(nonce).id, scope.id);
  for (const mismatch of [{ kind: "window" }, { origin: "https://foreign.example.test" }, { field: "TIANYAN_API_TOKEN" }, { operation: "remove" }]) {
    assert.equal(requests.consume(nonce, mismatch), undefined);
  }
  const attempts = await Promise.all([1, 2].map(async () => requests.consume(nonce, scope)));
  assert.equal(attempts.filter(Boolean).length, 1);
  assert.equal(requests.peek(nonce), undefined);
  assert.equal(requests.has(scope), false);
});

test("inspection is repeatable but every read and consumption rechecks expiry", t => {
  t.mock.timers.enable({ apis: ["Date"], now: Date.now() });
  const requests = createCredentialRequests();
  const nonce = requests.issue(scope);
  const other = requests.issue({ kind: "window", id: "connection" });
  assert.ok(requests.peek(nonce, scope));
  assert.ok(requests.peek(nonce, scope));
  assert.ok(requests.has({ kind: "field", origin: scope.origin }));
  t.mock.timers.tick(10 * 60 * 1000 + 1);
  assert.equal(requests.peek(nonce), undefined);
  assert.equal(requests.consume(other), undefined);
  assert.equal(requests.has({ kind: "field", origin: scope.origin }), false);
});

test("the request limit is shared by scopes and expired entries release capacity", t => {
  t.mock.timers.enable({ apis: ["Date"], now: Date.now() });
  const requests = createCredentialRequests();
  const nonces = new Set();
  for (let i = 0; i < 32; i++) nonces.add(requests.issue({ kind: i % 2 ? "window" : "field" }));
  assert.equal(nonces.size, 32);
  assert.throws(() => requests.issue(scope), /过多/);
  requests.consume(nonces.values().next().value);
  requests.issue(scope);
  assert.throws(() => requests.issue(scope), /过多/);
  t.mock.timers.tick(10 * 60 * 1000 + 1);
  assert.ok(requests.peek(requests.issue(scope)));
});

test("owners are isolated and closing revokes existing and future permissions", () => {
  const first = createCredentialRequests(), second = createCredentialRequests();
  const firstNonce = first.issue(scope), secondNonce = second.issue(scope);
  assert.equal(second.consume(firstNonce), undefined);
  first.close(); first.close();
  assert.equal(first.peek(firstNonce), undefined);
  assert.equal(first.consume(firstNonce), undefined);
  assert.equal(first.has(scope), false);
  assert.throws(() => first.issue(scope), /关闭/);
  assert.ok(second.consume(secondNonce));
});
