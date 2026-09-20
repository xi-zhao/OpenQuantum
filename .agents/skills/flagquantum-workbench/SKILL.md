---
name: flagquantum-workbench
description: 用固定 FlagQuantum 执行第二家量子 MCP 电路工作台，解释输入语义、独立数值对照、成本与科学边界。
---

# FlagQuantum

这是默认关闭的第二家上游量子 MCP。用户需要对照时，从设置中心启用 `flagquantum` 并准备固定环境。只使用该 server 命名空间中的 Tool，避免与 Qiskit 同名 Tool 混淆。

按 gate-list QIR → serialize_circuit_tool → analyze_circuit_tool → 按意图 optimize_circuit_tool / route_circuit_tool → emit_openqasm_tool / emit_qcis_tool 的顺序工作。输入是 FlagQuantum IR JSON 或 QIR 门列表；OpenQASM 仅输出，不当作可读入格式。示例 QIR：`[{"name":"h","index":[0]},{"name":"cx","index":[0,1]}]`。

本地模拟使用 simulate_circuit_tool，核对 output kind、wire 顺序、precision、shots 和执行模式。先读 describe_gate_set_tool 再选不熟悉的门；训练必须有独立基线。17 个上游 Tool 的成功/失败在结果 `status` 中，不应只看 MCP `isError`。`status=success` 与 accuracy.metric=not_measured 不代表科学验收；实际硬件作业没有通过此连接提交。源服务的 readOnlyHint 只描述计算，启动器首次物化环境会写磁盘，因此 OQ 保守按 workspace-write 登记。

资源由用户选择，通过 `execution.timeoutMs`、`maxOutputBytes`、`threads` 控制进程；首调可能物化锁定环境，因此完整调用为 workspace-write。不要把执行成功或参考相符写成最终科学验收。安装、来源与示例见 [候选库接入说明](../../../docs/integrations/CANDIDATE_LIBRARIES.md)。
