/** Deterministic rendering of persisted evidence and the central report. */
export function renderReport({ artifacts, acceptanceReport, resultPackage, acceptanceReportPath, resultPackagePath }) {
  return ["# LDPC syndrome 重放验收报告", "",
    `- 科学验收状态：\`${acceptanceReport.status}\``,
    `- 样本数：${artifacts.result.statistics.shots}；syndrome 匹配数：${artifacts.result.statistics.syndromeMatchedCount}`,
    "- 仅核对给定 H 的逐样本校验与固定 serial BP+LSD 重放，不证明量子码距或硬件容错阈值。",
    `- 会话：\`${resultPackage.executionRef.sessionId}\`；执行事件：${resultPackage.executionRef.eventRange.from}–${resultPackage.executionRef.eventRange.to}`,
    `- Acceptance Report：\`${acceptanceReportPath}\``, `- Result Package：\`${resultPackagePath}\``, "",
    "| 检查 | 状态 |", "| --- | --- |", ...acceptanceReport.checks.map(check => `| ${check.id} | ${check.status} |`), "",
    "未执行的独立检查保留 not_checked 并使验收为 conditional；已执行的检查若失败则整体验收失败。", "",
  ].join("\n");
}
