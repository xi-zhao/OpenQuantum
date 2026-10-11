import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { createInterface } from "node:readline";

// Use the desktop host's own parser. Direct MCP probes do not validate the
// Agent Plugins manifest contract and cannot prove sidebar discovery.
export async function probeHostPlugin({ codex, marketplacePath, env = process.env }) {
  const child = spawn(codex, ["app-server", "--listen", "stdio://"], { env, stdio: ["pipe", "pipe", "pipe"] });
  const lines = createInterface({ input: child.stdout });
  const errors = createInterface({ input: child.stderr });
  const diagnostics = [];
  const pending = new Map();
  let serial = 0;
  let hostError;
  const fail = (error) => { hostError = error; for (const { reject } of pending.values()) reject(error); pending.clear(); };
  child.on("error", fail);
  child.stdin.on("error", fail);
  child.on("exit", (code, signal) => fail(new Error(`Desktop host probe exited (${code ?? signal})`)));
  errors.on("line", (line) => {
    try {
      const { fields } = JSON.parse(line);
      if (fields?.server === "openquantum" && typeof fields.error === "string") diagnostics.push(fields.error);
    } catch { /* Ignore unrelated host logs. */ }
  });
  lines.on("line", (line) => {
    let message;
    try { message = JSON.parse(line); } catch { return; }
    const request = pending.get(message.id);
    if (!request) return;
    pending.delete(message.id);
    if (message.error) request.reject(new Error(message.error.message));
    else request.resolve(message.result);
  });
  const call = (method, params) => new Promise((resolve, reject) => {
    if (hostError) return reject(hostError);
    const id = ++serial;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`Desktop host timed out: ${method}`)); }, 20000);
    pending.set(id, { resolve: (result) => { clearTimeout(timer); resolve(result); }, reject: (error) => { clearTimeout(timer); reject(error); } });
    child.stdin.write(`${JSON.stringify({ id, method, params })}\n`);
  });
  try {
    const initialized = await call("initialize", { clientInfo: { name: "openquantum_plugin_check", version: "1.0.0" }, capabilities: { experimentalApi: true } });
    child.stdin.write('{"method":"initialized"}\n');
    const { plugin } = await call("plugin/read", { pluginName: "openquantum", marketplacePath });
    return { userAgent: initialized.userAgent, mcpServers: plugin.mcpServers, skills: plugin.skills.length, diagnostics };
  } finally {
    lines.close();
    errors.close();
    child.stdin.end();
    child.kill();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [codex, marketplacePath] = process.argv.slice(2);
  if (!codex || !marketplacePath) throw new Error("Usage: node scripts/probe-chatgpt-host.mjs <codex-executable> <marketplace.json>");
  const result = await probeHostPlugin({ codex, marketplacePath: path.resolve(marketplacePath) });
  console.log(JSON.stringify(result, null, 2));
  if (!result.mcpServers.includes("openquantum")) process.exitCode = 1;
}
