/** Deterministic rendering of persisted evidence and the central report. */
export function renderReport({ request, artifacts, acceptanceReport, resultPackage, acceptanceReportPath, resultPackagePath }) {
  const r = artifacts.result;
  return ["# Graphix MBQC 模式验收报告", "",
    `- 科学验收状态：\`${acceptanceReport.status}\``,
    `- 逻辑量子位数：${request.numQubits}；资源节点数：${r.nodes.length}；峰值活跃位：${r.maxSpace}；采样分支数：${r.branches.length}`,
    "- 仅核对指定输入态与采样分支的因果结构、归一化及自适应副产物纠正，不证明任意输入通道等价或硬件噪声性能。",
    `- 会话：\`${resultPackage.executionRef.sessionId}\`；执行事件：${resultPackage.executionRef.eventRange.from}–${resultPackage.executionRef.eventRange.to}`,
    `- Acceptance Report：\`${acceptanceReportPath}\``, `- Result Package：\`${resultPackagePath}\``, "",
    "| 检查 | 状态 |", "| --- | --- |", ...acceptanceReport.checks.map(check => `| ${check.id} | ${check.status} |`), "",
    "未执行的独立检查保留 not_checked 并使验收为 conditional；已执行的检查若失败则整体验收失败。", "",
  ].join("\n");
}
