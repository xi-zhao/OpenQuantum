---
name: tjm-dynamics
description: 开放 Ising 链的张量跳跃轨迹，与密度矩阵 Lindblad 演化比较。
---

# TJM 开放系统动力学

<!-- BEGIN NATIVE SDK ACCESS -->
## 原生 SDK 路径

本能力同时支持 **MQT YAQS 的原生公开 API**。用户需要 自定义 MPS/MPO、电路、噪声模型、时间演化与张量跳跃 时，由 Agent 在固定依赖环境中编写和运行任务代码，不限于下文便捷 Tool 的预设模型。

使用 `node scripts/sdk-access.mjs inspect tjm-dynamics` 定位环境，按[完整 SDK 工作流](../quantum-sdk-workbench/references/workflow.md)执行。模块导航：`mqt.yaqs`；导航不是 API 白名单。

下文关于模型、门集、输入与预算的限制描述便捷 Tool 的合同；原生 SDK 另受上游版本、可选依赖、宿主资源与用户授权约束。已禁用或被拒绝的动作不能借代码路径绕过。执行状态和科研验收分别报告。
<!-- END NATIVE SDK ACCESS -->


Agent 经 Harness 调用 tjm_local 提供的 `simulate_tjm_dynamics`。本 Skill 负责选择和解释，不启动计算进程。

至少 2 个量子位、初态全零、开放链。H = -J ΣZZ - g ΣX，跳跃算符 sqrt(gamma)|0><1|，hbar=1。时间与速率用一致单位。量子位数、时间网格、轨迹数与 bond dimension 由输入决定；standardErrors 仅含有限轨迹抽样误差，不含步长与张量截断偏差。无随机跳跃时标准误为零；含噪声但只有一条轨迹时，返回 standardErrors=null 和 standardErrorStatus=insufficient_trajectories。

独立参考使用 `referenceMode=auto|required|skip`：auto 按默认阈值选择参考，required 使用调用方资源尝试所请求规模，skip 跳过。未执行时 `reference.status=not_run`，参考值和差异为 null；尝试后失败会返回错误。

输入示例：

```json
{
  "numQubits": 3,
  "steps": 10,
  "trajectories": 32
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

运行前执行 `node scripts/setup-paper-tools.mjs tjm-dynamics`。缺失、旧锁和已安装环境的处理见[共同准备说明](../../../docs/integrations/LOCAL_ENVIRONMENTS.md)；Tool 不自动安装或升级依赖。
