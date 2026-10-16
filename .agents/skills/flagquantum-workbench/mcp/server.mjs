// Launch the unmodified pinned upstream MCP, with no model/hardware credentials.
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { localComputeEnvironment } from "../../../../src/lib/local-compute-policy.mjs";
import { preparedPythonLaunch } from "../../../../src/lib/prepared-python.mjs";
const skillRoot = fileURLToPath(new URL("..", import.meta.url));
const projectRoot = path.resolve(skillRoot, "../../..");
const allowed = ["HOME", "PATH", "HTTP_PROXY", "HTTPS_PROXY", "NO_PROXY", "SSL_CERT_FILE", "SSL_CERT_DIR", "REQUESTS_CA_BUNDLE", "TMPDIR", "TMP", "TEMP", "UV_CACHE_DIR", "UV_PYTHON_INSTALL_DIR", "SYSTEMROOT", "WINDIR"];
const env = localComputeEnvironment(Object.fromEntries(allowed.filter(k => process.env[k] !== undefined).map(k => [k, process.env[k]])));
Object.assign(env, { PYTHONNOUSERSITE: "1", PYTHONDONTWRITEBYTECODE: "1" });
const launch = await preparedPythonLaunch({ skillRoot, args: ["-c", "from importlib.metadata import distribution; next(e for e in distribution('flagquantum-mcp-server').entry_points if e.group == 'console_scripts' and e.name == 'flagquantum-mcp-server').load()()"] });
const child = spawn(launch.command, launch.args, { cwd: projectRoot, env, stdio: "inherit", detached: process.platform !== "win32" });
let closing = false;
let escalation;
for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) process.on(signal, () => {
  if (closing) return;
  closing = true;
  try { if (process.platform === "win32") child.kill(signal); else process.kill(-child.pid, signal); } catch { /* already exited */ }
  // The MCP stdio client kills this wrapper two seconds after SIGTERM.
  escalation = setTimeout(() => { try { if (process.platform === "win32") child.kill("SIGKILL"); else process.kill(-child.pid, "SIGKILL"); } catch { /* already exited */ } }, 1000);
});
child.on("error", error => { process.stderr.write(`FlagQuantum launcher: ${error.message}\n`); process.exitCode = 1; });
child.on("exit", (code, signal) => {
  if (process.platform !== "win32") { try { process.kill(-child.pid, "SIGKILL"); } catch { /* already exited */ } }
  clearTimeout(escalation); process.exitCode = closing ? 0 : (code ?? (signal ? 1 : 0));
});
