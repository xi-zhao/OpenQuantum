# OpenQuantum Domain Language

OpenQuantum 是 DeepSeek Harness 的开源量子科研发行版。本文件约定产品与科研领域语言，避免把
Harness 已有 Runtime 对象重新命名或复制。

## Platform

**OpenQuantum Distribution（OpenQuantum 发行版）**：
DeepSeek Harness、Agent Preset、量子 Skill、Tool Provider、可选 Scientific Validator 与必要科研 UI 的可运行组合。
_Avoid_: 新 Agent Runtime、插件市场、Capability 操作系统

**Harness Runtime（Harness 运行时）**：
Session、Agent loop、Turn、Step、Goal、Job、Registry、审批、权限、沙箱、模型调用、Cordis Plugin 组合、
事件和持久化的权威实现。OpenQuantum 不复制这些对象。
_Avoid_: OpenQuantum Runtime、第二套会话系统

**Responsibility Plane（职责面）**：
UI、Harness、量子扩展和 Model 四种规则归属视角；它们不是四级调用顺序，实际依赖通过 Harness Interface
和 Cordis Plugin composition 连接。
_Avoid_: 四阶段流水线、UI → Harness → 量子 → Model 固定调用链

**Cordis Plugin（Cordis 插件）**：
可组合模块进入 DSH Runtime、注册 Interface、获得依赖并随 scope 回收的统一装配与生命周期单元。
它描述模块怎样接入，不代替 Skill、Tool、Validator 等职责对象。
_Avoid_: 无边界业务容器、所有职责都叫 Plugin

**Runtime Readiness（运行就绪）**：
当前 Harness Host 中目标 Plugin 已激活、所需 Registry/连接与外部依赖可达的运行证据。
配置启用或静态 conformance 不能单独证明 Runtime Readiness。
_Avoid_: configured = ready、YAML 存在即 Agent 可用

**Harness Native UI Extension（Harness 原生 UI 扩展）**：
通过 Harness Client Plugin、Slot、Settings 和 Web Host 扩展点增加 OpenQuantum 品牌与科研展示；
不复制 Session 投影、事件重连、模型调用或 Tool 生命周期。
_Avoid_: 平行 Web UI、第二套浏览器状态机

## Research execution

**Research Session（科研会话）**：
直接使用 Harness `Session` 表示的持续科研上下文。事件日志是执行事实的唯一来源。
_Avoid_: Chat 数据副本、ResearchRun

**Research Goal（科研目标）**：
直接使用 Harness `Goal` 表示的、有明确完成条件的长期目标。
_Avoid_: Prompt、消息、平台自定义任务状态机

**Experiment（实验）**：
在固定输入、方法、参数和环境下，由 Harness Session / Turn / Tool 调用完成的一次可重复尝试。
它是对原生执行事实的科研解释，不是新的 Runtime 实体。
_Avoid_: 随手运行、模型回答

**Artifact（科研产物）**：
Tool 产生 facts，Scientific Result Materializer 产生可重读文件，Validator 产生 observations，
central Acceptance Builder 产生 Acceptance Report；这些都可以是有类型、可引用的科研产物。
_Avoid_: 最终聊天文本、无法追溯的附件

**Provenance（来源链）**：
把科研产物追溯到输入、方法、参数、依赖、模型、工具和 Harness 事件的记录。
_Avoid_: 模型解释、日志摘要

## Native extensions

**Capability（产品能力）**：
用户可理解的一项有界科研能力，由相互独立的 Skill、Tool Provider、Validator 和证据按需组合；知识能力
可以只有 Skill，原子动作可以只有 Tool，只有真实工作流价值才组合两者。它不是 Harness 运行时对象，也不会
自动绑定内部模块。
_Avoid_: Runtime、自动安装包、Tool 别名

**Capability Maturity（能力成熟度）**：
发行版 Capability Package 在 L0–L3 中具备的开发、合同和物化证据等级。
它不表示当前 Plugin 已激活、外部依赖可达或某次科学验收通过。
_Avoid_: Runtime 状态、在线 ready、能力质量总分

