---
name: classiq-synthesis
description: 使用 Classiq 官方 SDK 构建结构化 Qmod 模型，或通过用户自行配置的凭据调用远程综合；区分模型准备、云端综合和量子执行。
---

# Classiq 模型与综合

<!-- BEGIN NATIVE SDK ACCESS -->
## 原生 SDK 路径

本能力同时支持 **Classiq 的原生公开 API**。用户需要 Qmod、自定义模型、综合约束、执行与结果接口 时，由 Agent 在固定依赖环境中编写和运行任务代码，不限于下文便捷 Tool 的预设模型。

使用 `node scripts/sdk-access.mjs inspect classiq-synthesis` 定位环境，按[完整 SDK 工作流](../quantum-sdk-workbench/references/workflow.md)执行。模块导航：`classiq`；导航不是 API 白名单。

本地程序构建与外部调用分开；账户、凭据、费用、设备操作和数据外发沿用宿主及用户授权。原生 SDK 访问不自动启用服务。

原生程序导入库前，按环境定位器的 `bootstrap` 执行启动兼容处理：导入前关闭遥测；综合和执行仍使用上游 API 及用户明确授权。这不限制公开 API，也不替换数值算法。

下文关于模型、门集、输入与预算的限制描述便捷 Tool 的合同；原生 SDK 另受上游版本、可选依赖、宿主资源与用户授权约束。已禁用或被拒绝的动作不能借代码路径绕过。执行状态和科研验收分别报告。
<!-- END NATIVE SDK ACCESS -->


适用于把明确的门序列纳入 Classiq 工作流。`classiq_cloud` 默认关闭；用户按自己的厂商许可显式执行
`node scripts/setup-paper-tools.mjs classiq-synthesis` 并启用连接。依赖固定为 Classiq 1.29.1，
上游 SDK 使用专有评估许可，OpenQuantum 不复制或再分发其源码。

- `prepare_classiq_model` 接受 `numQubits` 与 `gates`，使用真正的 `qfunc`、`allocate`、`create_model` 构建模型，返回 `modelJson`。不需要账户，不调用云综合。
- `synthesize_classiq_circuit` 接受同一结构化门输入，通过官方 SDK 请求远程综合。模型会发送至 Classiq 和服务提供的签名 S3 地址；调用可能消耗额度或产生费用。
- 账号申请、服务许可和 `CLASSIQ_XCH_TOKEN` 由用户自行设置。通过 Harness 凭据引用读取 token，不把值放入 Tool 参数、Skill、模型、配置文件或结果。此版本支持主站 `https://platform.classiq.io` 的非交互 exchange token。
- 控制门首个 target 为控制位，旋转角为弧度；保留输入位编号和空闲位。没有任意 Python/Qmod 源码入口。
- 只调用综合，不申请 shots 或提交量子执行。远端综合产物不代表电路等价性或硬件可用性已经验证。
- `requestTimeoutSeconds` 约束远程综合等待和单次传输；`execution` 控制 worker 的部署资源限制。不自动重试、跳转、登录或取消。超时后先让用户查看账户中的作业状态，避免重复提交。
- SDK telemetry 关闭。厂商错误正文不回传，避免派生 token 或账户信息进入日志。凭据缺失在 SDK 导入和网络请求前失败。
- 当前 L1，`scientificValidation=not_evaluated`。离线协议 fixture 只验证真实 SDK 的传输行为，不证明真实云服务已连通。

参考：[Classiq 官方文档](https://docs.classiq.io/)、[官方安装与注册](https://docs.classiq.io/getting-started/registration_installations/)。
许可依据为固定 `classiq` wheel 的 `LICENSE.txt`；上游示例仓库的许可证不能替代 SDK 许可。
