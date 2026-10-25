import fs from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { stringify } from "yaml";
import { PROJECT_ROOT } from "../runtime/chatgpt/catalog.mjs";
import { createBackend } from "../runtime/chatgpt/backend.mjs";
import { readSdkLibraries } from "../src/lib/sdk-access.mjs";
import { componentDirectory, componentNavigation } from "./lib/component-directory.mjs";
import { EXTERNAL_MCP } from "../runtime/chatgpt/external/catalog.mjs";

export const digest = (data) => createHash("sha256").update(data).digest("hex");
export const json = (value) => `${JSON.stringify(value, null, 2)}\n`;
export function git(root, args) { return execFileSync("git", ["-C", root, ...args], { encoding: "utf8" }).trim(); }

// Keep scientific prose in one place. The generated Skill binds that reference
// to the host's actual Tools and optional native code execution facilities.
export function projectSkill(capability, release) {
  const sdk = capability.sdkIds?.length;
  const description = (capability.summary ?? capability.description).split(" 可经宿主代码工具")[0].slice(0, 180);
  return `---\n${stringify({ name: capability.id, description }).trim()}\n---\n\n# ${capability.title}\n\n## 当前宿主：ChatGPT / Codex\n\n` +
    `本 Skill 来自 OpenQuantum ${release.version}。领域边界、物理单位、算法适用条件和数值解释见 [领域参考](references/domain.md)。实际输入合同见 [工具合同](references/tools.json)。\n\n` +
    `- 当前便捷工具：${capability.tools.length ? capability.tools.map((name) => `\`${name}\``).join("、") : "无"}。只调用宿主实际列出的工具，不猜测工具名称。${sdk ? "此外支持下述原生 SDK 路径，便捷工具的 schema 不是库功能上限。" : ""}\n` +
    `- 当前 Codex 对话负责理解、选择工具和解释；OpenQuantum 侧边入口只管理能力设置。计算在本机插件中运行，连接到远程 MCP 的 Tool 以该连接说明为准。缺少运行依赖时如实报告错误，不擅自改动用户环境。无需额外配置模型 API key 或启动 Harness。\n` +
    `- 领域参考是独立版工作流的版本快照。工具名、运行位置、预算和证据状态以本文件与实际返回为准；其中的 Harness 设置、Host Plugin hook 和内部接口不能在本插件执行。${sdk ? "原生 SDK 的安装与文件路径以本 Skill 的环境定位器返回为准。" : "不要照搬参考中的安装命令。"}参考所提其他 Skill/Tool 仅在当前宿主实际提供时可用。\n` +
    `- 本插件 MCP 便捷工具单次调用最长 180 秒，输出最多 2 MiB，支持 execution 时最多 2 个线程；不接受 timeoutMs=0。${sdk ? "这些是便捷工具预算。较长、自定义或大输出任务使用原生 SDK 与宿主进程/Job 工具，按用户与宿主资源预算执行并保存完整工件。" : "超出预算时报告限制与所需资源。"}不得因此缩小用户的研究问题或静默改变科学输入。\n` +
    `- 保留实际包版本、输入摘要、数值误差和每条检查结果。执行成功不代表科学验收通过。本适配器没有 Harness 证据物化和 central Acceptance Builder 调用链；provenance.complete 保持 not_checked，不声称生成了 Acceptance Report、Score Report 或 Reproduction Report。\n` +
    `- 默认由 Agent 按任务选择 Skill；用户不必逐项启用。先用 \`find_openquantum_skills\` 的 \`skillId: ${capability.id}\` 检查准备状态。用户明确禁止的 Skill、Tool 或 MCP 不得恢复，也不得改用原生代码绕过。\n` +
    `- 只有真正需要执行时，才调用 \`prepare_openquantum_skill\`，传入 \`skillId: ${capability.id}\` 和所选 \`toolName\`，或传 \`sdkId\` 编写原生程序。一次只准备一个目标；解释、选型和查询目录不安装依赖。准备会复用已安装环境，缺少时下载固定依赖；沿用用户授权与宿主权限。准备和科学执行是两个独立步骤。\n` +
    `- 准备返回 preparing 时，用 find_openquantum_skills 查询同一 selection 的进度；不要重复开启安装。失败或取消后仅在需要重试时传 retry:true。ready 后直接在本聊天调用已列出的 Tool，无需重载。credentials_required 时使用准备结果附带的配置表单，引导用户填写所缺凭据，保存后继续；不要求用户将 Token 发送到聊天，不导出密钥。Tool 调用时才启动对应服务。不能伪造运行结果。\n` +
    (EXTERNAL_MCP.some(entry => entry.skillId === capability.id) ? `\n## 关联 MCP 的操作\n\n${EXTERNAL_MCP.filter(entry => entry.skillId === capability.id).map(entry => `- ${entry.title}：\`${entry.toolName}\``).join("\n")}\n\n先向 find_openquantum_skills 传 skillId、toolName，按操作说明选择 operationName，再查询同一选择得到精确 inputSchema。准备时沿用 operationName，可附 operationArguments 验证参数与本地/云端分支。ready 后调用 Tool，使用 operation、arguments；不要直接调用领域参考中的旧 Tool 名。账户管理通过设置页完成。\n\nQiskit Gym 与 QPanda3 Runtime 首次调用返回 sessionId，后续操作必须沿用。结束时调用 close_session；取消、禁用、凭据变化或 30 分钟没有后续请求会回收本地会话。Gym 会同时停止本地训练，长训练需要查询进度以续期，关闭前保存模型。QPanda 关闭会话仅释放本地绑定和任务句柄，不会取消已提交的云端任务；固定 SDK 尚无远端取消 API。保留云端任务 ID，失效或提交结果未知时不得自动重放提交。\n` : "") +
    (capability.id === "platform-diagnostics" ? `\n## Codex 诊断\n\n使用宿主代码 Tool 运行本 Skill 的 \`node scripts/diagnostics.mjs\`，按需要将 stdout 保存为 JSON 报告。脚本只读校验插件合同、配置和真实 MCP stdio 握手，并调用已打包的报告 Validator；不会安装、启动科学 MCP 或发出模型请求。不要执行领域参考中的独立版 Harness 命令。\n\n报告区分已验证的本机插件行为与尚未检查的侧边页、当前聊天 Skill、模型和科学验收。按当前任务补充宿主操作证据，不能把诊断报告有效等同于全部链路通过。\n` : "") +
    (capability.id === "pasqal-experiments" ? `\n## Pasqal 云端凭据\n\n只有云端操作才在 prepare_openquantum_skill 中增加 serviceId: pasqal_cloud，缺凭据时通过返回的表单填写；本地流程不需要云凭据。云端操作使用本 Skill 目录的 \`node scripts/pasqal-cloud.mjs <command> <args>\`，支持 device、submit、recover、close、cancel、harvest，参数沿用领域参考的 experiment.py；只在调用时为固定工作流读取本机凭据，不回传秘密。原始 Python 入口不会读取本页凭据。\n\n本地 validate-spec、prepare、local-run、analyze、plot 仍使用环境定位器返回的 Python 与原有 experiment.py，不注入云端凭据。自定义 SDK 程序也不得从本插件导出密钥。submit 仍需用户授权与 --approve-plan；close/cancel 仍需授权与 --confirm。保存凭据或启用 Skill 都不授权云端任务。\n` : "") +
    (sdk ? `\n## 原生 SDK\n\n先读[SDK 工作流](references/sdk-workflow.md)和[库导航](references/sdks.json)。使用宿主代码工具运行本 Skill 目录下的 \`scripts/sdk-access.mjs list\` 或 \`inspect <sdk-id>\`，由返回值定位已固定环境。${capability.sdkIds.length === 1 ? `本 Skill 对应 \`${capability.sdkIds[0]}\`。` : "按任务选择库，可跨环境交换显式工件。"} Agent 负责在用户工作区编写、运行和调试自定义程序，不能只交给用户一条 Python 建议。\n\n宿主若没有本机代码工具，则原生 SDK 执行暂不可用，如实说明；不得假装在云端聊天能访问本机。运行环境通过 prepare_openquantum_skill 按本次选定的 sdkId 准备，设置页保留手动检查与修复入口；允许使用与安装状态独立。设置页不会启动计算服务，工具调用时才启动对应服务。原生 SDK 程序使用定位器返回的解释器与 environment 字段。安装在单独的显式步骤完成，计算不自动安装。SDK 的公开 API 可组合使用，领域参考中的固定模型仅约束相应便捷 Tool。\n` : "");
}

function domainReference(source, capabilityId, commit) {
  const body = source.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "");
  // Retain source links at the same pinned revision, never broken plugin-relative
  // paths into a repository that the ChatGPT host does not have.
  return body.replace(/\]\(([^\s)]+)\)/g, (match, href) => {
    if (/^(?:[a-z]+:|#)/i.test(href)) return match;
    const location = path.posix.normalize(path.posix.join(".agents/skills", capabilityId, href));
    if (location.startsWith("../")) throw new Error(`Source link escapes repository: ${href}`);
    return `](https://github.com/xi-zhao/OpenQuantum/blob/${commit}/${location})`;
  });
}

