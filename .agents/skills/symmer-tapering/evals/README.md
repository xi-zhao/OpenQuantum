# 固定独立验证证据

独立辛 GF(2) 检查生成元对易、秩、Hamiltonian 对易和 n−k 降比特结构；≤6 qubits、≤256 项且启用参考时，用单独 NumPy 程序构造目标扇区投影，逐一对比完整能谱。

已接入版本化 Acceptance Profile `symmer-sector-spectrum-audit@1.0.0`，`reproductionProfiles: []`。开发证据为 L3；执行期只产生 observations，`provenance.complete=not_checked`；DSH 物化并重读字节并在 `full` 沙箱中运行独立参考后，中央 Builder 才派生 Acceptance。

`fixtures/` 来自固定锁环境的真实本地 SDK。`cases.json` 包含确定性正例、伪造结果、来源绑定错误与未检查边界；`suite.json` 固定案例摘要。执行 `node .agents/skills/symmer-tapering/evals/run-evals.mjs`。实时复核入口为 `OPENQUANTUM_REAL_UNITARY_OBSERVATIONS=1 node --test tests/unitary-independent-live.test.mjs`，需显式准备原锁环境。
