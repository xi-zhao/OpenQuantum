---
name: qdk-resource-estimation
description: 用 Microsoft QDK 的现代 qdk.qre 对结构化 Q# 电路估算容错量子计算的物理量子位数与运行时间。
---

# QDK 容错资源估算

<!-- BEGIN NATIVE SDK ACCESS -->
## 原生 SDK 路径

本能力同时支持 **QDK 的原生公开 API**。用户需要 Q# 程序、资源模型、误差预算与资源估算接口 时，由 Agent 在固定依赖环境中编写和运行任务代码，不限于下文便捷 Tool 的预设模型。

使用 `node scripts/sdk-access.mjs inspect qdk-resource-estimation` 定位环境，按[完整 SDK 工作流](../quantum-sdk-workbench/references/workflow.md)执行。模块导航：`qdk`；导航不是 API 白名单。

下文关于模型、门集、输入与预算的限制描述便捷 Tool 的合同；原生 SDK 另受上游版本、可选依赖、宿主资源与用户授权约束。已禁用或被拒绝的动作不能借代码路径绕过。执行状态和科研验收分别报告。
<!-- END NATIVE SDK ACCESS -->


Agent 经 Harness 调用 `qdk_local` 提供的 `estimate_qdk_resources`。Tool 接收结构化门列表，内部生成 Q# 的固定语法，并调用现代 `qdk.qre`；不接收任意 Q# 源码或使用已弃用的 `qsharp.estimate`。

先确定逻辑电路 `numQubits`、`gates`，再明确硬件假设：`physicalErrorRate` 为物理操作错误概率，`gateTimeNs`、`measurementTimeNs` 用 ns，`maxError` 为整体估计错误预算，四者都有可读回的默认值。电路支持 H/S/T/X/Y/Z、CX/CZ、RX/RY/RZ，旋转角度用 rad。

模型固定为 `QSharpApplication`、`GateBased`、`SurfaceCode.q() * RoundBasedFactory.q()`，使用固定 QDK 版本的默认 trace transforms 和查询参数域。生成的 Q# 末尾附加 `ResetAll`，其测量/重置成本计入结果。输入不保存或执行外部源码。

返回 `frontier` 中每个方案的 `physicalQubits`、`runtimeNs`、`errorProbability` 与搜索统计。比较方案时同时陈述物理错误率、门时长、纠错和工厂模型。前沿仅在该模型枚举的设计空间内有效，不是所有硬件架构的全局最优解；`feasible=false` 表示本次模型没有找到预算内方案。时间是模型估计，不是实际服务排队时间或硬件测量。

固定 [QDK 1.32.3](https://github.com/microsoft/qdk)（MIT），接口迁移依据 [QREv3](https://github.com/microsoft/qdk/wiki/QREv3)。本工具本地运行，无需 Azure 账号，也不代表 Azure 执行接口已接入。

先运行 `node scripts/setup-paper-tools.mjs qdk-resource-estimation` 显式准备固定依赖。计算 Tool 不安装依赖、不连接外部服务；SDK 可能写本地缓存，因此最大副作用登记为 workspace-write。部署时间、输出大小与线程设置使用 `execution`，与方法规模分开。

当前为 L1，`scientificValidation=not_evaluated`。本地数值、协议与 Harness 测试是开发证据；执行成功不等于 central Acceptance Builder 已推导科学验收。
