---
name: cudaq-simulation
description: 使用 NVIDIA CUDA-Q 的 qpp-cpu 后端运行结构化量子电路，返回精确概率和可选固定 seed 的测量计数；适用于 CPU 上核对 CUDA-Q 电路语义。
---

# CUDA-Q 电路仿真

<!-- BEGIN NATIVE SDK ACCESS -->
## 原生 SDK 路径

本能力同时支持 **CUDA-Q 的原生公开 API**。用户需要 任意 kernel、控制流、observe/sample、噪声、target 与并行 时，由 Agent 在固定依赖环境中编写和运行任务代码，不限于下文便捷 Tool 的预设模型。

使用 `node scripts/sdk-access.mjs inspect cudaq-simulation` 定位环境，按[完整 SDK 工作流](../quantum-sdk-workbench/references/workflow.md)执行。模块导航：`cudaq`；导航不是 API 白名单。

已固定版本要求 Linux 或 Apple Silicon macOS；GPU target 取决于驱动、硬件和上游支持。

下文关于模型、门集、输入与预算的限制描述便捷 Tool 的合同；原生 SDK 另受上游版本、可选依赖、宿主资源与用户授权约束。已禁用或被拒绝的动作不能借代码路径绕过。执行状态和科研验收分别报告。
<!-- END NATIVE SDK ACCESS -->


显式准备 `node scripts/setup-paper-tools.mjs cudaq-simulation`，再调用 `simulate_cudaq_circuit`。
输入 `numQubits`、结构化 `gates`、`shots` 与 `seed`；支持 H/S/T/X/Y/Z/CX/CZ/RX/RY/RZ，角度为弧度。
`shots=0` 只返回精确概率。每个结果位串从左到右对应 q0、q1……，不要套用 Qiskit 的显示顺序。

固定官方二进制分发 `cuda-quantum-cu13==0.16.0`，显式选择 `qpp-cpu`。此固定版本有 Linux 与 Apple Silicon
macOS wheel；较新的 0.16.0.post1 当前缺少 macOS wheel。名称中的 cu13 不表示本工具会用 GPU。
在组件设置中按需启用 `cudaq_local`；原生 Windows 与 Intel Mac 需在受支持的独立部署环境使用。

SDK 动态编译可能写缓存，环境准备不会在 Tool 调用内发生。本工具不接受任意 Python/MLIR 源码，
不选择云端 target，不执行付费服务或 QPU。精确概率与有限 shots 计数应分开解释；L1 结果不构成科学验收。

来源：[CUDA-Q](https://github.com/NVIDIA/cuda-quantum)、[安装说明](https://nvidia.github.io/cuda-quantum/latest/using/quick_start.html)，Apache-2.0。GPU/HPC 路径需另行适配与验证。
