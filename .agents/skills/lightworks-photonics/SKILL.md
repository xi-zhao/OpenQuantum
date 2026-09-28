---
name: lightworks-photonics
description: 用 Aegiq Lightworks permanent 后端计算无损线性光学网络的 Fock 振幅与概率，解释模式、反射率和干涉。
---

# Lightworks 光子干涉

Agent 经 Harness 调用 `lightworks_local` 的 `simulate_lightworks_photonics`。Skill 负责选择与解释，Tool 负责真实 SDK 执行。

`inputOccupation[i]` 为模式 i 的非负整数光子数，允许真空。`operations` 按时间排序，BS 使用两个不同模式与功率反射率 `reflectivity`，PS 使用单模式与 `phaseRad`。

BS 明确采用 Lightworks Rx 约定：矩阵 `[[√r, i√(1−r)], [i√(1−r), √r]]`；平衡分束器 r=0.5。PS 乘以 `exp(i*phaseRad)`。不要将这里的反射率与 Perceval 的 Hadamard 角度直接互换。

输出每个固定总光子数 Fock 态的复振幅和概率；`unitary[row][column]` 为输入列到输出行的 `[real,imag]`。先检查 `totalProbability`，用双光子 HOM 抑制符合项确认干涉约定，再解释一般网络。

只模拟完全不可区分光子、无损无源网络；无源纯度、探测器噪声、损耗、后选择、云或硬件接口。完整 Fock 输出空间随规模组合增长。

固定依赖需显式执行 `node scripts/setup-paper-tools.mjs lightworks-photonics`；调用时不安装依赖，数值库可能写入本地缓存。规模参数不按开发机算例设人工上限；通过独立的 `execution` 选择部署资源。

当前为 L1，`scientificValidation=not_evaluated`。成功执行与工程回归不代表科学 Acceptance。

[上游、许可与验证边界](references/UPSTREAM.md)。
