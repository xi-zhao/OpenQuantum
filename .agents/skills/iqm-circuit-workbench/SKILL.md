---
name: iqm-circuit-workbench
description: 用 IQM Client 内置 Qiskit adapter 转译和校验本地设备原生门电路，再用 IQM 静态噪声模型或理想 Aer 模拟采样。
---

# IQM 本地电路工作台

<!-- BEGIN NATIVE SDK ACCESS -->
## 原生 SDK 路径

本能力同时支持 **IQM Client / Qiskit IQM 的原生公开 API**。用户需要 电路验证、动态架构、fake backends、转译与远程客户端 时，由 Agent 在固定依赖环境中编写和运行任务代码，不限于下文便捷 Tool 的预设模型。

使用 `node scripts/sdk-access.mjs inspect iqm-circuit-workbench` 定位环境，按[完整 SDK 工作流](../quantum-sdk-workbench/references/workflow.md)执行。模块导航：`iqm.iqm_client`、`iqm.qiskit_iqm`；导航不是 API 白名单。

本地程序构建与外部调用分开；账户、凭据、费用、设备操作和数据外发沿用宿主及用户授权。原生 SDK 访问不自动启用服务。

下文关于模型、门集、输入与预算的限制描述便捷 Tool 的合同；原生 SDK 另受上游版本、可选依赖、宿主资源与用户授权约束。已禁用或被拒绝的动作不能借代码路径绕过。执行状态和科研验收分别报告。
<!-- END NATIVE SDK ACCESS -->


适用于检查门电路如何映射到 IQM Adonis、Apollo 或 Aphrodite 的本地设备模型。Agent 经 Harness 调用 `iqm_local` 的 `run_iqm_local_circuit`。

- `numQubits` 是逻辑量子位数；所选设备的实际容量和拓扑由 IQM SDK 检查。`operations` 按时间顺序，量子位从 0 开始，单/双量子位门的索引必须有效且不同。
- 支持 h/x/y/z/s/t/rx/ry/rz/cx/cz/swap；只有旋转门使用 `angleRad`，单位 rad。从全零态开始，末尾自动逐位 Z 测量。
- `simulationMode=ideal` 用于检查逻辑分布；`device-noise` 使用 SDK 随包提供的静态噪声模型。先对照理想结果，再区分噪声模型影响和有限 shots 波动。
- SDK 执行原生门转译及 `validate_circuit`。由于该固定版本的 fake backend `.run()` 不转发种子，Tool 显式使用 AerSimulator 并传入 SDK noise model 与 `seed_simulator`，确保 `seed` 生效。
- 返回所用设备、物理容量、耦合图、原生门名、编译后门数及采样频数。位串左端是逻辑输入量子位 0；转译布局不改变输出经典位的含义。
- `shots` 和 `execution` 由调用方决定，`seed` 是 SDK RNG 的 uint32 范围。固定版本和平台内可重放，跨版本编译与随机流不保证一致。
- 用 `node scripts/setup-paper-tools.mjs iqm-circuit-workbench` 显式准备固定环境。计算不联系 IQM 服务、不使用凭据、不提交 QPU。
- 当前 L1，`scientificValidation=not_evaluated`。SDK 原生门校验通过不代表科学 Acceptance，也不是当前硬件校准。

[上游与许可说明](references/UPSTREAM.md)。
