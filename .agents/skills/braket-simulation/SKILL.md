---
name: braket-simulation
description: 使用 Amazon Braket LocalSimulator 在本地计算结构化量子电路的精确数值振幅与概率。
---

# Amazon Braket 本地模拟

Agent 经 Harness 调用 `braket_local` 的 `simulate_braket_circuit`。Skill 负责选择与解释，Tool 负责真实 SDK 执行。

接受全零初态上的 `numQubits` 与 H/S/T/X/Y/Z/CX/CZ/RX/RY/RZ 有序门列表；旋转角为 rad。适配层显式保留空闲量子位，输出位串最左位始终对应 qubit 0。

Tool 只构造 `LocalSimulator("braket_sv")` 并以 shots=0 返回 state vector；不构造 AwsDevice，不读取 AWS 账户，不提交 S3、云任务或 QPU。安装 SDK 也不意味着真实 AWS 服务已经连通。

检查 `normError` 后解释振幅与概率。结果是理想、无测量纯态的数值模拟，不包含有限 shots 噪声或设备校准。状态向量内存随 2^N 增长；用户选择电路规模和执行资源。

需要远端服务时须使用另行提供的相应动作及用户自行配置的 AWS 凭据，不能通过本工具参数切换后端。

固定依赖需显式执行 `node scripts/setup-paper-tools.mjs braket-simulation`；调用时不安装依赖，数值库可能写入本地缓存。规模参数不按开发机算例设人工上限；通过独立的 `execution` 选择部署资源。

当前为 L1，`scientificValidation=not_evaluated`。成功执行与工程回归不代表科学 Acceptance。

[上游、许可与验证边界](references/UPSTREAM.md)。
