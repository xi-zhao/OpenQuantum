---
name: qualtran-resources
description: 用 Google Qualtran 计算加法器、常数比较器和受控寄存器交换的逻辑门资源与可配置 T 等价成本。
---

# Qualtran 算术资源分析

<!-- BEGIN NATIVE SDK ACCESS -->
## 原生 SDK 路径

本能力同时支持 **Qualtran 的原生公开 API**。用户需要 自定义 Bloq、组合、分解、call graph 与符号资源计数 时，由 Agent 在固定依赖环境中编写和运行任务代码，不限于下文便捷 Tool 的预设模型。

使用 `node scripts/sdk-access.mjs inspect qualtran-resources` 定位环境，按[完整 SDK 工作流](../quantum-sdk-workbench/references/workflow.md)执行。模块导航：`qualtran`；导航不是 API 白名单。

下文关于模型、门集、输入与预算的限制描述便捷 Tool 的合同；原生 SDK 另受上游版本、可选依赖、宿主资源与用户授权约束。已禁用或被拒绝的动作不能借代码路径绕过。执行状态和科研验收分别报告。
<!-- END NATIVE SDK ACCESS -->


Agent 经 Harness 调用 `qualtran_local` 提供的 `estimate_qualtran_resources`。适用于分析明确算术子模块的资源，不应把单个 bloq 成本称为完整算法或物理硬件成本。

`operation` 选择 `add`（两个等宽无符号寄存器相加，目标模 2^bitsize）、`less_than_constant`（将 x<constant 的真假 XOR 到 target）或 `controlled_swap`（受控交换两个等宽寄存器）。`bitsize` 是数据寄存器宽度；只有比较操作使用 `constant`，其值必须能由该无符号寄存器表示，其余操作保持 0。

返回 Qualtran `QECGatesCost` 的 T、Toffoli、controlled-swap、temporary-AND、Clifford、rotation、measurement 计数，以及 `QubitCount`。`tEquivalentCount` 使用输入 `tCosts` 的权重换算；默认 temporary-AND、Toffoli 和 controlled-swap 每个按 4 T 记账。这个惯例涉及相应辅助位/测量/分解假设，**不能表述为无辅助位酉 Toffoli 的 4-T 精确分解**。这些 bloq 没有任意旋转，rotation 权重只保留显式统一成本模型。超过 JSON 安全整数范围的结果以十进制字符串保留。

结果不包括纠错码、魔态工厂布局、实际调度或硬件运行。QubitCount 依赖库中的工作空间计数规则，不能直接称为物理量子位数。固定 [Qualtran 0.7.0](https://github.com/quantumlib/Qualtran)（Apache-2.0），上游处于 beta，资源模型与分解可能不完整。

先运行 `node scripts/setup-paper-tools.mjs qualtran-resources` 显式准备固定依赖。计算 Tool 不安装依赖、不连接外部服务；SDK 可能写本地缓存，因此最大副作用登记为 workspace-write。部署时间、输出大小与线程设置使用 `execution`，与方法规模分开。

当前为 L1，`scientificValidation=not_evaluated`。本地数值、协议与 Harness 测试是开发证据；执行成功不等于 central Acceptance Builder 已推导科学验收。
