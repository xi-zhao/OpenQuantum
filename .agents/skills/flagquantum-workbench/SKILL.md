---
name: flagquantum-workbench
description: 用固定 FlagQuantum 执行电路分析、编译、模拟和参数训练，解释输入语义、独立数值对照、成本与科学边界。
---

# FlagQuantum

这是默认关闭的上游电路工作台。用户需要其 IR、编译、模拟或参数训练方法时，从设置中心启用 `flagquantum` 并准备固定环境。只使用该 server 命名空间中的 Tool，避免与 Qiskit 同名 Tool 混淆。

根据目标选择所需步骤：原始 gate-list QIR 需要 serialize_circuit_tool 转成 IR；分析用 analyze_circuit_tool，优化/路由用 optimize_circuit_tool / route_circuit_tool，需要导出时再用 emit_openqasm_tool / emit_qcis_tool。已有有效 IR 不必重复序列化；仅模拟不要求先优化、路由和导出。输入是 FlagQuantum IR JSON 或 QIR 门列表；OpenQASM 仅输出，不当作可读入格式。示例 QIR：`[{"name":"h","index":[0]},{"name":"cx","index":[0,1]}]`。

本地模拟使用 simulate_circuit_tool，核对 output kind、wire 顺序、precision、shots 和执行模式。先读 describe_gate_set_tool 再选不熟悉的门；训练必须有独立基线。17 个上游 Tool 的成功/失败在结果 `status` 中，不应只看 MCP `isError`。`status=success` 与 accuracy.metric=not_measured 不代表科学验收；实际硬件作业没有通过此连接提交。源服务的 readOnlyHint 只描述计算，启动器首次物化环境会写磁盘，因此 OQ 保守按 workspace-write 登记。

此上游协议没有 `execution` 字段。连接超时由 MCP 设置控制；启动器继承用户配置的数值线程与设备环境（如 `OMP_NUM_THREADS`），不固定为单线程。首调可能物化锁定环境，因此完整调用为 workspace-write。不要把执行成功或参考相符写成最终科学验收。安装、来源与示例见 [候选库接入说明](../../../docs/integrations/CANDIDATE_LIBRARIES.md)。

可按编译、模拟或训练选用[专业工具范围](../../../docs/integrations/CAPABILITY_SELECTION.md#大型可选服务的工具范围)；未选择时保留完整原接口。
