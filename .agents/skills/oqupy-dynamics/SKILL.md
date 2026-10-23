---
name: oqupy-dynamics
description: 使用 OQuPy TEMPO 求解Ohmic spin-boson 非马尔可夫动力学，解释时间步长、环境记忆和张量截断对结果的影响。
---

# OQuPy 环境记忆动力学

<!-- BEGIN NATIVE SDK ACCESS -->
## 原生 SDK 路径

本能力同时支持 **OQuPy 的原生公开 API**。用户需要 自定义 System、Bath、相关函数、TEMPO、process tensor 与控制 时，由 Agent 在固定依赖环境中编写和运行任务代码，不限于下文便捷 Tool 的预设模型。

使用 `node scripts/sdk-access.mjs inspect oqupy-dynamics` 定位环境，按[完整 SDK 工作流](../quantum-sdk-workbench/references/workflow.md)执行。模块导航：`oqupy`；导航不是 API 白名单。

下文关于模型、门集、输入与预算的限制描述便捷 Tool 的合同；原生 SDK 另受上游版本、可选依赖、宿主资源与用户授权约束。已禁用或被拒绝的动作不能借代码路径绕过。执行状态和科研验收分别报告。
<!-- END NATIVE SDK ACCESS -->


调用 Harness 注册的 `oqupy_local.simulate_oqupy_spin_boson`。用于需要环境记忆的两能级模型；纯 Markovian Lindblad 参数扫描可使用 Dynamiqs。

模型为 `H=(tunneling X+bias Z)/2`，系统与环境的耦合算符为 `Z/2`，`J(w)=2 alpha w exp(-w/cutoff)`，`hbar=kB=1`。初态是用户所选计算基态/激发态/plus 与热 Gaussian bath 的因子化状态；这些标签不是相互作用系统的平衡态。

- 先明确频率、温度和时间的同一单位体系。步数、环境记忆步数、耦合强度和时长由输入决定；记忆步数不能超过演化步数。
- `memoryTime = memorySteps * duration / steps`。减小时间步长时要相应增大 memorySteps 才能保持同一物理记忆；若资源边界不允许，明确说明无法进行该收敛比较。
- 用独立的记忆长度扫描判断记忆截断影响，再看时间网格与 SVD 截断。固定 `epsrel=1e-7` 不是观测量误差上界。
- 读取 Bloch 轨迹、迹误差和最小本征值；有限记忆 TEMPO 不能自动宣称数值收敛、精确解或科学验收。
- 本能力为 L1，`scientificValidation=not_evaluated`。依赖须显式准备；计算可能写缓存；独立环境保留 OQuPy 所需 NumPy 1.x。

安装、范围和解析对照见 [接入说明](../../../docs/integrations/UNITARY_ECOSYSTEM.md)。

spin-boson 模型的演化时间、时间网格和记忆长度由调用方选择，适配器不额外设置人工规模上限。具体资源配置见[本地计算说明](../../../docs/integrations/SCALABLE_BRIDGES.md)。

## 依赖准备

运行前执行 `node scripts/setup-paper-tools.mjs oqupy-dynamics`。缺失、旧锁和已安装环境的处理见[共同准备说明](../../../docs/integrations/LOCAL_ENVIRONMENTS.md)；Tool 不自动安装或升级依赖。
