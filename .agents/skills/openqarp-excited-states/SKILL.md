---
name: openqarp-excited-states
description: 用固定 OpenQARP 执行VQD 激发态、残差与正交性，解释输入语义、独立数值对照、成本与科学边界。
---

# OpenQARP

<!-- BEGIN NATIVE SDK ACCESS -->
## 原生 SDK 路径

本能力同时支持 **OpenQARP 的原生公开 API**。用户需要 自定义算符、ansatz、引擎、优化器与算法对象 时，由 Agent 在固定依赖环境中编写和运行任务代码，不限于下文便捷 Tool 的预设模型。

使用 `node scripts/sdk-access.mjs inspect openqarp-excited-states` 定位环境，按[完整 SDK 工作流](../quantum-sdk-workbench/references/workflow.md)执行。模块导航：`qarp`；导航不是 API 白名单。

下文关于模型、门集、输入与预算的限制描述便捷 Tool 的合同；原生 SDK 另受上游版本、可选依赖、宿主资源与用户授权约束。已禁用或被拒绝的动作不能借代码路径绕过。执行状态和科研验收分别报告。
<!-- END NATIVE SDK ACCESS -->


相近入口、后端准备与位序差异按[共同选择说明](../../../docs/integrations/CAPABILITY_SELECTION.md)判断。

确认 Hermitian 实系数 Pauli Hamiltonian（最左字符 q0，q0 是最低有效位）、所求态数、复数 HEA 层数和迭代预算，调用 `solve_openqarp_vqd`。自动 penalty 严格高于保守谱宽。态保持 deflation 顺序，不通过排序掩盖重复态或激发态错误。

同时查看 optimizer.success/message、独立重算能量、残差方差、态间重叠和可选精确谱。优化器成功不是正确激发态的证明；失败也不自动意味着能量误差大。`referenceMode=skip` 仅跳过精确谱，独立态/Pauli重算仍执行。

资源由用户选择，通过 `execution.timeoutMs`、`maxOutputBytes`、`threads` 控制进程；依赖须显式准备；计算仍可能写 SDK 缓存，保留 workspace-write。不要把执行成功或参考相符写成最终科学验收。安装、来源与示例见 [候选库接入说明](../../../docs/integrations/CANDIDATE_LIBRARIES.md)。

## 依赖准备

运行前执行 `node scripts/setup-paper-tools.mjs openqarp-excited-states`。缺失、旧锁和已安装环境的处理见[共同准备说明](../../../docs/integrations/LOCAL_ENVIRONMENTS.md)；Tool 不自动安装或升级依赖。