**Native Skill（原生 Skill）**：
Harness 能直接发现和加载的 `SKILL.md` 及同目录科研资源。它描述问题范围、工作方法、工具使用、
产物约定和验证流程，但不执行代码、启动 MCP Server 或产生科学事实。
_Avoid_: OpenQuantum 私有插件包、页面模式

**Model-facing Tool（模型可调用 Tool）**：
Agent 能调用的原子动作，拥有稳定名称、输入输出 schema、错误语义和副作用分类；它可以由 Harness 原生
Tool Plugin 注册，或由 MCP Server 暴露后经 Harness MCP Client 注册。
副作用描述一次完整调用的最大影响，包括按需准备环境和后置保存证据，而不仅是内部计算函数。
_Avoid_: MCP、API、Skill

**Tool Provider（Tool 提供方）**：
把一个或多个 Tool 注册进 Harness Tool Registry 的模块，例如原生 Tool Plugin 或 Harness MCP Client。
_Avoid_: Tool 本身、Capability

**MCP Server（MCP 服务）**：
通过 MCP 协议向 Harness MCP Client 暴露确定性计算、数据查询或外部后端 Tool 的进程或远程服务。
它只用于独立进程、跨语言、远程部署或明确隔离边界；普通进程内 Module 不为形式统一而套 MCP。
_Avoid_: Tool、Agent Model、Session Runtime、进程内函数包装层

**Harness MCP Client（Harness MCP 客户端）**：
连接 MCP Server，将 MCP-exposed Tool 注册进 Harness Tool Registry，并管理连接、超时和重连。
_Avoid_: MCP Server、Tool implementation、Skill workflow

**Harness RPC（Harness RPC）**：
Client Plugin 调用 Harness 标准 Session、设置和 Tool 生命周期能力的传输合同。
_Avoid_: 量子领域规则、External API、Application Interface

**Bounded Host Route（有界宿主路由）**：
OpenQuantum 特有的窄 HTTP 边界，只校验来源、方法与请求体并格式化响应，然后委托 Application Interface。
_Avoid_: 复制业务规则、直接修改 Cordis、直接执行 Tool

**Application Interface（应用 Interface）**：
由 Web、Desktop 或消息入口共同调用的用例边界，统一拥有命令校验、状态转换、并发和安全规则。
_Avoid_: HTTP 解析、UI 渲染、真实凭据值

**External API（外部 API）**：
厂商或远程系统的网络请求合同；不能由 UI 或 Skill 直接调用。
_Avoid_: Module Interface、Tool、MCP Server

**External API Adapter（外部 API 适配器）**：
Tool implementation 内部满足 External API 合同的模块，负责凭据引用、超时、脱敏、幂等与错误映射。
_Avoid_: Tool Provider、Agent-facing API、UI data source

**Model Provider Route（模型 Provider Route）**：
把模型标识、协议、Endpoint 和凭据引用映射到 Harness 模型调用的 Deployment 配置。
_Avoid_: Skill、Tool、Agent Preset

**Host Plugin（宿主插件）**：
承担 Harness 宿主 hook、策略或 Bounded Host Route 职责的 Cordis Plugin 角色；只有原生 Skill、Tool Provider
和配置无法表达宿主行为时才增加。它拥有宿主代码权限，因此必须在
Fork 中显式审查和测试，不能把未经信任的远程代码自动装入 Runtime。
只服务某个 Agent composition 的 hook 归入 Agent scope；宿主 route 或全局生命周期扩展归入 Deployment scope。
_Avoid_: 全部 Cordis Plugin 的统称、默认扩展方式、任意第三方脚本

**Client Plugin（客户端插件）**：
承担浏览器 UI 扩展职责的 Cordis Plugin 角色，通过 Harness 原生 Slot、Settings 和只读投影收集意图与展示结果。
_Avoid_: 全部 Cordis Plugin 的统称、直接调用 Model Provider、MCP Server、External API 或 Validator

**Host Adapter（宿主入口适配器）**：
Browser、Desktop 或消息渠道这类进入同一 Harness 产品组合的入口。不同入口可以启动独立 Host 进程或 Session，
但不另建 Agent Runtime、业务规则或状态模型。
_Avoid_: Host Plugin、第二套 Agent Runtime、Session store

