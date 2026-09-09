import assert from "node:assert/strict";
import test from "node:test";
import { acceptsMessage, CHANNEL } from "../src/learning/ui-bridge.mjs";
import { acceptsThemeRequest, createThemeMessage, readThemeMessage, THEME_CHANNEL } from "../src/learning/ui-theme.mjs";

test("theme handshake is bound to its own channel, child window and exact origin", () => {
  const child = {};
  const origin = "http://localhost:3037";
  const event = { source: child, origin, data: { channel: THEME_CHANNEL, type: "ready" } };
  assert.equal(acceptsThemeRequest(event, child, origin), true);
  for (const invalid of [
    { ...event, source: {} }, { ...event, origin: "https://example.org" },
    { ...event, data: { ...event.data, channel: CHANNEL } },
    { ...event, data: { ...event.data, type: "setTheme" } },
  ]) assert.equal(acceptsThemeRequest(invalid, child, origin), false);
  assert.equal(acceptsThemeRequest(event, null, origin), false);
  assert.equal(acceptsMessage(event, child, origin), false);
});

test("light/dark snapshots carry resolved host tokens, including custom palette overrides", () => {
  const parent = {};
  const origin = "http://localhost:3000";
  for (const scheme of ["light", "dark"]) {
    const host = {
      "--dsw-alias-bg-base": scheme === "light" ? "rgb(255, 255, 255)" : "rgb(21, 21, 23)",
      "--dsw-alias-button-primary-fill": "#123456",
      "--dsw-font-family": "-apple-system, 'PingFang SC', sans-serif",
    };
    const data = createThemeMessage(scheme, (name) => host[name] || "");
    const result = readThemeMessage({ source: parent, origin, data }, parent, origin);
    assert.equal(result.colorScheme, scheme);
    assert.deepEqual(result.tokens, {
      "--oq-bg": host["--dsw-alias-bg-base"], "--oq-primary": "#123456", "--oq-font": host["--dsw-font-family"],
    });
  }
});

test("theme receiver ignores other windows, invalid modes and arbitrary style payloads", () => {
  const parent = {};
  const origin = "http://localhost:3000";
  const data = { channel: THEME_CHANNEL, type: "theme", colorScheme: "dark", tokens: {
    "--oq-bg": " #151517 ", "--oq-fg": "url(https://example.org/track)",
    "--oq-font": "sans-serif; background: red", "--unknown-token": "red", "--oq-primary": "x".repeat(513),
  } };
  const event = { source: parent, origin, data };
  assert.deepEqual(readThemeMessage(event, parent, origin).tokens, { "--oq-bg": "#151517" });
  assert.equal(readThemeMessage({ ...event, source: {} }, parent, origin), null);
  assert.equal(readThemeMessage({ ...event, origin: "https://example.org" }, parent, origin), null);
  assert.equal(readThemeMessage({ ...event, data: { ...data, colorScheme: "system" } }, parent, origin), null);
  assert.equal(readThemeMessage(event, null, origin), null);
});
