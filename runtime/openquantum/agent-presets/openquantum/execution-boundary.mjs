import path from "node:path";
import { readFileSync, readdirSync, realpathSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { writableRoots } from "@deepseek-ai/dsh-sandbox";
import { parse } from "yaml";
import { projectRoot } from "../../project-root.mjs";

const contains = (root, candidate) => {
  const relative = path.relative(root, candidate);
  return relative === "" || relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
};

// Resolve existing ancestors too: a not-yet-created environment may be below
// a symlink. Failure to inspect a trust boundary must never grant execution.
function canonicalRoot(value) {
  if (typeof value !== "string" || !path.isAbsolute(value)) throw new Error("Execution roots must be absolute paths");
  try { return realpathSync.native(value); } catch (error) {
    if (error.code !== "ENOENT") throw error;
    const parent = path.dirname(value);
    if (parent === value) throw error;
    return path.join(canonicalRoot(parent), path.basename(value));
  }
}

export function executionRoots(root, environment = process.env) {
  const pythonRoot = environment.OPENQUANTUM_PYTHON_ENV_ROOT || path.join(root, ".openquantum/python-envs");
  const directory = path.isAbsolute(pythonRoot) ? pythonRoot : path.join(root, pythonRoot);
  let environments;
  try { environments = readdirSync(directory, { withFileTypes: true }).filter(entry => entry.isDirectory() || entry.isSymbolicLink()).map(entry => entry.name); } catch (error) {
    if (error.code !== "ENOENT") throw error;
    environments = [];
  }
  const pythonRoots = environments.flatMap(id => {
    const location = path.join(directory, id);
    const executable = canonicalRoot(path.join(location, process.platform === "win32" ? "Scripts/python.exe" : "bin/python"));
    return [location, path.resolve(executable, "../..")];
  });
  return [root, ...[".agents", "src", "runtime", "scripts", "node_modules", ".openquantum"].map(name => path.join(root, name)),
    environment.DSH_HOME ?? path.join(root, ".openquantum/dsh"), ...pythonRoots,
    environment.OPENQUANTUM_PYTHON_ENV_ROOT, environment.UV_PYTHON_INSTALL_DIR,
    path.dirname(process.execPath),
    ...(environment.PATH?.split(path.delimiter).filter(Boolean) ?? []),
    ...(environment.OPENQUANTUM_JULIA_DEPOT_PATH?.split(path.delimiter).filter(Boolean) ?? [path.join(homedir(), ".julia")]),
  ].filter(Boolean).flatMap(value => {
    const original = path.isAbsolute(value) ? value : path.join(root, value);
    // Protect the link's location as well as its target; otherwise a writable
    // parent could redirect the next connection into another source tree.
    return [path.resolve(original), canonicalRoot(original)];
  });
}

export function installationWriteDenial(policy, roots) {
  if (policy?.mode === "danger-full-access") return;
  if (!["read-only", "workspace-write"].includes(policy?.mode)) return "OpenQuantum requires the effective session sandbox policy";
  // Also guard read-only sessions against a per-call workspace-write escalation.
  // Protect the installation from *all* tools, before a shell/fs write can taint
  // an MCP server, bridge, import, environment, or a later connection.
  const writable = writableRoots({ ...policy, mode: "workspace-write" }).map(canonicalRoot);
  if (roots.some(value => writable.some(root => contains(root, value) || contains(value, root)))) {
    return "OpenQuantum execution files overlap a session-writable root. Choose a research workspace separate from the OpenQuantum installation, runtime environments and DSH Home.";
  }
}

export function protectExecutionRoots(ctx, { root = projectRoot, environment = process.env } = {}) {
  const policy = parse(readFileSync(path.join(root, ".agents/capability-packages.yml"), "utf8"));
  const servers = policy.packages.flatMap(item => (item.execution?.mcpServers ?? []).filter(server => server.source === "package"));
  const tools = new Set(servers.flatMap(server => server.tools.map(tool => tool.name)));
  const prefixes = servers.map(server => `mcp__${server.name}__`);
  const entrypoints = servers.filter(server => server.entrypoint).flatMap(server => {
    const entrypoint = path.join(root, server.entrypoint);
    return [entrypoint, path.dirname(entrypoint), path.join(path.dirname(entrypoint), "bridge.py"), path.join(path.dirname(entrypoint), "bridge.jl")];
  });
  ctx.tools.guard(exec => {
    try {
      const policy = ctx.sandboxPolicy.resolve({ session: exec.agent?.session });
      if (policy.mode === "danger-full-access") return;
      const denial = installationWriteDenial(policy, [...executionRoots(root, environment), ...entrypoints.map(canonicalRoot)]);
      if (denial) return denial;
      if (policy.mode === "read-only" && (tools.has(exec.name) || prefixes.some(prefix => exec.name.startsWith(prefix)))) {
        return "Scientific MCP computations use temporary files and require a workspace-write session; no scientific process was invoked";
      }
    } catch {
      return "OpenQuantum could not verify its execution roots; no Tool was executed";
    }
  });
}

// Shared MCP connections serve multiple sessions. Permit only the temporary
// roots already granted by workspace-write, never a caller's workspace or the
// installation. Read-only calls are rejected by the deployment guard. Python,
// Julia and other descendants inherit the OS policy, even after a reconnect.
export async function confinedMcpLaunch(sandbox, { command, args }) {
  if (!sandbox?.confine) throw new Error("OpenQuantum scientific MCP requires a process sandbox");
  const confined = await sandbox.confine([command, ...args], { mode: "workspace-write", workspaceRoot: canonicalRoot(tmpdir()) });
  if (confined.enforcement !== "full" || !Array.isArray(confined.argv) || !confined.argv.length) {
    throw new Error("OpenQuantum scientific MCP requires full file-write confinement");
  }
  const cache = await mkdtemp(path.join(tmpdir(), "openquantum-compute-"));
  return { command: confined.argv[0], args: confined.argv.slice(1),
    env: { OPENQUANTUM_COMPUTE_CACHE_ROOT: cache, TMPDIR: cache, TEMP: cache, TMP: cache },
    dispose: () => rm(cache, { recursive: true, force: true }),
  };
}
