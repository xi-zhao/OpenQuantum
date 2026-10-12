---
name: fieldqkit-hardware
description: 使用 FieldQuantum fieldqkit 统一检查和发现夸父、天衍、国盾、腾讯、本源、FieldQuantum、逻辑比特等量子云后端。用于查询已配置的国内量子平台、筛选满足量子位数量的硬件、解释凭证缺口和规划后端选择；不得在用户明确批准前提交、取消或删除真实量子任务。
---

# FieldQKit Hardware

<!-- BEGIN NATIVE SDK ACCESS -->
## 原生 SDK 路径

本能力同时支持 **FieldQKit 的原生公开 API**。用户需要 QuantumHardwareClient、provider runtime 与供应商后端协议 时，由 Agent 在固定依赖环境中编写和运行任务代码，不限于下文便捷 Tool 的预设模型。

使用 `node scripts/sdk-access.mjs inspect fieldqkit-hardware` 定位环境，按[完整 SDK 工作流](../quantum-sdk-workbench/references/workflow.md)执行。模块导航：`fieldqkit`；导航不是 API 白名单。

本地程序构建与外部调用分开；账户、凭据、费用、设备操作和数据外发沿用宿主及用户授权。原生 SDK 访问不自动启用服务。

下文关于模型、门集、输入与预算的限制描述便捷 Tool 的合同；原生 SDK 另受上游版本、可选依赖、宿主资源与用户授权约束。已禁用或被拒绝的动作不能借代码路径绕过。执行状态和科研验收分别报告。
<!-- END NATIVE SDK ACCESS -->


相近入口、后端准备与位序差异按[共同选择说明](../../../docs/integrations/CAPABILITY_SELECTION.md)判断。

## 工作流

1. 先调用 `inspect_fieldqkit_setup`，确认目标 Provider 的凭证是否已在 OpenQuantum 设置中心配置。
2. 凭证缺失时，明确告诉用户前往“设置中心 → 量子组件 → 安全凭据”；不要索要或回显 Token。
3. 需要选择硬件时调用 `discover_fieldqkit_backends`，传入最小量子位数和可选芯片偏好。
4. 把返回的 Provider、芯片名、量子位数、耦合拓扑和校准摘要作为事实解释，不推断未返回的可用性、成本或排队时间。
5. 当前两个 MCP-exposed Tool 不会改变云端状态或提交任务；后端发现使用显式准备的环境，可能写 SDK 缓存并访问所选云端，因此其最大副作用声明为 `workspace-write`，不能称为端到端 `read-only`。
6. 不要通过 Bash、Python 或其他 Tool 绕过它们提交真实量子任务。

## 边界

- 复用 DeepSeek Harness 的 Skill Registry、Harness MCP Client、凭据库和 Session，不创建独立 Runtime。
- 本 Skill 不读取凭据值；FieldQKit MCP Server 仅能看到 Harness 注入的环境变量，并只返回“已配置/未配置”。
- 远程后端发现可能访问量子云；失败时保留 Provider 的原始错误语义，但不得泄露请求头或 Token。
- 真实 QPU 提交、取消、付费任务和数据外发尚未开放。后续必须通过 Harness 审批与可审计 Tool 才能增加。
- Qiskit 电路分析与转译优先使用 `qiskit-circuit-workbench`；严格二量子位基态验收使用 `quantum-ground-state`。

Provider 与凭据对应关系见 [references/providers.md](references/providers.md)。

## 依赖准备

运行前执行 `node scripts/setup-paper-tools.mjs fieldqkit-hardware`。缺失、旧锁和已安装环境的处理见[共同准备说明](../../../docs/integrations/LOCAL_ENVIRONMENTS.md)；Tool 不自动安装或升级依赖。
