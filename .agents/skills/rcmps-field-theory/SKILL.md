---
name: rcmps-field-theory
description: 使用 RcmpsCore.jl 的公开 Julia API 研究 1+1 维单标量玻色场的连续 RCMPS、变分基态、正常序观测量与同真空切空间激发，区分传递 gap、Hamiltonian 能隙和数值收敛。
---

# 连续相对论场论

<!-- BEGIN NATIVE SDK ACCESS -->
## 原生 SDK 路径

本能力使用 **RcmpsCore.jl 的原生公开 API**。用户需要 连续相对论标量场、RCMPS 优化、正常序观测量与同真空激发 时，由 Agent 在固定依赖环境中编写和运行任务代码。

使用 `node scripts/sdk-access.mjs inspect rcmps-field-theory` 定位环境，按[完整 SDK 工作流](../quantum-sdk-workbench/references/workflow.md)执行。模块导航：`RcmpsCore`、`JSON3`；导航不是 API 白名单。

单标量玻色场、无限体积、ComplexF64；正常序参考质量为 1，耦合为 g :phi^4:。传递 gap 不等于 Hamiltonian 能隙；保留背景优化、数值控制和失败诊断。

本入口复用宿主文件与代码工具，没有新增通用执行 Tool。原生 SDK 受上游版本、可选依赖、宿主资源与用户授权约束。已禁用或被拒绝的动作不能借代码路径绕过。执行状态和科研验收分别报告。
<!-- END NATIVE SDK ACCESS -->

适用于直接在连续空间、平移不变热力学极限研究 1+1 维标量场。格点 MPS/MPO、有限系统或非相对论模型优先使用已有 TeNPy、quimb、MPS 工作流或适用的上游实现；不把本入口当通用场论模拟器。

## 方法与边界

1. 明确模型、单位和正常序：CPU SDK 支持 phi4、sinh-Gordon、sine-Gordon 和修改质量的 phi4 等公开接口；参考质量为 1，phi4 系数为 `g :phi^4:`，没有 `1/4!`。小算例不限制公开 API 或用户选择的 bond dimension。
2. `State` 使用 ComplexF64 和左规范 `Q=-iK-R†R/2`。通过构造器或 retraction 更新矩阵与稳态，评估期间不直接改共享状态。唯一稳态、trace、Hermiticity、positivity 和物理残差分别核对。
3. 显式设置 `state.model_param.name` 和 `coupling`；一次 `fg_phi4` 不会替优化器设置模型。修改质量时向能量、优化及 `ExcitationModel` 显式传同一 `massmod`，换算能量单位后再判断色散。
4. `mass_gap(s)` / `transfer_gap(s)` 是传递算子 gap；Hamiltonian 静止能隙使用 `excitation_gap(s; model)` 或 `mass_gap(s, model)`。自由真空前者为 Inf、后者为 1。不得混写。
5. 保存背景优化的能量、梯度和停止原因；优化器的正则化度量不同于物理切空间度量，`vertex` 的梯度对应复值输出的实部。bond dimension、积分窗口、求积点数、ODE 容差、本征残差分别检查。values-only bilinear 激发不使用 `n_quad`，action/梯度路径才需要检查该求积控制。
6. 同真空切空间激发不包括跨真空 kink 或一般多粒子谱。上游 `accepted`、`converged`、残差与最终科学结论分别报告；检查背景是否为收敛基态，保留负能级和未接受结果，在能级交叉处追踪分支。
7. 不承诺多场、费米场、高维、有限温度或实时场论；独立 Python/CUDA `gpu/` 实现不在本次环境中。大 D 的稠密传递算子、并发与激发装配成本须按实际资源评估，不替用户默设人工规模上限。

通过[使用与验证说明](../../../docs/integrations/RCMPS.md)显式准备，再复制[可编辑程序](references/native-example.jl)到独立任务目录运行。该例是相干试探态，未优化背景，不能作为相互作用质量谱的验收结果。

保留程序、输入、完整结果、来源及锁摘要。无新增 Tool、MCP Server、Runtime、Validator 或 Acceptance Profile；DSH/Codex 共享这一份 SDK 与指南，`scientificValidation=not_evaluated`。
