---
name: vqnet-learning
description: 用本源 VQNet 的 CPU 变分电路模拟器计算 Pauli 能量、计算基概率，以及旋转参数的自动微分梯度。
---

# VQNet 可微电路

Agent 经 Harness 调用 `vqnet_local` 的 `differentiate_vqnet_circuit`。输入 `numQubits`、结构化 `gates` 和实系数 Pauli `terms`，得到期望值、概率与每个旋转门的自动微分梯度。适用于变分电路单点梯度与参数敏感性检查，不执行训练流程。

支持 H/S/T/X/Y/Z、CX/CZ、RX/RY/RZ。旋转角单位 rad；CX 首个 target 为控制位。Pauli 字符串和输出概率的位串均以 qubit 0 为最左位；字符串必须与量子位数等长。重复 Pauli 项合并，恒等项允许。每个旋转门的角度是独立参数，`gradients[].gateIndex` 指原始门列表中的位置；调用方复用一个模型参数时，应自行按链式法则合并相应梯度。

使用 VQNet VQC CPU complex128 状态矢量与 SDK 自动微分。无 shots 误差，但有浮点误差，内存随量子位数指数增长。不调用 GPU、云端、真实硬件或外部服务。

固定 [pyvqnet 2.18.1](https://vqnet20-tutorial.readthedocs.io/en/main/index.html)，Python 3.12。Python 源文件有 Apache-2.0 声明，但本次发行 wheel 未提供完整许可元数据；连接保守地默认关闭，用户应按上游发行许可自行启用。先显式运行 `node scripts/setup-paper-tools.mjs vqnet-learning`。

当前 macOS ARM wheel 含构建机动态库路径。Worker 在读取输入前，用当前 Python 和 SDK 自带 `libs` 的固定路径重启自身，解决加载问题，不修改 wheel 或宿主文件。SDK 在 macOS 导入时把 OMP 线程数设为 1，因此部署的 `execution.threads` 不保证覆盖 SDK 内部行为。

最大副作用为 workspace-write（本地缓存）。当前 L1，`scientificValidation=not_evaluated`；开发测试不等于科学验收。
