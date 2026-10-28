import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readSdkLibraries, sdkInventory } from "../src/lib/sdk-access.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const inventory = await sdkInventory(root);
const directories = (await fs.readdir(path.join(root, ".agents/skills"), { withFileTypes: true })).filter(entry => entry.isDirectory()).map(entry => entry.name);
const projects = [];
for (const id of directories) {
  try { await fs.access(path.join(root, ".agents/skills", id, "pyproject.toml")); projects.push(id); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
}
const ids = new Set((await readSdkLibraries(root)).map(entry => entry.id));
for (const id of projects) if (!ids.has(id)) throw new Error(`Python SDK omitted from inventory: ${id}`);
const md = (value) => String(value).replaceAll("|", "\\|").replaceAll("\n", " ");
const summary = inventory.libraries.map(entry => {
  const dependencies = Array.isArray(entry.dependencies) ? entry.dependencies.join(", ") : Object.keys(entry.dependencies).join(", ");
  return `| \`${entry.id}\` | ${md(entry.title)} | ${entry.language} | ${md(dependencies || "QDMI C source (setup-qdmi.mjs)")} | ${md(entry.workflow)} | ${md(entry.conditions.join(" ") || "按固定版本、已安装可选组件及目标平台核实")} |`;
});
const external = inventory.otherCapabilities.filter(entry => entry.kind === "external-mcp");
const native = inventory.otherCapabilities.filter(entry => entry.kind === "native-implementation");
const reference = inventory.otherCapabilities.filter(entry => entry.kind === "reference-workflow");
const languageCounts = Object.fromEntries(["python", "julia", "native", "lean"].map(language => [language, inventory.libraries.filter(entry => entry.language === language).length]));
const document = `# SDK 接入清单（生成文件）\n\n由 \`node scripts/audit-sdk-integration.mjs\` 从 capability policy、SDK 导航、项目 manifest 和依赖锁生成；用 \`--check\` 检查是否过期。\n\n本表覆盖 ${inventory.libraries.length} 个 SDK/源码环境入口：${languageCounts.python} 个 Python（包含算法共享环境）、${languageCounts.julia} 个 Julia、${languageCounts.native} 个原生源码或 ABI 入口、${languageCounts.lean} 个 Lean 项目。原生 QDMI 另有 Python 桥接依赖项目。一个入口可包含多个库，同一个库也可能有多个隔离版本，不能把入口数量当成独立 SDK 数量。所有锁摘要与间接依赖版本可通过 \`node scripts/sdk-access.mjs inventory\` 读出。\n\n**接入状态：原生路径与指南已提供；逐 API、可选依赖、平台与外部服务验证不由这张静态清单推断。** 环境是否准备需 \`inspect\`，实际执行证据见[完整接入记录](FULL_SDK_ACCESS.md)。\n\n| 环境 ID | 库 / 源码 | 语言 | 直接依赖（锁定版本另见 inventory） | 原生任务对象（非白名单） | 已知条件与缺口 |\n| --- | --- | --- | --- | --- | --- |\n${summary.join("\n")}\n\n## 外部 MCP（${external.length} 项）\n\n这些接入的协议是远程或外置 MCP，不等于已捆绑对应 SDK。Qiskit 本地 API 已由原生环境提供；供应商服务的全部 API 仍须其自己的 SDK、账户和运行条件，不能把以下连接称为完整库接入。\n\n${external.map(entry => `- \`${entry.id}\`：${entry.providers.map(provider => `\`${provider.name}\` (${provider.activation})`).join("、")}`).join("\n")}\n\n## 原生实现（${native.length} 项）\n\n${native.map(entry => `- \`${entry.id}\``).join("\n")}\n\n这些是 OpenQuantum 原生实现或宿主能力，不冒充对应项目的全部上游 SDK。特别是 QMClaw 当前是测控模拟实现，不能称作完整 QMClaw 实验室运行时。\n\n## 方法、知识与数据参考（${reference.length} 项）\n\n${reference.map(entry => `\`${entry.id}\``).join("、")}。算法指南通过共享 SDK 环境执行自定义代码；知识条目本身不是安装库。\n`;
const target = path.join(root, "docs/integrations/SDK_INVENTORY.md");
if (process.argv.includes("--check")) {
  if (await fs.readFile(target, "utf8") !== document) throw new Error("SDK inventory is stale");
} else await fs.writeFile(target, document);
console.log(JSON.stringify({ sdkEnvironments: inventory.libraries.length, externalMcp: external.length, native: native.length, reference: reference.length }));
