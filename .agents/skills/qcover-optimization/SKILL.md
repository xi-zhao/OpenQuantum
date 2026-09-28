---
name: qcover-optimization
description: 用北京量子院 Qcover 的局部子图分解和 Qulacs 后端评估 Ising 图上给定 QAOA 参数的能量。
---

# Qcover QAOA 参数点评估

Agent 经 Harness 调用 `qcover_local` 的 `evaluate_qcover_qaoa`。适合比较手头 QAOA 参数、检查图分解结果和独立算法交叉核对。

输入 `fields[i]` 表示节点 i 的 Z 场，`edges` 中每条边包含 `source`、`target` 和 `coupling`，Hamiltonian 是 `sum_i h_i Z_i + sum_edges J_ij Z_i Z_j`，没有常数偏移。节点编号从 0 起，保留无边的孤立节点；无向重复边应先合并，自环应化为常数偏移并在 Tool 外单独记录。

`gammas` 和 `betas` 长度相同，每项对应一层，单位 rad。Qcover 用 p 邻域分解图，Qulacs 精确评估各子图，再合成能量。此后端的 RZ/RX 使用正指数旋转约定，输出包括能量、边 ZZ 期望和子图规模。该动作不自动优化参数，不生成最优解承诺，也不连接云端或硬件。图和层数由用户选择；局部子图仍可能随密度、层数变大而需要指数内存。

固定 [Qcover 2.6.0](https://github.com/BAQIS-Quantum/Qcover)（Apache-2.0）及锁文件内的 Qiskit、Cirq、ProjectQ、Qulacs、Quimb 等依赖。Python 3.10 独立环境保留上游声明的完整依赖，使用固定的旧 Qiskit/Cirq 兼容版本；ProjectQ 构建依赖固定 setuptools 68.2.2。Worker 为旧 `collections.Callable` 导入添加局部兼容别名，不修改 SDK 安装文件。

先运行 `node scripts/setup-paper-tools.mjs qcover-optimization`。计算 Tool 不安装依赖；SDK 可能写缓存，因此最大副作用是 workspace-write。当前 L1，返回 `scientificValidation=not_evaluated`；开发测试不等于中央科学验收。
