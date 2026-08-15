---
name: fieldqkit-hardware
description: 使用 FieldQuantum fieldqkit 统一检查和发现夸父、天衍、国盾、腾讯、本源、FieldQuantum、逻辑比特等量子云后端。用于查询已配置的国内量子平台、筛选满足量子位数量的硬件、解释凭证缺口和规划后端选择；不得在用户明确批准前提交、取消或删除真实量子任务。
---

# FieldQKit Hardware

## 工作流

1. 先调用 `inspect_fieldqkit_setup`，确认目标 Provider 的凭证是否已在 OpenQuantum 设置中心配置。
2. 凭证缺失时，明确告诉用户前往“设置中心 → MCP 服务 → 安全凭据”；不要索要或回显 Token。
3. 需要选择硬件时调用 `discover_fieldqkit_backends`，传入最小量子位数和可选芯片偏好。
4. 把返回的 Provider、芯片名、量子位数、耦合拓扑和校准摘要作为事实解释，不推断未返回的可用性、成本或排队时间。
5. 当前 MCP 只开放只读配置检查和后端发现；不要通过 Bash、Python 或其他工具绕过它提交真实量子任务。

## 边界

- 复用 DeepSeek Harness 的 Skill、MCP Client、凭据库和 Session，不创建独立 Runtime。
- 本 Skill 不读取凭据值；MCP 仅能看到 Harness 注入的环境变量，并只返回“已配置/未配置”。
- 远程后端发现可能访问量子云；失败时保留 Provider 的原始错误语义，但不得泄露请求头或 Token。
- 真实 QPU 提交、取消、付费任务和数据外发尚未开放。后续必须通过 Harness 审批与可审计 Tool 才能增加。
- Qiskit 电路分析与转译优先使用 `qiskit-circuit-workbench`；严格二量子位基态验收使用 `quantum-ground-state`。

Provider 与凭据对应关系见 [references/providers.md](references/providers.md)。
