---
name: quantuminspire-cloud
description: 通过官方 SDK 分页查询设备与既有任务状态。
---


<!-- BEGIN NATIVE SDK ACCESS -->
## 原生 SDK 路径

本能力同时支持 **Quantum Inspire 的原生公开 API**。用户需要 上游 SDK 认证、平台、程序、job 与结果接口 时，由 Agent 在固定依赖环境中编写和运行任务代码，不限于下文便捷 Tool 的预设模型。

使用 `node scripts/sdk-access.mjs inspect quantuminspire-cloud` 定位环境，按[完整 SDK 工作流](../quantum-sdk-workbench/references/workflow.md)执行。模块导航：`quantuminspire`；导航不是 API 白名单。

本地程序构建与外部调用分开；账户、凭据、费用、设备操作和数据外发沿用宿主及用户授权。原生 SDK 访问不自动启用服务。

下文关于模型、门集、输入与预算的限制描述便捷 Tool 的合同；原生 SDK 另受上游版本、可选依赖、宿主资源与用户授权约束。已禁用或被拒绝的动作不能借代码路径绕过。执行状态和科研验收分别报告。
<!-- END NATIVE SDK ACCESS -->

用户通过设置保存 `QUANTUMINSPIRE_API_TOKEN` 后，用 `quantuminspire_cloud.query_quantum_inspire` 分页查询后端，或以 jobId 查询已有任务状态。后端列表返回 page/pageSize/total，读取后续页需显式指定页码；服务的单页上限为 100。

仅访问固定 Quantum Inspire HTTPS 服务；不打开登录网页，不读取或写入 ~/.quantuminspire，不自动刷新 Token。过期 Token 由用户更新。结果仅含所需状态和设备字段，不返回服务原始异常、日志或鉴权资料。本能力不提交、取消或轮询任务，网络编程仿真用既有 NetQASM 或 SimQN 能力。

环境需预先显式准备：`node scripts/setup-paper-tools.mjs quantuminspire-cloud`。Tool 调用不安装依赖。所有结果为 L1 / `scientificValidation=not_evaluated`；SDK 本地或传输夹具检查不等于真实账户连通、硬件运行或科学验收。

来源：[quantuminspire 4.1.0](https://github.com/QuTech-Delft/quantuminspire)。
