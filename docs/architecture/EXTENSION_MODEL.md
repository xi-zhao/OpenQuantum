# OpenQuantum 扩展对象模型

- 状态：当前架构契约
- 日期：2026-08-29
- 适用范围：新增 Skill、Tool、MCP Server、Harness MCP Client、External API、Validator、Composition、Host Plugin 或 Client Plugin

第一次阅读请先看[文档与架构入口](../README.md#架构总览)；本文件只负责严格术语、选择规则和禁止依赖。

## 1. 核心结论

OpenQuantum 的扩展对象不是一条 `Skill -> MCP -> Validator` 的固定流水线。正确模型是：

> 在 DeepSeek Harness 的运行时层，可组合能力统一通过 Cordis Plugin 装配、注入和回收；
> 在 OpenQuantum 的产品与领域层，Skill、Tool、MCP Server、Validator 等对象仍按各自 Interface 分工。
>
> Deployment Composition 配置模型与宿主；Agent Preset 并列组合 Skill、Tool Provider 与策略；
> Agent 读取 Skill 后只调用 Tool；Harness MCP Client 是一种 Tool Provider，MCP Server 通过协议暴露 Tool；
> 外部 API 位于 Tool 实现之后；
> Validator 只产生科学 observations；版本化 Acceptance Profile 是规则数据，中央
> Acceptance Builder 汇聚 Profile、observations 和 provenance 后推导最终验收。

因此，Agent 的唯一执行原语是 **Tool**。Skill、MCP Server、External API、Validator 和 Preset 都不是 Tool 的同义词。

### 1.1 “一切皆 Plugin”与职责模型

DeepSeek Harness 的“一切皆 Plugin”描述的是统一的**运行时装配机制**，OpenQuantum 的扩展对象模型描述的是
每个模块的**产品职责和 Interface**。两者是正交关系，不是两套竞争架构：

```text
DeepSeek Harness Runtime
  -> Cordis Plugin composition
     -> Skill Provider Plugin -> Skill Registry -> Skill
     -> native Tool Provider Plugin -> Tool Registry -> Tool
     -> Harness MCP Client Plugin -> MCP Server -> MCP-exposed Tool
     -> Model Adapter Plugin -> Provider Route -> Model Provider API
     -> Host Plugin -> Host hook / Bounded Host Route
     -> Client Plugin -> UI Slot / Settings / projection
```

- **Cordis Plugin**回答“这个模块怎样进入 Harness、获得依赖并随 scope 回收”；
- **Skill、Tool、MCP Server、Validator 等对象**回答“它负责什么、调用者必须知道什么、哪些规则不能越界”；
- Scientific Validator、Materializer 和领域算法可以是 Plugin 内部的普通模块；只有需要 Harness 生命周期、注册表或
  hook 时，才由相应 Cordis Plugin 接入；
- `Host Plugin` 和 `Client Plugin` 是 Cordis Plugin 的具体职责角色，不是对全部 Plugin 的统称；
- “一切皆 Plugin”不允许把工作流、执行、鉴权、科学验收和 UI 规则塞进一个泛化的 `quantum-plugin`。

## 2. 权威术语

这些对象属于不同抽象层级，不能放进同一个“插件类型”列表比较。

### 2.1 产品与用例

| 对象 | 回答的问题 | 负责 | 明确不负责 |
| --- | --- | --- | --- |
| Capability | 用户获得哪一项有界能力？ | 把相关 Skill、Tool Provider、Validator 和证据作为一个产品纵切组织起来 | 充当 Harness Runtime 对象或自动绑定内部模块 |
| Application Interface | 同一个用例怎样被 Web、Desktop 或消息入口复用？ | 统一拥有命令校验、状态转换、并发和安全规则 | 解析 HTTP、渲染 UI 或保存真实凭据值 |
| Harness RPC | Client Plugin 怎样调用 Harness 已有能力？ | 传输标准用户意图、认证上下文和结构化响应 | 承载量子领域规则或绕过 Harness 状态机 |
| Bounded Host Route | Client Plugin 怎样调用 OpenQuantum 特有的窄能力？ | 校验来源、方法和请求体，格式化响应，再委托 Application Interface | 复制业务规则、直接改 Cordis 或执行 Tool |

### 2.2 Runtime 装配

| 对象 | 回答的问题 | 负责 | 明确不负责 |
| --- | --- | --- | --- |
| Cordis Plugin | 一个模块怎样进入 DSH Runtime 并获得生命周期？ | 依赖注入、Interface 注册、scope 组合和统一回收；按实际职责表现为 Skill Provider、Tool Provider、Harness MCP Client、Model Adapter、Host 或 Client Plugin | 代替 Skill、Tool、Validator 等职责对象，或成为无边界的业务容器 |
| Agent Preset | 一个 Agent 会看到哪些能力？ | 在 Agent scope 组合 Skill Provider、原生 Tool Plugin、Harness MCP Client、策略，以及确有需要的 agent-scoped Host Plugin | 配置 Provider Route、实现算法或科学阈值 |
| Deployment/Home Patch | 一个 OpenQuantum Host 怎样启动？ | 配置 Provider Route、默认模型/Preset、品牌、deployment-scoped Host Plugin 和 Client Plugin | 实现量子领域工作流 |
| Host Plugin | Cordis Plugin 何时承担宿主扩展职责？ | 以可信代码接入 Tool hook、物化、策略或 Host route；按 hook 所有者归入 Agent 或 Deployment scope | 代表全部 Cordis Plugin，或创建第二套 Session、Tool Registry 或通用 Runtime |
| Client Plugin | Cordis Plugin 何时承担浏览器扩展职责？ | Harness 原生 UI Slot、Settings 和只读投影 | 代表全部 Cordis Plugin，或直接调用模型、MCP Server、External API 或 Validator |
| Host Adapter | 用户从哪种产品入口进入同一 Harness 产品组合？ | 以 Browser、Desktop 或消息渠道承载标准 Host 与传输边界；实现可以复用上游 Cordis Plugin，并可启动独立 Host 进程/Session | 拥有 Agent Runtime 规则或成为 OpenQuantum 领域 Host Plugin |

### 2.3 Agent Interface

| 对象 | 回答的问题 | 负责 | 明确不负责 |
| --- | --- | --- | --- |
| Skill | Agent 应该何时、为什么、按什么步骤做？ | 领域知识、工作流、适用范围、Tool 选择和解释边界 | 执行代码、启动 MCP Server、持有凭据、产生科学事实 |
| Tool | Agent 这一步可以调用什么动作？ | 稳定名称、输入输出 schema、错误语义、副作用和一次原子执行 | 管理 Session、决定 UI 状态、伪造最终 Acceptance |

### 2.4 Tool 集成

| 对象 | 回答的问题 | 负责 | 明确不负责 |
| --- | --- | --- | --- |
| Tool Provider | Tool 从哪里注册进 Harness？ | 作为 Cordis Plugin 角色向 Harness Tool Registry 提供一个或多个 Tool | 替代 Tool 的调用合同 |
| MCP Server | 进程外或远程能力怎样提供 Tool？ | 通过 MCP 协议暴露 Tool、Resource 或 Prompt | 充当 Agent 工作流、管理 Harness Session |
| Harness MCP Client | MCP-exposed Tool 怎样进入 Harness？ | 作为 Cordis Plugin 角色连接 MCP Server，并把其 Tool 注册进 Harness Tool Registry | 理解领域工作流、替 MCP Server 执行业务算法 |
| External API | 下游厂商或远程系统提供什么网络合同？ | 定义 HTTP/RPC 请求、鉴权和响应语义 | 直接暴露给 UI 或 Skill、充当 Agent 执行原语 |
| External API Adapter | Tool implementation 怎样调用 External API？ | 在 Tool 内实现鉴权引用、超时、脱敏、幂等和错误映射 | 注册 Tool、绕过 Harness 权限或成为独立 Agent 接口 |

### 2.5 科学证据

| 对象 | 回答的问题 | 负责 | 明确不负责 |
| --- | --- | --- | --- |
| Scientific Validator | 证据支持哪些科学检查事实？ | 确定性地重算并产生逐项 observations | 调用模型、管理 Session、直接宣布最终 Acceptance |
| Scientific Result Materializer | 如何得到可重读的真实证据字节？ | 约束 workspace 路径、原子写入、重读与 digest 校验，再传递结构化证据 | 实现量子算法、生成 observations 或拥有 Harness 生命周期 |
| Scientific Result Adapter（内部） | 某个 Tool 结果如何接入通用物化流程？ | 在可信 Host Plugin 内映射 Tool、输入、Artifact 类型、Materializer 和 Validator | 独立安装、注册 Tool、拥有 hook 或创建 Runtime |
| Acceptance Profile | 哪些 observations 足以支持某项主张？ | 以版本化数据定义作用域、必选检查、阈值和来源链要求 | 执行代码、重算 observations 或自己得出状态 |
| central Acceptance Builder | 如何得到最终 Acceptance？ | 作为中央共享模块，汇聚 Profile、observations 和 provenance 并唯一地推导状态 | 定义 capability 私有阈值、执行量子算法或替代 Validator |

### 2.6 开发与发布证据

| 对象 | 回答的问题 | 负责 | 明确不负责 |
| --- | --- | --- | --- |
| Eval | Skill/Tool/Validator 版本是否在固定案例上回归？ | 在开发、CI 和发布期运行可判定案例 | 进入用户请求的生产运行链 |
| Benchmark | 固定语料上的性能或质量如何对比？ | 使用锁定分母、指标和环境生成可比较证据 | 替代单次科学 Acceptance 或运行时 Validator |

项目中禁止裸写“API”。必须写成 `Harness RPC`、`External API` 或 `Model Provider API`。讨论 DSH 的统一装配机制时
应写 `Cordis Plugin`；讨论具体职责时应写 `Skill Provider Plugin`、`Tool Provider Plugin`、
`Harness MCP Client Plugin`、`Model Adapter Plugin`、`Host Plugin` 或 `Client Plugin`。只有上下文已经明确具体角色时，才可简称
`Plugin`，避免把运行时容器、职责 Interface 和安装包混在一起。

“API”在项目中固定分成下面几类：

| 名称 | 调用方向 | 规则归属 |
| --- | --- | --- |
| Harness RPC | Client Plugin → Harness Host | Harness 通用 Session、设置与 Tool 生命周期 |
| Bounded Host Route | Client Plugin → OpenQuantum Host Plugin → Application Interface | route 只管传输边界，业务规则归 Application Interface |
| External API | Tool implementation → 厂商/远程系统 | Tool 内的 External API Adapter 管凭据、超时、脱敏与幂等 |
| Model Provider API | Harness Model Adapter → 模型厂商 | Harness 管协议和 Tool Calling；Skill 管领域工作流 |

## 3. Tool、MCP Server、Harness MCP Client 与 External API 的真实关系

```text
Harness Agent
  -> Tool Registry
     -> Harness-native Tool
     -> OpenQuantum 原生 Tool Provider Plugin 提供的 Tool
     -> MCP-exposed Tool
        <- Harness MCP Client
           <-> MCP Server
               -> deterministic domain code
               -> SDK
               -> optional External API
```

- Agent 调用的是 Tool，不是“MCP”。
- MCP Server 可以暴露多个 Tool；Harness MCP Client 负责把它们注册进 Harness。
- REST、GraphQL、gRPC 或厂商 SDK 只是 Tool 实现使用的下游连接方式。
- 一个 External API 只有经过 Tool implementation 内的 External API Adapter、输入约束、凭据隔离和
  副作用策略后，才成为 Agent 能力。
- 本地函数若需要被 Agent 调用，也必须由原生 Tool Plugin 注册，或由 MCP Server 暴露后经 Harness MCP Client 注册为 Tool。

## 4. 三条互不混淆的链

### 4.1 用户运行链

```text
User intent
  -> Harness Session / Agent
  -> load Skill instructions when relevant
  -> model selects a Tool
  -> Harness policy / approval
  -> Harness invokes the Tool implementation through its Tool Provider
  -> tool/result enters the Session event log
```

Skill 影响模型如何选择 Tool，但 Skill 不调用 Tool，也不拥有 Tool 生命周期。

### 4.2 科学验收链

```text
Tool facts -> Scientific Result Materializer -> materialized Artifact + provenance
                                              -> Scientific Validator -> observations

Acceptance Profile ---------------------------\
observations ----------------------------------+-> central Acceptance Builder
materialized provenance ----------------------/        -> Acceptance Report / Result Commit
```

Tool 成功、Turn idle、Validator 没有报错，都不能单独写成“科学验收通过”。

### 4.3 开发证据链

```text
unit / contract tests ─┐
eval cases ────────────┼─> release evidence / gate
benchmarks ────────────┤
capability conformance ┘
```

Eval 和 Benchmark 不属于用户运行链，也不能在生产时静默替代真实 Tool 或 Validator。

## 5. Composition 的两个 scope

Deployment/Home Patch 与 Agent Preset 最终都通过 Cordis Plugin rows 组合能力；下图按职责展示这些 rows，
而不是建立一套绕过 Plugin 的装配系统。

```text
Deployment/Home Patch
  ├── Model Provider Routes
  ├── default model / default Agent Preset
  ├── Harness Host services
  └── deployment-scoped Host Plugin / Client Plugin

Agent Preset
  ├── persona and prompt sections
  ├── Skill Provider
  ├── Harness-native Tools
  ├── Harness MCP Clients -> MCP Servers -> MCP-exposed Tools
  └── Agent-scoped policy and necessary agent-scoped Host Plugin declarations
```

Provider Route 属于 Deployment Composition，不属于量子 Skill。Agent Preset 可以引用部署提供的模型选择，
但不应复制 Provider Endpoint、密钥或协议配置。
Host Plugin 的 scope 由它拥有的 hook 决定：只服务某个 Agent composition 的 hook 由 Agent Preset 声明，
宿主级 route 或全局生命周期扩展由 Deployment/Home Patch 声明。可信 Host Plugin（Cordis Plugin 实现）
拥有 Harness hook；Scientific Result Adapter 只是该 Host Plugin 内部的
capability 映射对象，不能被独立安装或当成 Tool Provider。

## 6. 新需求放在哪里

| 需求 | 首选对象 | 典型形式 |
| --- | --- | --- |
| 增加领域知识、工作步骤或适用范围 | Skill | `SKILL.md` + references |
| 让 Agent 调用一个原子动作 | Tool | 有界 input/output schema + 明确错误和副作用 |
| 需要进程隔离、跨语言协议或远程部署来提供 Tool | MCP Server | stdio 或 Streamable HTTP；由 Harness MCP Client 注册 |
| 接入厂商 REST/SDK、量子云或数据库 | Tool implementation 内的 External API Adapter | 凭据引用、超时、幂等安全重试、脱敏；UI/Skill 不直连 |
| 接入新的语言模型 | Model Provider Route | Deployment/Home Patch 或 Harness Models settings |
| 独立重算单位、数值和一致性检查 | Scientific Validator | 纯输入到 observations；固定正例、负例和篡改例 |
| 定义哪些 observations 足以验收、阈值和作用域 | Acceptance Profile | 版本化作用域、必选检查、阈值和来源链要求 |
| 从 Profile、observations 和 provenance 推导最终结论 | central Acceptance Builder | 共享合同模块，capability 不复制 Builder |
| 把 Tool 结果变成可重读科学证据 | Host Plugin + 内部 Scientific Result Adapter + Materializer | Plugin 拥有 hook；Adapter 做 capability 映射；Materializer 做 IO/重读 |
| 组合一组 Agent 能力 | Agent Preset | Skill Provider、Tool Provider、策略和 persona |
| 修改 Harness Host 生命周期或 Tool hook | Host Plugin | 只有原生配置无法表达时使用 |
| 增加浏览器表单或结果展示 | Client Plugin | 调用 Harness/Host route，只展示或提交意图 |
| 检查版本质量或回归 | Eval 或 Benchmark | 离线、CI 或受控发布任务 |

选择时遵守六条主原则：

1. Skill 与 Tool 正交：允许 Skill-only、Tool-only 和 Skill + Tool，是否组合取决于是否存在真实工作流知识。
2. 进程内、同语言且无需隔离的动作默认使用原生 Tool Provider；MCP 只承担独立进程、跨语言、远程部署或明确隔离边界。
3. Tool surface 保持最小且“深”：一个 Tool 尽量完成一个完整用户意图，内部阶段和运行时元数据不自动升级成模型可见 Tool。
4. 副作用按完整调用的最大可能影响声明；延迟安装、缓存物化和环境创建都属于写入，不能因最终科学计算只读而隐藏。
5. Skill 可以直接编排 Harness 已有的通用 Tool；不要为了让每个 capability 都“拥有一个 Tool”而重复包装 shell、浏览、文件或审批能力。只有稳定业务合同或安全边界成立时才增加专用 Tool。
6. Cordis Plugin 是装配机制，不改变 Skill、Tool、MCP Server、Validator、External API Adapter 和 eval 的职责边界。

四个常见例子：

1. 新增模型：增加 Provider Route；不能把模型包装成 Skill 或 MCP Server。
2. 新增量子云：先定义有界 Tool 和其 External API Adapter；只有需要独立进程、跨语言或远程部署时
   才用 MCP Server 暴露；再用 Skill 说明选择方法。
3. 新增科研算法：有工作流知识时用 Skill 描述方法，Tool 执行确定性计算；只有存在可验证主张时才增加 Validator 和
   Acceptance Profile。
4. 平台诊断：Skill 编排 Harness 已有的 shell Tool 并保留命令和审批可见性；除非形成稳定、可复用的诊断业务合同，
   不再套一层 `diagnose_openquantum` Tool。

## 7. 禁止依赖

```text
Client Plugin / UI -X-> Model Provider / MCP Server / External API / Skill filesystem / Validator
Skill              -X-> Tool implementation / MCP lifecycle / credentials / UI / Validator execution
HTTP route         -X-> domain policy / direct Cordis mutation
MCP Server         -X-> Session lifecycle / UI / model-provider credentials
Tool               -X-> UI state / fabricated Session events / final Acceptance declaration
Validator          -X-> Model / network / Session lifecycle / UI / side effects
Eval / Benchmark   -X-> production runtime path
Agent Preset       -X-> algorithms / scientific thresholds / secret values
Host Plugin        -X-> second Tool Registry / second Session store / generic OpenQuantum Runtime
Model output       -X-> scientific pass state
```

允许的方向：

- UI 只通过 Harness RPC 或有界 Host route 提交意图；Host route 再调用应用 Interface。
- Skill 可以引用 Tool 名称和结果解释规则，但不能 import 或启动 Tool implementation。
- MCP-exposed Tool 可以调用有界领域 Module、SDK 或 External API。
- Tool 可调用 Validator 产生执行期 observations。可信 Host Plugin 拥有物化 hook，并通过内部
  Scientific Result Adapter 把数据交给 Materializer；Materializer 重读后将结构化证据交给 Validator。
- Preset 和 Home Patch 只组合已有模块，不承载领域规则。

## 8. Capability Package 只是源码纵切

`.agents/skills/<capability-id>/` 可以共置 Skill、MCP Server、Validator、schema、eval 和 test，以获得维护
locality。共置不产生运行时绑定：

- 只有 `SKILL.md` 被 Skill Provider 发现；
- 连接 MCP Server 的 Harness MCP Client 必须在 Agent Preset 中独立声明；
- Tool 必须由原生 Tool Plugin 注册，或由 MCP Server 暴露后经 Harness MCP Client 注册；
- Validator 必须由 Tool、Materializer 或 CI 显式调用；若起点是 Harness hook，hook 必须由
  可信 Host Plugin 拥有，Scientific Result Adapter 只做内部 capability 映射；
- Eval/Benchmark 只由开发与发布流程执行。

发行版证据清单 `.agents/capability-packages.yml` 使用两种执行声明：

- `mcpServers` 记录 Server 名称、来源、package `entrypoint`、启用方式、合同检查入口、`effectEvidence`，以及它暴露的 Tool 名称和最大副作用级别；package `entrypoint` 必须是当前 capability 目录内的安全 canonical POSIX path；
- `nativeTools` 记录 Tool 名称、提供它的原生 Tool Plugin、启用方式、合同检查入口、最大副作用级别与 `effectEvidence`。

`activation` 只有三种静态语义：`always` 表示 Preset 未设置禁用条件，`conditional` 表示是否启用由平台或
环境表达式决定，`opt-in` 表示 Preset 默认关闭。`contractCheck` 指向验证实际 Tool surface 的测试或显式
上游探针；本地 MCP Server 测试必须从同一份 policy 读取 Tool 名称，防止声明与 `tools/list` 漂移。
`npm run capability:contracts:test` 直接从 policy 收集 package MCP 与 native Tool 的 `contractCheck` 并执行，
因此新增默认离线合同不需要再手工维护一份 CI 测试清单。

副作用分类是有意限定的：`read-only` 不产生持久变更（但仍可能读取网络，数据外发边界需单独说明）；
`workspace-write` 只改变本地工作区；`external-write` 改变云端、QPU 任务或其他外部状态，必须额外定义
审批、费用、幂等与恢复规则。

`effectEvidence` 说明副作用声明的证据来源：仓库本地 MCP Server 使用 `mcp-annotations`，合同测试必须
核对实际 `tools/list` annotations；没有 annotations 的固定上游版本使用 `reviewed-source`，并用
`effectEvidenceRef` 指向版本化的逐 Tool 审查记录，显式 probe 必须拒绝与源码审查结论冲突的 annotations；
Harness 原生 Tool 使用 `conservative-provider`，按 Provider
可达能力保守声明，并由真实 Tool Registry 测试锁定名称。证据来源不是副作用级别，也不能把静态声明
误写成运行时已就绪。

用户执行入口不接受 `runner` 或 `localRunner`；本地程序只能是 Tool implementation 内部细节，
或作为 `checks` 中的开发证据。Conformance report 明确标记 `scope=static-declaration`：它只验证 Tool
contract 声明、Preset 中的 Provider/activation 声明和证据文件静态存在；它不执行 check，也不证明
Provider 当前已启用或依赖已经 ready。本地 Tool surface 由 `npm run check` 执行的 `contractCheck` 验证；
需要下载或访问上游的动态 Tool 清单则由显式 probe 验证。

## 9. 命名和评审规则

文档、代码注释和 PR 中不要再使用：

- `MCP/Tool`：改成“Tool（原生或由 MCP 暴露）”；
- `Validator/eval`：分别写运行时 Validator 和开发期 eval；
- `Skill Validator`：改成 Scientific Validator 或 Capability Validator；
- “Agent 调用 MCP”：改成“Agent 调用 MCP-exposed Tool”；
- “Skill 产生结果”：改成“Tool 产生 facts、Validator 产生 observations、Materializer 产生 Artifact”；
- 裸写 `API`：写成 `Harness RPC`、`External API` 或 `Model Provider API`；
- 用泛化 `Plugin` 代替职责：运行时装配写 `Cordis Plugin`，具体能力写出 Provider/Adapter/Host/Client 角色和 scope；
- `preset / Cordis`：分别写 Agent Preset、Deployment/Home Patch 或 Cordis Plugin composition。

每次新增能力至少回答：

1. 用户看到的 Capability 是什么？
2. Skill 只增加了哪些知识和选择规则？
3. Agent 实际调用哪些 Tool？每个 Tool 的副作用是什么？
4. Tool 由原生 Tool Plugin 注册，还是由 MCP Server 暴露并经 Harness MCP Client 注册？
5. 是否调用 External API，凭据和数据外发边界是什么？
6. 哪些事实由 Tool 产生，哪些 observations 由 Validator 重算？
7. 哪个 Profile 定义规则，哪个 central Acceptance Builder 推导最终 Acceptance？
8. Agent Preset 与 Deployment/Home Patch 分别需要组合什么？
9. 哪些是运行时行为，哪些只是 eval/benchmark 证据？

长期模块地图见 [MODULES.md](MODULES.md)，架构基线见
[ARCHITECTURE_AUDIT.md](ARCHITECTURE_AUDIT.md)，目录与配置权威见
[REPOSITORY_GUIDE.md](../REPOSITORY_GUIDE.md)。
