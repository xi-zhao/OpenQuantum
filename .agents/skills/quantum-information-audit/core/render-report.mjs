const complex = value => value.imag === 0 ? String(value.real) : `${value.real} + (${value.imag})i`;

/** Present persisted input and validated facts; do not invent physical prose. */
export function renderStateAuditReport({ request, artifacts, acceptanceReport, resultPackage,
  acceptanceReportPath, resultPackagePath }) {
  const { analysis } = artifacts;
  const state = analysis.state, transpose = analysis.partialTranspose;
  const nonzero = [];
  let nonzeroCount = 0;
  for (let row = 0; row < request.matrixReal.length; row++) {
    for (let column = 0; column < request.matrixReal.length; column++) {
      const real = request.matrixReal[row][column], imag = request.matrixImag?.[row]?.[column] ?? 0;
      if (real !== 0 || imag !== 0) {
        nonzeroCount++;
        if (nonzero.length < 64) nonzero.push(`| (${row}, ${column}) | ${complex({ real, imag })} |`);
      }
    }
  }
  return [
    "# 密度矩阵审计报告", "",
    `- 中央验收状态：\`${acceptanceReport.status}\``,
    `- toqito 版本：${analysis.packageVersion}`,
    `- 矩阵维数：${state.dimension}`,
    `- 子系统维数：\`${JSON.stringify(request.subsystemDimensions)}\``,
    `- 部分转置子系统：\`${JSON.stringify(request.transposeSubsystems)}\``, "",
    "## 输入矩阵的非零元素", "",
    "以下行、列索引从 0 开始，直接来自原始密度矩阵，不是部分转置矩阵。", "",
    `非零元素预览：${nonzero.length} / ${nonzeroCount}；完整矩阵见 Result Package 的 input 引用。`, "",
    "| (行, 列) | 原矩阵元素 |", "| --- | --- |", ...nonzero, "",
    "## 实际数值事实", "",
    `- 迹：${complex(state.trace)}`,
    `- Hermiticity 残差：${state.hermiticityResidual}`,
    `- 纯度 Tr(ρ²)：${complex(state.purity)}`,
    `- 数值秩：${state.numericalRank}`,
    `- toqito 密度矩阵判定：${state.toqitoDensity}`,
    `- 部分转置谱预览（前 ${Math.min(32, transpose.eigenvalues.length)} / ${transpose.eigenvalues.length} 项）：\`${JSON.stringify(transpose.eigenvalues.slice(0, 32))}\`；完整谱见 state-analysis Artifact。`,
    `- 部分转置最小本征值：${transpose.minimumEigenvalue}`,
    `- Negativity：${transpose.negativity}`, "",
    "## 逐项检查", "",
    "| 检查 | 状态 |", "| --- | --- |",
    ...acceptanceReport.checks.map(check => `| \`${check.id}\` | \`${check.status}\` |`), "",
    "## 来源与范围", "",
    `- Harness 会话：\`${resultPackage.executionRef.sessionId}\``,
    `- 执行事件范围：${resultPackage.executionRef.eventRange.from}–${resultPackage.executionRef.eventRange.to}`,
    `- Acceptance Report 路径：\`${acceptanceReportPath}\``,
    `- Result Package 路径：\`${resultPackagePath}\``,
    "- 验收覆盖输入、上述数值事实及来源链，不覆盖模型另行撰写的物理解释。",
    "- 本报告区分原矩阵与部分转置的结果；不把后者的非零位置当作原态的相干项。",
    "- 这是指定矩阵、指定二分的本地审计，不是态层析、硬件验证或一般纠缠分类。", "",
  ].join("\n");
}
