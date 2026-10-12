---
name: myqlm-simulation
description: 使用 Bull myQLM 的显式本地 PyLinalg 模拟器计算结构化无噪声门电路的完整复振幅和概率。
---

# myQLM 本地门电路

<!-- BEGIN NATIVE SDK ACCESS -->
## 原生 SDK 路径

本能力同时支持 **myQLM 的原生公开 API**。用户需要 AQASM、自定义程序、job、QPU、插件与计算栈 时，由 Agent 在固定依赖环境中编写和运行任务代码，不限于下文便捷 Tool 的预设模型。

使用 `node scripts/sdk-access.mjs inspect myqlm-simulation` 定位环境，按[完整 SDK 工作流](../quantum-sdk-workbench/references/workflow.md)执行。模块导航：`qat.lang`、`qat.qpus`；导航不是 API 白名单。

myQLM 按上游 EULA 使用；不能视为 OQC 的同名 qat 包，两者环境必须隔离。

下文关于模型、门集、输入与预算的限制描述便捷 Tool 的合同；原生 SDK 另受上游版本、可选依赖、宿主资源与用户授权约束。已禁用或被拒绝的动作不能借代码路径绕过。执行状态和科研验收分别报告。
<!-- END NATIVE SDK ACCESS -->


Agent 经 Harness 调用 `myqlm_local` 的 `simulate_myqlm_circuit`。用于理想门模型与跨 SDK 数值对照；不把本地模拟器称为 Qaptiva 设备或量子处理器执行。

输入 `numQubits`、H/S/T/X/Y/Z/CX/CZ/RX/RY/RZ 门序列，初态为全零，旋转角为弧度。输出完整 `amplitudes` 和 `probabilities` 按计算基字典序排列，最左侧 bit 为 qubit 0，`norm` 可检查归一化。使用 `nbshots=0` 和零振幅筛选阈值取得无抽样噪声结果；仍受浮点误差影响，规模受实际内存与输出预算约束。

适配显式创建 `PyLinalg`，不调用默认 QPU 工厂，避免用户的远程 QPU 配置影响本地动作。没有硬件、云、模拟哈密顿量或退火任务。需要这些方法时另选已有能力。

固定 [myQLM 1.13.7](https://myqlm.github.io/)；myQLM 由供应方 EULA 管理，按需安装、默认关闭，不随仓库附带 SDK。先运行 `node scripts/setup-paper-tools.mjs myqlm-simulation` 再启用连接，调用不安装依赖、不接受令牌和任意代码。SDK 缓存使最大副作用登记为 workspace-write；`execution` 保留线程、超时、输出预算设置。

当前为 L1，`scientificValidation=not_evaluated`。开发期独立稠密矩阵和 MCP 检查不等于最终科学验收。
