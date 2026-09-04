---
name: qpanda-qubo
description: 使用 OpenQuantum 通过 Harness MCP Client 注册的 QPanda QUBO Tool，把命名二值目标和线性等式约束编译成 QUBO，或直接求解小规模二次无约束二值优化问题，并用经典暴力枚举复核编译和最优值。用于组合优化/金融建模中的 QUBO 建模、QAOA 变分近似与经典最优解比较；只在本地 CPU 模拟器运行，不连接本源量子云、不提交真实硬件任务，也不替代最终科学 Validator。
---

# QPanda QUBO Workbench

## 工作边界

这个 Skill 负责组织 QUBO 求解工作流，真正的计算由 `qpanda_qubo` MCP Server 暴露并经 Harness MCP Client 注册的 Tool 完成，
底层调用本源官方 `pyqpanda_alg` 的 QUBO 模块（`QuadraticBinary` / `QUBO_QAOA`）。当前只开放
本地、无凭据的求解；首次调用可能由 `uv` 构建固定的 Python 环境（`pyqpanda3` 是原生 wheel）：

- 1–5 个二值变量；
- 可以用变量名、minimize/maximize 目标和最多 4 个线性等式约束建模；每个约束必须显式给出 penalty；
- QUBO 以数值系数给出：`quadratic`（方阵）、可选 `linear`、可选 `constant`；
- `method=traversal` 始终返回经典暴力遍历的确定性最优解；
- `method=qaoa` 额外运行本地 QAOA（`layer` 1–6），返回比特串概率分布。

当前不开放不等式自动松弛、penalty 自动选择、本源量子云、Token、真机任务提交、任意 Python、
sympy 表达式字符串、文件路径或数据集加载。

## 工作流

1. 按用户输入选择下述主动作；主动作会加载固定环境并随结果返回 `packageVersion`，不需要额外的运行时检查调用。
2. 若 Tool 不存在，告诉用户在“设置中心 → 量子组件 → MCP Server 连接”把 **QPanda QUBO** 配置为启用，重启
   OpenQuantum 后再试；不要改用 Bash 绕过设置。
3. 用户给的是业务目标和等式约束时，优先调用 `model_and_solve_qpanda_qubo`。检查
   `constraints.feasible` 和 `penalty.sufficient`；后者失败表示 penalty 太弱，不能把 QUBO 最优解写成
   原约束问题的最优解。
4. 用户已经给出 QUBO 数值时，调用 `solve_qpanda_qubo`：目标是 `x^T Q x + b·x + c`，
   `quadratic` 是 `Q`，`linear` 是 `b`，`constant` 是 `c`。
5. 先用 `method=traversal` 拿到确定性最优解；需要量子近似时再用 `method=qaoa` 并指定 `layer`。
6. 比较 QAOA 概率分布的最高比特串与经典最优解时，注意比特序可能不同，按目标函数值判断而不是
   直接按比特位比较。
7. 输出时区分：用户模型、编译后的 QUBO、上游工具事实、枚举 observations、尚未完成的来源链验收。

## 与其他能力的分工

- 电路层面的构建、转译与文档查询用 `qiskit-circuit-workbench` 或 `tyxonq-workbench`。
- 严格限定的二量子位基态 VQE 与独立验收用 `quantum-ground-state`。
- 真机执行（悟空 QPU）使用默认关闭的 `qpanda_runtime` MCP Server 所暴露的 Tool；本地 QUBO 求解不提交任何云任务。

## 解释规则

- MCP-exposed Tool 成功只代表 `pyqpanda_alg` 本地计算完成，不代表优化结论通过科学验收。
- `classical` 是经典暴力遍历的确定性参考；`checks.objectiveConsistencyError` 只是对目标函数取值
  做的自洽检查，不是独立 Validator。
- 建模工具会枚举全部二值赋值，核对“原目标 + penalty 残差平方”等于编译后 QUBO，并独立比较
  pyqpanda_alg 的经典最小值；这些是 `observations_available`，不自动物化最终 Acceptance。
- `penalty.sufficient=fail` 是模型事实，不是运行错误：提高 penalty 或重新建模后再比较。
- QAOA 结果是变分采样近似，含随机性；不要把一次分布解释为确定性最优。
- Harness MCP Client 连接不可用或 MCP-exposed Tool 返回错误时保留原始错误语义，不编造最优解、分布或版本。

## 输出格式

保持简洁并包含：

1. 原模型、变量顺序与 QUBO 系数摘要；
2. 可行解数量、原问题可行最优解、penalty 是否足够；
3. pyqpanda_alg 经典最优值，以及与独立枚举参考的误差；
4. 若运行 QAOA：`layer`、最高概率比特串与分布要点；
5. `pyqpanda_alg` 版本和 `scientificValidation` 边界。
