/** Deterministic rendering of persisted evidence and the central report. */
export function renderReport({ request, artifacts, acceptanceReport, resultPackage, acceptanceReportPath, resultPackagePath }) {
  return ["# QUBO 代数与最优性验收报告", "",
    `- 科学验收状态：\`${acceptanceReport.status}\``,
    `- 变量数：${(artifacts.result.solver ?? artifacts.result).problem.size}；主算法：${request.method}`,
    "- 只在 n≤16 且未跳过穷举时核对全局最优集合；QAOA 分布不构成全局最优证明。",
    `- 会话：\`${resultPackage.executionRef.sessionId}\`；执行事件：${resultPackage.executionRef.eventRange.from}–${resultPackage.executionRef.eventRange.to}`,
    `- Acceptance Report：\`${acceptanceReportPath}\``, `- Result Package：\`${resultPackagePath}\``, "",
    "| 检查 | 状态 |", "| --- | --- |", ...acceptanceReport.checks.map(check => `| ${check.id} | ${check.status} |`), "",
    "未执行的独立检查保留 not_checked 并使验收为 conditional；已执行的检查若失败则整体验收失败。", "",
  ].join("\n");
}
