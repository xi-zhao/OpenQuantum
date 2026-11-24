import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)));

function readPackageScripts(projectRoot = root) {
  const manifest = JSON.parse(fs.readFileSync(path.join(projectRoot, "package.json"), "utf8"));
  return manifest.scripts ?? {};
}

export function listCapabilityGroups(projectRoot = root) {
  const scripts = readPackageScripts(projectRoot);
  const groups = new Map();

  for (const name of Object.keys(scripts)) {
    const match = name.match(/^capability:([a-z0-9-]+):(setup|test|live|catalog)$/);
    if (!match) continue;
    const [, group, action] = match;
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group).push(action);
  }

  return Object.fromEntries(
    [...groups.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([group, actions]) => [group, actions.sort()]),
  );
}

export function resolveCapabilityAction({ action, target, projectRoot = root }) {
  const scripts = readPackageScripts(projectRoot);
  if (action === "conformance") {
    return { scriptName: "capability:conformance", command: scripts["capability:conformance"] };
  }
  if (action === "contracts") {
    return { scriptName: "capability:contracts:test", command: scripts["capability:contracts:test"] };
  }
  if (!target) {
    throw new Error(`Action "${action}" requires a capability group name. Run "npm run cap -- list" to inspect groups.`);
  }
  const scriptName = `capability:${target}:${action}`;
  const command = scripts[scriptName];
  if (!command) {
    const groups = listCapabilityGroups(projectRoot);
    const available = groups[target];
    if (available) {
      throw new Error(`Capability group "${target}" does not support "${action}". Supported actions: ${available.join(", ")}`);
    }
    throw new Error(`Unknown capability group "${target}". Run "npm run cap -- list" to inspect groups.`);
  }
  return { scriptName, command };
}

function usage() {
  return [
    "Usage:",
    "  npm run cap -- list",
    "  npm run cap -- <setup|test|live|catalog> <group> [--dry-run]",
    "  npm run cap -- <conformance|contracts> [--dry-run]",
  ].join("\n");
}

if (path.resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  const rawArgs = process.argv.slice(2);
  const dryRun = rawArgs.includes("--dry-run");
  const positional = rawArgs.filter(arg => arg !== "--dry-run");
  const [action, target] = positional;

  if (!action || action === "--help" || action === "-h") {
    console.log(usage());
    process.exit(0);
  }
  if (action === "list") {
    const groups = listCapabilityGroups(root);
    for (const [group, actions] of Object.entries(groups)) {
      console.log(`${group.padEnd(32)} ${actions.join(", ")}`);
    }
    process.exit(0);
  }

  let resolved;
  try {
    resolved = resolveCapabilityAction({ action, target, projectRoot: root });
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }

  if (dryRun) {
    console.log(JSON.stringify(resolved, null, 2));
    process.exit(0);
  }

  const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
  const result = spawnSync(npmCommand, ["run", resolved.scriptName], {
    cwd: root,
    stdio: "inherit",
  });
  process.exit(result.status ?? 1);
}
