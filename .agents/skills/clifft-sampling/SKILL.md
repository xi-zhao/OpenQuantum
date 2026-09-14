---
name: clifft-sampling
description: 用 Clifft 运行 Clifford+T 电路带噪采样，分析位串分布并可选密度矩阵参考。
---

# Clifft 近 Clifford 采样

调用 Harness 注册的 `clifft_local.sample_clifft_circuit`，进行 T 门干涉、Clifford+T 电路与门后去极化噪声实验。

- 提交结构化 gates，支持 H、S、T、X、Y、Z、CX、CZ；CX/CZ targets 依次为控制位、目标位。量子位数、门数与 shots 由用户选择。
- 初态全零，每个门后对涉及的各量子位独立施加 DEPOLARIZE1(p)，p 是 Pauli 错误总概率。
- 最终 Z 测量，位串从左到右为 q0、q1……。计算参考时返回完整分布（complete）；否则返回实际出现的位串（observed_only），总频数始终等于 shots。
- referenceMode 默认 auto，为默认小算例计算密度矩阵参考；required 显式运行参考，skip 跳过。未运行时 reference.status=not_run，参考概率、TVD 和 trace error 为 null。
- peakActiveWidth 报告编译后实际活跃宽度；maxActiveWidth 是用户可选的限制，省略则不额外限制。
- execution 控制 timeoutMs、maxOutputBytes、threads；默认 180000 ms、2 MiB、1 线程。timeoutMs=0 关闭工作进程定时器。长任务同时在设置中心调整 Harness MCP 连接的请求超时。
- 当前接口使用结构化门与最终测量；LOSS、LEAKAGE、测量反馈和任意 Stim 文本属于其他接口需求。首次调用可能准备固定依赖和缓存；结果 scientificValidation=not_evaluated。

参数与执行配置见[计算工具使用说明](../../../docs/integrations/SCALABLE_BRIDGES.md)，版本与数值算例见[接入说明](../../../docs/integrations/UNITARY_ECOSYSTEM.md)。
