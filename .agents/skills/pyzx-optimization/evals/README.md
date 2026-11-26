# 固定独立验证证据

独立解析前后 QASM，复算门数/T 门数/双比特门数及依赖深度；≤6 qubits、≤512 输入门、≤2048 输出门且未跳过参考时，用独立复矩阵乘法核对全局相位无关酉等价。

已接入版本化 Acceptance Profile `pyzx-unitary-optimization-audit@1.0.0`，`reproductionProfiles: []`。开发证据为 L3；执行期只产生 observations，`provenance.complete=not_checked`；DSH 物化并重读字节后，中央 Builder 才派生 Acceptance。

`fixtures/` 来自固定锁环境的真实本地 SDK。`cases.json` 包含确定性正例、伪造结果、来源绑定错误与未检查边界；`suite.json` 固定案例摘要。执行 `node .agents/skills/pyzx-optimization/evals/run-evals.mjs`。实时复核入口为 `OPENQUANTUM_REAL_UNITARY_OBSERVATIONS=1 node --test tests/unitary-independent-live.test.mjs`，需显式准备原锁环境。
