---
name: qutrunk-simulation
description: 用启科 QuTrunk 的纯本地 BackendLocal 执行用户电路，返回 OpenQASM、末态振幅和概率。
---

# QuTrunk 本地电路仿真

<!-- BEGIN NATIVE SDK ACCESS -->
## 原生 SDK 路径

本能力同时支持 **QuTrunk 的原生公开 API**。用户需要 QCircuit、参数、门与上游后端 时，由 Agent 在固定依赖环境中编写和运行任务代码，不限于下文便捷 Tool 的预设模型。

使用 `node scripts/sdk-access.mjs inspect qutrunk-simulation` 定位环境，按[完整 SDK 工作流](../quantum-sdk-workbench/references/workflow.md)执行。模块导航：`qutrunk`；导航不是 API 白名单。

下文关于模型、门集、输入与预算的限制描述便捷 Tool 的合同；原生 SDK 另受上游版本、可选依赖、宿主资源与用户授权约束。已禁用或被拒绝的动作不能借代码路径绕过。执行状态和科研验收分别报告。
<!-- END NATIVE SDK ACCESS -->


Agent 经 Harness 调用 `qutrunk_local` 提供的 `simulate_qutrunk_circuit`。本 Skill 负责模型选择和结果解释，Tool 在独立 Python 环境执行真实上游 SDK。

输入 `numQubits` 和 `gates`。每项包括 `gate`、`targets`；支持 H/S/T/X/Y/Z/CX/CZ 和 RX/RY/RZ。旋转门必须提供 `angle`（rad），其他门不得提供。CX 的首个 target 是控制位。只接收结构化门，不执行用户代码或文件路径。

从全零态开始进行理想酉演化。`outcomes` 的位串左端是量子位 0，`amplitude=[real,imag]`。概率由 SDK 末态振幅计算，无裁剪或归一化。先检查 `normError`；概率不是有限 shots 测量频数。完整态向量的计算和存储随 2^N 增长。

显式选择 BackendLocal(run_mode="local")，不根据环境选择远程后端，不访问 QuSAAS、MPI 或 GPU。返回 `program` 是由 SDK Command 序列导出的 OpenQASM 2。固定 Python 3.10，因为 QuTrunk 0.2.2 声明 Python <3.11。SDK 内部量子位零在最低有效位，适配层已转换为输出左端位。

计算规模由调用方选择，后端数值表示限制仍适用。资源限制用 `execution` 设置，与模型参数分开。先运行 `node scripts/setup-paper-tools.mjs qutrunk-simulation` 显式准备固定依赖；计算调用不安装依赖或联网，数值库可能写本地缓存。

固定上游版本：0.2.2；来源与许可见[上游仓库](https://github.com/qudoor/qutrunk)（Apache-2.0）。本地数值和协议检查属于开发证据；当前 L1，`scientificValidation=not_evaluated`，成功执行不等于最终科学 Acceptance。
