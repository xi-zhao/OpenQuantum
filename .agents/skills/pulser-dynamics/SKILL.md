---
name: pulser-dynamics
description: 用 Pasqal Pulser 的真实序列和 QuTiP 在本地模拟二维 Rydberg 全局脉冲，返回逐原子占据、振幅、概率、实际时长与单位。
---

# Pulser Rydberg 动力学

<!-- BEGIN NATIVE SDK ACCESS -->
## 原生 SDK 路径

本能力同时支持 **Pulser 的原生公开 API**。用户需要 Register、Device、Sequence、waveform、pulse、变量、噪声与模拟 时，由 Agent 在固定依赖环境中编写和运行任务代码，不限于下文便捷 Tool 的预设模型。

使用 `node scripts/sdk-access.mjs inspect pulser-dynamics` 定位环境，按[完整 SDK 工作流](../quantum-sdk-workbench/references/workflow.md)执行。模块导航：`pulser`、`pulser_simulation`；导航不是 API 白名单。

下文关于模型、门集、输入与预算的限制描述便捷 Tool 的合同；原生 SDK 另受上游版本、可选依赖、宿主资源与用户授权约束。已禁用或被拒绝的动作不能借代码路径绕过。执行状态和科研验收分别报告。
<!-- END NATIVE SDK ACCESS -->


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
