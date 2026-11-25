# 固定独立验证证据

≤4 qubits、≤64 生成元独立计算所有嵌套对易闭包、正交 Pauli 基、DLA 维数与中心维数；≤3 qubits 加稠密 AB−BA 复核。辛向量秩不等于 DLA 维数。

独立验证器只产 observations，不自行推导科学验收；`acceptanceProfiles: []` 和 `reproductionProfiles: []`。执行期 `provenance.complete=not_checked`。

`fixtures/` 来自固定锁环境的真实本地 SDK。`cases.json` 包含确定性正例、伪造结果、来源绑定错误与未检查边界；`suite.json` 固定案例摘要。执行 `node .agents/skills/paulie-algebra/evals/run-evals.mjs`。实时复核入口为 `OPENQUANTUM_REAL_UNITARY_OBSERVATIONS=1 node --test tests/unitary-independent-live.test.mjs`，需显式准备原锁环境。
