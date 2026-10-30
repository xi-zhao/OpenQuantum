import path from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { isMap, isSeq, parse, parseDocument, Scalar } from "yaml";
import { isDeepStrictEqual } from "node:util";
import { desktopEnvironmentDefaults } from "./desktop-environment.mjs";
import { Config as PersonaConfig } from "@deepseek-ai/dsh-persona";

export const nativeProviderNames = new Set(["./native-quantum-tools.mjs", "./quantum-practices-tools.mjs", "./metriq-data-tools.mjs"]);
export const desktopYamlOptions = { customTags: [{ tag: "tag:yaml.org,2002:js",
  resolve: value => value === "true" ? true : value === "false" ? false : value }] };
const render = (source, root, node) => desktopEnvironmentDefaults(source, root)
  .replaceAll("process.cwd()", `(${JSON.stringify(path.resolve(root))})`).replaceAll("process.execPath", `(${JSON.stringify(node)})`);

// Only the reviewed legacy template and its own path projection can be replaced.
// Do not infer ownership from serverName: a user can point that row elsewhere.
function assertManagedRows(source, projectRoot, nodeExecutable, managed) {
  const original = parseDocument(source, desktopYamlOptions).toJSON();
  const canonical = readFileSync(new URL("../../runtime/openquantum/agent-presets/openquantum/agent.cordis.yml", import.meta.url), "utf8");
  const templates = parseDocument(canonical, desktopYamlOptions).toJSON();
  const projected = new Map();
  const candidates = node => {
    if (!projected.has(node)) projected.set(node, [
      parseDocument(render(canonical, projectRoot, node), desktopYamlOptions).toJSON(),
      parseDocument(desktopPreset(canonical, projectRoot, node), desktopYamlOptions).toJSON(),
      parseDocument(desktopPreset(canonical, projectRoot, node, { runtimeBin: path.dirname(node) }), desktopYamlOptions).toJSON(),
    ]);
    return [templates, ...projected.get(node)];
  };
  for (const row of original) {
    if (!nativeProviderNames.has(row?.name) && !managed.has(row?.config?.serverName)) continue;
    const { disabled, id, ...configuration } = row;
    const deployedNode = row.config?.env?.OPENQUANTUM_NODE_EXECUTABLE;
    const nodes = new Set([nodeExecutable, ...(typeof deployedNode === "string" && path.isAbsolute(deployedNode) ? [deployedNode] : [])]);
    const matches = [...nodes].some(node => candidates(node).some(rows => rows.some(template => {
      const expected = { ...template }; delete expected.disabled; delete expected.id;
      return isDeepStrictEqual(configuration, expected);
    })));
    if (!matches) throw new Error(`Desktop 配置 ${id || row.config?.serverName || row.name} 包含自定义 MCP 或 Tool 参数，未转换。请保留原配置，与 runtime/openquantum/agent-presets/openquantum/agent.cordis.yml 比较并手动合并后再试。`);
    if (disabled !== undefined && typeof disabled !== "boolean" &&
        !(typeof disabled === "string" && /^(?:process\.env\.OPENQUANTUM_DISABLE_QISKIT_MCP|\(process\.env\.OPENQUANTUM_DISABLE_QISKIT_MCP\s*\?\?\s*"(?:[^"\\]|\\.)*"\))\s*===\s*['"]1['"]$/.test(disabled))) {
      throw new Error(`Desktop 配置 ${id || row.name} 的禁用条件无法安全迁移，请保留原配置并手动合并后再试。`);
    }
  }
}

export function migrateDesktopPresetSchema(source) {
  const document = parseDocument(source, desktopYamlOptions);
  if (document.errors.length || !isSeq(document.contents)) throw new Error("Invalid OpenQuantum preset");
  let changed = false;
  for (const row of document.contents.items) {
    if (!isMap(row) || row.get("name") !== "@deepseek-ai/dsh-persona") continue;
    const config = row.get("config", true);
    if (!isMap(config) || !config.has("prefix")) continue;
    const prefix = config.get("prefix", true);
    if (!(prefix instanceof Scalar) || typeof prefix.value !== "string" || prefix.tag || config.has("text") && config.get("text") !== prefix.value) {
      throw new Error("Desktop persona prefix/text 配置冲突，请保留原配置并手动合并");
    }
    if (!config.has("text")) config.set("text", prefix);
    config.delete("prefix");
    changed = true;
  }
  for (const row of document.contents.items) {
    if (isMap(row) && row.get("name") === "@deepseek-ai/dsh-persona") PersonaConfig(row.get("config", true)?.toJSON());
  }
  return changed ? document.toString({ lineWidth: 0 }) : source;
}

export function desktopPreset(source, sourceRoot, nodeExecutable = process.execPath, { runtimeBin, onDemand = false, projectRoot = sourceRoot } = {}) {
  const rendered = render(source, projectRoot, nodeExecutable);
  const document = parseDocument(rendered, desktopYamlOptions);
  if (document.errors.length) throw new Error("Invalid OpenQuantum preset");
  if (!isSeq(document.contents)) throw new Error("Expected preset rows");
  if (onDemand) {
    const policy = parse(readFileSync(path.join(sourceRoot, ".agents/capability-packages.yml"), "utf8"));
    const managed = new Set(policy.packages.flatMap(item => (item.execution?.mcpServers ?? []).map(server => server.name)));
    assertManagedRows(source, projectRoot, nodeExecutable, managed);
    document.contents.items = document.contents.items.filter(row => {
      if (!isMap(row)) return true;
      if (row.get("id") === "openquantum-adaptive-capabilities") return false;
      if (row.get("id") === "skill-filesystem") {
        row.set("name", "./additional-skills.mjs");
        row.set("inject", document.createNode(["skills", "openquantumCapabilities"]));
      }
      if (nativeProviderNames.has(row.get("name"))) return false;
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
