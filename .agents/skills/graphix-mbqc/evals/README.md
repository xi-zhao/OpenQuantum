# 固定独立验证证据

≤10 逻辑/活跃 qubits、≤512 门、≤4096 模式命令且启用参考时，从输入门序列独立算态和 Born 概率，并逐条重放 N/E/M/X/Z、自适应角度和给定测量分支的副产物修正。只覆盖采样分支，不声称所有输入的通道等价。

独立验证器只产 observations，不自行推导科学验收；`acceptanceProfiles: []` 和 `reproductionProfiles: []`。执行期 `provenance.complete=not_checked`。

`fixtures/` 来自固定锁环境的真实本地 SDK。`cases.json` 包含确定性正例、伪造结果、来源绑定错误与未检查边界；`suite.json` 固定案例摘要。执行 `node .agents/skills/graphix-mbqc/evals/run-evals.mjs`。实时复核入口为 `OPENQUANTUM_REAL_UNITARY_OBSERVATIONS=1 node --test tests/unitary-independent-live.test.mjs`，需显式准备原锁环境。
