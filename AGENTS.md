# OpenQuantum

OpenQuantum 是一个科研 Agent 操作平台。DeepSeek Harness 负责通用 Agent Runtime，量子计算、
性质预测、案例咨询和通用问答等产品能力由 Agent Preset 组合独立的 Harness Skill 与 Tool Provider；
Tool 可以由原生 Tool Plugin 注册，或由 MCP Server 暴露后经 Harness MCP Client 注册，必要时再调用
OpenQuantum Scientific Validator。只有 Tool hook 等 Agent 生命周期行为才在同一 Preset 组合受信任的
agent-scoped Host Plugin。

DeepSeek Harness 的“一切皆 Plugin”是运行时装配原则：可组合模块统一通过 Cordis Plugin row 注入、注册
Interface 并随 scope 回收。Skill、Tool、MCP Server、Validator 等是职责对象；它们说明模块负责什么，
不与 Cordis Plugin 这一装配机制竞争。

开始架构或实现工作前，先阅读 `docs/README.md` 的架构总览和权威导航；涉及架构基线、发布验收或当前风险时，
再阅读 `docs/architecture/ARCHITECTURE_AUDIT.md`。

## 四个职责面

下面四项用于判断规则归属，不表示一条 `UI → Harness → 量子扩展 → Model` 的线性调用链：

1. UI：直接使用 Harness 原生 Web UI；浏览器展示通过 Harness Client Plugin、Slot 和 Harness RPC 扩展，
   品牌壳由 deployment-scoped Host Plugin 使用 `tapIndex` 注入，OpenQuantum 特有设置经 Bounded Host Route
   委托 Application Interface。
2. Harness：Session、Turn、Step、Goal、Job、事件日志、工具调度、审批、沙箱和持久化。
3. 量子扩展内容：Harness Skill 保存领域工作流和 Prompt；Tool 是 Agent 唯一调用的执行原语；Harness MCP
   Client 是 Tool Provider，MCP Server 通过协议暴露 Tool；Scientific Validator 产生科学 observations，
   Acceptance Profile 定义规则，只有 central Acceptance Builder 推导验收。
4. Model：Provider route、模型能力元数据、协议适配、鉴权引用、超时和可用性探测。

不要新增独立的 OpenQuantum domain/platform Runtime。通用执行机制放 Harness；领域指令放原生
`SKILL.md`，确定性执行放 Tool implementation，可强制规则放 Validator 或可信 Host Plugin。相关源码可以为维护 locality
共置在 `.agents/skills/<capability-id>/`，但共置不表示 Harness 会自动绑定或启动这些模块。

## 扩展对象不可混用

- **Cordis Plugin**：DSH 的统一装配与生命周期单元；按具体职责承载 Skill Provider、Tool Provider、
  Harness MCP Client、Model Adapter、Host 或 Client 扩展，不能成为无边界的业务容器。
- **Skill**：告诉 Agent 何时、为何和怎样做；不执行代码、不启动 MCP Server、不持有凭据。
- **Tool**：Agent 可调用的原子动作；必须声明有界 schema、错误语义和副作用。
- **Tool Provider**：在 Harness 侧把 Tool 注册进 Registry；典型实现是原生 Tool Plugin 或 Harness MCP Client。
- **MCP Server**：通过协议暴露一个或多个 Tool；Agent 调用 MCP-exposed Tool，而不是“调用 MCP”。
- **Harness MCP Client**：连接 MCP Server，并把其 Tool 注册进 Harness Tool Registry。
- **Bounded Host Route**：只做请求边界与响应格式，然后委托 Application Interface；不复制业务规则。
- **Application Interface**：统一拥有用例命令、状态转换、并发和安全规则，可被多个产品入口复用。
- **External API**：Tool implementation 使用的下游网络合同；UI 和 Skill 不直接调用。
- **Scientific Validator**：从结构化证据产生 observations；Acceptance Profile 定义规则，只有 central
  Acceptance Builder 推导最终 Acceptance。
- **Eval / Benchmark**：开发、CI 和发布期证据，不进入用户请求的运行链。
- **Agent Preset**：组合 Skill Provider、Tool Provider、Agent 策略，以及确有需要的 agent-scoped Host Plugin；不保存模型 Provider Route。
- **Deployment/Home Patch**：组合 Provider Route、默认模型、默认 Agent Preset、deployment-scoped Host Plugin 与 Client Plugin。

禁止使用 `MCP/Tool`、`Validator/eval`、`Skill Validator` 或裸写的 `API`。讨论运行时装配时写
`Cordis Plugin`；讨论具体职责时写明 Skill/Tool Provider、Harness MCP Client、Model Adapter、Host 或
Client Plugin 角色和 scope。完整定义和选择规则见 `docs/architecture/EXTENSION_MODEL.md`。

## 不变量

- UI 不直接调用 Model Provider、MCP Server、External API 或 Skill 文件系统。
- Session event log 是执行事实的唯一来源。
- 运行完成和科学验收是两个状态；Acceptance Profile 只定义规则，只有 central Acceptance Builder 汇聚
  Validator observations 和来源链推导出状态后，才能宣称科学验收通过。
- API Key 不得进入源码、日志、Artifact、Git diff 或提交。
- Provider 配置只引用环境变量名；真实密钥留在忽略的 `.env` 或 credential store。
- 新增研究能力优先增加原生 Skill、Tool Provider 和必要 Validator；Agent Preset 组合 Skill、Tool Provider，
  以及只有 Harness hook 确实需要时才声明的 agent-scoped Host Plugin。
  Tool 或 Materializer 显式调用 Validator；可信 Host Plugin 拥有 hook，内部 Scientific Result Adapter
  只做 capability 映射。
- 不修改 `node_modules` 中的 DeepSeek Harness 实现；通过 Cordis patch 和 preset 扩展。

## 代码位置

- `runtime/openquantum`：Harness patch、preset、模型 route、品牌和原生 Client Plugin。
- `src/settings/server`：项目 Skill、MCP Server 连接与凭据引用的受控设置实现。
- `.agents/skills`：Harness 原生 Skill 指令，以及为维护 locality 可选共置的领域资源；连接 MCP Server 的
  Harness MCP Client 仍需在 Agent Preset 中独立声明。
- `docs/architecture`：架构决策和边界。

## 常用命令

- `npm run dev`：启动 OpenQuantum Harness Web Host 和原生 Web UI。
- `npm run harness:dev`：以自定义参数启动同一个 Harness Host。
- `npm run harness:config`：展开并检查 Harness 组合配置。
- `npm run models:probe -- --provider openquantum-public`：验证模型目录、文本生成和工具调用。
- `npm run capability:diagnostics:test`：验证平台诊断能力包和评分规则。
- `npm run check`：运行 lint、平台/科学测试并验证 Harness 组合配置。

## 实现规则

- 使用清晰的原生 ESM、明确数据结构和 2 空格缩进。
- 领域指令放 Skill；可强制规则放 Tool、Validator 或可信 Host Plugin，不散落在 Client Plugin 或
  Provider 配置里。
- 先定义核心对象、状态、事件和不变量，再选择文件与框架实现。
- 每次变更运行最相关的检查，并明确报告未通过或未验证的部分。
