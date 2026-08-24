# OpenQuantum 架构审计与 Harness-first 目标设计

- 状态：当前架构基线
- 日期：2026-08-24
- 上游：DeepSeek Harness `0.1.0-rc.6`

## 1. 结论

OpenQuantum 是 DeepSeek Harness 的开源量子科研发行版，不是新的 Agent Runtime。

产品保持四层：

1. **UI**：展示 Harness 会话、交互、工具调用和科研结果；
2. **Harness**：提供 Session、Agent、Turn、Goal、Job、Tool、Skill、MCP、Plugin、权限、沙箱、模型和持久化；
3. **量子扩展内容**：独立的 Harness Skill、MCP/Tool 与 OpenQuantum Validator/eval，由 preset 组合；
4. **Model**：通过 Harness Provider route 提供推理和 Tool Calling。

核心原则是：

> Harness 已经提供的通用机制不重做；量子差异优先实现为原生 Skill、MCP 或经过审查的 `dsh-plugin`。

OpenQuantum 不建设私有插件市场、包管理器、安装锁、可安装扩展 Catalog、第二套权限系统或平行事件日志。
量子公司通过 Fork、普通 Git/npm/pip 依赖和 Harness 原生扩展点维护自己的发行版。

### 1.1 本轮审计结论

本轮按业务对象、依赖方向、配置权威、真实 Harness 组合和测试 surface 审计，而不是按目录数量判断架构。
结论是：**四层边界成立，可以继续在现有架构上开发；当前主要问题是能力包成熟度和少数模块命名尚未
被正式管理，而不是缺少新的 Runtime。**

| 审计项 | 结论 | 证据或处理 |
| --- | --- | --- |
| Harness 是唯一通用 Runtime | 通过 | 真实临时 Host 完成 `host.describe`、双 Session、Skill/MCP/模型目录检查 |
| UI 不直连 Model/MCP/Skill 文件系统 | 通过 | 原生 Web UI + Client Plugin；设置写入只进入服务端 Interface |
| Skill、MCP、Validator 独立组合 | 通过 | preset 独立注册 MCP；各 capability 包有独立 Tool/eval 测试 |
| 执行事实与科学验收分离 | 通过 | Harness event log 与 Result/Acceptance/Score/Reproduction 合同正交 |
| 设置模块职责 | 已改善 | 静态 Integration Catalog 已从 CAS、路径安全和原子写入状态机中拆出 |
| Capability Package 一致性 | 通过（持续执行） | L0–L3 policy 已绑定 Git 跟踪的 Skill、MCP 注册、科学合同、依赖锁和物化证据 |
| 科研结果物化 | 通过 | QGS 与 QI 作为两个 L3 Adapter 复用同一物化 Module、Registry 和有界投影协议 |
| 在线模型可用性 | 本环境未检查 | 无 Provider 凭据，文本生成和 Tool Calling 严格记为 `not_checked` |

长期模块边界、依赖方向和新增能力落点见 [模块地图](MODULES.md)。本次平台连接证据见
[`evidence/platform-diagnostics-2026-08-24.json`](evidence/platform-diagnostics-2026-08-24.json)；其
`degraded` 表示当前无凭据环境没有运行在线模型检查，不表示静态架构失败。

## 2. 当前事实

仓库已经具备：

- 固定版本的 DeepSeek Harness Web Host；
- 与同一 Harness Home 组合的可选 DSH Desktop 原生宿主；
- 项目级 OpenQuantum Agent preset 和模型 Provider route；
- Harness 原生 Session 创建、历史、Prompt、取消、审批和问题响应；
- `events.mux` / `events.host` 双流、重连和 history 重基线；
- 通过 Harness 官方扩展点注册的 OpenQuantum 品牌、设置和科研展示；
- 项目 Skill 根 `.agents/skills`；
- `platform-diagnostics` 诊断 Skill；
- `quantum-ground-state` 量子基态 Skill；
- `quantum-information-audit` 独立量子信息 Validator/eval；
- Qiskit、FieldQKit、QPanda QUBO、MQT QCEC、Stim/PyMatching 与 TyxonQ 等有界 Skill/MCP 能力；
- 通过 Harness 原生 MCP client 独立注册的本地量子求解、验证和后端发现工具；
- 默认关闭、固定源码 commit 且由设置中心做凭据/安装门控的社区量子硬件 MCP。

