import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";

const originalFetch = globalThis.fetch;
let createRequests = 0;

globalThis.fetch = async (input, options) => {
  if (new URL(input).pathname !== "/api/session.create") return originalFetch(input, options);
  assert.equal(++createRequests, 1, "the probe must not replay session.create");
  const response = await originalFetch(input, options);
  // Hold the real reply beyond the old deadline and honor the caller's signal.
  await delay(11_000, undefined, { signal: options.signal });
  console.error("probe fixture: delayed session.create response delivered once");
  return response;
};
