/** Render only trusted persisted facts and central Acceptance, without an LLM. */
export function renderClassificationReport({ artifacts, acceptanceReport, resultPackage,
  acceptanceReportPath, resultPackagePath }) {
  const analysis = artifacts.analysis;
  const replay = acceptanceReport.checks.find(check => check.id === "classification.replayed");
  return [
    "# 电路判定复核报告", "",
    `- 电路判定：\`${analysis.result.equivalence}\``,
    `- 判定复核状态：\`${acceptanceReport.status}\``,
    "- `passed` 表示该判定的数值和来源满足当前规则；不等价判定仍为不等价。", "",
    "## 证据", "",
    `- MQT QCEC：${analysis.packageVersion}`,
    `- 电路 A SHA-256：\`${analysis.inputs.circuitA.sha256}\``,
    `- 电路 B SHA-256：\`${analysis.inputs.circuitB.sha256}\``,
    `- Harness 会话：\`${resultPackage.executionRef.sessionId}\``,
    `- 实际执行事件范围：${resultPackage.executionRef.eventRange.from}–${resultPackage.executionRef.eventRange.to}`,
    `- 中央 Acceptance Report 路径：\`${acceptanceReportPath}\``,
    `- Result Package 路径：\`${resultPackagePath}\``, "",
    "验收覆盖本报告列出的判定、数值与来源检查，不覆盖模型另行撰写的物理解释。", "",
    "## 逐项检查", "",
    "| 检查 | 状态 |", "| --- | --- |",
    ...acceptanceReport.checks.map(check => `| \`${check.id}\` | \`${check.status}\` |`), "",
    "## 独立复核与范围", "",
    `- 参考模式：${replay.observed.mode ?? "尚未完成"}`,
    ...(replay.observed.referenceChecked ? [
      `- 最大矩阵元差：${replay.observed.strictResidual}`,
      `- 去除全局相位后的最大矩阵元差：${replay.observed.globalPhaseResidual}`,
    ] : ["- 独立参考尚未完成；本报告不能将 conditional 升级为 passed。"]),
    "- 矩阵正例容差为 1e-9，否定判定要求差大于 1e-8；两者之间保留不确定性。",
    "- 科学验收范围至 16 量子位、每份输入 65536 字节和 512 条语句；不限制原计算 Tool 的规模。完整稠密矩阵参考至 8 量子位，字节相同的输入可在验收范围内证明恒等。",
    "- 全局相位判定保留原标签；一般相位、概率性和无信息判定不能改写成确定的严格等价。",
    "- 本报告不涉及测量、经典控制、硬件、噪声或任意输入态的纠缠结论。", "",
  ].join("\n");
}
