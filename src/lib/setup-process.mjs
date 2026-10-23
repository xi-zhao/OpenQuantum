import { spawn } from "node:child_process";

// An explicit setup command, with visible progress and cancellation forwarded
// to its owned process tree. This never runs as a calculation fallback.
export function runSetupCommand(command, args, { cwd, env = process.env, capture = false, signal, onOutput, timeoutMs = 1_800_000 } = {}) {
  signal?.throwIfAborted();
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, env, stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit", detached: process.platform !== "win32", windowsHide: true });
    let failure, output = "", escalation;
    const stop = signal => {
      if (!child.pid) return;
      if (process.platform === "win32") {
        const killer = spawn("taskkill", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore", windowsHide: true });
        killer.on("error", () => child.kill());
      } else {
        try { process.kill(-child.pid, signal); }
        catch (error) { if (error.code !== "ESRCH") failure ??= error; }
      }
    };
    const cancel = () => {
      failure ??= new Error("SDK setup cancelled; retry the same setup command");
      stop("SIGTERM");
      escalation ??= setTimeout(() => stop("SIGKILL"), 5000);
    };
    process.once("SIGINT", cancel); process.once("SIGTERM", cancel);
    signal?.addEventListener("abort", cancel, { once: true });
    const deadline = setTimeout(() => { failure ??= new Error("SDK setup timed out"); cancel(); }, timeoutMs);
    const cleanup = () => {
      clearTimeout(deadline); clearTimeout(escalation);
      process.removeListener("SIGINT", cancel); process.removeListener("SIGTERM", cancel);
      signal?.removeEventListener("abort", cancel);
    };
    child.stdout?.on("data", bytes => {
      onOutput?.(bytes.toString());
      output += bytes;
      if (Buffer.byteLength(output) > 8 * 1024 * 1024) { failure ??= new Error("SDK setup output exceeds capture budget"); cancel(); }
    });
    child.stderr?.on("data", bytes => onOutput?.(bytes.toString()));
    // A descendant can keep inherited pipes open after the direct child exits.
    // Reap the owned group on exit so close cannot wait until the deadline.
    child.once("exit", () => { if (process.platform !== "win32") stop("SIGKILL"); });
    child.once("error", error => { cleanup(); reject(error); });
    child.once("close", (code, signal) => {
      // The direct child can exit before a stubborn build subprocess. Never
      // cancel escalation while leaving descendants of our owned group alive.
      if (process.platform !== "win32") stop("SIGKILL");
      cleanup();
      if (failure || code !== 0) reject(failure ?? new Error(`SDK setup failed: ${command} (${signal || code})`));
      else resolve(output.trim());
    });
  });
}
