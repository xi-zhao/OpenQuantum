---
name: qoolqit-workbench
description: 用真实 QoolQit 编译器把用户无量纲原子阵列和脉冲转换为 Pulser 程序并本地模拟；明确能标、距离/时间换算、纳秒量化和许可边界。
---

# QoolQit 无量纲模拟程序

这是默认关闭、需明确选择启用的可选能力。QoolQit 使用 PASQAL **MIT-derived** 许可，其专利许可限内部研究与学术用途，不能称为标准 MIT。Agent 经 Harness 调用 `qoolqit_local` 的 `simulate_qoolqit_analog`。

- `atomPositions`、`durations`、`rabiAmplitude`、`detuning` 均无量纲；后两者各有段数+1个端点值。全程常数 `phaseRad` 用 rad，Rabi 非负，位置不同。
- `energyScaleRadPerUs=E` 指定物理角频率能标；真实 `UnitConverter` 给出时间因子 `1000/E` ns、距离因子 `(C6/E)^(1/6)` µm。转换后的 C6、坐标、时长和单位全部返回。
- Tool 构造真实 `QuantumProgram(Register,Drive)`，调用 `compile_to(profile="default")`，再以编译得到的 Pulser Sequence 运行 QuTiP。没有仅把 QoolQit 名称映射到 Pulser。
- 编译后的 `compiledSegmentDurationsNs` 记录各段实际纳秒时长；量化为 0 ns 的正段以及 1 ns 内不等端点会明确拒绝，避免上游静默丢段。总时长至少 4 ns。能标改变会改变网格，不能假设离散模拟具有精确尺度不变性。
- 输出位序、相位符号、求解容差和 raw norm 约定与本地 Pulser 相同。相位驱动为 `Ω/2*(exp(-iφ)|g><r|+exp(iφ)|r><g|)`。从全 ground 态、完整 2^N 空间演化，虚拟 Rb70S 设备无硬件校准。
- 先检查单位换算和单原子脉冲面积，再分析相互作用。比较能标时同时检查编译时长和网格收敛；`timeSteps` 网格会并入实际分段边界。
- 显式执行 `node scripts/setup-paper-tools.mjs qoolqit-workbench` 准备独立锁定环境。上游依赖树带有云客户端，但此 Tool 不构造它、不使用凭据或网络服务。调用时不安装依赖。
- 规模由调用方决定，使用 `execution` 管理资源。当前 L1，`scientificValidation=not_evaluated`；编译、数值对照和运行成功都不代表科学 Acceptance。

[上游与许可说明](references/UPSTREAM.md)。
