export const SDK_BEGIN = "<!-- BEGIN NATIVE SDK ACCESS -->";
export const SDK_END = "<!-- END NATIVE SDK ACCESS -->";

export function sourceSdkSection(entry) {
  return `${SDK_BEGIN}\n## 原生 SDK 路径\n\n` +
    `本能力${entry.nativeOnly ? "使用" : "同时支持"} **${entry.title} 的原生公开 API**。用户需要 ${entry.workflow} 时，由 Agent 在固定依赖环境中编写和运行任务代码${entry.nativeOnly ? "。" : "，不限于下文便捷 Tool 的预设模型。"}\n\n` +
    `使用 \`node scripts/sdk-access.mjs inspect ${entry.id}\` 定位环境，按[完整 SDK 工作流](../quantum-sdk-workbench/references/workflow.md)执行。模块导航：${entry.modules.map((name) => `\`${name}\``).join("、") || "固定版本的原生头文件与源码"}；导航不是 API 白名单。\n\n` +
    (entry.conditions.length ? `${entry.conditions.join("\n\n")}\n\n` : "") +
    (entry.bootstrap ? `原生程序导入库前，按环境定位器的 \`bootstrap\` 执行启动兼容处理：${entry.bootstrap}。这不限制公开 API，也不替换数值算法。\n\n` : "") +
    `${entry.nativeOnly ? "本入口复用宿主文件与代码工具，没有新增通用执行 Tool。原生 SDK 受" : "下文关于模型、门集、输入与预算的限制描述便捷 Tool 的合同；原生 SDK 另受"}上游版本、可选依赖、宿主资源与用户授权约束。已禁用或被拒绝的动作不能借代码路径绕过。执行状态和科研验收分别报告。\n${SDK_END}\n`;
}

export function upsertSdkSection(source, entry) {
  const begin = source.indexOf(SDK_BEGIN);
  if (begin !== -1) {
    const end = source.indexOf(SDK_END, begin);
    if (end === -1) throw new Error(`Unclosed SDK section: ${entry.id}`);
    return source.slice(0, begin) + sourceSdkSection(entry).trimEnd() + source.slice(end + SDK_END.length);
  }
  const heading = source.match(/^#{1,2} .+$/m);
  const frontmatter = source.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n/);
  if (!heading && !frontmatter) throw new Error(`Skill metadata missing: ${entry.id}`);
  const position = heading ? heading.index + heading[0].length : frontmatter[0].length;
  return `${source.slice(0, position)}\n\n${sourceSdkSection(entry)}${source.slice(position)}`;
}
