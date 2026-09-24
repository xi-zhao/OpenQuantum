---
name: tenpy-ground-state
description: 有限自旋链 DMRG 基态计算，并与小系统精确对角化比较。
---

# TeNPy 多体基态

Agent 经 Harness 调用 tenpy_local 提供的 `solve_tenpy_chain`。本 Skill 负责选择和解释，不启动计算进程。

至少 3 个 spin-1/2 站点，S=Pauli/2；H = Σ(Jx SxSx + Jy SySy + Jz SzSz) - Σ(hx Sx + hz Sz)，开放边界。站点数、bond dimension 与 sweeps 由输入决定。报告能量、磁化、纠缠熵、sweep 收敛条件和截断误差。criteriaMet 表示局部 sweep 判据，不保证全局基态。

独立参考使用 `referenceMode=auto|required|skip`：auto 按默认阈值选择参考，required 使用调用方资源尝试所请求规模，skip 跳过。未执行时 `reference.status=not_run`，参考值和差异为 null；尝试后失败会返回错误。

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
计算 worker 默认不设置时间或输出大小上限；部署可配置资源预算，取消会终止本次计算进程组。连接层超时与硬件环境配置见[资源配置](../../../docs/integrations/SCALABLE_BRIDGES.md)。
计算前显式准备固定依赖；运行仍可能写 SDK 缓存，因此保留 workspace-write。工具未注册或连接已禁用时，检查设置中心；不要用通用执行工具绕过禁用。
依赖尚未准备时按仓库文档运行 `npm run capability:paper-tools:setup`；不要自行改版本或扩大输入边界来绕过失败。

所有结果保留完整输入、输入摘要、上游版本和依赖锁摘要。报告实际数值、物理假设、误差与限制；
`scientificValidation=not_evaluated`，比较数据不构成中央科学验收。失败时说明真实原因，不补造数据。

来源与接入范围见 [论文能力说明](../../../docs/integrations/PAPER_BACKED_TOOLS.md)。

## 依赖准备

运行前执行 `node scripts/setup-paper-tools.mjs tenpy-ground-state`。缺失、旧锁和已安装环境的处理见[共同准备说明](../../../docs/integrations/LOCAL_ENVIRONMENTS.md)；Tool 不自动安装或升级依赖。
