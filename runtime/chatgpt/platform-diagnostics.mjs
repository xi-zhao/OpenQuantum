import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { createBackend } from "./backend.mjs";
import { Settings, skillEnabled } from "../../src/settings/codex/application.mjs";

// Called by the Skill with the host's existing code Tool. This is a bounded
// diagnostic, not a new scientific Tool or a second Agent runtime.
export async function diagnoseCodex({ root, pluginRoot, environment = process.env }) {
  const backend = await createBackend({ root });
  const checks = [];
  const add = (id, layer, status, evidence, nextAction) => checks.push({ id, layer, required: true, status, evidence: [evidence], ...(nextAction ? { nextAction } : {}) });
  try {
    const settings = new Settings({ backend, directory: environment.OPENQUANTUM_PLUGIN_SETTINGS_HOME, codexHome: environment.CODEX_HOME, skillRoot: path.join(pluginRoot, "skills") });
    const { codex, config } = await settings.read();
    if (!skillEnabled(codex, "platform-diagnostics", settings.skillRoot)) throw new Error("用户已禁止 platform-diagnostics Skill");
    const release = JSON.parse(await fs.readFile(path.join(root, "dist/chatgpt/release.json"), "utf8"));
    add("codex.package", "skill", "pass", `已校验固定 Tool 合同：${backend.tools.length} 个 Tool；版本 ${release.version}；摘要 ${release.contractDigest}。`);
    add("codex.policy", "skill", "pass", `只读解析设置成功；明确禁用 MCP ${config.disabledProviders.length} 项、Tool ${config.disabledTools.length} 项。未读取凭据值。`);
    const environments = await settings.environments.snapshot(settings.environmentIds());
    add("codex.environments", "skill", "pass", `只读检查 ${environments.length} 个环境记录；${environments.filter(item => item.ready).length} 个已有有效检查记录。未准备的环境仍保持按需安装；本步骤不启动任何科学 MCP。`);
    const client = new Client({ name: "openquantum-diagnostics", version: "1.0.0" });
    const allowed = ["PATH", "HOME", "USERPROFILE", "SYSTEMROOT", "WINDIR", "TMPDIR", "TEMP", "TMP", "CODEX_HOME", "OPENQUANTUM_PLUGIN_SETTINGS_HOME"];
    const transport = new StdioClientTransport({ command: process.execPath, args: [path.join(root, "runtime/chatgpt/main.mjs"), "--stdio"], cwd: root,
      env: { ...Object.fromEntries(allowed.filter(key => environment[key]).map(key => [key, environment[key]])), OPENQUANTUM_PLUGIN_ROOT: pluginRoot }, stderr: "pipe" });
    transport.stderr?.resume();
    try {
      await client.connect(transport, { timeout: 30000 });
      const result = await client.listTools({}, { timeout: 30000 });
      if (result.nextCursor || !["find_openquantum_skills", "prepare_openquantum_skill"].every(name => result.tools.some(tool => tool.name === name))) throw new Error("能力选择或准备 Tool 缺失");
      add("codex.mcp", "harness", "pass", `原生插件入口完成实际 stdio 握手与 tools/list：${result.tools.length} 个 Tool；未启动科学 MCP、安装依赖或执行计算。`);
    } catch {
      add("codex.mcp", "harness", "fail", "原生插件入口握手或 Tool 发现失败。", "检查插件安装与运行日志；修复后重新运行本诊断。");
    } finally { await client.close(); await transport.close(); }
    for (const [id, layer, reason, next] of [
      ["ui.transport", "ui", "本机探针不能证明 Codex 原生侧边页的显示、编辑和保存行为。", "在当前聊天打开设置页，核验相关操作与重开后的状态。"],
      ["harness.config", "harness", "当前发行版使用 Codex 宿主；独立版 Harness 配置不在此诊断范围。", "需要独立版验收时，在对应部署运行其诊断 Skill。"],
      ["harness.host", "harness", "上方 codex.mcp 只证明插件协议；没有访问独立版 Harness Host。", "按实际部署范围补充 Host 运行证据。"],
      ["skill.discovery", "skill", "磁盘上的 Skill 与协议 Tool 清单不能证明当前聊天已加载相应 Skill。", "在当前聊天发现并读取目标 Skill，保留宿主调用记录。"],
      ["model.catalog", "model", "模型由 Codex 当前聊天管理；此诊断不读取账户或切换模型。", "从当前聊天的宿主状态确认模型。"],
      ["model.text-generation", "model", "未发出额外模型请求。", "需要完整验收时，使用当前模型完成任务并保留聊天证据。"],
      ["model.tool-calling", "model", "本机 MCP 探针不等于模型在同一聊天成功调用。", "在同一聊天完成选择、准备与 Tool 调用，核对真实结果。"],
    ]) add(id, layer, "not_checked", reason, next);
    const counts = checks.reduce((sum, item) => { sum[item.status === "not_checked" ? "notChecked" : item.status]++; return sum; }, { pass: 0, warn: 0, fail: 0, notChecked: 0 });
    const report = { schemaVersion: "1.0", capability: { id: "platform-diagnostics", version: release.version }, generatedAt: new Date().toISOString(),
      status: counts.fail ? "blocked" : "degraded", checks, summary: { statement: "Codex 本机插件诊断；宿主界面、当前模型与科学验收分别保留未检查状态。", counts } };
    const { validateReport } = await import(pathToFileURL(path.join(root, ".agents/skills/platform-diagnostics/validators/validate-report.mjs")));
    const errors = validateReport(report);
    if (errors.length) throw new Error(`诊断报告校验失败：${errors.join("; ")}`);
    return report;
  } finally { await backend.close(); }
}
