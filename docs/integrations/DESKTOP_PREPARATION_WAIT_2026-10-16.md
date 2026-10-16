# Desktop 准备等待：原版同聊验收

已将 `734554d2c7cb78ded1be2c8c57e3cfa9b9fab701` 安装到本机正式 OpenQuantum Home，
并在原版 DSH Desktop `2.0.7`、DSH `0.1.5-rc.1`、macOS arm64 上完成验证。
模型沿用用户选定的 `deepseek-v4.1-flash`，模型路由与凭据没有变更。

准备 Tool 现在在一次调用内等待安装与检查，成功才返回 `ready`，然后 Agent 执行任务。
真实首次准备等待 9.237 秒，期间没有额外 Tool 调用，也没有提前执行。
原生窗口的同一聊天完成了 Skill 选择、安装、执行、完整重启后的复用、缺凭据引导与禁用拦截。

## 修复范围

旧准备动作启动安装后立即返回 `preparing`，描述还要求模型查询进度，导致每次查询都再次请求模型。
本次复用共享安装器和已有收据，用 Node 可取消的定时等待留在原生 Tool 调用内，不增加新 Runtime。
设置页与 Codex 的异步安装接口保持原有行为；原生 Skill 与 Tool 说明统一为等待完成后再执行。

等待期间持续检查明确禁用与凭据；失败不自动重试。取消、等待超时或 Agent 关闭时，
只取消本次调用启动的安装，并等待子进程退出。另一聊天或调用加入已有安装时，不能取消安装发起者的任务。
依赖安装不执行科学计算，计算服务仍在实际 Tool 调用时才启动，并按既有规则回收。

## 原版窗口与同一聊天

Session：`session-99b0e75e-9093-44eb-b91e-785fbc2c84c2`。
完整原生持久化日志与逐项事件摘要见[版本化证据](evidence/desktop-preparation-wait-2026-10-16.json)。

| 场景 | 实际结果 |
| --- | --- |
| 首次选择 | 第 6 轮，Agent 为电路等价任务选择 `quantum-circuit-verification`；事件 233 确认环境尚未准备 |
| 一次准备 | 事件 237 调用准备，事件 238 在 9.237 秒后返回 `ready`；收据安装耗时 8.638 秒；中间没有其他 Tool 调用 |
| 同聊执行 | 事件 242 才调用 `verify_circuit_equivalence`；事件 243 返回 MQT QCEC 3.10.0 的 `equivalent` 分类 |
| 完整重启后复用 | 通过原生“重启 → 重启应用”确认，Host PID 从 64757 变为 66079；第 7 轮原聊天直接执行成功，安装 job ID 未变 |
| 缺凭据 | 事件 263 的 Pasqal 准备返回 `credentials_required` 和 `/openquantum/settings#skill=pasqal-experiments`；未安装相关 SDK、未访问云端 |
| 明确禁用 | 事件 268 的 SimQN 准备返回 `blocked`；原有 `simqn_local` 禁用保持，未准备或执行 |
| 资源回收 | 结束后实际安装器与计算进程为 0；Qiskit、PyZX、QCEC 的租约均为空；已安装 SDK 留作复用 |
| 配置保留 | 6 份配置、原生凭据和 preset 文件逐字节摘要一致，25 项原有 MCP 禁用及 Tool/Skill 禁用集合不变；Qiskit 原安装 job ID 未变；原版应用摘要不变 |

首次准备与执行共 4 次 Tool 调用：加载 Skill、发现、准备、执行。
此前 Qiskit 首次安装轮有 18 次调用，含 12 次发现，其中 10 次发生在准备之后，还有一次 Job 查询和一次被拒绝的提前执行。
本次准备后的发现、Job 查询和提前执行均为 0。两轮任务与上下文不同，这些计数证明轮询被消除，
不作为严格 Token 节省比例或总耗时对照实验。

### Host 重启与先前记录的更正

本次安装后最初重开窗口时，旧 Host PID 36941 仍在运行。第 5 轮 PyZX 因此加载了旧 Skill 说明，
仍返回 `preparing` 并轮询；该轮不计为新版通过。记录保留在 `old-host-attempt-events.json`，没有删除失败证据。
随后通过原生重启确认对话框完整重启，PID 变为 64757，事件 231 确认新版 Skill 的等待说明已经加载。
第 6、7 轮才是绑定当前候选的验收。

前一份记录的“完整退出重开”只证实了窗口恢复，没有 Host PID 证据；本轮补齐了真正的 Host 重启与重启后执行。
后续不能以窗口重新出现推断后端代码已重载。无需修改原版 Desktop 或现有用户配置。

## 工程验证与交付

- 相关 Desktop、共享准备和环境检查共 47 项：46 通过，1 个 live 条件用例在默认组跳过。
  最终提交另用固定 Node 24.14.1 真实安装 Qiskit，live 检查 1/1 通过；一次准备直接到 `ready`，同一 Agent 连续执行两次。
- 回归覆盖失败、取消、超时、并发等待、等待者不取消发起者、安装中禁用变化，以及 Agent 关闭后的进程回收。
  独立审查另实测两个独立 Application/Environments 的等待者与发起者取消；忽略 TERM 的子进程也正确退出。
- 独立审查绑定代码 `734554d2`，无剩余 P1/P2；变更 JavaScript 的 ESLint 与差异检查通过。
- 清洁代码打包成功，2,673 个文件摘要通过；实际安装的 5 个变更实现文件与候选摘要一致。
  安装前完成受保护备份、6 份配置读回和恢复测试；安装保留自定义 preset。

原始本地证据位于 `.openquantum/desktop-wait-acceptance/`，包括脱敏原生事件、截图、收据、安装及测试日志。
本轮实施基线为 `5a8a2806`，任务分支仍为 `c/desktop-native-preparation`；只完成本地提交和已获授权的本机安装，
未推送、创建 GitHub PR、合并或发布。可复现入口与职责边界见[设计说明](DESKTOP_PREPARATION.md)。

MQT QCEC 的等价分类是 Tool observation，不是中央科学验收，本轮科学状态仍为 `not_evaluated`。
没有验证真实 Pasqal 认证、云设备、QPU、Windows 或 Intel Mac；此前凭据表单保存的验收范围见
[前一轮记录](DESKTOP_PREPARATION_2026-10-16.md)。
