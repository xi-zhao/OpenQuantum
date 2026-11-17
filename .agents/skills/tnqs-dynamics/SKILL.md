---
name: tnqs-dynamics
description: 使用 TensorNetworkQuantumSimulator.jl 的公开 Julia API 研究任意图张量网络、电路与时间演化，在有效平面嵌入上使用 CTMRG，并核对采样权重及近似误差。
---

# 非规则图张量网络

<!-- BEGIN NATIVE SDK ACCESS -->
## 原生 SDK 路径

本能力使用 **TensorNetworkQuantumSimulator.jl 的原生公开 API**。用户需要 非规则图张量网络、电路、时间演化、平面 CTMRG 与采样 时，由 Agent 在固定依赖环境中编写和运行任务代码。

使用 `node scripts/sdk-access.mjs inspect tnqs-dynamics` 定位环境，按[完整 SDK 工作流](../quantum-sdk-workbench/references/workflow.md)执行。模块导航：`TensorNetworkQuantumSimulator`、`JSON3`；导航不是 API 白名单。

CTMRG 需要有效平面嵌入；分别记录状态/环境维数、截断、精度与收敛。采样权重相对于实际规约态，函数名 certified 不构成科学验收。

本入口复用宿主文件与代码工具，没有新增通用执行 Tool。原生 SDK 受上游版本、可选依赖、宿主资源与用户授权约束。已禁用或被拒绝的动作不能借代码路径绕过。执行状态和科研验收分别报告。
<!-- END NATIVE SDK ACCESS -->


适用于保留处理器或晶格原始图结构的电路、动力学及平衡态计算。优先沿用已有 quimb、TeNPy 或 Yao 任务；需要在同一非方格图上比较 BP、boundary MPS 与有限平面 CTMRG 时选择本能力。

## 方法与边界

1. 固定图、顶点到物理位点映射、位置、边、输入态、模型和 CPU 精度。CTMRG 要求连通、不同顶点位置、无交叉的平面嵌入；失败时报告原始原因，不静默换图或换算法。
2. 先用可枚举的小系统对照独立稠密矩阵或指标求和，再扩大问题。状态 bond dimension、环境维数、门截断、时间步和浮点误差分别记录；有环图 BP 收敛不等于精确。
3. v0.5.0 使用 Qiskit 的旋转角约定；`freenergy=-ln Z`。CTMRG 默认 SVD projector，`:eig` 为实验选项，不保证支持任意平面图。不要把环境维数增大当成单调误差定理。
4. `sample_certified` 的权重对应实际规约/缩放后的采样态。记录归一化、seed、样本数、权重、支持集和统计容差；函数名称不是严格误差证书或最终 Acceptance。
5. 公开 API、用户图及模型不受示例大小限制。Qiskit.jl、GPU、MPI 与额外 Python 桥接不在默认环境中；QASM 测量、反馈和动态电路语义须另行核验。

按[使用与验证说明](../../../docs/integrations/TNQS.md)准备环境，然后通过宿主代码工具运行[可编辑的原生程序](references/native-example.jl)。指南与环境由 DSH/Codex 共享，不新增转发 Tool、MCP Server 或 Runtime。

保留输入、完整输出、诊断、版本和锁摘要。工程检查与有限数值对照不推导科学验收，`scientificValidation=not_evaluated`。