**Agent Preset（Agent 预设）**：
在 Agent scope 中组合 persona、Skill Provider、原生 Tool Plugin、Harness MCP Client、策略，以及确有需要的
agent-scoped Host Plugin 的配置入口。
_Avoid_: UI 硬编码模式、另一个编排层

**Deployment Composition（部署组合）**：
在 Host scope 中组合 Model Provider Route、默认模型、默认 Agent Preset、deployment-scoped Host Plugin 和 Client Plugin。
_Avoid_: Agent Preset、领域算法、第二套 Runtime

**Scientific Validator（科学 Validator）**：
从结构化输入与证据独立重算科学 observations 的确定性程序；它不直接推导最终 Acceptance。
_Avoid_: LLM 自评、Acceptance Builder、通用总分

**Scientific Result Materializer（科研结果物化器）**：
在 Harness workspace 内约束路径、原子写入、重读和校验真实字节，再把结构化证据交给 Validator。
_Avoid_: Validator、Tool Provider、Session persistence

**Scientific Result Adapter（科研结果适配器，内部）**：
可信 Host Plugin 内部将某个 Tool 映射到输入规范化、Artifact 类型、Materializer 和 Validator 的对象。
_Avoid_: 独立安装包、Host hook owner、Tool Provider

**Eval（评测）**：
使用固定输入、预期证据和判定依据检测 Skill、Tool 或 Validator 回归的开发/发布流程。
_Avoid_: Demo、营销示例

**Benchmark（基准测试）**：
在锁定语料、分母、指标和环境下产生可比较的性能或质量证据。
_Avoid_: 单次 Scientific Acceptance、运行时 Validator

## Trust and acceptance

**Runtime Completion（执行完成）**：
Harness Turn、Goal 或 Job 已经停止且没有待处理步骤；它不表示结果在科学上正确。
_Avoid_: 验收通过、科研成功

**Scientific Acceptance（科学验收）**：
科研产物在声明适用范围内满足版本化 Profile、Validator observations 和来源链要求的结论，只能由
central Acceptance Builder 推导。
_Avoid_: Runtime Completion、模型确信、Benchmark 均分

**Acceptance Profile（验收 Profile）**：
规定适用范围、必选 observations、阈值和来源链要求的版本化科学合同。
_Avoid_: Validator、Prompt、Benchmark

**central Acceptance Builder（中央验收构建器）**：
汇聚 Acceptance Profile、Validator observations 和 provenance，唯一地推导最终 Acceptance 状态的共享模块。
_Avoid_: capability 私有 Builder、Validator、模型自评

**Acceptance Report（验收报告）**：
记录被验收产物、检查项、证据、限制和结论的结构化产物。
_Avoid_: 自评、结果摘要

**Valid Score（有效评分）**：
由版本化规则从完整证据中计算的评分。证据不足或硬门槛失败时不能形成有效评分。
_Avoid_: LLM 打分、人工印象分

**Reproduction（复现）**：
在锁定输入、方法和环境后，独立获得处于规定容差内的目标结果。复现不自动表示科学特征验收通过。
_Avoid_: 再运行一次、答案相似

## Orthogonal states

执行、评分、复现和科学验收是相互独立的事实，不能压缩成一个“完成度”：

| 维度 | 示例状态 | 权威来源 |
| --- | --- | --- |
| 执行 | pending / running / idle / failed / cancelled | Harness events |
| 评分 | unscored / invalid / valid | 版本化评分规则与 eval evidence |
| 复现 | not_attempted / reproduced / not_reproduced | 复现证据 |
| 科学验收 | not_evaluated / passed / conditional / failed | central Acceptance Builder（输入为 Profile、Validator observations 与 provenance） |

因此：

- “11 篇做过复现，但科学特征未通过验收”应表示为 `reproduced + scientific failed`；
- “6 篇尚未形成有效评分”应表示为 `unscored`；
- Harness 已 idle 但没有 Validator observations 或 Acceptance Report，应表示为 `idle + not_evaluated`。

这些状态用于科研呈现和验证，不要求 OpenQuantum 新建一套平行于 Harness 的持久化或发布系统。
