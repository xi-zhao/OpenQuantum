/** Deterministic rendering of persisted evidence and the central report. */
export function renderReport({ request, artifacts, acceptanceReport, resultPackage, acceptanceReportPath, resultPackagePath }) {
  const r = artifacts.result;
  return ["# Symmer 对称性降比特验收报告", "",
    `- 科学验收状态：\`${acceptanceReport.status}\``,
    `- 量子位数：${request.numQubits} → ${r.reducedQubits}；目标扇区维数：${r.sectorDimension}；化简项数：${r.reducedTerms.length}`,
    "- 仅核对给定对称性扇区的辛对易/秩与 ≤6 比特独立能谱，不代表全局基态扇区选择或上下文子空间 VQE。",
    `- 会话：\`${resultPackage.executionRef.sessionId}\`；执行事件：${resultPackage.executionRef.eventRange.from}–${resultPackage.executionRef.eventRange.to}`,
    `- Acceptance Report：\`${acceptanceReportPath}\``, `- Result Package：\`${resultPackagePath}\``, "",
    "| 检查 | 状态 |", "| --- | --- |", ...acceptanceReport.checks.map(check => `| ${check.id} | ${check.status} |`), "",
    "未执行的独立检查保留 not_checked 并使验收为 conditional；已执行的检查若失败则整体验收失败。", "",
  ].join("\n");
}
