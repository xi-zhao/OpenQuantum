---
name: cqlib-kernel
description: 用固定 cqlib-qml 执行角度编码核与 QSVM，解释输入语义、独立数值对照、成本与科学边界。
---

# cqlib-qml

先在设置中心按需启用 `cqlib_kernel_local`，准备 Rust 构建环境。明确给出 trainX/trainY、testX 及可选 testY，再调用 `fit_cqlib_angle_kernel`。不从全数据拟合缩放或选择划分；所有实特征按弧度使用，实际编码为 RY(2x)。

报告真实 SDK 核与独立 ∏cos²(x−y) 对照，区分无 jitter 的 fidelity Gram 与上游训练时的 1e-8 对角 jitter；同时给解析核分类和同数据 RBF baseline。该核可经典解析，不宣称量子优势。只开放 classical angle 核，不开放 signed amplitude、共享参数 parameter-shift、VQC 或 swap test。若用户要求这些路径，解释上游当前缺陷，不能暗中用不同算法替代。

资源由用户选择，通过 `execution.timeoutMs`、`maxOutputBytes`、`threads` 控制进程；首调可能物化锁定环境，因此完整调用为 workspace-write。不要把执行成功或参考相符写成最终科学验收。安装、来源与示例见 [候选库接入说明](../../../docs/integrations/CANDIDATE_LIBRARIES.md)。
