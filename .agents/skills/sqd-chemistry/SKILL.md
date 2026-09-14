---
name: sqd-chemistry
description: 分子活性空间的采样子空间对角化，支持输入频数与可选 FCI 参照。
---

# SQD 量子化学

Agent 经 Harness 调用 sqd_local 提供的 `run_sqd_chemistry`。本 Skill 负责选择和解释，不启动计算进程。

支持结构化 H–Ne 分子、sto-3g/6-31g/cc-pvdz 基组和 activeSpace，默认仍为 H₂/STO-3G。坐标与默认键长用 Å，能量用 Hartree。提供 molecule 后仅以其 atoms/charge 构建几何，bondLengthAngstrom 不参与计算。使用闭壳层 RHF 轨道，活性电子数为偶数，固定 n_alpha=n_beta（M_s=0），不约束总自旋。活性轨道从冻结核之后连续选取。

原子数、全分子基组大小、样本数和子空间规模由用户指定。当前 PySCF 的 signed-int64 CI 字符串要求活性轨道少于 64，这是后端编码要求。counts 位宽为 2×活性轨道数，位序 beta(n−1)…beta0 alpha(n−1)…alpha0，保留前导零。maxSubspaceDimension 是每个自旋子空间的上限。HF 构型始终包含，未提供 counts 时使用标记为 synthetic_uniform 的合成样本。

返回冻结核数、活性轨道索引、电子数和能量偏移；coreEnergyOffsetHartree 已包含核排斥能，不再重复相加。FCI 参照对象是同一活性空间 Hamiltonian。超出 JSON 精确整数表示的行列式维数返回十进制字符串。

referenceMode 默认 auto，自动为适合直接比较的算例运行精确参考；required 显式运行参考，skip 跳过。未运行时 reference.status=not_run，参考值和差异为 null。默认参考选择范围不限制功能或主计算规模。

输入示例：

```json
{
  "bondLengthAngstrom": 0.735
}
```

调用前确认用户问题落在上述范围内；参数含糊且会改变物理结果时先澄清。接口不接受代码、路径、凭据或真实硬件任务。
execution 指定工作进程 timeoutMs、maxOutputBytes 与 threads；默认 180000 ms、2 MiB、1 线程。timeoutMs=0 关闭工作进程定时器。Harness MCP 连接的请求超时在设置中心单独配置；长任务需相应调整。每个连接一次运行一个动作，取消会结束计算进程组。
首次使用可能准备固定依赖或缓存，因此最大副作用为 workspace-write。工具未注册或连接已禁用时，检查设置中心；不要用通用执行工具绕过禁用。
依赖尚未准备时按仓库文档运行 `npm run capability:paper-tools:setup`；保持固定依赖版本，依据返回错误调整输入或执行配置。

所有结果保留完整输入、输入摘要、上游版本和依赖锁摘要。报告实际数值、物理假设、误差与限制；
`scientificValidation=not_evaluated`，比较数据不构成中央科学验收。失败时说明真实原因，不补造数据。

执行配置见[计算工具使用说明](../../../docs/integrations/SCALABLE_BRIDGES.md)。来源与接入范围见 [论文能力说明](../../../docs/integrations/PAPER_BACKED_TOOLS.md)。
