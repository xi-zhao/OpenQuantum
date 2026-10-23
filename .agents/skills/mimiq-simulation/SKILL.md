---
name: mimiq-simulation
description: 使用 QPerfect MIMIQ Exaqt 的本地态矢量引擎执行结构化无噪声电路，返回精确概率、复振幅与可选有种子的采样。
---

# MIMIQ Exaqt 本地电路

<!-- BEGIN NATIVE SDK ACCESS -->
## 原生 SDK 路径

本能力同时支持 **MIMIQ 的原生公开 API**。用户需要 任意电路、指令、噪声、模拟器与远程接口 时，由 Agent 在固定依赖环境中编写和运行任务代码，不限于下文便捷 Tool 的预设模型。

使用 `node scripts/sdk-access.mjs inspect mimiq-simulation` 定位环境，按[完整 SDK 工作流](../quantum-sdk-workbench/references/workflow.md)执行。模块导航：`mimiqcircuits`、`exaqt`；导航不是 API 白名单。

原生 Exaqt 目标有限；MIMIQ 远程服务、许可证和二进制平台分别核实。

下文关于模型、门集、输入与预算的限制描述便捷 Tool 的合同；原生 SDK 另受上游版本、可选依赖、宿主资源与用户授权约束。已禁用或被拒绝的动作不能借代码路径绕过。执行状态和科研验收分别报告。
<!-- END NATIVE SDK ACCESS -->


Agent 经 Harness 调用 `mimiq_local` 的 `simulate_mimiq_circuit`。使用本地 ExaqtSV 引擎，适合检查理想门电路和采样分布；不代表 MIMIQ 远程服务或 TensorWeaver 已接入。

输入 `numQubits` 和门序列，初态为全零。支持 H/S/T/X/Y/Z/CX/CZ/RX/RY/RZ，旋转角以弧度表示。`shots=0` 只返回态矢量；大于 0 时按 `seed` 用 Exaqt RNG 采样。概率及复振幅按计算基字典序排列，**最左侧 bit 是 qubit 0**；适配层显式从 Exaqt 的小端索引转换。输出包括所有振幅、概率、范数与采样 counts，因此内存和输出随量子位指数增长；`execution` 可设置资源预算。

选择 `probabilities` 作理想结果，选择 `counts` 作有限采样结果，不把无 shots 噪声等同于没有浮点误差。没有噪声模型、测量反馈或真实硬件证据。固定 [mimiq-exaqt 0.3.0](https://docs.qperfect.io/exaqt-python/)；供应方公开 wheel 未附明确许可证信息，作为按需安装的外部依赖，不随 OpenQuantum 分发 SDK 二进制或声称它是开源组件。

先按供应方条款运行 `node scripts/setup-paper-tools.mjs mimiq-simulation` 并启用连接。公开 wheel 支持 Apple Silicon macOS、Linux x86_64（glibc 2.34+）和 Windows x86_64；没有兼容 wheel 时清楚失败。调用不安装、不创建云连接、不接收凭据；SDK 缓存副作用保守登记为 workspace-write。

当前 L1，`scientificValidation=not_evaluated`。固定 SDK 数值与协议测试是工程证据，不是 central Acceptance Builder 推导的验收。
