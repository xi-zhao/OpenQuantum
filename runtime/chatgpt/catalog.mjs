import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";
import { mcpCatalogEntry } from "../../src/settings/server/project-settings-catalog.mjs";
import { readSdkLibraries } from "../../src/lib/sdk-access.mjs";
import { serviceById } from "../../src/settings/codex/service-catalog.mjs";
import { optionalRuntime } from "../../src/settings/codex/runtime-catalog.mjs";
import { EXTERNAL_MCP, externalMcp } from "./external/catalog.mjs";

export const PROJECT_ROOT = fileURLToPath(new URL("../../", import.meta.url));
export const PRESET_PATH = "src/capabilities";
const NATIVE_PROVIDERS = new Set([
  "./native-quantum-tools.mjs", "./quantum-practices-tools.mjs", "./metriq-data-tools.mjs",
]);
const HOST_CODE_PROVIDERS = new Set(["@deepseek-ai/dsh-tool-bash", "@deepseek-ai/dsh-tool-pwsh"]);
const HOST_EXCLUSIONS = {
  "quantum-learning": "量子学习通属于 Desktop 发行版，不在 Codex 插件范围内。",
};
const NATIVE_PRESENTATION = {
  "platform-diagnostics": { title: "OpenQuantum 平台诊断", description: "检查当前 Codex 插件的目录、设置、运行环境和 Tool 接入，区分配置、实际调用与尚未验证的状态。" },
  "quantum-practices": { title: "量子算法参考", description: "查找量子算法的适用条件、方法比较和实验设计参考。" },
  "metriq-data": { title: "Metriq 基准数据", description: "检索固定版本的量子硬件与算法基准记录，查看来源和实验条件。" },
  "quantum-ground-state": { title: "二量子位基态", description: "求解给定实 Pauli Hamiltonian 的固定粒子数扇区基态，比较 VQE 与精确参考，并返回独立检查结果。" },
  "qmclaw-workbench": { title: "QMClaw 测控模拟", description: "模拟 Rabi、Ramsey、T1 等 13 类测控实验，组织无硬件的实验预检。" },
  "fatqat-workbench": { title: "FatQat 量子实验", description: "在本地运行量子电路、原生门约束和脉冲动力学实验，比较算法与物理实现。" },
  "qpanda-qubo": { title: "QPanda QUBO 建模与求解", description: "将二值目标和等式约束编译为 QUBO，运行本地 QAOA，并可选经典枚举对照。" },
};

export function containedPath(root, relative) {
  const resolved = path.resolve(root, relative);
  if (resolved === root || !resolved.startsWith(`${path.resolve(root)}${path.sep}`)) {
    throw new Error(`Path must stay inside the source tree: ${relative}`);
  }
  return resolved;
}

