import { spawn } from "node:child_process";

// StdioClientTransport owns this small launcher; it owns the upstream process
// group, including Gym training/TensorBoard descendants. Closing the connection
// never leaves a calculation running after its environment lease is released.
const [python, ...args] = process.argv.slice(2);
const child = spawn(python, args, { env: process.env, cwd: process.cwd(), stdio: ["pipe", "pipe", "pipe"], detached: process.platform !== "win32", windowsHide: true });
let closing = false, escalation;
function kill(signal) {
  if (!child.pid) return;
  if (process.platform === "win32") spawn("taskkill", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore", windowsHide: true }).on("error", () => child.kill());
  else try { process.kill(-child.pid, signal); } catch (error) { if (error.code !== "ESRCH") process.exitCode = 1; }
}
function close() {
  if (closing) return;
  closing = true; kill("SIGTERM");
  escalation = setTimeout(() => kill("SIGKILL"), 1000);
}
process.stdin.pipe(child.stdin); child.stdout.pipe(process.stdout); child.stderr.pipe(process.stderr);
child.stdin.on("error", () => {});
process.stdin.on("end", close); process.on("SIGTERM", close); process.on("SIGINT", close);
child.once("error", () => { process.exitCode = 1; close(); });
child.once("exit", () => { kill("SIGKILL"); clearTimeout(escalation); });
child.once("close", code => { process.stdin.destroy(); process.exitCode = closing ? 0 : code || 0; });
