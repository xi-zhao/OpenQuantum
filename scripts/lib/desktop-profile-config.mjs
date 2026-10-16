import path from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { isMap, isSeq, parse, parseDocument, Scalar } from "yaml";
import { desktopEnvironmentDefaults } from "./desktop-environment.mjs";

export function desktopPreset(source, projectRoot, nodeExecutable = process.execPath, { runtimeBin, onDemand = false } = {}) {
  const rendered = desktopEnvironmentDefaults(source, projectRoot).replaceAll("process.cwd()", `(${JSON.stringify(path.resolve(projectRoot))})`).replaceAll("process.execPath", `(${JSON.stringify(nodeExecutable)})`);
  const document = parseDocument(rendered, { customTags: [{ tag: "tag:yaml.org,2002:js", resolve: value => value }] });
  if (document.errors.length) throw new Error("Invalid OpenQuantum preset");
  if (!isSeq(document.contents)) throw new Error("Expected preset rows");
  if (onDemand) {
    const policy = parse(readFileSync(path.join(projectRoot, ".agents/capability-packages.yml"), "utf8"));
    const managed = new Set(policy.packages.flatMap(item => (item.execution?.mcpServers ?? []).map(server => server.name)));
    const native = new Set(["./native-quantum-tools.mjs", "./quantum-practices-tools.mjs", "./metriq-data-tools.mjs"]);
    document.contents.items = document.contents.items.filter(row => {
      if (!isMap(row)) return true;
      if (row.get("id") === "openquantum-adaptive-capabilities") return false;
      if (row.get("id") === "skill-filesystem") {
        row.set("name", "./additional-skills.mjs");
        row.set("inject", document.createNode(["skills", "openquantumCapabilities"]));
      }
      if (native.has(row.get("name"))) return false;
      const config = row.get("config", true);
      return !(isMap(config) && managed.has(config.get("serverName")));
    });
    document.contents.items.push(document.createNode({ id: "openquantum-adaptive-capabilities", name: "./adaptive-capabilities.mjs",
      inject: ["tools", "skills", "openquantumCapabilities"] }));
  }
  const bin = runtimeBin || path.dirname(nodeExecutable);
  const executable = name => {
    const filename = `${name}${process.platform === "win32" ? ".exe" : ""}`;
    if (runtimeBin || existsSync(path.join(bin, filename))) return path.join(bin, filename);
    for (const directory of (process.env.PATH || "").split(path.delimiter)) {
      if (directory && existsSync(path.join(directory, filename))) return path.join(directory, filename);
    }
    return name;
  };
  for (const row of document.contents.items) {
    if (!isMap(row)) continue;
    const config = row.get("config", true);
    if (!isMap(config) || config.get("transport") !== "stdio") continue;
    if (["uv", "uvx"].includes(config.get("command"))) config.set("command", executable(config.get("command")));
    if (!config.has("env")) config.set("env", document.createNode({}));
    const env = config.get("env", true);
    if (!isMap(env)) throw new Error("Expected a map for MCP environment");
    // The original Desktop restores login-shell PATH. Give only OQ's workers
    // their own bundled runtime path; never alter the upstream application.
    const declaredPath = env.get("PATH", true);
    const inheritedPath = declaredPath?.tag === "tag:yaml.org,2002:js"
      ? `(${declaredPath.value})` : declaredPath ? JSON.stringify(declaredPath.value) : "(process.env.PATH || '')";
    const workerPath = new Scalar(`${JSON.stringify(bin + path.delimiter)} + ${inheritedPath}`);
    workerPath.tag = "tag:yaml.org,2002:js";
    env.set("PATH", workerPath);
    if (!env.has("OPENQUANTUM_NODE_EXECUTABLE")) env.set("OPENQUANTUM_NODE_EXECUTABLE", nodeExecutable);
  }
  return document.toString({ lineWidth: 0 });
}
