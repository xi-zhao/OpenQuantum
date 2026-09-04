---
name: quantum-ground-state
description: 求解并科学验收用户提供的二量子位实 Pauli Hamiltonian 在固定 hamming-weight=1 扇区内的无噪 statevector VQE 基态。用于给定 Hamiltonian 的扇区基态、VQE 收敛与精确参考比较；不用于从分子几何生成 Hamiltonian、QAOA、shots、噪声、真实量子硬件或多于二量子位的问题。
---

# Quantum Ground State

## 能力边界

这个 Skill 只支持一个窄而可验证的科学主张：对用户提供的二量子位实 Pauli 和，在固定
`hamming-weight=1` 扇区内计算基态能量。执行方法固定为无噪 statevector VQE，并用独立的
实对称 `2×2` 闭式对角化提供参考。

把输入 Hamiltonian 当作用户提供的问题定义，不从名称或标签推断分子来源。
完整边界见 [references/SCOPE.md](references/SCOPE.md)，数值约定见
[references/NUMERICAL-CONVENTIONS.md](references/NUMERICAL-CONVENTIONS.md)。

## 执行工作流

1. 按 [inputs/request.schema.json](inputs/request.schema.json) 检查结构，并由 solver 再做语义 preflight。
2. 明确拒绝 QAOA、Pauli `Y`、复系数、错误单位、其他粒子扇区、更多量子位、shots 和噪声。
3. 普通用户请求调用原生 Tool `solve_and_validate_ground_state`；它在一次确定性调用内生成六类事实并运行独立 Validator。
4. facts-only 求解和已物化 Result Package 重验是内部 solver/Validator 接口，不增加到模型可见 Tool surface。
5. 组合 Tool 自己的 `provenance.complete` 必须保持 `not_checked`；不得伪造 Session、路径或摘要让它通过。
6. OpenQuantum 的可信 Host Plugin 从真实 Session/Tool 身份进入内部 Scientific Result Adapter；
   Materializer 使用 `ctx.fs` 物化、重读和校验 Result Package，Validator 只对重读后的结构化
   证据产生 observations，central Acceptance Builder 再汇聚 Acceptance Profile、observations 和
   provenance 推导科学结论。
7. 需要评分或复现时，分别生成 Score Report 或 Reproduction Report；不得从运行完成推导它们。

本地事实求解命令：

```bash
node scripts/solve.mjs <request.json> <new-output-directory>
```

目标目录中任何同名 Artifact 已存在时必须拒绝覆盖。

## 产物合同

- `problem-spec`
- `hamiltonian-manifest`
- `exact-reference`
- `ground-state-result`
- `convergence-trace`
- `resource-estimate`

六类 Artifact 都是 `additionalProperties: false` 的 JSON 事实对象。不要在其中增加：

- `status`、`score`、`acceptance` 或“已复现”结论；
- Model 的主观置信度；
- 没有来源链的分子/化学主张；
- API key、凭证、绝对路径或 Harness 身份。

## 科学验收规则

权威规则位于
[acceptance-profiles/supplied-pauli-statevector-v1.json](acceptance-profiles/supplied-pauli-statevector-v1.json)。
`1.6 mHa` 只适用于这个 Profile，不是所有体系的普适标准。必须同时检查作用域、canonical digest、
Hermiticity、扇区不变性、精确参考重算、归一化、期望值回放、变分下界、收敛和 provenance。

若 optimizer 未收敛，solver 仍可产生有限事实，但 Validator 必须使必需的 `vqe.converged` 检查失败；
不得把它包装成科学成功。

## 解释要求

对用户解释时明确区分：这是“给定 Hamiltonian 的扇区基态”，不是完整的分子 Hamiltonian/FCI 工作流。
Model 可以解释 Result/Report，但不能修改中央 Acceptance Builder 基于 Validator observations、Profile 和
来源链推导的结论。