DeepSeek Harness 仍处于 Developer Preview，因此上游接口可能发生破坏性变化。OpenQuantum 通过固定版本、
真实端到端测试和少量 Adapter 隔离这种变化；不应因此复制 Harness 的状态机。

## 3. 权威对象映射

| 产品概念 | 权威实现 | OpenQuantum 是否另建对象 |
| --- | --- | --- |
| 科研会话与历史 | Harness `Session` + `SessionEvent` | 否 |
| 一次用户交互 | Harness `Turn` / `Step` | 否 |
| 长期目标与后台任务 | Harness `Goal` / `Job` | 否 |
| Agent 执行循环 | Harness Agent Runtime | 否 |
| Skill 发现与加载 | Harness Skill registry | 否 |
| Tool、MCP、Plugin | Harness registry / MCP client / Cordis | 否 |
| 审批、权限和沙箱 | Harness policy / approval / sandbox | 否 |
| 模型调用 | Harness Provider route / Model Adapter | 否 |
| 持久化、回放与恢复 | Harness Session event log | 否 |
| 量子工作流与解释边界 | Harness Skill | 是，作为模型指令内容 |
| 确定性科学计算 | OpenQuantum MCP / Tool | 是，作为工具实现 |
| 科学验收 | OpenQuantum Validator + Profile | 是，通过 Tool/可信插件独立调用 |

`Experiment`、`Artifact`、`Provenance` 和 `Scientific Acceptance` 是对 Harness 执行事实的科研解释，
不是新的 Runtime 状态机。

## 4. 四层职责

### 4.1 UI

UI 拥有布局、输入和只读投影。它可以发出新建、发送、取消、审批等用户意图，但不直接调用 Model、
MCP 或 Skill 文件系统，不保存第二份 Session 历史，也不推导科学通过状态。

默认产品界面直接使用 DeepSeek Harness 原生 Web UI，通过它的 Client Plugin、Slot、Settings 和
`tapIndex` 扩展点组合 OpenQuantum 品牌与量子科研展示。这样 Session、审批、模型、设置和插件界面
继续由 Harness 自己维护，不在 OpenQuantum 中复制一套平行状态机。

可选 Desktop 入口使用 DSH Desktop 的 Electron Host adapter 承载这套原生 Web UI。它只增加窗口、托盘、
终端和原生通知；loopback HTTP/WebSocket、Session event log、Agent loop、插件组合与科研状态仍由同一个
Harness Host 管理。OpenQuantum 不读取 Electron 私有接口，也不建立 Desktop 专用 Session 投影。

OpenQuantum 不保留独立的浏览器应用、Session 投影或事件 Transport Adapter。品牌通过 `tapIndex` 注入，
量子设置与科研展示通过 Harness Client Plugin、Slot 和 Settings 扩展。新增 Goal、Job、Skill、Model 或
量子算法行为时，必须继续使用 Harness 原生 UI/扩展点或向上游贡献，不能重新复制 Runtime 状态。

### 4.2 Harness

Harness 是通用执行权威，拥有：

- Session、Turn、Step、Goal、Job 生命周期；
- append-only 事件日志、持久化、回放、恢复和分叉；
- Agent loop、Prompt 组装、上下文压缩和 Tool Calling；
- Skill、Tool、MCP、Plugin 和 Model registry；
- 审批、权限、沙箱、文件、子进程、超时和取消；
- HTTP RPC 与 WebSocket 事件协议。

OpenQuantum 只通过 `runtime/openquantum/` 中的 patch/preset 组合这些能力，不修改 `node_modules`，也不把
Harness 通用职责搬进应用代码。

### 4.3 量子扩展内容

DeepSeek Harness 在这里提供三个彼此独立的 seam：

