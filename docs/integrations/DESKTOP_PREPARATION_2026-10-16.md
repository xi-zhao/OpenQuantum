# Desktop 原生按需准备：本地安装与验收

已将候选安装到本机正式 OpenQuantum Home，并在原版 DSH Desktop `2.0.7` 窗口中，使用用户选择的
`deepseek-v4.1-flash` 完成同一聊天四轮验收。Agent 自行选择 Skill、首次安装 Qiskit、实际执行、
同聊再次执行、窗口重开后继续执行、缺凭据引导和明确禁用拦截均有 Session event log 证据。
Pasqal 验证到原生表单保存与重开保留；没有真实账户，因此没有验证 Pasqal 认证或云端执行。
首次安装期间存在重复查询状态的问题，见下方限制。后续 `734554d2` 已修复并完成原版同聊验收，
见[准备等待验收](DESKTOP_PREPARATION_WAIT_2026-10-16.md)。本报告中的“完整退出重开”当时只有窗口恢复证据，
未记录 Host PID；后续验收通过原生重启确认与 PID 变化补齐了真正的 Host 重启，不以本报告的窗口证据替代。

实现提交：`393d6750735dfe9da8562bf3f7f71a29867b9934`；原生权限修复及已安装代码：
`bf5c32c7283c9fa0d801fca663df7d941d17c257`。任务分支：`c/desktop-native-preparation`。
实施基线为 `dbe1b9e3`，沿用既有 Codex 开发线；DSH 固定 `0.1.5-rc.1`，实际平台为 macOS arm64。
原版 Desktop 应用文件未改动。工程结果与用户科研任务的科学验收分开。

## 模型与原生权限

旧模型 `kimi-k2.7-code` 在此前 Session 返回 AUTH / HTTP 403，错误指向当前 Token 无该模型权限。
本轮同一网关的模型目录请求返回 200，目录中没有旧模型。用户明确选择 `deepseek-v4.1-flash` 后，
沿用现有受保护凭据，通过 DSH 原生 Credential Interface 和设置接口配置正式 Home。
文本生成和自动 Tool 选择均返回 200，原版窗口也完成实际 Tool 调用。
指定固定 Tool 名称的 `tool_choice` 探针返回网关 500；原生 Agent 使用的自动选择路径正常。

首次原版窗口检查发现：本地安装即使已有会话“完全权限”，仍额外返回 ask，导致 DSH 的
`approval=never` 自动拒绝。`bf5c32c7` 修复为读取原生会话权限，并在异步准备后、真正安装或本地写入前
重新检查。受限会话仍经过审批，其他宿主策略的 ask/deny 和外部写操作审批保留。
仅验收聊天使用完全权限，Desktop 新会话默认值仍为 workspace-write。

## 原版窗口与持久化证据

Session：`session-99b0e75e-9093-44eb-b91e-785fbc2c84c2`；最终从原生持久化接口读取 164 条事件。

| 场景 | 实际结果 |
| --- | --- |
| 第一轮：自然语言 Bell 电路任务 | Agent 自选 `qiskit-circuit-workbench`，准备 `run_qiskit_circuit`；仅安装所选 `mcp-qiskit`，安装收据用时 11.891 秒。加载与分析均成功：2 qubits、0 clbits、depth 2、size 2、H/CX 各 1 个 |
| 第二轮：同一聊天复用 | `analyze_circuit_tool` 再次成功，未重新安装；Pasqal 只读发现返回 `credentials_required` |
| 第三轮：窗口重开 | 回到同一聊天后直接调用同一 Qiskit Tool 成功；Pasqal 实际 prepare 返回 `credentials_required` 和 `/openquantum/settings#skill=pasqal-experiments`，未执行云端 Tool；当时未记录 Host PID，完整重启见后续验收 |
| 第四轮：原有禁止选择 | SimQN prepare 返回 `blocked`，关联 `simqn_local`；未安装、未执行、未改变禁止选择 |
| 原生凭据表单 | 设置 → 量子组件 → 凭据 → Pasqal，可直接填写 Access Token；假测试值保存成功，字段不回显；窗口重开仍显示“已保存”。验证后通过原生凭据接口移除测试值，恢复初始缺凭据状态，模型凭据保留 |
| Skill 与凭据关联 | 实际 Pasqal prepare 后，“需要填写或已保存”默认筛选显示 Pasqal 未配置卡片，用户可展开填写 |
| 资源回收 | 当时记录为调用完成与窗口重开后闲置无 Qiskit 服务残留；完整 Host 重启后的进程及租约检查由后续验收补齐。已安装 SDK 保留供下次复用 |
| 升级保留 | 25 项原有 MCP 禁用逐项一致；原 Tool/Skill 禁用集合、自定义 preset 保留，原版 Desktop `app.asar` SHA-256 不变 |

