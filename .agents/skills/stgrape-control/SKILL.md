---
name: stgrape-control
description: 在固定时间网格上为有限维量子系统设计鲁棒控制脉冲。使用 ST-GRAPE 的公开接口比较分裂传播与未分裂传播，复核独立准静态误差源的一、二阶响应和预算终止。
---

# ST-GRAPE 多误差源鲁棒控制

<!-- BEGIN NATIVE SDK ACCESS -->
## 原生 SDK 路径

本能力使用 **ST-GRAPE 的原生公开 API**。用户需要 固定时间网格的鲁棒脉冲优化、独立准静态高斯误差响应及分裂传播精度对照 时，由 Agent 在固定依赖环境中编写和运行任务代码。

使用 `node scripts/sdk-access.mjs inspect stgrape-control` 定位环境，按[完整 SDK 工作流](../quantum-sdk-workbench/references/workflow.md)执行。模块导航：`stgrape`、`qutip`、`numpy`、`scipy`；导航不是 API 白名单。

为 ST 路径验证控制基与实对角谱。保留角频率单位、时间步、Taylor 阶数、独立误差宽度和预算终止原因。

本入口复用宿主文件与代码工具，没有新增通用执行 Tool。原生 SDK 受上游版本、可选依赖、宿主资源与用户授权约束。已禁用或被拒绝的动作不能借代码路径绕过。执行状态和科研验收分别报告。
<!-- END NATIVE SDK ACCESS -->


适用于给定 Hamiltonian、控制通道和目标态或目标门的离线控制设计。需要常规 GRAPE/Krotov 时也可使用 [QuantumControl.jl](../quantumcontrol-julia/SKILL.md)。当问题涉及两个准静态误差源的联合微扰、滤波脉冲或分裂传播误差时，使用此环境可在同一个模型上核对这些量。

## 运行一个可检查的小问题

1. 用 `node scripts/sdk-access.mjs inspect stgrape-control` 读取环境状态及解释器。需要准备时运行 `node scripts/setup-sdk.mjs stgrape-control`，再检查一次。两种宿主均使用已有的代码工具。
2. 在新建的任务目录使用该解释器运行[可编辑示例](references/native-example.py)。若将示例复制到别处，将 `OPENQUANTUM_ROOT` 指向仓库根目录。默认模型从 |00⟩ 到 |11⟩，采用 4 段各 0.35 µs 的方波，Hamiltonian 以 rad/µs 计。三个输入系数与 FIR 核 (0.6, 0.4) 卷积后得到实际四段振幅。
3. 给整个进程设置 60 秒截止时间。缺省求解预算为 3 次迭代、16 次求值及 12 秒。可在不同目录用 `--method st-grape --steps 1`、`--steps 2`、`--steps 4` 和 `--method dense`、`--method block-sparse` 比较同一初始脉冲。保留各次的 `result.json`。
4. 从结果读取实际终止原因、初始和最终控制、独立逐段矩阵指数的态损失以及 8 个留出样本的损失。固定种子仅用于留出样本。优化器达到迭代上限时，报告当时的脉冲与误差，收敛状态仍为未收敛。

## 模型和解释

- 示例取独立、零均值、单位方差的高斯参数，物理宽度 0.06 和 0.04 已乘进各自的扰动算符。态损失为 `1−|⟨target|ψ⟩|²`。同时报告 Taylor 阶数及二阶交叉矩。独立有限差分和单比特解析旋转见[实测与对照](../../../docs/ecosystem/proposals/st-grape.md)。
- 自定义 ST 控制分组前，调用示例里的 `check_control_groups(problem, groups)` 核对每个通道的覆盖、酉变换和实对角谱。上游 v1.0.0 的原生 `optimize` 会接受某些错误基，在解析解能完全翻转的单比特脉冲上曾返回损失 1 并报告收敛。自定义分组无法成立时，选择处理原 Hamiltonian 的未分裂传播。
- 时间网格、角频率单位、初态/目标、滤波核和基底次序必须一起保存。未经重新验证，四段、两比特的分裂误差趋势只适用于该算例。有色噪声、相关噪声、大尺度性能和硬件保真度均须各自取得证据。
- 默认环境固定[官方 v1.0.0 代码 wheel](https://github.com/Fanyd271/ST-GRAPE/releases/tag/v1.0.0)，可选科研数据另用 CC BY 4.0。复现归档缺失时标记缺失；自定义实验照常保存到任务目录。`scientificValidation=not_evaluated`。
