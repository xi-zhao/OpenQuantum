---
name: pyquil-simulation
description: 用 Rigetti pyQuil 的 NumPy 波函数模拟器执行用户电路，返回 Quil 程序、末态振幅与概率。
---

# pyQuil 本地理想电路仿真

Agent 经 Harness 调用 `pyquil_local` 提供的 `simulate_pyquil_circuit`。本 Skill 负责模型选择和结果解释，Tool 在独立 Python 环境执行真实上游 SDK。

输入 `numQubits` 和 `gates`。每项包括 `gate`、`targets`；支持 H/S/T/X/Y/Z/CX/CZ 和 RX/RY/RZ。旋转门必须提供 `angle`（rad），其他门不得提供。CX 的首个 target 是控制位。只接收结构化门，不执行用户代码或文件路径。

从全零态开始进行理想酉演化。`outcomes` 的位串左端是量子位 0，`amplitude=[real,imag]`。概率由 SDK 末态振幅计算，无裁剪或归一化。先检查 `normError`；概率不是有限 shots 测量频数。完整态向量的计算和存储随 2^N 增长。

使用 Rigetti 自带 NumpyWavefunctionSimulator，在本地进程执行 Program。返回的 `program` 是真实序列化 Quil。此路径无需 QVM/quilc 服务，也不会访问 QCS 或 QPU；不包含噪声、条件执行或硬件连接映射。

计算规模由调用方选择，后端数值表示限制仍适用。资源限制用 `execution` 设置，与模型参数分开。先运行 `node scripts/setup-paper-tools.mjs pyquil-simulation` 显式准备固定依赖；计算调用不安装依赖或联网，数值库可能写本地缓存。

固定上游版本：4.21.0；来源与许可见[上游仓库](https://github.com/rigetti/pyquil)（Apache-2.0）。本地数值和协议检查属于开发证据；当前 L1，`scientificValidation=not_evaluated`，成功执行不等于最终科学 Acceptance。
