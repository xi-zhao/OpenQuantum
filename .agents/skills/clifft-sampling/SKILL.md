---
name: clifft-sampling
description: 用固定 Clifft 对 Clifford+T 电路做带噪采样或 Stim 格式的纠错记录采样，按活跃宽度控制成本，可选最终测量密度矩阵参考。
---

# Clifft 近 Clifford 采样

结构化最终测量调用 Harness 注册的 `clifft_local.sample_clifft_circuit`。用于 T 门干涉、Clifford+T 电路和门后去极化噪声实验。

- 提交结构化 `gates`，仅支持 H、S、T、X、Y、Z、CX、CZ；CX/CZ 的 targets 顺序为控制位、目标位。量子位数、门数和 shots 由输入决定。maxActiveWidth 默认为 null；只有用户显式设置该预算时才按实际 peakActiveWidth 检查。
- 初态固定为全零态；每个门后，在该门涉及的各量子位独立施加 `DEPOLARIZE1(p)`。`p` 是 Pauli 错误总概率，不是直接乘在密度矩阵上的白噪声混合系数。
- 只做最终 Z 测量，位串从左到右为 q0、q1……。密度矩阵参考运行时返回完整位串（complete）；跳过参考时仅返回实际出现的位串（observed_only），频数之和仍等于 shots。
- referenceMode=auto|required|skip；独立密度矩阵参考默认在 6 qubits 内自动运行；required 尝试所请求规模；skip 主动跳过。未运行时 reference.status=not_run，参考概率、TVD、trace error 均为 null。密度矩阵参考描述相同的噪声模型；采样频数仍有有限 shots 不确定度。比较 total variation distance 时结合样本数，不要求频数与解析概率完全相等。
- 该结构化接口不开放中间测量、反馈或 Stim 文本；需要记录采样时使用下述独立 Tool。
- 当前 L1，`scientificValidation=not_evaluated`；依赖须显式准备；计算可能写本地缓存。

## Stim 格式的纠错记录采样

调用同一连接的 `clifft_local.sample_clifft_qec`，提交 `stimCircuit`、`shots`、`seed` 和可选 `maxActiveWidth`、`execution`。

- 接受文档列出的 Stim 指令子集及 T/T_DAG；支持 reset、REPEAT、DETECTOR、OBSERVABLE_INCLUDE，并已验证 `CX rec[-1]` 反馈。各门可用目标仍由固定后端检查，不承诺所有记录控制组合。
- 返回每个 shot 的 measurements、detectors、observables 位串。测量按记录次序排列，detector 按声明次序排列，observable 按 ID 排列；不要按量子位编号重排中间记录。
- detector/observable 是原始测量奇偶值，未减去理想参考。非零值不自动表示错误；没有生成 DEM、匹配权重或逻辑错误率。接解码器前必须另行定义参考与模型。
- 仅 CPU 固定 shots；拒绝 LOSS、LEAKAGE、后选择和期望值记录。纯 Clifford 纠错存储与 MWPM 解码优先使用已有 QEC Tool。
- 该路径没有独立科学 Validator，scientificValidation 仍为 not_evaluated。线路规模与资源设置由调用方选择，活跃宽度预算仅在显式设置时检查。

新接口的完整输入输出、允许指令与验证见[互操作接入](../../../docs/integrations/QUANTUM_INTEROP.md)。

资源预算与实测规模见[计算规模与参考检查](../../../docs/integrations/SCALABLE_BRIDGES.md)。版本和数值验证见 [接入说明](../../../docs/integrations/UNITARY_ECOSYSTEM.md)。

## 依赖准备

运行前执行 `node scripts/setup-paper-tools.mjs clifft-sampling`。缺失、旧锁和已安装环境的处理见[共同准备说明](../../../docs/integrations/LOCAL_ENVIRONMENTS.md)；Tool 不自动安装或升级依赖。
