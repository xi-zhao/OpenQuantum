---
name: merlin-learning
description: 用 Quandela MerLin 在 CPU 上批量计算无损光子线路的完整 Fock 概率，以及指定输出概率对相移的自动微分梯度。
---

# MerLin 光子层推断与梯度

Agent 经 Harness 调用 `merlin_local` 的 `evaluate_merlin_layer`。用于分析光子量子层的可微响应；完整训练模型、准确率对比和实机推断需要其他工作流与证据。

输入模式数、Fock `occupation`、目标 `targetOccupation`、`BS`/`PS` 操作序列及二维 `phases`。每个 phase 行是一次参数取值，各列按线路中 PS 出现的顺序绑定。`BS.theta` 使用 Perceval Rx 约定：对角元 cos(theta/2)，非对角元 i sin(theta/2)；所有角度为弧度。目标与输入光子总数必须相同；MerLin SLOS 后端要求输入至少一个光子。每条线路至少有一个 PS，参数可跨批次比较。

Tool 显式使用完整 `FOCK` 空间而非 MerLin 默认的 `UNBUNCHED` 空间，保留光子聚束事件且不进行后选择。返回 `basis` 明确列出概率列对应的模式占据数；`phaseGradients` 是对应批次的目标输出概率对各 PS 角度的偏导，采用 CPU float64 自动微分。检查 `probabilitySums`，并用有限差分检验关键参数点；目标梯度不代表模型精度提升或量子优势。模拟假定光子不可区分、理想无损器件，无有限 shots 统计噪声。

固定 [merlinquantum 0.4.1](https://github.com/merlinquantum/merlin)（MIT）与 Perceval 1.2.1，避免较新 Perceval 的不兼容模块变更。先运行 `node scripts/setup-paper-tools.mjs merlin-learning`；调用不安装依赖、不连接云、不加载任意用户模型。SDK 缓存使最大副作用登记为 workspace-write。`execution` 控制部署资源，模式、光子、批次数不设测试规模上限。

当前为 L1，`scientificValidation=not_evaluated`。开发期 permanent 参照和梯度回归不构成科研结论或最终科学验收。
