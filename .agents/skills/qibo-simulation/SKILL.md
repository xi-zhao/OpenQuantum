---
name: qibo-simulation
description: 使用 Qibo 显式 NumPy CPU 后端模拟结构化幺正电路，输出完整复振幅和计算基概率。
---

# Qibo 本地电路

Agent 经 Harness 调用 `qibo_local` 的 `simulate_qibo_circuit`。Skill 负责选择与解释，Tool 负责真实 SDK 执行。

输入全零初态上的 `numQubits` 与有序 `gates`；支持 H/S/T/X/Y/Z/CX/CZ/RX/RY/RZ，旋转角以 rad 给出，CX/CZ 首个目标是控制位。

Tool 显式构造 `NumpyBackend`，固定 complex128，避免自动选择 GPU 或设备后端。输出 `outcomes` 包含完整计算基，`bits` 最左位对应 qubit 0，振幅为 `[real,imag]`。

先检查 `normError`，再解释概率或相位；数据不经过裁剪或归一化。当前只做理想纯态演化，没有 Qibolab/Qibocal 控制、噪声、采样、硬件连接或云提交。状态向量内存随 2^N 增长。

固定依赖需显式执行 `node scripts/setup-paper-tools.mjs qibo-simulation`；调用时不安装依赖，数值库可能写入本地缓存。规模参数不按开发机算例设人工上限；通过独立的 `execution` 选择部署资源。

当前为 L1，`scientificValidation=not_evaluated`。成功执行与工程回归不代表科学 Acceptance。

[上游、许可与验证边界](references/UPSTREAM.md)。
