/** Deterministic rendering of persisted evidence and the central report. */
export function renderReport({ request, artifacts, acceptanceReport, resultPackage, acceptanceReportPath, resultPackagePath }) {
  const r = artifacts.result;
  return ["# PauLie 动力学 Lie 代数验收报告", "",
    `- 科学验收状态：\`${acceptanceReport.status}\``,
    `- 量子位数：${request.numQubits}；DLA 维数：${r.dimension}（su(2^n) 维数：${r.fullSpecialUnitaryDimension}）；分类：\`${r.classification}\``,
    "- 仅核对给定独立 Pauli 控制生成元的闭包与维数（≤4 比特闭包、≤3 比特稠密 AB−BA 复核），不推出有限深 ansatz 可训练性或硬件可控性。",
    `- 会话：\`${resultPackage.executionRef.sessionId}\`；执行事件：${resultPackage.executionRef.eventRange.from}–${resultPackage.executionRef.eventRange.to}`,
    `- Acceptance Report：\`${acceptanceReportPath}\``, `- Result Package：\`${resultPackagePath}\``, "",
    "| 检查 | 状态 |", "| --- | --- |", ...acceptanceReport.checks.map(check => `| ${check.id} | ${check.status} |`), "",
    "未执行的独立检查保留 not_checked 并使验收为 conditional；已执行的检查若失败则整体验收失败。", "",
  ].join("\n");
}