export async function buildChatgpt({ root = PROJECT_ROOT, output = path.join(root, "dist/chatgpt"), backend, release } = {}) {
  const packageInfo = JSON.parse(await fs.readFile(path.join(root, "distributions/codex-plugin/package.json"), "utf8"));
  release ??= {
    version: packageInfo.version,
    commit: git(root, ["rev-parse", "HEAD"]),
    dirty: Boolean(git(root, ["status", "--porcelain"])),
  };
  backend ??= await createBackend({ root, discover: true });
  await fs.mkdir(output, { recursive: true });
  const uiRoot = path.join(PROJECT_ROOT, "runtime/chatgpt/ui");
  try {
    const mark = `data:image/svg+xml;base64,${(await fs.readFile(path.join(root, "packages/openquantum-web-branding/assets/mark.svg"))).toString("base64")}`;
    const inverseMark = `data:image/svg+xml;base64,${(await fs.readFile(path.join(root, "packages/openquantum-web-branding/assets/mark-inverse.svg"))).toString("base64")}`;
    const app = await build({ entryPoints: [path.join(uiRoot, "app.mjs")], outfile: path.join(output, "app.js"), bundle: true, write: false, format: "esm", platform: "browser", target: "es2022", minify: true, legalComments: "inline", metafile: true,
      define: { "process.env.NODE_ENV": '"production"' },
      loader: { ".module.css": "local-css", ".woff2": "dataurl", ".woff": "dataurl", ".ttf": "dataurl" },
    });
    const packageNames = new Set(Object.keys(app.metafile.inputs).flatMap((file) => {
      const match = file.match(/node_modules\/(@[^/]+\/[^/]+|[^/]+)/);
      return match ? [match[1]] : [];
    }));
    const notices = [];
    for (const name of [...packageNames].sort()) {
      const packageRoot = path.join(PROJECT_ROOT, "node_modules", name);
      const info = JSON.parse(await fs.readFile(path.join(packageRoot, "package.json"), "utf8"));
      const files = await fs.readdir(packageRoot);
      const license = files.find((file) => /^licen[cs]e(?:\.(?:md|txt))?$/i.test(file));
      if (!license) throw new Error(`Missing bundled dependency license: ${name}`);
      notices.push(`${name} ${info.version}\n${await fs.readFile(path.join(packageRoot, license), "utf8")}`);
    }
    const noticeText = notices.join("\n\n---\n\n");
    await fs.writeFile(path.join(output, "THIRD_PARTY_NOTICES.txt"), noticeText);
    const script = (`/*!\n${noticeText.replaceAll("*/", "* /")}\n*/\n` + app.outputFiles.find((file) => file.path.endsWith(".js")).text)
      .replaceAll("__RELEASE_VERSION__", release.version).replaceAll("</script", "<\\/script");
    const styles = app.outputFiles.find((file) => file.path.endsWith(".css"))?.text ?? "";
    const template = await fs.readFile(path.join(uiRoot, "app.html"), "utf8");
    const directory = await componentDirectory(root);
    const tabs = componentNavigation(directory.copy);
    await fs.writeFile(path.join(output, "app.html"), template.replace("<!-- COMPONENT_TABS -->", () => tabs).replaceAll("__RELEASE_VERSION__", release.version).replaceAll("__OQ_MARK__", mark).replaceAll("__OQ_MARK_INVERSE__", inverseMark).replace("/* APP_STYLES */", () => styles).replace("/* APP_SCRIPT */", () => script));
    const contracts = { capabilities: backend.capabilities, providers: backend.providers, tools: backend.tools };
    const contractDigest = digest(json(contracts));
    await fs.writeFile(path.join(output, "capabilities.json"), json(contracts));
    await fs.writeFile(path.join(output, "components.json"), json(directory));
    await fs.writeFile(path.join(output, "release.json"), json({ ...release, contractDigest, sdk: { mcpApps: packageInfo.dependencies["@modelcontextprotocol/ext-apps"] } }));
    // Clear only this generated subtree so removed capabilities cannot leave stale Skills.
    await fs.rm(path.join(output, "skills"), { recursive: true, force: true });
    const sdkLibraries = await readSdkLibraries(root);
    for (const capability of backend.sourceCapabilities.filter((item) => item.status === "available" && item.skill)) {
      const directory = path.join(output, "skills", capability.id);
      await fs.mkdir(path.join(directory, "references"), { recursive: true });
      await fs.writeFile(path.join(directory, "SKILL.md"), projectSkill(capability, release));
      await fs.writeFile(path.join(directory, "references/domain.md"), domainReference(capability.skill, capability.id, release.commit));
      await fs.writeFile(path.join(directory, "references/tools.json"), json(backend.tools.filter((tool) => capability.tools.includes(tool.name))));
      if (capability.id === "platform-diagnostics") {
        await fs.mkdir(path.join(directory, "scripts"), { recursive: true });
        await fs.copyFile(path.join(root, "runtime/chatgpt/diagnostics-entry.mjs"), path.join(directory, "scripts/diagnostics.mjs"));
        await fs.copyFile(path.join(root, "runtime/chatgpt/sdk-access.mjs"), path.join(directory, "scripts/sdk-access.mjs"));
      }
      if (capability.sdkIds?.length) {
        await fs.mkdir(path.join(directory, "scripts"), { recursive: true });
        await fs.copyFile(path.join(root, "runtime/chatgpt/sdk-access.mjs"), path.join(directory, "scripts/sdk-access.mjs"));
        if (capability.id === "pasqal-experiments") await fs.copyFile(path.join(root, "runtime/chatgpt/pasqal-cloud.mjs"), path.join(directory, "scripts/pasqal-cloud.mjs"));
        await fs.copyFile(path.join(root, ".agents/skills/quantum-sdk-workbench/references/workflow.md"), path.join(directory, "references/sdk-workflow.md"));
        await fs.copyFile(path.join(root, ".agents/skills/quantum-sdk-workbench/references/evidence.py"), path.join(directory, "references/evidence.py"));
        await fs.writeFile(path.join(directory, "references/sdks.json"), json(sdkLibraries.filter((library) => capability.sdkIds.includes(library.id))));
      }
    }
    return { release, output, contractDigest, capabilities: backend.capabilities, tools: backend.tools };
  } finally { await backend.close(); }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await buildChatgpt();
  console.log(`Built ChatGPT ${result.release.version}: ${result.tools.length} tools; ${result.output}`);
}
