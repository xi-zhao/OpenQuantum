---
name: sqd-chemistry
description: 分子活性空间的采样子空间对角化，支持输入频数与可选 FCI 参照。
---

# SQD 量子化学

Agent 经 Harness 调用 sqd_local 提供的 `run_sqd_chemistry`。本 Skill 负责选择和解释，不启动计算进程。

支持结构化 H–Ne 分子、sto-3g/6-31g/cc-pvdz 基组和可选 activeSpace；默认仍为 H₂/STO-3G。坐标与默认 H₂ 键长用 Å，能量用 Hartree。提供 molecule 后仅以其 atoms/charge 构建分子，bondLengthAngstrom 不参与几何。仅使用闭壳层 RHF 轨道，活性空间含 2–32 个空间轨道和偶数电子；n_alpha=n_beta 固定 M_s=0，不约束总自旋。活性轨道从冻结核之后连续选取；最多 128 个全分子空间轨道，并检查轨道数与子空间维数的联合预算。

counts 位宽为 2×活性空间轨道数，位序 beta(n-1)…beta0 alpha(n-1)…alpha0，保留前导零；总 counts≤4096。maxSubspaceDimension 是每个自旋子空间上限，乘积才是总子空间上限。返回冻结核数、活性轨道索引、电子数和能量偏移；coreEnergyOffsetHartree 已包含核排斥能，不能再加 nuclearEnergyHartree。FCI 仅在活性轨道≤12 且行列式维数≤10000 时可运行，参照对象是同一活性空间 Hamiltonian。未提供 counts 时明确标记 synthetic_uniform；HF 构型始终包含。不得把合成样本或 FCI 一致性称为量子优势。

独立参考使用 referenceMode=auto|required|skip：auto 在参考预算内计算，required 在超限时明确报错，skip 主动跳过。未运行时 reference.status=not_run，参考值和差异均为 null；不将缺失参考解释为零误差或通过验证。接口资源上限与本地实测覆盖分别见[计算规模与参考检查](../../../docs/integrations/SCALABLE_BRIDGES.md)。

输入示例：

```json
{
  "bondLengthAngstrom": 0.735
}
```

调用前确认用户问题落在上述范围内；参数含糊且会改变物理结果时先澄清。接口不接受代码、路径、凭据或真实硬件任务。
单次计算上限 180 秒，每个连接一次只运行一个动作；超时/取消会结束整个计算进程组。
首次使用可能准备固定依赖或缓存，因此最大副作用为 workspace-write。工具未注册或连接已禁用时，检查设置中心；不要用通用执行工具绕过禁用。
依赖尚未准备时按仓库文档运行 `npm run capability:paper-tools:setup`；不要自行改版本或扩大输入边界来绕过失败。

所有结果保留完整输入、输入摘要、上游版本和依赖锁摘要。报告实际数值、物理假设、误差与限制；
`scientificValidation=not_evaluated`，比较数据不构成中央科学验收。失败时说明真实原因，不补造数据。

来源与接入范围见 [论文能力说明](../../../docs/integrations/PAPER_BACKED_TOOLS.md)。
