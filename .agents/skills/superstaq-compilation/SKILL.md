---
name: superstaq-compilation
description: 使用 Infleqtion 官方 SDK 在本地序列化电路，或按明确目标调用 Superstaq 远程编译；区分程序准备、服务结果与真实硬件执行。
---

# Superstaq 编译

<!-- BEGIN NATIVE SDK ACCESS -->
## 原生 SDK 路径

本能力同时支持 **Qiskit Superstaq 的原生公开 API**。用户需要 自定义电路、编译选项、targets、provider 与执行结果 时，由 Agent 在固定依赖环境中编写和运行任务代码，不限于下文便捷 Tool 的预设模型。

使用 `node scripts/sdk-access.mjs inspect superstaq-compilation` 定位环境，按[完整 SDK 工作流](../quantum-sdk-workbench/references/workflow.md)执行。模块导航：`qiskit_superstaq`；导航不是 API 白名单。

本地程序构建与外部调用分开；账户、凭据、费用、设备操作和数据外发沿用宿主及用户授权。原生 SDK 访问不自动启用服务。

下文关于模型、门集、输入与预算的限制描述便捷 Tool 的合同；原生 SDK 另受上游版本、可选依赖、宿主资源与用户授权约束。已禁用或被拒绝的动作不能借代码路径绕过。执行状态和科研验收分别报告。
<!-- END NATIVE SDK ACCESS -->


`superstaq_cloud` 默认关闭。先运行 `node scripts/setup-paper-tools.mjs superstaq-compilation`，
再在设置中心按需启用连接。凭据只通过 Harness 的 `SUPERSTAQ_API_KEY` 引用，不进入 Tool 参数。

- `prepare_superstaq_circuit`：无凭据本地准备结构化电路并做官方 QPY 序列化回读；不是目标编译。
- `list_superstaq_targets`：按账户查询服务支持编译的目标。返回的可用性只代表查询时刻。
- `compile_superstaq_circuit`：用户明确选择目标并授权远程编译后，外发电路到官方服务；可能消耗账户额度或产生服务费用。
  返回原生编译后的 QPY、可导出时的 QASM，以及初始/最终逻辑位到物理位映射。
- 输入门序列使用 `numQubits` 和 `gates`，旋转角单位为弧度。控制门的第一个 target 为控制位。
- 远程端点固定为官方 HTTPS API，不接受用户 URL，不自动加载其他厂商凭据，不重试、不跟随重定向。
- `requestTimeoutSeconds` 控制单次 HTTP 超时，`execution` 控制整个 worker。超时不能证明服务端未处理请求。
- 此能力不提交 shots、不运行或取消 QPU 作业。编译成功不等于电路等价性已独立验证。
- 当前 L1，`scientificValidation=not_evaluated`。没有真实账户调用证据时只能报告本地与协议测试通过。
