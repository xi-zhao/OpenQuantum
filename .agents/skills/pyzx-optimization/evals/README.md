# 固定独立验证证据

独立解析前后 QASM，复算门数/T 门数/双比特门数及依赖深度；≤6 qubits、≤512 输入门、≤2048 输出门且未跳过参考时，用独立复矩阵乘法核对全局相位无关酉等价。

独立验证器只产 observations，不自行推导科学验收；`acceptanceProfiles: []` 和 `reproductionProfiles: []`。执行期 `provenance.complete=not_checked`。

`fixtures/` 来自固定锁环境的真实本地 SDK。`cases.json` 包含确定性正例、伪造结果、来源绑定错误与未检查边界；`suite.json` 固定案例摘要。执行 `node .agents/skills/pyzx-optimization/evals/run-evals.mjs`。实时复核入口为 `OPENQUANTUM_REAL_UNITARY_OBSERVATIONS=1 node --test tests/unitary-independent-live.test.mjs`，需显式准备原锁环境。
