import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";
import { mcpCatalogEntry } from "../../src/settings/server/project-settings-catalog.mjs";

export const PROJECT_ROOT = fileURLToPath(new URL("../../", import.meta.url));
export const PRESET_PATH = "src/capabilities";
const NATIVE_PROVIDERS = new Set([
  "./native-quantum-tools.mjs", "./quantum-practices-tools.mjs", "./metriq-data-tools.mjs",
]);
const HOST_EXCLUSIONS = {
  "quantum-learning": "量子学习通属于 Desktop 发行版，不在 Codex 插件范围内。",
  "quantum-algorithms": "该工作流依赖独立版源码与宿主 Shell，当前插件提供其知识型子 Skill。",
  "platform-diagnostics": "需要独立版宿主的文件系统、Shell 和事件日志。",
  "fieldqkit-hardware": "需要显式配置本机设备与硬件凭据，当前插件未启用。",
};
const NATIVE_PRESENTATION = {
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
  const policy = parse(await fs.readFile(path.join(root, ".agents/capability-packages.yml"), "utf8"));
  if (policy.schemaVersion !== "1.1" || !Array.isArray(policy.packages)) {
    throw new Error("Unsupported capability policy; review the ChatGPT projection before releasing.");
  }
  const seen = new Set();
  return Promise.all(policy.packages.map(async (entry) => {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.id) || seen.has(entry.id)) {
      throw new Error("Invalid or duplicate capability id");
    }
    seen.add(entry.id);
    const native = entry.execution?.nativeTools ?? [];
    const mcp = entry.execution?.mcpServers ?? [];
    let reason = HOST_EXCLUSIONS[entry.id];
    if (!reason && mcp.some((server) => server.source !== "package" || server.activation !== "always")) {
      reason = "外部或按需启用的 MCP 需要用户单独配置连接与授权，当前发行包未启用。";
    }
    if (!reason && native.some((tool) => !NATIVE_PROVIDERS.has(tool.providerPlugin))) {
      throw new Error(`Review the new native provider for ChatGPT: ${entry.id}`);
    }
    if (!reason && [...native, ...mcp.flatMap((server) => server.tools)].some((tool) => tool.effect === "external-write")) {
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
    const description = !native.length && !mcp.length ? `方法解释与选型参考：${title}。此 Skill 不附带计算 Tool。${sourceDescription}` : sourceDescription;
    return {
      id: entry.id, title, description, summary: NATIVE_PRESENTATION[entry.id]?.description ?? presentation?.description ?? description,
      status: reason ? "unsupported" : "available", ...(reason ? { reason } : {}),
      skill, native, mcp, tools: [...native.map((tool) => tool.name), ...mcp.flatMap((server) => server.tools.map((tool) => tool.name))],
    };
  }));
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
      providers.set(server.name, {
        key: server.name, kind: "mcp", entrypoint: server.entrypoint,
        tools: server.tools.map((tool) => ({ ...tool, capabilityId: capability.id })),
      });
    }
  }
  return [...providers.values()];
}