安装前建立受保护的本地备份，核对 992 个相关文件，并对设置文件与 preset 做恢复读回测试。
实际安装由原有安装器执行；不是覆盖原版 Desktop，也不复制聊天或密钥到仓库。

## 工程检查与独立复核

以下用例组有重叠，不相加作为独立覆盖总数。

| 检查 | 结果与绑定范围 |
| --- | --- |
| 本轮 Desktop 与共享准备 | 23 通过，1 个真实安装条件用例在此组跳过；原生 Session、SandboxPolicy 和 ApprovalService 覆盖允许、拒绝、权限收紧及异步竞态 |
| 本轮 Home/profile/环境兼容 | 30/30 通过 |
| 当前安装包 | 清洁代码 `bf5c32c7` 构建成功；2,671 个文件 SHA-256 全部通过；正式安装中的变更代码与候选一致 |
| 当前代码独立复核 | 对 `bf5c32c7` 的权限、异步准备和执行边界直接复核，范围内无剩余 P1/P2；定向检查 23 通过、1 跳过 |
| 前一轮包内真实流程 | 实现 `393d6750`：12/12 通过，包内 Node 24.14.1 真实安装 Qiskit，同一 Agent 两次执行，检查租约、禁用、销毁与重读 |
| 前一轮共享/Codex/发行/科学结果回归 | 实现 `393d6750`：146 通过、9 个条件用例跳过；不概括为所有平台或账户可用 |
| 静态检查 | 变更 JavaScript 的 ESLint 和差异空白检查通过；本轮最终文档仅检查链接、证据摘要与差异 |

架构与复跑入口见[设计说明](DESKTOP_PREPARATION.md)。
[版本化摘要](evidence/desktop-native-2026-10-16.json)保存代码提交、事件序号、结构化结果、资源状态与工件哈希。
原始本地证据位于 `.openquantum/desktop-install-acceptance/`，包括脱敏 Session 事件、安装和测试日志、
备份回读记录与原版窗口截图；前一轮隔离证据保留于 `.openquantum/desktop-native-acceptance/`。

## 仍需改进和未验证的范围

- 首次安装期间，Agent 重复读取状态，第一轮共 18 次 Tool 调用，其中 12 次是发现/状态查询；
  一次提前执行在事件 98 被 `preparation_required` 拦截。随后在同一轮完成加载与分析，未绕过准备检查。
  这说明端到端路径可完成，但等待期间的交互和 Token 消耗仍需改进，不能描述为无异常的一次调用流程。
- Pasqal 凭据保存与缺失拦截通过，不等于真实账户认证或设备访问通过。本轮没有云硬件调用。
- Windows、Intel Mac、全部 SDK API 和真实 QPU 未在本轮逐项实测；科学状态仍为 `not_evaluated`。

当前为已安装的本地候选；尚未推送任务分支、创建 GitHub PR、合并或发布。本地 PR 草稿已更新。
后续准备外部 PR 时需重新核对实时 `main`，并明确当前开发线中 19 项既有 Codex 前置提交的关系。
