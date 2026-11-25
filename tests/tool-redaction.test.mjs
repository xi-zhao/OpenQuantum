import assert from "node:assert/strict";
import test from "node:test";
import { CallToolResultSchema } from "@modelcontextprotocol/sdk/types.js";
import { redactCredentialValues, redactToolResult } from "../src/lib/tool-redaction.mjs";

for (const [name, text, secrets, expected] of [
  ["contained credentials", "value=fixture-token-suffix", ["fixture-token", "fixture-token-suffix"], "value=[redacted]"],
  ["partially overlapping credentials", "value=abcde", ["abc", "cde"], "value=[redacted]"],
  ["self-overlapping credential", "value=aaaaa", ["aaa"], "value=[redacted]"],
  ["separate matches", "value=abc / cde", ["abc", "cde"], "value=[redacted] / [redacted]"],
  ["placeholder-like credential", "value=fixture-token", ["fixture-token", "redacted"], "value=[redacted]"],
  ["Unicode overlap", "value=量子🔬密钥", ["量子🔬", "🔬密钥"], "value=[redacted]"],
]) {
  test(`redaction covers ${name} independently of credential order`, () => {
    for (const values of [secrets, [...secrets].reverse(), [...secrets, ...secrets]]) {
      assert.equal(redactCredentialValues(text, values), expected);
    }
  });
}

test("overlap redaction preserves structured results, nested JSON and MCP discriminators", () => {
  const secrets = ["abc", "cde", "text"];
  const body = { source: { library: "fixture" }, text: "value=abcde", metric: 0.125, ok: true, absent: null };
  const original = { content: [{ type: "text", text: JSON.stringify(body) }, { type: "text", text: JSON.stringify(JSON.stringify(body)) }],
    structuredContent: body, isError: true };
  const before = structuredClone(original);
  const expected = { ...body, text: "value=[redacted]" };
  const clean = redactToolResult(original, secrets);
  assert.equal(CallToolResultSchema.safeParse(clean).success, true);
  assert.deepEqual(clean.structuredContent, expected);
  assert.deepEqual(JSON.parse(clean.content[0].text), expected);
  assert.deepEqual(JSON.parse(JSON.parse(clean.content[1].text)), expected);
  assert.equal(clean.content[0].type, "text");
  assert.equal(clean.isError, true);
  assert.deepEqual(original, before, "provider-owned results must not be mutated");
});

test("escaped credentials in ordinary diagnostic text are matched before any replacement", () => {
  const credential = 'fixture-"quoted"-key\\tail\n';
  const secrets = ["fixture-", credential, "redacted"];
  let escaped = credential;
  for (let level = 0; level < 4; level++) {
    assert.equal(redactCredentialValues(`error: ${escaped} failed`, secrets), "error: [redacted] failed");
    escaped = JSON.stringify(escaped).slice(1, -1);
  }
});