| 模块 | Harness Interface | 职责 | 不负责 |
| --- | --- | --- | --- |
| Skill | `ctx.skills` / `skill` Tool | 发现并加载名称、描述、Markdown 指令和资源基址 | 启动 MCP、注册 Tool、执行 Validator |
| MCP Client | `ctx.tools` | 连接外部 MCP Server，把 Tool 独立注册为 `mcp__<server>__<tool>` | 加载 Skill、理解领域工作流 |
| Agent preset / Cordis | 组合配置 | 在同一 Agent scope 中挂载 Skill provider、MCP、权限和模型 | 创造新的 Skill→MCP 绑定协议 |

Validator/eval 不是 Harness Skill Registry 的子模块，而是 OpenQuantum 的确定性科学实现。它们必须由
MCP Tool、普通 Tool、CI 或可信 `dsh-plugin` 显式调用。模型加载 Skill 不会自动执行 Validator。

#### Harness Skill

Harness 原生入口是 `.agents/skills/<skill-name>/SKILL.md`。同目录可以包含：

```text
.agents/skills/<skill-name>/
├── SKILL.md                 # Harness 原生入口和工作流
├── agents/openai.yaml       # 可选的跨 Agent UI 元数据；Harness filesystem provider 不读取
├── references/             # 领域约定和作用域
├── inputs/                 # 输入 schema
├── scripts/                # 确定性本地实现
├── validators/             # 科学检查
├── evals/                  # 固定回归案例
├── artifacts/              # 科研产物 schema
└── capability.yaml         # 可选的仓库科学元数据
```

`capability.yaml`、Acceptance Profile、Result/Report schema 是 OpenQuantum 的科研合同约定，用来组织并测试
科学证据。它们不是 Harness Skill 字段、插件安装协议或 Skill→MCP 绑定，也不会取代 Harness 的 Skill
registry、MCP client、权限或持久化。

`SKILL.md` 是模型指令，不能独自强制安全或科学正确性。必须强制的规则放在 Tool/MCP 输入校验、确定性
Validator 或可信 `dsh-plugin` 中，并由 Harness 调用。

把 MCP、Validator、schema 或 eval 源码放在同一 `.agents/skills/<name>/` 目录只是一项 locality 约定：
相关科学知识可以一起审查和版本化。MCP 仍需在 preset 中独立注册，Validator 仍需由 Tool/插件显式调用。
同理，`agents/openai.yaml` 可以服务其他 Agent/Codex 客户端，但不能作为 DeepSeek Harness 的 Skill 配置或
依赖声明；Harness filesystem provider 的权威入口仍是 `SKILL.md` frontmatter 与正文。

### 4.4 Model

Model 层只拥有 Provider、模型、Endpoint、凭证引用和推理能力差异。Skill 可以描述需要 Tool Calling，
但不能读取 Provider 凭证；UI 也不能直接调用模型。真实密钥只保存在被 Git 忽略的环境文件或 Harness
credential store。

## 5. 原生扩展选择

按从轻到重的顺序选择扩展点：

1. **Skill**：仅在需要领域知识、步骤、边界和工具使用说明时增加；
2. **MCP**：仅在需要确定性计算、科学后端、数据库或外部服务时增加；
3. **Validator/eval**：仅在存在可验证科学主张时增加，由 Tool/插件显式调用；
4. **preset / Cordis 配置**：组合 Agent、Skill、MCP、权限和模型 route；
5. **`dsh-plugin`**：只有原生配置不能表达宿主行为时才使用。

`dsh-plugin` 与仓库内 stdio MCP 都是可信宿主代码，必须在 Fork 中显式审查和锁定依赖。第一版不从远程
自动安装用户提供的命令、Cordis patch 或插件。

## 6. QGS 参考纵切

首个参考流程是：

```mermaid
flowchart LR
  A["用户提供二量子位 Pauli Hamiltonian"] --> B["Harness Session / Agent"]
  B --> C["加载 quantum-ground-state Skill"]
  C --> D["调用原生 stdio MCP solve_and_validate_ground_state"]
  D --> E["六类结构化事实"]
  D --> F["计算级独立 Validator"]
  F --> G["执行期 observations；provenance not_checked"]
  G --> H["Harness ctx.fs 物化 Result Package"]
  H --> I["Validator 重读真实字节"]
  I --> J["中央 Profile 派生 Acceptance"]
  J --> K["tool/result 持久化 Result Commit；UI 回放"]
```

