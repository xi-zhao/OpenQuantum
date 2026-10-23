---
name: perceval-photonics
description: 用 Quandela Perceval 在本地计算用户指定 Fock 输入、分束器和相移器网络的光子输出概率，解释模式顺序、HOM 干涉和适用边界。
---

# Perceval 线性光学

<!-- BEGIN NATIVE SDK ACCESS -->
## 原生 SDK 路径

本能力同时支持 **Perceval 的原生公开 API**。用户需要 任意光学网络、Fock 输入、processor、sampler、噪声与损耗 时，由 Agent 在固定依赖环境中编写和运行任务代码，不限于下文便捷 Tool 的预设模型。

使用 `node scripts/sdk-access.mjs inspect perceval-photonics` 定位环境，按[完整 SDK 工作流](../quantum-sdk-workbench/references/workflow.md)执行。模块导航：`perceval`；导航不是 API 白名单。

下文关于模型、门集、输入与预算的限制描述便捷 Tool 的合同；原生 SDK 另受上游版本、可选依赖、宿主资源与用户授权约束。已禁用或被拒绝的动作不能借代码路径绕过。执行状态和科研验收分别报告。
<!-- END NATIVE SDK ACCESS -->


适用于无损、不可区分光子的被动线性光学干涉。Agent 经 Harness 调用 `perceval_local` 的 `simulate_perceval_photonics`；Skill 解释输入和结果，Tool 执行真实 Perceval SLOS 计算。

- `inputOccupation[i]` 是模式 i 的非负整数光子数；真空输入允许。`operations` 按时间顺序应用。
- `BS` 接受两个有序、不同模式；可非相邻。`angleRad` 是 θ，采用 `BS.H(θ)`，矩阵为 `[[cos(θ/2),sin(θ/2)],[sin(θ/2),-cos(θ/2)]]`，θ=π/2 为平衡分束器。适配层通过 SDK `PERM` 显式路由并还原模式。
- `PS` 接受一个模式，以 `exp(i*angleRad)` 改变振幅。所有角度是 rad。
- 输出 `outcomes` 包含固定总光子数下每个 Fock 输出；`occupation[i]` 对应输入模式 i。`unitary[row][column]` 是 `[real,imag]`，输入列到输出行。检查 `totalProbability` 接近 1。
- 先用双光子 HOM 或单光子网络检查角度与模式约定，再分析多光子永久式干涉。只有概率，无采样、损耗、探测器噪声或后选择。
- 规模由调用方选择；Fock 空间组合增长，使用独立的 `execution` 设定资源约束。不得用本地理想概率推断设备保真度。
- 固定依赖需显式执行 `node scripts/setup-paper-tools.mjs perceval-photonics`；调用时不安装依赖，可能产生本地数值库缓存。
- 当前 L1，`scientificValidation=not_evaluated`；成功计算或工程回归不构成科学 Acceptance。

[上游与许可说明](references/UPSTREAM.md)。
