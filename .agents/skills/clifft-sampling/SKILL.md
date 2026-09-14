---
name: clifft-sampling
description: 用固定 Clifft 对 Clifford+T 电路做带噪采样，按活跃宽度控制成本，可选独立密度矩阵参考。
---

# Clifft 近 Clifford 采样

调用 Harness 注册的 `clifft_local.sample_clifft_circuit`。用于 T 门干涉、Clifford+T 电路和门后去极化噪声实验。

- 提交结构化 `gates`，仅支持 H、S、T、X、Y、Z、CX、CZ；CX/CZ 的 targets 顺序为控制位、目标位。1–128 qubits，最多 2048 个门、8192 shots，且 numQubits×shots≤524288。编译后检查实际 peakActiveWidth，不超过请求的 maxActiveWidth（默认 16、最高 24），并检查 2^width×shots×门数≤536870912。
- 初态固定为全零态；每个门后，在该门涉及的各量子位独立施加 `DEPOLARIZE1(p)`。`p` 是 Pauli 错误总概率，不是直接乘在密度矩阵上的白噪声混合系数。
- 只做最终 Z 测量，位串从左到右为 q0、q1……。密度矩阵参考运行时返回完整位串（complete）；跳过参考时仅返回实际出现的位串（observed_only），频数之和仍等于 shots。
- referenceMode=auto|required|skip；独立密度矩阵参考至 6 qubits。auto 超限时跳过参考；required 超限明确失败；skip 主动跳过。未运行时 reference.status=not_run，参考概率、TVD、trace error 均为 null。密度矩阵参考描述相同的噪声模型；采样频数仍有有限 shots 不确定度。比较 total variation distance 时结合样本数，不要求频数与解析概率完全相等。
- 不开放 LOSS、LEAKAGE、续算、测量反馈或任意 Stim 文本。允许的输入上限不代表所有电路或极端资源组合已验证；纯 Clifford 纠错存储优先使用现有 QEC Tool。
- 当前 L1，`scientificValidation=not_evaluated`；首次调用可能安装固定依赖、写本地缓存。

资源预算与实测规模见[计算规模与参考检查](../../../docs/integrations/SCALABLE_BRIDGES.md)。版本和数值验证见 [接入说明](../../../docs/integrations/UNITARY_ECOSYSTEM.md)。
