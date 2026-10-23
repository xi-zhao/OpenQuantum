---
name: qibo-simulation
description: 使用 Qibo 显式 NumPy CPU 后端模拟结构化幺正电路，输出完整复振幅和计算基概率。
---

# Qibo 本地电路

<!-- BEGIN NATIVE SDK ACCESS -->
## 原生 SDK 路径

本能力同时支持 **Qibo 的原生公开 API**。用户需要 自定义 Circuit、Hamiltonian、噪声、模型与后端 时，由 Agent 在固定依赖环境中编写和运行任务代码，不限于下文便捷 Tool 的预设模型。

使用 `node scripts/sdk-access.mjs inspect qibo-simulation` 定位环境，按[完整 SDK 工作流](../quantum-sdk-workbench/references/workflow.md)执行。模块导航：`qibo`；导航不是 API 白名单。

下文关于模型、门集、输入与预算的限制描述便捷 Tool 的合同；原生 SDK 另受上游版本、可选依赖、宿主资源与用户授权约束。已禁用或被拒绝的动作不能借代码路径绕过。执行状态和科研验收分别报告。
<!-- END NATIVE SDK ACCESS -->


Agent 经 Harness 调用 `qibo_local` 的 `simulate_qibo_circuit`。Skill 负责选择与解释，Tool 负责真实 SDK 执行。

输入全零初态上的 `numQubits` 与有序 `gates`；支持 H/S/T/X/Y/Z/CX/CZ/RX/RY/RZ，旋转角以 rad 给出，CX/CZ 首个目标是控制位。

Tool 显式构造 `NumpyBackend`，固定 complex128，避免自动选择 GPU 或设备后端。输出 `outcomes` 包含完整计算基，`bits` 最左位对应 qubit 0，振幅为 `[real,imag]`。

先检查 `normError`，再解释概率或相位；数据不经过裁剪或归一化。当前只做理想纯态演化，没有 Qibolab/Qibocal 控制、噪声、采样、硬件连接或云提交。状态向量内存随 2^N 增长。

固定依赖需显式执行 `node scripts/setup-paper-tools.mjs qibo-simulation`；调用时不安装依赖，数值库可能写入本地缓存。规模参数不按开发机算例设人工上限；通过独立的 `execution` 选择部署资源。

当前为 L1，`scientificValidation=not_evaluated`。成功执行与工程回归不代表科学 Acceptance。

[上游、许可与验证边界](references/UPSTREAM.md)。
