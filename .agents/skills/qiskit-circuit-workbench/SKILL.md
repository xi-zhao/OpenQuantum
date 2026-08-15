---
name: qiskit-circuit-workbench
description: 使用 OpenQuantum 已接入的 Qiskit 与 Qiskit Docs MCP 检查、转换、分析和转译 OpenQASM 3/QPY 量子电路。用于电路静态审查、门数与深度分析、优化等级比较、QASM/QPY 转换、Qiskit API 查证和迁移排错；默认只做本地无凭据工作，不用于提交真实 QPU 任务、估算科研结论或替代科学 Validator。
---

# Qiskit Circuit Workbench

## 工作边界

把这个 Skill 当作量子电路工程工作台，而不是通用量子求解器。默认只使用无凭据的
`qiskit` 与 `qiskit_docs` MCP：

- 读取与导出 OpenQASM 3；
- 在 QASM 3 与 QPY 之间转换；
- 分析电路门数、深度、寄存器和操作；
- 比较 Qiskit 转译优化等级；
- 查证当前 Qiskit 文档、API 和错误码。

不要因为电路能加载、转译或执行就宣称算法正确、物理模型正确或科学验收通过。真实 IBM Runtime、
IBM Transpiler 和社区硬件 MCP 都是独立的可选连接器，只有用户明确要求、设置中心已启用且费用与数据
外发边界已说明时才考虑使用。

## 工作流

1. 先确认输入是 OpenQASM 3、QPY，还是自然语言描述的电路意图。
2. 若只有自然语言意图，先写出最小 OpenQASM 3 草案，并明确量子位、经典位、测量和参数约定。
3. 用 `load_circuit_from_qasm_tool` 解析 QASM；解析失败时保留原始错误，不猜测电路已有效。
4. 用 `analyze_circuit_tool` 取得基线指标。至少记录量子位数、经典位数、深度、门计数和测量。
5. 只有用户要求优化或目标后端约束时才转译：
   - 比较优化等级时调用 `compare_optimization_levels_tool`；
   - 已有明确目标参数时调用 `transpile_circuit_tool`；
   - 比较时保持同一输入和同一目标约束，不混用不可比结果。
6. 需要 QPY/QASM 互换时使用 `convert_qpy_to_qasm3_tool` 或
   `convert_qasm3_to_qpy_tool`；需要最终文本时使用 `export_circuit_to_qasm_tool`。
7. 遇到 API、版本、迁移或错误码不确定时，依次使用 Qiskit Docs MCP 的
   `search_docs_tool`、`get_page_tool`、`lookup_error_code_tool`，以取回页面为准。
8. 输出“输入事实 → 工具结果 → 变更 → 未验证项”，不要把模型推断混进工具事实。

## 审查规则

- 转译前后复核量子位、经典位、测量寄存器与参数是否仍满足用户意图。
- 门数或深度下降不自动代表线路更优；同时报告二比特门、额外 SWAP、目标门集和耦合约束。
- 未指定后端时只做抽象或本地转译，不虚构某台 QPU 的拓扑、校准或可用性。
- 不把 QASM/QPY 内容交给 Python `pickle` 或其他不安全反序列化路径。
- MCP 不可用时说明缺少实测证据，只能给出待验证草案；不得编造工具指标。

## 输出格式

保持简洁并包含：

1. 电路目标与输入格式；
2. 基线指标；
3. 采取的转换或转译；
4. 前后指标与语义检查；
5. 仍需用户或真实后端确认的限制；
6. 若查了文档，附直接页面来源。
