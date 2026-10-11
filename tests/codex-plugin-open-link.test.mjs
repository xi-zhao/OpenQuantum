import assert from "node:assert/strict";
import test from "node:test";
import { openHostLink } from "../runtime/chatgpt/ui/open-link.mjs";

test("host link rejection and transport failures cannot be reported as opened", async () => {
  await assert.rejects(openHostLink({ openLink: async () => ({ isError: true }) }, "https://example.com"), /宿主未打开/);
  await assert.rejects(openHostLink({ openLink: async () => { throw new Error("disconnected"); } }, "https://example.com"), /disconnected/);
  let opened;
  await openHostLink({ openLink: async ({ url }) => { opened = url; return {}; } }, "https://example.com");
  assert.equal(opened, "https://example.com");
});
