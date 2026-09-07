import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

function redactError(value, environment) {
  let redacted = String(value);
  for (const value of Object.values(environment)) {
    if (typeof value === "string" && value.length >= 4) {
      redacted = redacted.split(value).join("[REDACTED]");
    }
  }
  return redacted;
}

// This owns only one bridge invocation, not MCP or Harness lifecycle.
export async function runLocalJsonProcess({
  command,
  args,
  cwd,
  env,
  input,
  signal,
  timeoutMs,
  maxOutputBytes,
  label,
  notFoundMessage,
}, { platform = process.platform } = {}) {
  signal?.throwIfAborted();
  const stdin = JSON.stringify(input);
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env,
      stdio: ["pipe", "pipe", "pipe"],
      // uv can own a Python child. A private POSIX process group lets Stop
      // terminate both without touching the MCP server or sibling calls.
      detached: platform !== "win32",
      windowsHide: true,
    });
    const stdout = [];
    const stderr = [];
    let outputBytes = 0;
    let failure;
    let cleanup;
    let cleanupFailure;
    let exited = false;

    const closeOwnedPipes = () => {
      child.stdin.destroy();
      child.stdout.destroy();
      child.stderr.destroy();
    };
    const stopOwnedProcesses = () => {
      if (cleanup || !child.pid) return;
      if (platform !== "win32") {
        // Use the invocation's process group, never a possibly reused PID.
        // Do this immediately on exit, before any asynchronous continuation.
        try {
          process.kill(-child.pid, "SIGKILL");
        } catch (error) {
          if (error.code !== "ESRCH") cleanupFailure = error;
        }
        cleanup = Promise.resolve();
      } else if (!exited) {
        cleanup = execFileAsync("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
          windowsHide: true,
          timeout: 5000,
        }).catch((error) => {
          cleanupFailure = new Error("Failed to stop the local computation process tree", { cause: error });
          if (!exited) child.kill("SIGKILL");
          closeOwnedPipes();
        });
      } else if (failure) {
        // taskkill cannot safely address a root PID after it exits. A child
        // may still own inherited pipes; release our ends and fail explicitly
        // rather than hanging past cancellation or killing a reused PID.
        cleanupFailure = new Error("The Windows bridge exited; descendant termination could not be confirmed");
        cleanup = Promise.resolve();
        closeOwnedPipes();
      }
    };
    const fail = (error) => {
      failure ??= error;
      stopOwnedProcesses();
    };
    const onAbort = () => {
      const error = new Error(`${label} cancelled`);
      error.name = "AbortError";
      fail(error);
    };
    const timeout = setTimeout(() => fail(new Error(`${label} timed out`)), timeoutMs);
    signal?.addEventListener("abort", onAbort, { once: true });
    if (signal?.aborted) onAbort();

    child.on("error", (error) => {
      fail(error.code === "ENOENT" ? new Error(notFoundMessage) : error);
    });
    child.stdin.on("error", fail);
    for (const [stream, chunks] of [[child.stdout, stdout], [child.stderr, stderr]]) {
      stream.on("error", fail);
      stream.on("data", (chunk) => {
        if (failure) return;
        outputBytes += chunk.length;
        if (outputBytes > maxOutputBytes) {
          fail(new Error(`${label} returned too much data`));
          return;
        }
        chunks.push(chunk);
      });
    }
    child.on("exit", () => {
      exited = true;
      // A descendant can retain stdout after uv exits. Reap the private group
      // now so close cannot wait indefinitely for that inherited pipe.
      stopOwnedProcesses();
    });
    child.on("close", async (code) => {
      clearTimeout(timeout);
      signal?.removeEventListener("abort", onAbort);
      await cleanup;
      // macOS can report EPERM while an already exiting group is a zombie.
      // Confirm that it is gone after reaping; never send a delayed kill.
      if (platform !== "win32" && cleanupFailure?.code === "EPERM") {
        try {
          process.kill(-child.pid, 0);
        } catch (error) {
          if (error.code === "ESRCH") cleanupFailure = undefined;
        }
      }
      if (cleanupFailure) {
        reject(new AggregateError([failure, cleanupFailure].filter(Boolean), `Local computation cleanup failed: ${cleanupFailure.message}`));
        return;
      }
      if (failure) {
        reject(failure);
        return;
      }
      const stdoutText = Buffer.concat(stdout).toString("utf8").trim();
      const stderrText = Buffer.concat(stderr).toString("utf8").trim();
      if (code !== 0) {
        reject(new Error(stderrText
          ? redactError(stderrText.slice(0, 2000), env)
          : `${label} exited with code ${code}`));
        return;
      }
      try {
        resolve(JSON.parse(stdoutText));
      } catch {
        reject(new Error(`${label} returned invalid JSON`));
      }
    });
    child.stdin.end(stdin);
  });
}