MCP server 使用官方 Model Context Protocol SDK，Harness 通过 `@deepseek-ai/dsh-mcp-client` 管理 stdio
进程、Tool registry、超时和重连。MCP 不管理 Session，不读取模型密钥，不写任意文件。

官方 MCP bridge 将完整 `structuredContent` 保留为 Tool pipeline 的执行期 value，而 Session log 持久化
model-facing `tool/result` content。OpenQuantum 在官方 `tools/post-execute` 接缝使用一个仓库内可信 Adapter：
它通过 Harness `ctx.fs` 把 input、六类 Artifact 和合同文件原子写入 Session workspace，调用独立 Validator
与中央 Acceptance builder，并只把有界 Result Commit/展示投影放回原生 `tool/result`。它不接管 MCP 生命周期、
不另存 Session，也不新增自定义事件类型。未来 Harness 若原生支持等价的结构化 Artifact commit，这个 Adapter
应继续收缩或上游化。

Solver 只产生事实；Validator 只产生作用域和逐项 observation。总体科学验收必须由版本化 Profile 和中央
builder 推导，模型、MCP 成功或 Harness idle 都不能自行宣称“科学通过”。

普通调用使用组合 Tool 是为了隐藏跨 Tool 的大型 bundle 编排，而不是合并科学职责：内部 Solver 和 Validator
仍是独立模块。MCP 返回的执行期观察仍固定 `provenance.complete=not_checked`；只有 Harness Adapter 物化真实
Result Package、完整 Validator 重读这些字节后，中央 builder 才能派生最终 Acceptance。facts-only 与
materialized-validation Tool 继续作为高级接口。

## 7. 状态不变量

执行、科学验收、评分和复现是正交事实：

| 维度 | 示例状态 | 权威来源 |
| --- | --- | --- |
| 执行 | pending / running / idle / failed / cancelled | Harness events |
| 科学验收 | not_evaluated / passed / conditional / failed | OpenQuantum Validator + Profile |
| 评分 | unscored / invalid / valid | OpenQuantum eval runner |
| 复现 | not_attempted / reproduced / not_reproduced | 独立复现证据 |

必须始终满足：

1. UI 不持有密钥，也不直接调用 Model/MCP；
2. Session log 是执行事实的唯一来源；
3. Runtime 完成不等于科学验收通过；
4. 模型只能解释 Validator 结果，不能改写它；
5. 有副作用或付费操作仍通过 Harness Tool、权限和审批；
6. Skill 加载或 MCP 调用失败必须形成可观察失败，不能降级为模型猜测；
7. 新增量子场景按需增加独立 Skill、MCP/Tool 和 Validator，并由 preset 组合，不修改 Harness 核心；
8. 更换模型 Provider 不修改量子科学规则。

## 8. 部署与依赖方向

第一阶段是共享 Harness Home 的本地 Host：

```text
Browser ───────────────────────────────┐
DSH Desktop (optional Electron shell) ─┤
                                      └── DeepSeek Harness native Web UI + OpenQuantum branding/plugins
                                            └── DeepSeek Harness Host (loopback)
                                                  ├── OpenQuantum preset
                                                  ├── native project Skills
                                                  ├── native MCP client → local scientific MCP
                                                  └── model provider routes
```

Web 与 Desktop 是同一产品组合的两个 Host adapter，读取同一个 `.openquantum/dsh`。本地单用户模式不同时
启动两个 Host 写入同一 Session 状态。Desktop 版本必须与固定的 Harness family 对齐，并通过 headless
组合检查后才能升级。

禁止依赖：UI → Model、UI → MCP、UI → Skill 文件系统、Skill → UI、Skill → Provider 凭证、
Model → Skill，以及任何层绕过 Harness 伪造 Session 执行事件。

生产部署如果公开给不受信任用户，必须把 Harness 与本地 MCP 放进受控 Worker/容器，并单独审计身份、
workspace、网络、进程和凭证隔离；本地开发配置不能被误称为多租户安全边界。

