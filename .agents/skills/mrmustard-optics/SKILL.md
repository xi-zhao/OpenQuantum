---
name: mrmustard-optics
description: 用固定 MrMustard 计算真空经高斯光学门与衰减后的相空间矩、光子数和显式截断的 Fock 概率。
---

# MrMustard 连续变量光学

Agent 经 Harness 调用 `mrmustard_local` 的 `simulate_mrmustard_optics`。适合相干、压缩、双模关联和线性光学模型；有确定光子数输入时优先选 Perceval/Lightworks，需要可微 Fock 层时选 MerLin。

输入 `numModes`、操作序列和每模式的 `cutoff`。初态为真空。`D` 使用 `x,y`，对应复位移 `alpha=x+iy`；`S` 与 `S2` 使用非负压缩量 `r` 和相位 `phi`；`R` 使用 `theta`；`BS` 使用 `theta,phi`，幅度混合的系数为 cos(theta)、sin(theta)；`LOSS` 使用 `[0,1]` 的 `transmissivity`。角度均为弧度，模式从 0 编号。两个模式的门接受任意不同模式。

`hbar=2`，真空协方差为单位阵；输出的 quadrature 顺序是所有 x 后接所有 p。相空间均值、协方差和 `meanPhotons` 不使用 Fock 截断。`fockProbabilities` 只包含各模式 0 到 cutoff−1 的占据数，并保留原始概率；`retainedProbability` 是其总质量，不做归一化掩盖截断。判断分布前检查该值并按需要增大 cutoff，输出规模为 cutoff^numModes。浮点舍入可能使极小概率或总和略偏离物理范围，不能把它当成新物理。

固定 [MrMustard 0.7.3](https://github.com/XanaduAI/MrMustard)（Apache-2.0）。上游仓库已于 2026-07-29 归档，因此按需启用该兼容接口；不是仍受上游维护的承诺。本接口不开放训练、非高斯初态、测量条件化或硬件控制。

先显式运行 `node scripts/setup-paper-tools.mjs mrmustard-optics` 准备 Python 3.11 固定环境，再启用连接。调用不安装依赖，不连接远程服务；SDK 编译/缓存可能写本地文件，最大副作用为 workspace-write。部署线程、超时、输出预算使用 `execution`，不作为物理参数上限。

当前为 L1；结果 `scientificValidation=not_evaluated`。数值回归与 MCP 测试不替代 central Acceptance Builder 的科学验收。
