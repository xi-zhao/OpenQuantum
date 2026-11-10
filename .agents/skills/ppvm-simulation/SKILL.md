---
name: ppvm-simulation
description: 用 PPVM 原生 API 编写 Pauli 传播、广义稳定子 tableau 和含丢失/泄漏的自定义电路；区分观测量反向传播、采样与物理近似。
---

# PPVM

<!-- BEGIN NATIVE SDK ACCESS -->
## 原生 SDK 路径

本能力使用 **PPVM 的原生公开 API**。用户需要 Pauli 传播、广义 tableau、近 Clifford 观测量与含丢失/泄漏的自定义电路采样 时，由 Agent 在固定依赖环境中编写和运行任务代码。

使用 `node scripts/sdk-access.mjs inspect ppvm-simulation` 定位环境，按[完整 SDK 工作流](../quantum-sdk-workbench/references/workflow.md)执行。模块导航：`ppvm`；导航不是 API 白名单。

显式准备固定源码的 Python 3.12 / Rust 环境；完整原生 API 可用，成本取决于非 Clifford 分支与截断。

Heisenberg 计算倒序处理整条门和噪声链；LOST 与比特值分开；reset_state 不恢复丢失/泄漏。

非对称丢失的存活分支反作用尚未实现；开发数值对照不构成器件模型或科学验收。

本入口复用宿主文件与代码工具，没有新增通用执行 Tool。原生 SDK 受上游版本、可选依赖、宿主资源与用户授权约束。已禁用或被拒绝的动作不能借代码路径绕过。执行状态和科研验收分别报告。
<!-- END NATIVE SDK ACCESS -->


当任务需要近 Clifford 观测量、非 Clifford tableau 或中性原子丢失/泄漏模型时使用。先比较现有 Stim、Tsim、Clifft 与 monoprop：仅需普通 Clifford 采样或通用算符传播时，不必引入 PPVM。

## 方法选择与边界

- `PauliSum` / `LossyPauliSum`：从观测量出发反向传播，**整条门和噪声操作链倒序，旋转角保留原符号**。记录截断规则，不能以一次有限截断计算宣称收敛。
- `GeneralizedTableau`：按物理时间顺序作用门，再测量。Python 绑定支持 1–2048 qubit；此上限不表示这些规模在任意非 Clifford 电路上都可承受，系数可能迅速增长。
- `StimProgram` / `sample_stim`：使用固定版本支持的 Stim 指令及扩展，不假定与 Stim 全指令等价。保存原始测量记录；`LOST=2` 不是布尔比特，不能直接转成 detector flips。
- `reset_state` 只重置活跃 qubit，保留丢失/泄漏标记；`reset` 才恢复计算子空间。丢失与泄漏的模型语义分别报告。
- 相关丢失参数 `p[1]` 是失去某个指定 qubit 的概率，恰好失去一个的总概率为 `2*p[1]`。非对称丢失目前不包含存活分支反作用；不能宣称完整物理量子通道或器件数字孪生已验证。
- 保存种子与线程设置；用 `fork(seed=...)` 构造独立随机轨迹，复制对象可能复制随机数状态。

## 执行与证据

先发现环境，再显式准备，随后用宿主代码工具运行用户的完整程序。准备会下载和编译 Rust/Python 依赖；首次执行不隐式安装。硬件或外部服务仍需另行授权。

[可编辑原生示例](references/native-example.py)展示带噪观测量与丢失恢复，参数只是示例，不是公开 API 白名单。程序、输入、锁文件摘要、实际版本、近似与原始输出一起保留；用独立解析值、密度矩阵或其他适用方法检查任务的科学结论。

[使用、来源与实测范围](../../../docs/integrations/PPVM.md)。原生程序执行与开发回归不推导最终科学验收，`scientificValidation=not_evaluated`。
