---
name: quri-parts-estimation
description: 用 QunaSys QURI Parts 和 Qulacs 在本地计算结构化电路上实 Pauli Hamiltonian 的精确期望值。
---

# QURI Parts / Qulacs 期望值

Agent 经 Harness 调用 `quri_parts_local` 提供的 `estimate_quri_observable`。这是 QURI SDK 中 Parts 与 Qulacs 后端的有界能力，不代表 QURI Algo、VM 或所有云后端均已接入。

输入 `numQubits`、`gates` 与 `terms`。支持 H/S/T/X/Y/Z、CX/CZ 和 RX/RY/RZ；旋转 `angle` 用 rad，CX 的首个 target 为控制位。Pauli 字符串长度必须等于量子位数，**最左字符是 qubit 0**。每个 term 的实 `coefficient` 可重复，重复 Pauli 会相加。

Tool 通过 QURI Parts 构建电路和 GeneralCircuitQuantumState，再由 Qulacs vector estimator 计算 Hamiltonian 期望值。`expectation` 是实部；`imaginaryResidual` 保留虚部绝对值。`estimatorError=0` 只表示没有有限 shots 的抽样误差，不是数值舍入误差或物理模型误差的严格上界。

适用于局域可观测量、变分电路单点评估、方法交叉核对。它不执行参数优化，不构造噪声模型，也不自动提交云任务。精确态矢量内存随量子位数指数增长，计算规模由调用方按资源选择。

固定依赖：[QURI Parts 0.27.0](https://github.com/QunaSys/quri-sdk)（Apache-2.0）及 [Qulacs 0.6.14](https://github.com/qulacs/qulacs)（MIT）。QURI SDK 的 Algo/VM 有各自许可证，不能把整个仓库概括为一个许可证。

先运行 `node scripts/setup-paper-tools.mjs quri-parts-estimation` 显式准备固定依赖。计算 Tool 不安装依赖、不连接外部服务；SDK 可能写本地缓存，因此最大副作用登记为 workspace-write。部署时间、输出大小与线程设置使用 `execution`，与方法规模分开。

当前为 L1，`scientificValidation=not_evaluated`。本地数值、协议与 Harness 测试是开发证据；执行成功不等于 central Acceptance Builder 已推导科学验收。