// This reads the existing capability authority; it is not a second tool registry.
export async function readCapabilities(root = PROJECT_ROOT) {
  const sdkLibraries = await readSdkLibraries(root);
  const algorithms = JSON.parse(await fs.readFile(path.join(root, "examples/quantum-algorithms/coverage.json"), "utf8"));
  const algorithmIds = new Set(algorithms.guides.map((entry) => entry.skill));
  const policy = parse(await fs.readFile(path.join(root, ".agents/capability-packages.yml"), "utf8"));
  if (policy.schemaVersion !== "1.1" || !Array.isArray(policy.packages)) {
    throw new Error("Unsupported capability policy; review the ChatGPT projection before releasing.");
  }
  const seen = new Set();
  const capabilities = await Promise.all(policy.packages.map(async (entry) => {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.id) || seen.has(entry.id)) {
      throw new Error("Invalid or duplicate capability id");
    }
    seen.add(entry.id);
    const hostTools = (entry.execution?.nativeTools ?? []).filter(tool => HOST_CODE_PROVIDERS.has(tool.providerPlugin));
    const native = (entry.execution?.nativeTools ?? []).filter(tool => !HOST_CODE_PROVIDERS.has(tool.providerPlugin));
    const declaredMcp = entry.execution?.mcpServers ?? [];
    const mcp = declaredMcp.map(server => {
      const external = externalMcp(server.name);
      return external ? { ...server, external: true, upstreamTools: server.tools, tools: [{ name: external.toolName,
        effect: server.tools.every(tool => tool.effect === "read-only") ? "read-only" : "external-write" }] } : server;
    });
    const managed = mcp.length === 1 && serviceById(mcp[0].name)?.supported === true
      && serviceById(mcp[0].name).capability === entry.id && mcp[0].source === "package";
    const optional = mcp.length === 1 && optionalRuntime(entry.id)?.server === mcp[0].name
      && mcp[0].source === "package" && mcp[0].activation === "opt-in";
    let reason = HOST_EXCLUSIONS[entry.id];
    if (!reason && !managed && !optional && mcp.some((server) => !server.external && (server.source !== "package" || server.activation !== "always"))) {
      reason = "外部或按需启用的 MCP 需要用户单独配置连接与授权，当前发行包未启用。";
    }
    if (!reason && native.some((tool) => !NATIVE_PROVIDERS.has(tool.providerPlugin))) {
      throw new Error(`Review the new native provider for ChatGPT: ${entry.id}`);
    }
    if (!reason && !managed && [...native, ...mcp.filter(server => !server.external).flatMap((server) => server.tools)].some((tool) => tool.effect === "external-write")) {
      reason = "存在外部写入副作用，当前插件未提供相应的凭据与授权流程。";
    }
    let skill = null;
    try {
      skill = await fs.readFile(path.join(root, ".agents/skills", entry.id, "SKILL.md"), "utf8");
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    const frontmatter = skill?.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
    const metadata = frontmatter ? parse(frontmatter[1]) : {};
    if (skill && (metadata.name !== entry.id || typeof metadata.description !== "string")) {
      throw new Error(`Invalid source Skill: ${entry.id}`);
    }
    const presentation = mcp.length ? mcpCatalogEntry(mcp[0].name) : null;
    const title = NATIVE_PRESENTATION[entry.id]?.title ?? presentation?.displayName ?? skill?.match(/^# (.+)$/m)?.[1] ?? entry.id;
    const sourceDescription = NATIVE_PRESENTATION[entry.id]?.description ?? metadata.description ?? title;
    const sdkIds = entry.id === "quantum-sdk-workbench" ? sdkLibraries.map((library) => library.id)
      : entry.id === "pasqal-experiments" ? ["pulser-dynamics"]
      : sdkLibraries.some((library) => library.id === entry.id) ? [entry.id]
        : algorithmIds.has(entry.id) ? ["quantum-algorithms"] : [];
    const description = sdkIds.length ? `${sourceDescription} 可经宿主代码工具使用锁定环境中的原生 SDK 公开 API，自定义任务不限于便捷 Tool 的参数范围。`
      : !native.length && !mcp.length ? `方法解释与选型参考：${title}。此 Skill 不附带计算 Tool。${sourceDescription}` : sourceDescription;
    return {
      id: entry.id, title, description, summary: NATIVE_PRESENTATION[entry.id]?.description ?? presentation?.description ?? description,
      status: reason ? "unsupported" : "available", ...(reason ? { reason } : {}),
      skill, native, mcp, sdkIds, hostTools, optIn: managed || optional, tools: [...native.map((tool) => tool.name), ...mcp.flatMap((server) => server.tools.map((tool) => tool.name))],
    };
  }));
  for (const external of EXTERNAL_MCP) {
    const skill = capabilities.find(item => item.id === external.skillId);
    if (skill && capabilities.some(item => item.mcp.some(server => server.name === external.id))) skill.tools = [...new Set([...skill.tools, external.toolName])];
  }
  return capabilities;
}

export function providerGroups(capabilities) {
  const providers = new Map();
  for (const capability of capabilities.filter((item) => item.status === "available")) {
    for (const tool of capability.native) {
      const key = `native:${tool.providerPlugin}`;
      const provider = providers.get(key) ?? { key, kind: "native", entrypoint: `${PRESET_PATH}/${tool.providerPlugin}`, tools: [] };
      provider.tools.push({ name: tool.name, effect: tool.effect, capabilityId: capability.id });
      providers.set(key, provider);
    }
    for (const server of capability.mcp) {
      if (providers.has(server.name)) throw new Error(`Duplicate MCP provider: ${server.name}`);
      const external = externalMcp(server.name);
      providers.set(server.name, {
        key: server.name, kind: "mcp", ...(server.entrypoint ? { entrypoint: server.entrypoint } : {}),
        ...(external ? { kind: "external", environmentId: external.environmentId, upstreamTools: server.upstreamTools } : {}),
        defaultEnabled: !capability.optIn,
        tools: server.tools.map((tool) => ({ ...tool, capabilityId: external?.skillId ?? capability.id })),
      });
    }
  }
  return [...providers.values()];
}
