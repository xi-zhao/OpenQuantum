---
name: mqt-ddsim
description: 用 MQT DDSIM 决策图在本地模拟结构化量子电路，采样末端测量，并可显式请求完整态矢量。
---

# MQT DDSIM 决策图仿真

Agent 经 Harness 调用 `mqt_ddsim_local` 提供的 `simulate_mqt_ddsim`。适用于能利用决策图结构的无噪声电路仿真，和其他模拟器的数值对照。

输入 `numQubits`、`gates`、`shots`、`seed`。支持 H/S/T/X/Y/Z、CX/CZ 和 RX/RY/RZ；旋转角度用 rad，CX 首个 target 是控制位。Tool 从全零态出发，在末尾测量所有量子位。`counts` 的位串按 **q[n-1]...q[0]** 排列；例如只对 q0 施加 X，三位结果是 `001`。

默认 `includeStatevector=false`，只返回采样计数，避免强制物化指数维数的稠密向量。显式设为 true 时返回采样前的相干态矢量，数组下标就是位串对应的二进制整数。`seed` 传给 DDSIM 的 `seed_simulator`，采样不确定性仍需按 shots 解释。

DDSIM 的近似保真度固定为 1，因此这里不使用决策图截断近似；浮点误差依然存在。决策图对一般无结构电路仍可能指数增长。规模由调用方决定，既不保证所有电路高效，也不包含中途测量、噪声、QPU 或远程执行。

固定 [MQT DDSIM 2.6.0](https://github.com/munich-quantum-toolkit/ddsim)（MIT），独立环境内固定 MQT Core 与 Qiskit；不改变现有 MQT QCEC 的环境或作用域。

先运行 `node scripts/setup-paper-tools.mjs mqt-ddsim` 显式准备固定依赖。计算 Tool 不安装依赖、不连接外部服务；SDK 可能写本地缓存，因此最大副作用登记为 workspace-write。部署时间、输出大小与线程设置使用 `execution`，与方法规模分开。

当前为 L1，`scientificValidation=not_evaluated`。本地数值、协议与 Harness 测试是开发证据；执行成功不等于 central Acceptance Builder 已推导科学验收。
