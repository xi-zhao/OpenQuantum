# OpenQuantum Harness-first MVP 历史开发计划

- 状态：MVP 核心链已完成；本文保留首条纵切的历史决策，不再作为当前任务清单
- 日期：2026-08-24
- 最近修订：2026-09-04（QGS 与 QMClaw 迁移到原生 Tool Provider）
- 产品定位：DeepSeek Harness 的开源量子科研发行版
- 架构约束：UI / Harness / 量子扩展内容 / Model 四个职责面，不增加平行 Runtime

当前模块边界、能力包 L0–L3 演进方式和下一步优先级，以
[模块地图](../architecture/MODULES.md)和[当前架构审计](../architecture/ARCHITECTURE_AUDIT.md)为准。

## 1. MVP 目标

第一版只证明一件事：

> 开发者 Fork OpenQuantum 后，可以沿用 DeepSeek Harness 原生机制按需增加量子 Skill，并用合适的 Tool Provider 注册 Tool，
> 并在真实 Session 中得到可观察、可验证的科研结果。

首个端到端案例是 `quantum-ground-state`：用户提供二量子位实 Pauli Hamiltonian，在固定
`hamming-weight=1` 扇区内运行无噪 statevector VQE；Validator 用独立精确解产生 observations，版本化
Acceptance Profile 定义规则，central Acceptance Builder 再推导 Acceptance。

OpenQuantum 的首版价值不是“能力最多”，而是给量子公司一个结构清楚、能运行、能改、能验证的
Harness 发行版起点。

## 2. 核心模型

OpenQuantum 不创建与 Harness 重复的业务对象：

| 产品概念 | 权威实现 |
| --- | --- |
| 科研会话与历史 | Harness `Session` + `SessionEvent` |
| 一次交互与模型步骤 | Harness `Turn` + `Step` |
| 长期目标与后台任务 | Harness `Goal` + `Job` |
| Agent 执行循环 | Harness Agent Runtime |
| Skill 发现与加载 | Harness Skill registry |
| Agent-facing Tool | Harness Tool Registry |
| MCP Server 连接与 Tool 注册 | Harness MCP Client |
| Host Plugin 与 Client Plugin 生命周期 | Harness Cordis / Client Plugin 系统 |
| 审批、权限与沙箱 | Harness 原生策略与执行机制 |
| 模型调用 | Harness Provider route / Model Adapter |
| 持久化、回放和分叉 | Harness Session event log |
| 量子工作流与解释边界 | Harness Skill |
| 确定性科学计算 | OpenQuantum Tool（原生或由 MCP 暴露） |
| 科学验收 | Scientific Validator observations + Acceptance Profile + central Acceptance Builder |
| 可回放科学展示 | Harness `tool/result` + OpenQuantum 原生 Client Plugin 投影 |

OpenQuantum 自己只维护量子 Agent Preset、Skill、Tool implementation、必要的 MCP Server、可信 Host Plugin、
科学 Validator，以及通过 Harness 原生扩展点
注入的必要 UI。

结构化 Tool 返回值仍由 Harness Tool pipeline 执行。对于需要刷新后继续显示的少量科学摘要，仓库内可信
插件只在官方 `tools/post-execute` 接缝生成有界展示投影，并随原生 `tool/result` 进入 Session log；它不创建
第二套执行器、存储或自定义 Session 事件。

## 3. 首版范围

### 必须完成

1. `quantum-ground-state` 原生 Skill；
2. 一个原生 Tool Provider，向 Harness 暴露最小基态计算 Tool；
3. 与 Skill 共置但独立调用的 Validator、结构化 Artifact 和固定正负案例；
4. 从 UI 输入到 Harness Session、Agent、Tool、Artifact、Validator、UI 展示的真实 E2E；
5. 面向量子公司的 Fork、Skill、MCP 和 preset 开发指南；
6. 模型 Provider 模板、凭证隔离和最小健康探测。

