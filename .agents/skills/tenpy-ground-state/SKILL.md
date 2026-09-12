---
name: tenpy-ground-state
description: 有限自旋链 DMRG 基态计算，并与小系统精确对角化比较。
---

# TeNPy 多体基态

Agent 经 Harness 调用 tenpy_local 提供的 `solve_tenpy_chain`。本 Skill 负责选择和解释，不启动计算进程。

3–10 个 spin-1/2 站点，S=Pauli/2；H = Σ(Jx SxSx + Jy SySy + Jz SzSz) - Σ(hx Sx + hz Sz)，开放边界。最多 64 bond dimension、20 sweeps。低 bond 或有限 sweeps 可以未收敛；报告 energyError，不将执行结束等同于基态正确。

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
