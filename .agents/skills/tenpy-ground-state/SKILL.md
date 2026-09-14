---
name: tenpy-ground-state
description: 自旋链 DMRG 基态、磁化与纠缠熵计算，可选精确对角化参照。
---

# TeNPy 多体基态

Agent 经 Harness 调用 tenpy_local 提供的 `solve_tenpy_chain`。本 Skill 负责选择和解释，不启动计算进程。

运行 spin-1/2 XYZ 开放链的 two-site DMRG，计算能量、磁化、纠缠熵与收敛信息。S=Pauli/2；H = Σ(Jx SxSx + Jy SySy + Jz SzSz) − Σ(hx Sx + hz Sz)。站点数、bond dimension 和 sweeps 由用户指定，不设置与本地实测规模绑定的上限。criteriaMet 表示 sweep 判据满足，不代表全局基态证明。

referenceMode 默认 auto，自动为适合直接比较的算例运行精确参考；required 显式运行参考，skip 跳过。未运行时 reference.status=not_run，参考值和差异为 null。默认参考选择范围不限制功能或主计算规模。

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
execution 指定工作进程 timeoutMs、maxOutputBytes 与 threads；默认 180000 ms、2 MiB、1 线程。timeoutMs=0 关闭工作进程定时器。Harness MCP 连接的请求超时在设置中心单独配置；长任务需相应调整。每个连接一次运行一个动作，取消会结束计算进程组。
首次使用可能准备固定依赖或缓存，因此最大副作用为 workspace-write。工具未注册或连接已禁用时，检查设置中心；不要用通用执行工具绕过禁用。
依赖尚未准备时按仓库文档运行 `npm run capability:paper-tools:setup`；保持固定依赖版本，依据返回错误调整输入或执行配置。

所有结果保留完整输入、输入摘要、上游版本和依赖锁摘要。报告实际数值、物理假设、误差与限制；
`scientificValidation=not_evaluated`，比较数据不构成中央科学验收。失败时说明真实原因，不补造数据。

执行配置见[计算工具使用说明](../../../docs/integrations/SCALABLE_BRIDGES.md)。来源与接入范围见 [论文能力说明](../../../docs/integrations/PAPER_BACKED_TOOLS.md)。