### 明确不做

- 独立 Agent Runtime；
- OpenQuantum 私有 `.oqcap` 包格式或配套打包工具链；
- 插件市场、远程自动安装、签名、安装锁和发布通道治理；
- 平行于 Harness 的 Session、权限、沙箱、模型或持久化实现；
- 动态加载第三方前端代码；
- 首版多租户 SaaS、计费、组织权限和云 QPU；
- 性质预测、案例咨询等第二条科研纵切。

这些非目标不是永远禁止，而是在真实需求出现前不提前建设。版本管理先使用 Git、npm/pip 锁文件和
DeepSeek Harness 已有配置；量子公司通过 Fork 管理自己的发行版。

## 4. 四个职责面

### UI

- 展示 Session、消息、Tool 调用、Artifact、执行状态和科学验收状态；
- 发出创建、发送、取消、审批等用户意图；
- 只使用 Harness Web UI 已有的 Session 与 Tool 数据流；
- 不运行量子算法，不推导科学结论，不保存第二份 Session 状态。

### Harness

- 完整复用 Session、Agent、Tool Registry、Skill Registry、Harness MCP Client、Host Plugin、Client Plugin、事件、审批、权限、沙箱、模型和持久化；
- OpenQuantum 只通过 preset、Cordis 配置和受支持扩展点进行组合；
- 不修改 `node_modules` 中的 Harness 实现；优先向上游贡献通用修复。

### 量子扩展内容

- Harness Skill 只保存量子问题的作用域、工作流、Prompt 和工具使用说明；
- Tool 由原生 Tool Plugin 注册，或由 MCP Server 暴露后经 Harness MCP Client 注册，并提供确定性执行能力；
- OpenQuantum Scientific Validator 独立实现可强制的科学 observations，由 Tool、Materializer 或 CI 显式调用；
- Eval/benchmark 只属于开发证据，不进入用户运行链；
- Agent Preset/Cordis 组合 Skill Provider、Tool Provider，以及确有 hook 需要的 agent-scoped Host Plugin；Validator 由 Tool 或可信 Host Plugin 显式
  调用。源码可以共置以方便维护，但不存在自动的 Skill→MCP 或 Skill→Validator 绑定。

### Model

- 通过 Harness Provider route 接入 Kimi、GLM 或其他云模型；
- 配置只引用环境变量名；真实密钥留在 `.env` 或 credential store；
- Model 负责规划和工具调用，不替代科学数值程序或 Validator。

## 5. 最高价值纵切

```mermaid
flowchart LR
  A["用户输入 Hamiltonian"] --> B["Harness 创建 Session / Turn"]
  B --> C["Agent 加载 quantum-ground-state Skill"]
  C --> D["Harness 调用 Tool"]
  D --> E["Tool 返回结构化计算 Artifact"]
  E --> F["OpenQuantum Validator 独立检查"]
  F --> G["Harness 记录事件与结果"]
  G --> H["UI 分开展示执行状态与科学状态"]
```

两种状态必须正交：

- **Runtime 完成**：Harness Turn / Goal / Job 已结束；
- **科学验收**：Validator 产生 observations，版本化 Acceptance Profile 定义规则，只有 central Acceptance Builder 推导 `passed / conditional / failed`。

`idle`、模型回答或 Tool 成功返回都不能自动显示为“科学验收通过”。评分和复现若出现，也保持独立：

- 复现成功但科学检查失败：`reproduced + scientific failed`；
- 没有有效评分证据：`unscored`；
- 执行完成但未运行 Validator：`idle + not_evaluated`。

## 6. 四个里程碑

### M0：Harness 能力审计与冻结

目标：确认哪些能力直接复用，避免误建 Runtime。

