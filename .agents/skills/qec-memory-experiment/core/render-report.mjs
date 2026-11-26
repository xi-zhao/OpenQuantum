/** Deterministic report from re-read evidence and central Acceptance only. */
export function renderReport({ request, artifacts, acceptanceReport, resultPackage, acceptanceReportPath, resultPackagePath }) {
  return [
    "# QEC 存储实验验收报告", "",
    `- 科学验收状态：\`${acceptanceReport.status}\``,
    `- 逻辑失败：${artifacts.facts.result.logicalErrors} / ${request.shots}`,
    `- Wilson 95% 区间：[${artifacts.facts.result.wilson95.low}, ${artifacts.facts.result.wilson95.high}]`,
    `- 参数：basis=${request.basis}, distance=${request.distance}, rounds=${request.rounds}, p=${request.physicalErrorRate}, seed=${request.seed}`,
    "- 仅验收固定参数的采样、解码统计、电路/DEM 和同机 seed 重放，不推导码阈值或硬件性能。",
    `- 会话：\`${resultPackage.executionRef.sessionId}\`；执行事件：${resultPackage.executionRef.eventRange.from}–${resultPackage.executionRef.eventRange.to}`,
    `- Acceptance Report：\`${acceptanceReportPath}\``,
    `- Result Package：\`${resultPackagePath}\``, "",
    "| 检查 | 状态 |", "| --- | --- |",
    ...acceptanceReport.checks.map(check => `| ${check.id} | ${check.status} |`), "",
    "验收仅覆盖版本化 Profile 和本报告的证据；执行完成或模型解释不能替代中央验收。", "",
  ].join("\n");
}
