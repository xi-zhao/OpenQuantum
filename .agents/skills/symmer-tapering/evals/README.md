# 固定独立验证证据

独立辛 GF(2) 检查生成元对易、秩、Hamiltonian 对易和 n−k 降比特结构；≤6 qubits、≤256 项且启用参考时，用单独 NumPy 程序构造目标扇区投影，逐一对比完整能谱。

独立验证器只产 observations，不自行推导科学验收；`acceptanceProfiles: []` 和 `reproductionProfiles: []`。执行期 `provenance.complete=not_checked`。

`fixtures/` 来自固定锁环境的真实本地 SDK。`cases.json` 包含确定性正例、伪造结果、来源绑定错误与未检查边界；`suite.json` 固定案例摘要。执行 `node .agents/skills/symmer-tapering/evals/run-evals.mjs`。实时复核入口为 `OPENQUANTUM_REAL_UNITARY_OBSERVATIONS=1 node --test tests/unitary-independent-live.test.mjs`，需显式准备原锁环境。
