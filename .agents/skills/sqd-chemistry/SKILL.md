---
name: sqd-chemistry
description: 分子活性空间的采样子空间对角化，支持输入频数与可选 FCI 参照。
---

# SQD 量子化学

Agent 经 Harness 调用 sqd_local 提供的 `run_sqd_chemistry`。本 Skill 负责选择和解释，不启动计算进程。

支持结构化分子、已安装 PySCF 目录中的命名基组和可选 activeSpace；默认 H₂/STO-3G。坐标用 Å，能量用 Hartree。提供 molecule 后以其 atoms/charge 构建分子，默认键长不参与几何。使用闭壳层 RHF 轨道，活性电子数为偶数，n_alpha=n_beta 固定 M_s=0，不约束总自旋；活性轨道从冻结核之后连续选取。轨道数、样本数和子空间尺寸由用户选择。当前 PySCF 的 CI 位串使用 int64，活性空间轨道数须小于 64；分子全空间可以更大。

counts 位宽为 2×活性空间轨道数，位序 beta(n-1)…beta0 alpha(n-1)…alpha0，保留前导零；总频数由输入决定。maxSubspaceDimension 是每个自旋子空间上限，乘积才是总子空间上限。返回冻结核数、活性轨道索引、电子数和能量偏移；coreEnergyOffsetHartree 已包含核排斥能，不能再加 nuclearEnergyHartree。FCI 默认在活性轨道≤12 且行列式维数≤10000 时自动运行，required 可请求更大参考，参照对象是同一活性空间 Hamiltonian。未提供 counts 时明确标记 synthetic_uniform；HF 构型始终包含。不得把合成样本或 FCI 一致性称为量子优势。

独立参考使用 `referenceMode=auto|required|skip`：auto 按默认阈值选择参考，required 使用调用方资源尝试所请求规模，skip 跳过。未执行时 `reference.status=not_run`，参考值和差异为 null；尝试后失败会返回错误。

输入示例：

```json
{
  "bondLengthAngstrom": 0.735
}
```

调用前确认用户问题落在上述范围内；参数含糊且会改变物理结果时先澄清。接口不接受代码、路径、凭据或真实硬件任务。
计算 worker 默认不设置时间或输出大小上限；部署可配置资源预算，取消会终止本次计算进程组。连接层超时与硬件环境配置见[资源配置](../../../docs/integrations/SCALABLE_BRIDGES.md)。
计算前显式准备固定依赖；运行仍可能写 SDK 缓存，因此保留 workspace-write。工具未注册或连接已禁用时，检查设置中心；不要用通用执行工具绕过禁用。
依赖尚未准备时按仓库文档运行 `npm run capability:paper-tools:setup`；不要自行改版本或扩大输入边界来绕过失败。

所有结果保留完整输入、输入摘要、上游版本和依赖锁摘要。报告实际数值、物理假设、误差与限制；
`scientificValidation=not_evaluated`，比较数据不构成中央科学验收。失败时说明真实原因，不补造数据。

来源与接入范围见 [论文能力说明](../../../docs/integrations/PAPER_BACKED_TOOLS.md)。

## 依赖准备

运行前执行 `node scripts/setup-paper-tools.mjs sqd-chemistry`。缺失、旧锁和已安装环境的处理见[共同准备说明](../../../docs/integrations/LOCAL_ENVIRONMENTS.md)；Tool 不自动安装或升级依赖。
