---
name: iqm-circuit-workbench
description: 用 IQM Client 内置 Qiskit adapter 转译和校验本地设备原生门电路，再用 IQM 静态噪声模型或理想 Aer 模拟采样。
---

# IQM 本地电路工作台

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
