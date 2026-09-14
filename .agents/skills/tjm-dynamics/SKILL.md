---
name: tjm-dynamics
description: 开放 Ising 链的张量跳跃轨迹，与密度矩阵 Lindblad 演化比较。
---

# TJM 开放系统动力学

Agent 经 Harness 调用 tjm_local 提供的 `simulate_tjm_dynamics`。本 Skill 负责选择和解释，不启动计算进程。

运行开放 Ising 链的张量跳跃轨迹，初态全零；H = −J ΣZZ − g ΣX，跳跃算符 sqrt(gamma)|0><1|，hbar=1。系统规模、时间网格、轨迹数和 bond dimension 由用户指定。时间和速率采用一致单位。standardErrors 描述抽样标准误；单条随机轨迹返回 null 与 insufficient_trajectories，无噪声确定性演化返回零和 deterministic。

referenceMode 默认 auto，自动为适合直接比较的算例运行精确参考；required 显式运行参考，skip 跳过。未运行时 reference.status=not_run，参考值和差异为 null。默认参考选择范围不限制功能或主计算规模。

输入示例：

```json
{
  "numQubits": 3,
  "steps": 10,
  "trajectories": 32
}
```

调用前确认用户问题落在上述范围内；参数含糊且会改变物理结果时先澄清。接口不接受代码、路径、凭据或真实硬件任务。
execution 指定工作进程 timeoutMs、maxOutputBytes 与 threads；默认 180000 ms、2 MiB、1 线程。timeoutMs=0 关闭工作进程定时器。Harness MCP 连接的请求超时在设置中心单独配置；长任务需相应调整。每个连接一次运行一个动作，取消会结束计算进程组。
首次使用可能准备固定依赖或缓存，因此最大副作用为 workspace-write。工具未注册或连接已禁用时，检查设置中心；不要用通用执行工具绕过禁用。
依赖尚未准备时按仓库文档运行 `npm run capability:paper-tools:setup`；保持固定依赖版本，依据返回错误调整输入或执行配置。

所有结果保留完整输入、输入摘要、上游版本和依赖锁摘要。报告实际数值、物理假设、误差与限制；
`scientificValidation=not_evaluated`，比较数据不构成中央科学验收。失败时说明真实原因，不补造数据。

执行配置见[计算工具使用说明](../../../docs/integrations/SCALABLE_BRIDGES.md)。来源与接入范围见 [论文能力说明](../../../docs/integrations/PAPER_BACKED_TOOLS.md)。
