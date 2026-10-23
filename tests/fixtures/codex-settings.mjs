import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Settings } from "../../src/settings/codex/application.mjs";
import { withLock } from "../../src/settings/codex/storage.mjs";

export async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "oq-plugin-settings-"));
  const secrets = new Map();
  const credentials = { resolve: async id => secrets.get(id) ?? null, describe: async id => ({ configured: secrets.has(id) }), set: async (id, value) => secrets.set(id, value), remove: async id => secrets.delete(id) };
  let calls = 0;
  const backend = { sourceCapabilities: [{ id: "example", title: "Example", status: "available", skill: "text", tools: ["calculate"] }],
    tools: [{ name: "calculate", inputSchema: { type: "object", properties: {}, additionalProperties: false } }],
    providers: [{ key: "local" }], providerFor: name => name === "calculate" ? "local" : undefined,
    call: async () => { calls++; return { content: [{ type: "text", text: "42" }] }; } };
  const options = { backend, credentials, directory: path.join(root, "settings"), codexHome: path.join(root, "codex"), skillRoot: path.join(root, "skills") };
  const settings = new Settings(options);
  t.after(async () => {
    // An HTTP response may arrive before its handler releases the settings lock.
    await withLock(settings.file, async () => {});
    await fs.rm(root, { recursive: true, force: true });
  });
  return { root, settings, options, backend, credentials, secrets, calls: () => calls };
}
