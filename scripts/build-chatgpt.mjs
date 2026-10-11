import fs from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { stringify } from "yaml";
import { PROJECT_ROOT } from "../runtime/chatgpt/catalog.mjs";
import { createBackend } from "../runtime/chatgpt/backend.mjs";

export const digest = (data) => createHash("sha256").update(data).digest("hex");
export const json = (value) => `${JSON.stringify(value, null, 2)}\n`;
export function git(root, args) { return execFileSync("git", ["-C", root, ...args], { encoding: "utf8" }).trim(); }

// Keep scientific prose in one place. The generated Skill binds that reference
// to this host, where local commands, Harness hooks and cloud tools do not exist.
export function projectSkill(capability, release) {
  return `---\n${stringify({ name: capability.id, description: capability.description }).trim()}\n---\n\n# ${capability.title}\n\n## 当前宿主：ChatGPT / Codex\n\n` +
    `本 Skill 来自 OpenQuantum ${release.version}。领域边界、物理单位、算法适用条件和数值解释见 [领域参考](references/domain.md)。实际输入合同见 [工具合同](references/tools.json)。\n\n` +
    `- 当前可调用的工具：${capability.tools.length ? capability.tools.map((name) => `\`${name}\``).join("、") : "无；这是知识与选型 Skill"}。只调用宿主实际列出的工具；不要猜测工具名称或借助 Shell 替代未提供的工具。\n` +
    `- 当前 Codex 对话负责理解、选择工具和解释；OpenQuantum 侧边入口只管理能力设置。计算在本机插件中运行，连接到远程 MCP 的 Tool 以该连接说明为准。缺少运行依赖时如实报告错误，不擅自改动用户环境。无需额外配置模型 API key 或启动 Harness。\n` +
    `- 领域参考是独立版工作流的版本快照。只采用其中的领域知识与解释规则；本宿主的工具名、运行位置、预算和证据状态以本文件与工具返回为准。不要执行参考中的本地安装命令、文件操作、Harness 设置、Host Plugin hook 或内部接口。参考所提其他 Skill/Tool 仅在本插件实际提供时可用。\n` +
    `- 本宿主单次工具调用最长 180 秒，输出最多 2 MiB，支持 execution 时最多 2 个线程；不接受 timeoutMs=0。超出范围先缩小研究问题，不静默改变科学输入。\n` +
    `- 保留实际包版本、输入摘要、数值误差和每条检查结果。执行成功不代表科学验收通过。本适配器没有 Harness 证据物化和 central Acceptance Builder 调用链；provenance.complete 保持 not_checked，不声称生成了 Acceptance Report、Score Report 或 Reproduction Report。\n` +
    `- 仅调用当前已启用的工具；不会因 Skill 被启用而自动开启 MCP 或 Tool。凭据通过设置页的专用本机窗口配置，不要求用户将 Token 发送到聊天。量子学习通不属于此插件。不能伪造运行结果。\n`;
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
  backend ??= await createBackend({ root });
  await fs.mkdir(output, { recursive: true });
  const uiRoot = path.join(PROJECT_ROOT, "runtime/chatgpt/ui");
  try {
    const mark = `data:image/svg+xml;base64,${(await fs.readFile(path.join(root, "packages/openquantum-web-branding/assets/mark.svg"))).toString("base64")}`;
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
    await fs.writeFile(path.join(output, "app.html"), template.replaceAll("__RELEASE_VERSION__", release.version).replaceAll("__OQ_MARK__", mark).replace("/* APP_STYLES */", () => styles).replace("/* APP_SCRIPT */", () => script));
    const contracts = { capabilities: backend.capabilities, tools: backend.tools };
    const contractDigest = digest(json(contracts));
    await fs.writeFile(path.join(output, "capabilities.json"), json(contracts));
    await fs.writeFile(path.join(output, "release.json"), json({ ...release, contractDigest, sdk: { mcpApps: packageInfo.dependencies["@modelcontextprotocol/ext-apps"] } }));
    // Clear only this generated subtree so removed capabilities cannot leave stale Skills.
    await fs.rm(path.join(output, "skills"), { recursive: true, force: true });
    for (const capability of backend.sourceCapabilities.filter((item) => item.status === "available" && item.skill)) {
      const directory = path.join(output, "skills", capability.id);
      await fs.mkdir(path.join(directory, "references"), { recursive: true });
      await fs.writeFile(path.join(directory, "SKILL.md"), projectSkill(capability, release));
      await fs.writeFile(path.join(directory, "references/domain.md"), domainReference(capability.skill, capability.id, release.commit));
      await fs.writeFile(path.join(directory, "references/tools.json"), json(backend.tools.filter((tool) => capability.tools.includes(tool.name))));
    }
    return { release, output, contractDigest, capabilities: backend.capabilities, tools: backend.tools };
  } finally { backend.close(); }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await buildChatgpt();
  console.log(`Built ChatGPT ${result.release.version}: ${result.tools.length} tools; ${result.output}`);
}