- 固定已验证的 DeepSeek Harness 版本；
- 对 Session、Agent、Skill Registry、Tool Registry、Harness MCP Client、Host Plugin、Client Plugin、权限、沙箱、Model Provider 和持久化做真实调用审计；
- 记录 OpenQuantum preset 与 Harness 原生 Web 扩展的唯一必要改造；
- 删除路线图中自建包市场、安装治理和 Capability Runtime 的任务。

退出条件：架构文档和实际配置一致，所有通用运行职责都有 Harness 权威实现或明确上游缺口。

### M1：`quantum-ground-state` Skill

目标：完成作用域小但科学闭环完整的原生 Skill。

- 明确 supported / out-of-scope；
- 固定输入和 Artifact schema；
- 实现 VQE 求解与独立精确参考；
- 实现只根据结构化事实判定的 Validator；
- 覆盖正常、非法、边界、篡改和作用域外案例；
- 在 Harness 原生 Skill registry 中发现并加载。

退出条件：固定案例可重复运行，数值容差与作用域测试通过；任何 required 检查失败都不能形成 `passed`。

### M2：Agent 执行边界（历史方案已迁移）

最初用 stdio MCP 证明 Harness Tool Registry 的外部协议边界。2026-09-04 按当前扩展原则完成迁移：QGS 是
进程内纯 JavaScript，改由原生 Tool Provider 注册；MCP 继续服务跨语言、独立进程和远程能力。

- 由共享原生 Tool Provider 注册最小基态计算 Tool；
- 定义清晰的输入、输出、错误和超时；
- 在 OpenQuantum preset / Cordis 配置中注册；
- 验证 Provider 不接触模型密钥，不自行管理 Session；
- 增加 Tool 集成测试和 Harness 调用测试。

退出条件：Harness 能列出并调用 Tool；非法输入、执行失败和超时均形成可观察的失败事件。

### M3：Harness E2E 与开发指南

目标：让使用者能运行，让量子公司能 Fork 后修改。

- UI 发起真实 Session 并展示 Tool 调用过程；
- Artifact 与 Validator 结果可读；
- Runtime / Scientific 两组状态分别展示；
- 真实模型完成至少一次 Tool Calling E2E；
- 发布 Fork、Skill、Tool、MCP Server、Agent Preset 和 `dsh-plugin` 开发说明；
- CI 运行 Skill、原生/MCP Tool contract、Harness 集成、原生 UI 扩展、lint 和配置展开检查。

退出条件：一个新开发者只读仓库文档即可在本机启动、运行黄金案例，并知道如何按需增加独立的
Skill、Tool Provider 或 Validator；Agent Preset 组合 Skill Provider、Tool Provider 与必要的 agent-scoped Host Plugin，Validator 由 Tool、
Materializer 或 CI 显式调用。

### 当前进度（2026-08-24）

| 里程碑 | 状态 | 已有证据 | 尚缺 |
| --- | --- | --- | --- |
| M0 | 完成 | Harness-first 架构、preset、原生 Web 扩展与诊断合同已落地 | 持续跟踪 rc 版本变化 |
| M1 | 完成 | QGS solver、独立 exact reference、Validator、Artifact schema 与边界测试 | 无 |
| M2 | 完成并迁移 | 共享原生 Tool Provider、单一 QGS 原子 Tool、Harness Registry 测试，以及真实 provider 的 `tool/call`→`tool/result` 事件链 | 无 |
| M3 | 核心链完成 | QGS 与 QI 两条 L3 Adapter 已完成 `ctx.fs` Result Package 物化、真实字节重读、完整 Validator→中央 Acceptance、Result Commit 与 UI 回放；QGS 真实浏览器卡片已人工验收，另有零密钥黄金案例、双 Session Tool Registry 回归和隔离 Harness CI | 把已验证的浏览器输入→最终验收卡片流程自动化到 CI，并补 QI 在线模型回放证据 |

