---
name: tenpy-ground-state
description: 有限自旋链 DMRG 基态计算，并与小系统精确对角化比较。
---

# TeNPy 多体基态

Agent 经 Harness 调用 tenpy_local 提供的 `solve_tenpy_chain`。本 Skill 负责选择和解释，不启动计算进程。

3–256 个 spin-1/2 站点，S=Pauli/2；H = Σ(Jx SxSx + Jy SySy + Jz SzSz) - Σ(hx Sx + hz Sz)，开放边界。最多 256 bond dimension、100 sweeps，且 numSites×maxBondDimension²≤4194304。精确对角化参考至 10 站点；更大链直接运行 DMRG，报告能量、磁化、纠缠熵、sweep 收敛条件和截断误差。criteriaMet 仅表示局部 sweep 判据满足，不保证全局基态。

独立参考使用 referenceMode=auto|required|skip：auto 在参考预算内计算，required 在超限时明确报错，skip 主动跳过。未运行时 reference.status=not_run，参考值和差异均为 null；不将缺失参考解释为零误差或通过验证。接口资源上限与本地实测覆盖分别见[计算规模与参考检查](../../../docs/integrations/SCALABLE_BRIDGES.md)。

输入示例：

```json
{
  "numSites": 4,
  "jx": 1,
  "jy": 1,
  "jz": 1
}
```

调用前确认用户问题落在上述范围内；参数含糊且会改变物理结果时先澄清。接口不接受代码、路径、凭据或真实硬件任务。
单次计算上限 180 秒，每个连接一次只运行一个动作；超时/取消会结束整个计算进程组。
首次使用可能准备固定依赖或缓存，因此最大副作用为 workspace-write。工具未注册或连接已禁用时，检查设置中心；不要用通用执行工具绕过禁用。
依赖尚未准备时按仓库文档运行 `npm run capability:paper-tools:setup`；不要自行改版本或扩大输入边界来绕过失败。

所有结果保留完整输入、输入摘要、上游版本和依赖锁摘要。报告实际数值、物理假设、误差与限制；
`scientificValidation=not_evaluated`，比较数据不构成中央科学验收。失败时说明真实原因，不补造数据。

来源与接入范围见 [论文能力说明](../../../docs/integrations/PAPER_BACKED_TOOLS.md)。
