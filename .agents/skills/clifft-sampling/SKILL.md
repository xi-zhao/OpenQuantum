---
name: clifft-sampling
description: 用固定 Clifft 对 1–6 qubits 的有界 Clifford+T 电路做带噪采样，与独立密度矩阵参考比较最终位串分布。
---

# Clifft 近 Clifford 采样

调用 Harness 注册的 `clifft_local.sample_clifft_circuit`。用于 T 门干涉、Clifford+T 小电路和门后去极化噪声实验。

- 提交结构化 `gates`，仅支持 H、S、T、X、Y、Z、CX、CZ；CX/CZ 的 targets 顺序为控制位、目标位。最多 64 个门、8192 shots。
- 初态固定为全零态；每个门后，在该门涉及的各量子位独立施加 `DEPOLARIZE1(p)`。`p` 是 Pauli 错误总概率，不是直接乘在密度矩阵上的白噪声混合系数。
- 只做最终 Z 测量，位串从左到右为 q0、q1……。返回完整的 `2^n` 个位串，包括零频数。
- 密度矩阵参考描述相同的噪声模型；采样频数仍有有限 shots 不确定度。比较 total variation distance 时结合样本数，不要求频数与解析概率完全相等。
- 不开放 LOSS、LEAKAGE、续算、测量反馈或任意 Stim 文本。Clifft 的结构化大规模性能优势没有由这个小系统 Tool 验证；纯 Clifford 纠错存储优先使用现有 QEC Tool。
- 当前 L1，`scientificValidation=not_evaluated`；首次调用可能安装固定依赖、写本地缓存。

版本和数值验证见 [接入说明](../../../docs/integrations/UNITARY_ECOSYSTEM.md)。
