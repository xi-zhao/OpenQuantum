---
name: pulser-dynamics
description: 用 Pasqal Pulser 的真实序列和 QuTiP 在本地模拟二维 Rydberg 全局脉冲，返回逐原子占据、振幅、概率、实际时长与单位。
---

# Pulser Rydberg 动力学

适用于已用物理单位定义的全局脉冲。Agent 经 Harness 调用 `pulser_local` 的 `simulate_pulser_rydberg`；无量纲程序应选择 QoolQit。

- `atomPositionsUm` 按输入顺序给出不同的二维位置，单位 µm。固定 Rb70S，实际 C6 随结果返回。
- 每个 `pulses` 元素包含整数 `durationNs`、Rabi 振幅和失谐的两个端点，以及常数 `phaseRad`。振幅非负；角频率是 rad/µs，相位是 rad。相邻脉冲可有不同相位；虚拟设备的 phase-jump delay 显式设为 0。
- 总时长至少 4 ns（模拟器采样表示要求）；单个 1 ns 样本无法表示不等的线性端点。输入任意规模均受 SDK 数值表示与机器资源约束，未施加人为原子数或时长上限。
- 从全 ground 态演化，完整两能级空间、固定原子、全局控制；没有耗散、运动、局域寻址或硬件幅度限制。虚拟设备不代表校准后的实际 QPU。
- **相位约定**：Pulser 的驱动项是 `Ω/2*(exp(-iφ)|g><r|+exp(iφ)|r><g|)`；与 Bloqade 比较需翻转相位符号，并分别使用各 SDK 的 C6。失谐项为 `-Δ n`。
- 输出位串左端是输入原子 0，0=ground、1=Rydberg。振幅为 `[real,imag]`，保留 SDK 原始全局相位与 norm；检查 `maxNormError`，不得静默归一化。
- `timeSteps` 是均匀输出间隔数，输出还包含每个脉冲边界。Pulser 在 ns 网格采样并插值；`atol/rtol` 只约束 ODE 数值精度，不保证相对连续理想波形的物理误差。`solverMaxStepNs` 与 `maxSolverSteps` 可控制积分步进，资源限制另用 `execution`。
- 显式执行 `node scripts/setup-paper-tools.mjs pulser-dynamics`。固定使用提供原始态与求解容差的 `QutipEmulator` 公共 API；它在上游 1.9 已标记弃用，升级时须重新核验接口。
- 当前 L1，`scientificValidation=not_evaluated`；成功仿真和解析对照不是科学 Acceptance。无云/QPU 请求。

[上游与许可说明](references/UPSTREAM.md)。
