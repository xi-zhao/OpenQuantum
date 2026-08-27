---
name: tyxonq-workbench
description: 使用 OpenQuantum 通过 Harness MCP Client 注册的 TyxonQ Tool 构建并运行有界量子电路，比较无噪声 statevector 与 density-matrix 噪声采样结果。用于 TyxonQ 电路验证、Bell/GHZ 等小规模态制备、采样分布和退极化/振幅阻尼/相位阻尼/Pauli 噪声分析；不用于真实量子硬件、云任务、任意 Python 执行或替代独立科学 Validator。
---

# TyxonQ Workbench

## 工作边界

这个 Skill 负责组织 TyxonQ 工作流，真正的计算由 `tyxonq_local` MCP Server 暴露并经 Harness MCP Client 注册的 Tool 完成。
当前只开放本地、无凭据的电路仿真；首次调用可能由 `uv` 下载固定依赖，实际计算不连接 TyxonQ
云端 Provider：

- 1–8 个量子位；
- 至多 64 个受控门操作；
- 精确 statevector，或至多 8192 shots 的采样；
- 可选 density-matrix 噪声：depolarizing、amplitude damping、phase damping、Pauli。

当前不开放 TyxonQ 云端 Provider、Token、任务提交、查询或取消，也不开放任意 Python、文件路径、
自定义矩阵和未审查的脉冲程序。

## 工作流

1. 先调用 `inspect_tyxonq_runtime`，确认固定的 TyxonQ 版本和本地能力已经可用。
2. 若 Tool 不存在，告诉用户在“设置中心 → 量子组件 → MCP Server 连接”把 **TyxonQ Local** 配置为启用，重启
   OpenQuantum 后再试；不要改用 Bash 绕过设置。
3. 把用户意图整理成明确的 `numQubits` 与 `operations`。只使用 Tool schema 支持的门，旋转角单位为弧度。
4. 需要确定性态矢和概率时使用 `mode=exact`；需要有限 shots 或噪声时使用 `mode=sampled`。
5. 比较噪声前后时保持电路和 shots 不变，分别运行无噪声与有噪声请求，再比较返回分布。
6. 输出时区分：用户输入、TyxonQ 工具事实、工程检查和未完成的科学验收。

## 与其他能力的分工

- OpenQASM/QPY 解析、转译和 Qiskit 文档查询优先使用 `qiskit-circuit-workbench`。
- 严格限定的二量子位基态 VQE 与独立验收使用 `quantum-ground-state`。
- 真实后端发现使用 `fieldqkit-hardware`；任何付费或真实硬件任务仍需独立 Tool Provider 与 Harness 审批。
- TyxonQ 脉冲/TQASM 和量子化学能力尚未进入本地稳定 Interface，不要声称当前工具已经支持。

## 解释规则

- MCP-exposed Tool 成功只代表 TyxonQ 本地计算完成，不代表算法、物理模型或科研结论通过科学验收。
- `checks` 是对返回结构做的工程一致性检查，不是独立 Validator。
- sampled 结果包含随机波动；比较时报告 shots，不把一次频数差异解释为确定性物理效应。
- 噪声模型是 TyxonQ 本地模拟假设，不等于某台真实 QPU 的校准模型。
- Harness MCP Client 连接不可用或 MCP-exposed Tool 返回错误时保留原始错误语义，不编造状态、概率或版本。

## 输出格式

保持简洁并包含：

1. 电路规模和门序列摘要；
2. exact 或 sampled 执行方式、shots 和噪声假设；
3. 主要概率/频数与结构检查；
4. TyxonQ 版本；
5. `scientificValidation=not_evaluated` 及仍需独立验证的限制。
