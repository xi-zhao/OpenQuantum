---
name: qpanda-qubo
description: 使用 OpenQuantum 的 QPanda QUBO 本地 MCP 求解小规模二次无约束二值优化（QUBO）问题，并用经典暴力遍历作为独立参考。用于组合优化/金融建模中的 QUBO 求解、QAOA 变分近似与经典最优解比较；调用上游 pyqpanda_alg 的 QUBO 算法，只在本地 CPU 模拟器运行，不连接本源量子云、不提交真实硬件任务，也不替代独立科学 Validator。
---

# QPanda QUBO Workbench

## 工作边界

这个 Skill 负责组织 QUBO 求解工作流，真正的计算由独立注册的 `qpanda_qubo` MCP 完成，
底层调用本源官方 `pyqpanda_alg` 的 QUBO 模块（`QuadraticBinary` / `QUBO_QAOA`）。当前只开放
本地、无凭据的求解；首次调用可能由 `uv` 构建固定的 Python 环境（`pyqpanda3` 是原生 wheel）：

- 1–5 个二值变量；
- QUBO 以数值系数给出：`quadratic`（方阵）、可选 `linear`、可选 `constant`；
- `method=traversal` 始终返回经典暴力遍历的确定性最优解；
- `method=qaoa` 额外运行本地 QAOA（`layer` 1–6），返回比特串概率分布。

当前不开放本源量子云、Token、真机任务提交、任意 Python、sympy 表达式字符串、文件路径或
数据集加载。

## 工作流

1. 先调用 `inspect_qpanda_qubo_runtime`，确认 `pyqpanda_alg` 版本和本地能力可用。
2. 若工具不存在，告诉用户在“设置 → 量子组件 → MCP 组件”启用 **QPanda QUBO**，重启
   OpenQuantum 后再试；不要改用 Bash 绕过设置。
3. 把优化问题整理成 QUBO 数值形式：目标 `x^T Q x + b·x + c`（x 为二值向量）。`quadratic` 是
   `Q`（方阵），`linear` 是 `b`，`constant` 是 `c`。
4. 先用 `method=traversal` 拿到确定性最优解；需要量子近似时再用 `method=qaoa` 并指定 `layer`。
5. 比较 QAOA 概率分布的最高比特串与经典最优解时，注意比特序可能不同，按目标函数值判断而不是
   直接按比特位比较。
6. 输出时区分：用户输入、上游工具事实、工程一致性检查、尚未完成的科学验收。

## 与其他能力的分工

- 电路层面的构建、转译与文档查询用 `qiskit-circuit-workbench` 或 `tyxonq-workbench`。
- 严格限定的二量子位基态 VQE 与独立验收用 `quantum-ground-state`。
- 真机执行（悟空 QPU）用默认关闭的 `qpanda_runtime` MCP；本地 QUBO 求解不提交任何云任务。

## 解释规则

- MCP 成功只代表 `pyqpanda_alg` 本地计算完成，不代表优化结论通过科学验收。
- `classical` 是经典暴力遍历的确定性参考；`checks.objectiveConsistencyError` 只是对目标函数取值
  做的自洽检查，不是独立 Validator。
- QAOA 结果是变分采样近似，含随机性；不要把一次分布解释为确定性最优。
- MCP 不可用或返回错误时保留原始错误语义，不编造最优解、分布或版本。

## 输出格式

保持简洁并包含：

1. QUBO 规模（变量数、key/result 量子位）与系数摘要；
2. 经典最优解（assignment 与最小值）；
3. 若运行 QAOA：`layer`、最高概率比特串与分布要点；
4. `pyqpanda_alg` 版本；
5. `scientificValidation=not_evaluated` 及仍需独立验证的限制。
