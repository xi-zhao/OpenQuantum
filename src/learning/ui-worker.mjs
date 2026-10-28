import { spawn, execFile } from "node:child_process";
import path from "node:path";

// Keep Next's private process group leased to the owning Harness IPC channel.
// The supervisor survives abrupt Host exit long enough to reap that group.
let child, stopping = false, timer, exitCode = 1;
function terminate(signal) {
  if (!child?.pid) return;
  if (process.platform !== "win32") {
    try { process.kill(-child.pid, signal); } catch (error) { if (error.code !== "ESRCH") child.kill(signal); }
  } else {
    // Descendants may still hold the pipes after the root exits. Attempt tree
    // cleanup even then, and bound our wait when Windows can no longer find it.
    execFile("taskkill", ["/PID", String(child.pid), "/T", "/F"], { windowsHide: true, timeout: 5000 }, () => {
      if (child.exitCode !== null || child.signalCode != null) {
        child.stdout.destroy();
        child.stderr.destroy();
      }
    });
  }
}
function report(message, done = () => {}) {
  if (!process.connected) { done(); return; }
  try { process.send(message, (error) => { if (error) stop(true); done(); }); }
  catch { stop(true); done(); }
}
function stop(force = false) {
  if (stopping) { if (force) terminate("SIGKILL"); return; }
  stopping = true;
  if (!child) { process.exit(0); return; }
  terminate(force ? "SIGKILL" : "SIGTERM");
  if (!force) timer = setTimeout(() => {
    // A live root PID cannot be reused. Never perform a delayed group kill
    // after the root has exited; its exit handler reaps descendants immediately.
    if (child.exitCode === null) terminate("SIGKILL");
  }, 4000).unref();
}
// Log readers can close before IPC. Reap the owned group on EPIPE as well.
process.stdout.on("error", () => stop(true));
process.stderr.on("error", () => stop(true));
process.on("SIGTERM", () => stop());
process.on("SIGINT", () => stop());
process.on("disconnect", () => stop(true));
process.once("message", ({ directory, port }) => {
  if (stopping || !path.isAbsolute(directory) || !Number.isInteger(port) || port < 1024 || port > 65535) {
    process.exit(1); return;
  }
  child = spawn(process.execPath, [path.join(directory, "node_modules/next/dist/bin/next"), "dev", "--hostname", "127.0.0.1", "--port", String(port)], {
    cwd: directory, env: process.env, detached: process.platform !== "win32", windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.pipe(process.stdout); child.stderr.pipe(process.stderr);
  child.once("spawn", () => report({ type: "app-started", pid: child.pid }));
  child.on("error", () => { exitCode = 1; stop(true); });
  child.once("exit", (code) => { exitCode = code ?? 1; terminate("SIGKILL"); });
  child.once("close", () => {
    clearTimeout(timer);
    report({ type: "app-stopped", pid: child.pid }, () => process.exit(stopping ? 0 : exitCode));
  });
});
