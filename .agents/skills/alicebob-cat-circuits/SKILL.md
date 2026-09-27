---
name: alicebob-cat-circuits
description: 用 Alice & Bob 的真实本地 Qiskit provider 构建物理或逻辑猫量子位噪声电路模型，返回调度转译后的采样和明确模型参数。
---

# Alice & Bob 猫量子位电路

适用于编码量子位上的门级模型比较。Agent 经 Harness 调用 `alicebob_local` 的 `run_alicebob_local_circuit`。此动作没有求解振子 Fock 空间中的猫态主方程。

- 选择 `physical`、`logical` 或 `logical-noiseless`。输入 `initialStates` 按量子位 0 开始，逐个指定编码基中的 `0/1/+/-`；长度必须与 `numQubits` 相同。
- 物理模型原生门范围 x/z/rz/cx，`rz.angleRad` 单位 rad。逻辑模型支持 x/z/h/s/sdg/t/tdg/cx/ccx，不接受连续 rz。macOS 上游已知不支持的 CRY/RCCX/RCCCX 不在此接口内。
- `modelParameters` 可指定 `kappa1Hz`、`kappa2Hz`、`averagePhotons`；`logical` 还接受奇数 `distance>=3`。遵循 SDK 模型域：平均光子数至少 4、kappa1 至少 10 Hz、两损耗率之比在 1e-7 至 1e-1。
- `logical-noiseless` 固定使用 SDK 无噪声参数，`modelParameters` 必须为空。以返回的 `resolvedModelParameters` 为准；物理模型 distance=0 表示未使用重复码距离。
- Tool 用官方 builder 构造用户指定量子位数的 all-to-all 本地模型，再真实转译、调度、注入 SDK 解析噪声并运行 ProcessorSimulator。不是把预设 6Q/40Q 名称作为规模上限。
- 末尾逐位 Z 测量，位串左端为输入量子位 0。先用 noiseless 验证逻辑干涉，再比较噪声模型；有限 shots 差异不等于硬件性能。
- 显式执行 `node scripts/setup-paper-tools.mjs alicebob-cat-circuits`。此 provider 使用独立 Qiskit 1.x 环境，不与 IQM 的 Qiskit 2.x 混装。调用时不安装依赖，也不使用远程 provider。
- 规模和资源分别由 `numQubits`/`shots` 与 `execution` 控制。当前 L1，`scientificValidation=not_evaluated`；数值回归不是科学 Acceptance。

[上游与许可说明](references/UPSTREAM.md)。
