---
name: mrmustard-optics
description: 用固定 MrMustard 计算真空经高斯光学门与衰减后的相空间矩、光子数和显式截断的 Fock 概率。
---

# MrMustard 连续变量光学

<!-- BEGIN NATIVE SDK ACCESS -->
## 原生 SDK 路径

本能力同时支持 **MrMustard 的原生公开 API**。用户需要 任意连续变量态、门、信道、参数与优化 时，由 Agent 在固定依赖环境中编写和运行任务代码，不限于下文便捷 Tool 的预设模型。

使用 `node scripts/sdk-access.mjs inspect mrmustard-optics` 定位环境，按[完整 SDK 工作流](../quantum-sdk-workbench/references/workflow.md)执行。模块导航：`mrmustard`；导航不是 API 白名单。

固定 Python 3.11 / TensorFlow 2.15 环境；原生 wheel 与目标平台兼容性需核验。

下文关于模型、门集、输入与预算的限制描述便捷 Tool 的合同；原生 SDK 另受上游版本、可选依赖、宿主资源与用户授权约束。已禁用或被拒绝的动作不能借代码路径绕过。执行状态和科研验收分别报告。
<!-- END NATIVE SDK ACCESS -->


Agent 经 Harness 调用 `mrmustard_local` 的 `simulate_mrmustard_optics`。适合相干、压缩、双模关联和线性光学模型；有确定光子数输入时优先选 Perceval/Lightworks，需要可微 Fock 层时选 MerLin。

输入 `numModes`、操作序列和每模式的 `cutoff`。初态为真空。`D` 使用 `x,y`，对应复位移 `alpha=x+iy`；`S` 与 `S2` 使用非负压缩量 `r` 和相位 `phi`；`R` 使用 `theta`；`BS` 使用 `theta,phi`，幅度混合的系数为 cos(theta)、sin(theta)；`LOSS` 使用 `[0,1]` 的 `transmissivity`。角度均为弧度，模式从 0 编号。两个模式的门接受任意不同模式。

`hbar=2`，真空协方差为单位阵；输出的 quadrature 顺序是所有 x 后接所有 p。相空间均值、协方差和 `meanPhotons` 不使用 Fock 截断。`fockProbabilities` 只包含各模式 0 到 cutoff−1 的占据数，并保留原始概率；`retainedProbability` 是其总质量，不做归一化掩盖截断。判断分布前检查该值并按需要增大 cutoff，输出规模为 cutoff^numModes。浮点舍入可能使极小概率或总和略偏离物理范围，不能把它当成新物理。

固定 [MrMustard 0.7.3](https://github.com/XanaduAI/MrMustard)（Apache-2.0）。上游仓库已于 2026-07-29 归档，因此按需启用该兼容接口；不是仍受上游维护的承诺。本接口不开放训练、非高斯初态、测量条件化或硬件控制。

先显式运行 `node scripts/setup-paper-tools.mjs mrmustard-optics` 准备 Python 3.11 固定环境，再启用连接。调用不安装依赖，不连接远程服务；SDK 编译/缓存可能写本地文件，最大副作用为 workspace-write。部署线程、超时、输出预算使用 `execution`，不作为物理参数上限。

当前为 L1；结果 `scientificValidation=not_evaluated`。数值回归与 MCP 测试不替代 central Acceptance Builder 的科学验收。
