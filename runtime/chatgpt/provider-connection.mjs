import path from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { containedPath } from "./catalog.mjs";
import { serviceById } from "../../src/settings/codex/service-catalog.mjs";
import { RUNTIME_ENV_NAMES } from "../../src/settings/codex/environments.mjs";

// Codex adapts native Tool definitions through stdio. Desktop reuses this
// transport only for MCP providers and supplies its in-process native adapter.
function environment(root) {
  // Do not inherit model/API/hardware secrets into numerical tools.
  const allowed = ["PATH", "HOME", "SYSTEMROOT", "WINDIR", "TEMP", "TMP", "TMPDIR", "UV_CACHE_DIR", "UV_PYTHON_INSTALL_DIR", "SSL_CERT_FILE", "SSL_CERT_DIR"];
  return { ...Object.fromEntries(allowed.filter((key) => process.env[key]).map((key) => [key, process.env[key]])), OPENQUANTUM_PROJECT_ROOT: root };
}

export async function connectProvider(provider, root, values = {}, signal, nodeExecutable = process.execPath, { confine } = {}) {
  const args = provider.kind === "native"
    ? [path.join(root, "runtime/chatgpt/native-server.mjs"), provider.key]
    : [containedPath(root, provider.entrypoint)];
  // The host adapter supplies process confinement; shared transport remains
  // independent of DSH and applies it before attaching any credential values.
  const launch = confine ? await confine({ command: nodeExecutable, args, cwd: root }) : { command: nodeExecutable, args };
  const fields = serviceById(provider.key)?.fields ?? [];
  const env = { ...environment(root), ...Object.fromEntries(RUNTIME_ENV_NAMES.filter(key => values[key]).map(key => [key, values[key]])), ...Object.fromEntries(fields.filter(field => values[field.name]).map(field => [field.name, values[field.name]])), ...launch.env };
  env.PATH = `${path.dirname(nodeExecutable)}${path.delimiter}${env.PATH ?? ""}`;
  const transport = new StdioClientTransport({ command: launch.command, args: launch.args, cwd: root, env, stderr: "pipe", maxBufferSize: 4 * 1024 * 1024 });
  transport.stderr?.resume();
  const client = new Client({ name: "openquantum-chatgpt", version: "1.0.0" });
  try {
    signal?.throwIfAborted();
    await client.connect(transport, { timeout: 15000, signal });
    const close = client.close.bind(client);
    client.close = async () => { try { await close(); } finally { await launch.dispose?.(); } };
    return client;
  } catch (error) {
    try { await transport.close(); } finally { await launch.dispose?.(); }
    throw error;
  }
}
