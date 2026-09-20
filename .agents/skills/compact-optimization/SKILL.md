---
name: compact-optimization
description: 用固定 Compact 执行线路优化与独立等价对照，解释输入语义、独立数值对照、成本与科学边界。
---

# Compact

确认无测量、reset、动态控制或噪声的门列表，调用 `optimize_compact_circuit`。比较优化前后原生二比特门数量，以及相同 u/cx 基底的 CX 数；抽象 CP 替代两个 CX 不一定节省硬件成本。

`referenceMode=auto|required|skip` 决定独立全酉参考；默认小系统计算，required 显式请求更大参考。上游 verification tier 只作诊断，独立对照不符则 Tool 返回错误、用户原输入保留。未做独立参考时输出只是待检查候选。当前不开放 ECR/iSWAP；固定上游验证器的反例在开发回归中保留。

资源由用户选择，通过 `execution.timeoutMs`、`maxOutputBytes`、`threads` 控制进程；首调可能物化锁定环境，因此完整调用为 workspace-write。不要把执行成功或参考相符写成最终科学验收。安装、来源与示例见 [候选库接入说明](../../../docs/integrations/CANDIDATE_LIBRARIES.md)。
