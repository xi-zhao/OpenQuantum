// Launch the unmodified pinned upstream MCP, with no model/hardware credentials.
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { localComputeEnvironment } from "../../../../src/lib/local-compute-policy.mjs";
const skillRoot = fileURLToPath(new URL("..", import.meta.url));
const projectRoot = path.resolve(skillRoot, "../../..");
const allowed = ["HOME", "PATH", "HTTP_PROXY", "HTTPS_PROXY", "NO_PROXY", "SSL_CERT_FILE", "SSL_CERT_DIR", "REQUESTS_CA_BUNDLE", "TMPDIR", "TMP", "TEMP", "UV_CACHE_DIR", "UV_PYTHON_INSTALL_DIR", "SYSTEMROOT", "WINDIR"];
const env = localComputeEnvironment(Object.fromEntries(allowed.filter(k => process.env[k] !== undefined).map(k => [k, process.env[k]])));
Object.assign(env, { UV_PROJECT_ENVIRONMENT: path.join(projectRoot, ".openquantum/python-envs/flagquantum-workbench"), UV_LINK_MODE: "copy", PYTHONNOUSERSITE: "1", PYTHONDONTWRITEBYTECODE: "1" });
const child = spawn("uv", ["run", "--quiet", "--frozen", "--project", skillRoot, "--python", "3.12", "flagquantum-mcp-server"], { cwd: projectRoot, env, stdio: "inherit", detached: process.platform !== "win32" });
let closing = false;
for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) process.on(signal, () => {
  if (closing) return;
  closing = true;
  try { if (process.platform === "win32") child.kill(signal); else process.kill(-child.pid, signal); } catch { /* already exited */ }
});
child.on("error", error => { process.stderr.write(`FlagQuantum launcher: ${error.message}\n`); process.exitCode = 1; });
child.on("exit", (code, signal) => { process.exitCode = closing ? 0 : (code ?? (signal ? 1 : 0)); });
