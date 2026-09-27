---
name: superstaq-compilation
description: 使用 Infleqtion 官方 SDK 在本地序列化电路，或按明确目标调用 Superstaq 远程编译；区分程序准备、服务结果与真实硬件执行。
---

# Superstaq 编译

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