在配置 `openquantum-public` 凭据的环境中，四层诊断 7/7 为 `ready`：真实 `kimi-k2.7-code` 在 Harness
Session 中调用 `solve_and_validate_ground_state`，随后六类 Artifact、Result
Package、Acceptance Report 和 Result Commit 均通过复核。没有 Provider 凭据的环境仍必须把模型两项记为
`not_checked`，不得用静态 schema、Mock、直接 Tool implementation 或 MCP SDK 调用冒充真实模型证据。

## 7. 测试与验收

| 检查 | 证明什么 |
| --- | --- |
| Skill discovery / instruction | frontmatter、触发范围、工作流和工具使用说明正确 |
| Validator mutation | 缺字段、改单位、改数值或伪状态会被拒绝 |
| Tool Provider integration | Tool schema、注册、错误和超时正确；MCP 能力另检查传输生命周期 |
| Harness integration | Skill 发现、Tool 调用、事件和权限使用原生机制 |
| UI E2E | 用户看到的状态来自真实 Harness 事件 |
| Model probe | 配置的云模型可生成文本并调用 Tool |
| `e2e:quantum-harness` | 真实模型经 AgentLoop 调用 QGS 原生 Tool，并提交可复核科学验收 |
| Secret scan | 密钥不进入仓库、日志和 Artifact |
| `npm run check` | lint、测试和 Harness 组合配置检查通过 |

MVP 完成必须同时满足：

- 没有用 Mock 冒充黄金 E2E；
- UI 没有直接调用 MCP Server 或 Model Provider；
- 没有修改 `node_modules` 中的 Harness；
- 没有新增 OpenQuantum 私有 Runtime 或安装协议；
- 科学通过状态只能由 central Acceptance Builder 基于 Profile、Validator observations 和 provenance 推导；
- 本地启动、失败排查和二次开发都有文档。

## 8. 二次开发路径

量子公司的正常参与方式是：

```text
Fork OpenQuantum
→ 按需增加原生 SKILL.md
→ 按需增加原生 Tool Provider 或配置 MCP Server
→ 有科学主张时增加独立 Validator / eval
→ 组合 Harness preset / dsh-plugin
→ 运行本地测试与 Harness E2E
→ 通过普通 Git PR 或维护自己的发行版发布
```

OpenQuantum 可以维护少量参考 Skill、原生 Tool Provider 和 MCP Server，帮助开发者理解结构，但它们不要求专用安装器，也不享有
Harness 特权。只有当多个真实贡献者明确需要跨 Fork 分发、安装和升级时，再基于 Harness 上游能力重新评估
目录或治理；第一版不为假设性市场设计 Interface。

## 9. 主要风险

| 风险 | MVP 控制 |
| --- | --- |
| Harness 预览版破坏性变化 | 固定版本、少量原生扩展、真实 E2E、优先上游修复 |
| 为平台感重复造 Runtime | 每项通用机制先核对 Harness；OpenQuantum 只做量子差异 |
| LLM 产生科学幻觉 | Tool 产数值、Validator 产 observations、Acceptance Profile 提供规则、central Acceptance Builder 推状态、模型只解释 |
| Skill 作用域过度承诺 | 明确 supported / out-of-scope，增加边界负例 |
| MCP 获得过多权限 | 本地最小权限、显式配置、失败时 fail closed |
| dsh-plugin 污染宿主 | 首版只接受仓库内可信插件并逐项审查 |
| 模型或科研数据泄露 | 凭证引用、同源白名单、日志脱敏、受控网络 |
| MVP 被多场景拖散 | QGS E2E 完成前不增加第二条科研纵切 |

## 10. MVP 之后再决定

MVP 之后根据真实 Fork 和贡献反馈决定：

- 第二个量子 Skill 或性质预测 Skill；
- 云模拟器、HPC 或 QPU MCP；
- 更丰富的 Artifact renderer；
- 向 DeepSeek Harness 上游贡献的通用扩展；
- 是否真的需要跨发行版的发现、安装或治理。

没有真实使用证据前，不启动私有包格式、市场、发布通道、安装锁或第二套权限系统。
