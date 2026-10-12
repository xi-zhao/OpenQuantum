---
name: aqt-workbench
description: 官方离子阱后端本地编译与仿真，以及用户鉴权后的设备查询。
---


<!-- BEGIN NATIVE SDK ACCESS -->
## 原生 SDK 路径

本能力同时支持 **AQT Provider 的原生公开 API**。用户需要 本地与远程 provider、电路、设备模型与 job 时，由 Agent 在固定依赖环境中编写和运行任务代码，不限于下文便捷 Tool 的预设模型。

使用 `node scripts/sdk-access.mjs inspect aqt-workbench` 定位环境，按[完整 SDK 工作流](../quantum-sdk-workbench/references/workflow.md)执行。模块导航：`qiskit_aqt_provider`；导航不是 API 白名单。

本地程序构建与外部调用分开；账户、凭据、费用、设备操作和数据外发沿用宿主及用户授权。原生 SDK 访问不自动启用服务。

下文关于模型、门集、输入与预算的限制描述便捷 Tool 的合同；原生 SDK 另受上游版本、可选依赖、宿主资源与用户授权约束。已禁用或被拒绝的动作不能借代码路径绕过。执行状态和科研验收分别报告。
<!-- END NATIVE SDK ACCESS -->

使用 `aqt_local.simulate_aqt_circuit` 将结构化电路编译到官方 AQT 原生门后，在 SDK 离线后端采样。角度为弧度，输出位串从 q[n-1] 到 q[0]；可选择 SDK 示例去极化噪声。先核对 shots 总数与门集，再解释概率的采样误差。SDK 本身限制每个作业不超过 20 比特、2000 shots，超出会明确失败。

需要云设备时调用 `aqt_local.list_aqt_devices`，用户在设置中保存 `AQT_API_TOKEN`。缺凭据立即失败，设备发现不表示 QPU 执行已验证。离线动作从不读取该令牌，不登录、不读取 .env；此能力不提交 AQT 云任务。

环境需预先显式准备：`node scripts/setup-paper-tools.mjs aqt-workbench`。Tool 调用不安装依赖。所有结果为 L1 / `scientificValidation=not_evaluated`；SDK 本地或传输夹具检查不等于真实账户连通、硬件运行或科学验收。

来源：[qiskit-aqt-provider 1.15.0](https://github.com/qiskit-community/qiskit-aqt-provider)。
