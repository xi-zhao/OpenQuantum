import assert from "node:assert/strict";
import test from "node:test";
import { apply } from "../runtime/openquantum/cc-connect/ready.mjs";

function context(awaitComposition) {
  const published = [];
  const entry = {
    options: { id: "openquantum-agent-extensions" },
    fiber: { await: async () => {} },
    subtree: { await: awaitComposition },
  };
  return {
    llm: { listProviders: () => [{ id: "fixture" }] },
    loader: { entries: () => [entry] },
    on: () => () => {},
    effect: () => {},
    provide: (...value) => published.push(value),
    published,
  };
}

test("ACP readiness publishes only after the Loader finishes Tool composition", async () => {
  let release;
  const ctx = context(() => new Promise(resolve => { release = resolve; }));
  const ready = apply(ctx, { provider: "fixture" });
  while (!release) await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(ctx.published, []);
  release();
  await ready;
  assert.deepEqual(ctx.published, [["openquantumAcpModelReady", { provider: "fixture" }]]);
});

test("ACP never publishes readiness after a Tool composition failure", async () => {
  const ctx = context(async () => { throw new Error("fixture Tool apply failed"); });
  await assert.rejects(apply(ctx, { provider: "fixture" }), /fixture Tool apply failed/);
  assert.deepEqual(ctx.published, []);
});
