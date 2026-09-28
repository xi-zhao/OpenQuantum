---
name: quairkit-information
description: 用 QuAIRKit 在 CPU 上模拟结构化电路后的有序局域噪声信道，返回密度矩阵、纯度和概率并解释物理约定。
---

# QuAIRKit 量子信道

Agent 经 Harness 调用 `quairkit_local` 的 `simulate_quairkit_channel`。Skill 负责选择与解释，Tool 负责真实 SDK 执行。

先提供 `numQubits`、结构化 `gates`，再提供 `channels`。输入态固定为全零；H/S/T/X/Y/Z/CX/CZ 和 RX/RY/RZ 的角度用 rad。所有信道在整个电路之后按列表顺序作用，不能将其描述为每门噪声模型。

每个信道指定 `target` 和 `[0,1]` 范围的 `strength`。幅度阻尼对应激发态衰减概率 γ；相位阻尼将局域相干乘以 √(1−γ)；退极化使用 `(1−p)ρ + p I/2` 的单量子位约定，纠缠态通过局域 Kraus 算符作用。

`densityMatrix` 每项为 `[real,imag]`，计算基中 qubit 0 对应最左位。输出 trace、purity 和 Hermiticity 残差只描述数值结果，不是独立科学验收。使用 CPU complex128；没有状态裁剪、重归一化或设备标定。

先检查 trace 接近 1、Hermiticity 残差小，再结合阻尼、退极化和输入态解释纯度变化。密度矩阵内存随 4^N 增长。

固定依赖需显式执行 `node scripts/setup-paper-tools.mjs quairkit-information`；调用时不安装依赖，数值库可能写入本地缓存。规模参数不按开发机算例设人工上限；通过独立的 `execution` 选择部署资源。

当前为 L1，`scientificValidation=not_evaluated`。成功执行与工程回归不代表科学 Acceptance。

[上游、许可与验证边界](references/UPSTREAM.md)。
