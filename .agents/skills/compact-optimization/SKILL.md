---
name: compact-optimization
description: 用固定 Compact 执行线路优化与独立等价对照，解释输入语义、独立数值对照、成本与科学边界。
---

# Compact

<!-- BEGIN NATIVE SDK ACCESS -->
## 原生 SDK 路径

本能力同时支持 **CompactQ 的原生公开 API**。用户需要 自定义电路、编译优化策略与结果检查 时，由 Agent 在固定依赖环境中编写和运行任务代码，不限于下文便捷 Tool 的预设模型。

使用 `node scripts/sdk-access.mjs inspect compact-optimization` 定位环境，按[完整 SDK 工作流](../quantum-sdk-workbench/references/workflow.md)执行。模块导航：`compactq`；导航不是 API 白名单。

下文关于模型、门集、输入与预算的限制描述便捷 Tool 的合同；原生 SDK 另受上游版本、可选依赖、宿主资源与用户授权约束。已禁用或被拒绝的动作不能借代码路径绕过。执行状态和科研验收分别报告。
<!-- END NATIVE SDK ACCESS -->


确认无测量、reset、动态控制或噪声的门列表，调用 `optimize_compact_circuit`。比较优化前后原生二比特门数量，以及相同 u/cx 基底的 CX 数；抽象 CP 替代两个 CX 不一定节省硬件成本。

`referenceMode=auto|required|skip` 决定独立全酉参考；默认小系统计算，required 显式请求更大参考。上游 verification tier 只作诊断，独立对照不符则 Tool 返回错误、用户原输入保留。未做独立参考时输出只是待检查候选。当前不开放 ECR/iSWAP；固定上游验证器的反例在开发回归中保留。

资源由用户选择，通过 `execution.timeoutMs`、`maxOutputBytes`、`threads` 控制进程；依赖须显式准备；计算仍可能写 SDK 缓存，保留 workspace-write。不要把执行成功或参考相符写成最终科学验收。安装、来源与示例见 [候选库接入说明](../../../docs/integrations/CANDIDATE_LIBRARIES.md)。

## 依赖准备

运行前执行 `node scripts/setup-paper-tools.mjs compact-optimization`。缺失、旧锁和已安装环境的处理见[共同准备说明](../../../docs/integrations/LOCAL_ENVIRONMENTS.md)；Tool 不自动安装或升级依赖。