## 9. 版本与贡献策略

- DeepSeek Harness 与 MCP SDK 使用锁定版本；
- DSH Desktop 与 Harness family 成对锁定，桌面上游升级不得绕过 Harness 兼容性检查；
- OpenQuantum 通过普通 Git commit、tag 和 lockfile 发布；
- 量子公司通过 Fork 增加自己的 Skill、MCP、preset 或可信插件；
- 通用 Runtime 修复优先贡献给 DeepSeek Harness 上游；
- 科学差异和企业后端留在对应 Fork/Skill/MCP；
- 没有多个真实贡献者提出跨 Fork 分发需求前，不设计私有市场或安装系统。

## 10. 当前架构验收基线

每次架构级变更需要持续证明：

- Harness 原生 Skill registry 能发现并加载 `quantum-ground-state`；
- Harness 原生 MCP client 能列出并调用求解与验证 Tool；
- 非法输入、低预算和篡改结果走确定性失败/observation 路径；
- UI 输入最终进入真实 Harness Session，而不是 Mock Runtime；
- Runtime 与 Scientific 状态分开展示；
- 关闭并重启 Harness 后，Session 可由原生事件日志恢复；
- 一个新开发者能按文档增加独立的 Skill、MCP 或 Validator，并由 preset 组合，而无需修改 Harness 核心。

完整实施顺序见 [`../roadmap/DEVELOPMENT_PLAN.md`](../roadmap/DEVELOPMENT_PLAN.md)。

## 11. 主要风险

| 风险 | 当前控制 |
| --- | --- |
| Harness Developer Preview 发生破坏性变化 | 固定版本、少量原生扩展、真实 E2E、优先上游修复 |
| Desktop 与 Harness 版本错配 | 成对固定版本、Home patch 组合测试、升级时重跑完整平台检查 |
| LLM 产生科学幻觉 | MCP 产数值、Validator 产 observations、模型只解释 |
| Skill 作用域过度承诺 | supported/out-of-scope、schema、正负例和篡改测试 |
| MCP/Plugin 获得宿主权限 | 仓库内可信代码、依赖锁定、显式配置、代码审查 |
| 社区硬件 MCP 提交真实云任务 | 默认关闭、固定源码 SHA、显式安装与启用、Harness 凭据引用、最小权限云账户 |
| 凭证或科研数据泄露 | 服务端环境引用、同源白名单、Artifact 秘密扫描 |
| Client Plugin 演化成第二套 Runtime | 冻结业务范围，只做展示与配置扩展，通用能力回到 Harness 上游 |
| 能力数量增长导致包结构和声明失真 | 使用 L0–L3 开发成熟度、标准 package 形态和 capability conformance 检查 |

## 12. 后续开发顺序

1. **能力包 conformance（已完成）**：`npm run capability:conformance` 只读验证 Git 跟踪的 `SKILL.md`、
   preset MCP 注册、`capability.yaml`、依赖锁、测试证据和 L3 物化 Adapter；`npm run check` 强制执行。
2. **第二条 L3 纵切（已完成）**：`quantum-information-audit` 已进入 Harness workspace 物化、真实字节重读、
   中央 Acceptance 与 `tool/result` 回放；QGS 与 QI 通过 Scientific Result Adapter Registry 组合。
3. **Harness 成对升级（下一步）**：审阅 DeepSeek Harness 新版本 release/API 变化，保持 Web、Desktop、preset 和
   Tool seam 同一版本族；通过 config、Host、Skill、MCP、UI 和 Session 恢复测试后再升级锁文件。
4. **在线证据门**：在有受控 Provider 凭据的 CI/发布环境运行文本生成、Tool Calling 和 QGS/QI E2E；无凭据环境
   继续明确输出 `not_checked`，不阻塞纯离线单元测试，也不伪造 ready。
5. **硬件写操作治理**：FieldQKit 继续只读发现；任何真实 QPU 提交能力必须默认关闭、展示成本与副作用，
   并经过 Harness approval、凭据隔离和单独的集成测试。

后续按“先成对升级基础设施并补在线证据，再谨慎扩大副作用面”的顺序推进。
