/** Deterministic report from re-read evidence and central Acceptance only. */
export function renderReport({ request, artifacts, acceptanceReport, resultPackage, acceptanceReportPath, resultPackagePath }) {
  return [
    "# Hamiltonian 演化验收报告", "",
    `- 科学验收状态：\`${acceptanceReport.status}\``,
    `- 方法：${request.method}；量子位：${request.numQubits}；步数：${request.steps}`,
    `- 态范数：${artifacts.result.stateNorm}；精确参考保真度：${artifacts.result.stateFidelity}`,
    `- 谱误差：${artifacts.result.unitarySpectralError}；双量子位门：${artifacts.result.circuit.twoQubitGates}`,
    "- Trotter 检查保守误差界；qDrift 只检查所记录 seed 的确定性重放，不保证单次随机实现的收敛或量子优势。",
    "- 验收不要求可观测的渐近收敛阶；零时间、对易和舍入误差区间不据此作收敛阶结论。",
    `- 会话：\`${resultPackage.executionRef.sessionId}\`；执行事件：${resultPackage.executionRef.eventRange.from}–${resultPackage.executionRef.eventRange.to}`,
    `- Acceptance Report：\`${acceptanceReportPath}\``,
    `- Result Package：\`${resultPackagePath}\``, "",
    "| 检查 | 状态 |", "| --- | --- |",
    ...acceptanceReport.checks.map(check => `| ${check.id} | ${check.status} |`), "",
    "验收仅覆盖版本化 Profile 和本报告的证据；执行完成或模型解释不能替代中央验收。", "",
  ].join("\n");
}
