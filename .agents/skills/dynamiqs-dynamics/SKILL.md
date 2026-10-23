---
name: dynamiqs-dynamics
description: 用固定 Dynamiqs 计算受驱动耗散单量子位的动力学、驱动批量扫描和末态人口梯度，并与独立 Lindblad 解及有限差分比较。
---

# Dynamiqs 动力学与梯度

<!-- BEGIN NATIVE SDK ACCESS -->
## 原生 SDK 路径

本能力同时支持 **Dynamiqs 的原生公开 API**。用户需要 任意维数与复合系统、时变算符、sesolve、mesolve、批处理与自动微分 时，由 Agent 在固定依赖环境中编写和运行任务代码，不限于下文便捷 Tool 的预设模型。

使用 `node scripts/sdk-access.mjs inspect dynamiqs-dynamics` 定位环境，按[完整 SDK 工作流](../quantum-sdk-workbench/references/workflow.md)执行。模块导航：`dynamiqs`、`jax`；导航不是 API 白名单。

显式选择 JAX 数值精度和 target；需要 float64 时在建立数组前启用 jax_enable_x64。CPU、GPU 选择按任务与已安装后端决定。

下文关于模型、门集、输入与预算的限制描述便捷 Tool 的合同；原生 SDK 另受上游版本、可选依赖、宿主资源与用户授权约束。已禁用或被拒绝的动作不能借代码路径绕过。执行状态和科研验收分别报告。
<!-- END NATIVE SDK ACCESS -->


通过 Harness 注册的 `dynamiqs_local.simulate_dynamiqs_dynamics` 执行。适用于研究驱动、失谐和振幅衰减怎样影响单量子位人口；模型为单量子位恒定驱动，计算设备由已安装的 JAX 后端与用户环境选择。

- 模型为 `H=(drive X+detuning Z)/2`、`L=sqrt(gamma)|0><1|`，`hbar=1`。用户选择一致的时间单位，驱动和失谐使用相应角频率；不要混用 Hz 与 rad/s。
- `drives` 指定驱动幅度批次；初态 `ground/excited/plus` 指计算基态、激发态或 X 正本征态。衰减率非负，时长与时间网格由输入决定。
- Tool 返回每条人口轨迹、末态人口对驱动的梯度、可选独立 SciPy 参考和有限差分偏差。说明梯度是固定失谐、衰减率和时长下的局部灵敏度；不能据此宣称找到最优控制。
- 解释结果时同时查看状态迹、最小本征值和两类偏差。明显不一致时报告数值问题，不把成功返回当成正确。
- 当前仅 L1，`scientificValidation=not_evaluated`。依赖须显式准备；计算可能写本地缓存；无 QPU、凭据或数据外发接口。

版本、安装与证据见 [接入说明](../../../docs/integrations/UNITARY_ECOSYSTEM.md)。

独立参考使用 `referenceMode=auto|required|skip`：auto 按默认阈值选择参考，required 使用调用方资源尝试所请求规模，skip 跳过。未执行时 `reference.status=not_run`，参考值和差异为 null；尝试后失败会返回错误。

单量子位模型的驱动批次、演化时间和时间网格由调用方选择，适配器不额外设置人工规模上限。具体资源配置见[本地计算说明](../../../docs/integrations/SCALABLE_BRIDGES.md)。

## 依赖准备

运行前执行 `node scripts/setup-paper-tools.mjs dynamiqs-dynamics`。缺失、旧锁和已安装环境的处理见[共同准备说明](../../../docs/integrations/LOCAL_ENVIRONMENTS.md)；Tool 不自动安装或升级依赖。
