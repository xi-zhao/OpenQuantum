/** Deterministic rendering of persisted evidence and the central report. */
export function renderReport({ request, artifacts, acceptanceReport, resultPackage, acceptanceReportPath, resultPackagePath }) {
  const { before, after } = artifacts.result;
  return ["# PyZX 电路优化验收报告", "",
    `- 科学验收状态：\`${acceptanceReport.status}\``,
    `- 量子位数：${request.numQubits}；门数变化：${before.gates} → ${after.gates}（T 门 ${before.tCount} → ${after.tCount}，双比特门 ${before.twoQubitGates} → ${after.twoQubitGates}）`,
    "- 仅核对给定 Clifford+T 请求门表、前后资源与 ≤6 比特独立稠密酉等价，不做硬件路由或任意规模证明。",
    `- 会话：\`${resultPackage.executionRef.sessionId}\`；执行事件：${resultPackage.executionRef.eventRange.from}–${resultPackage.executionRef.eventRange.to}`,
    `- Acceptance Report：\`${acceptanceReportPath}\``, `- Result Package：\`${resultPackagePath}\``, "",
    "| 检查 | 状态 |", "| --- | --- |", ...acceptanceReport.checks.map(check => `| ${check.id} | ${check.status} |`), "",
    "未执行的独立检查保留 not_checked 并使验收为 conditional；已执行的检查若失败则整体验收失败。", "",
  ].join("\n");
}
