# OpenQuantum

## 任务范围、授权与完成

本文件补充全局工作偏好，适用于本仓库；子目录规则只约束其覆盖路径。下文的 Agent、Tool、Skill、
Model 等要求描述 OpenQuantum 产品架构，不要求仓库维护任务都启动产品运行链或科研流程。

- 解释、审查、诊断和方案讨论不自动授权修改代码、配置或运行状态。按请求提供结论、证据和建议；
  用户同时明确要求修复、优化文件或实施时，执行相应修改。
- 对已授权且范围明确的实施，完成必要修改、适度验证和结果交付，不停在计划或等候重复确认。
  只有缺少会实质影响结果的信息，或下一步超出授权范围时才询问；等待时继续不依赖该决定的工作。
- 发现附带问题或文档与实现不一致时，说明偏差和影响。只有完成当前任务确实需要且在授权范围内时才修复；
  文档中的待办、里程碑和“应修复”不是独立的执行授权。
- 修改前检查相关工作树和暂存区差异，保留已有及并发改动。工作树不干净本身不是停工条件；
  若同一区域的改动无法安全分离，暂停该区域的写入或提交，说明需要用户决定的具体重叠。
- 仓库实施沿用全局的独立本地提交偏好，只暂存本任务文件或片段；用户明确要求仅留工作树改动或不提交时除外。
  提交前核对暂存范围。交付说明实际修改、验证结果和提交状态；受阻时明确剩余项，不把准备当成完成。
- 部署、发布、push、改写历史、向他人发送消息、删除重要数据或其他破坏性操作须有明确授权；
  已有授权覆盖当前动作时不重复询问。修改、测试或 Skill 指令本身不扩大这些权限。
- 外部模型请求、数据外发、依赖安装和真实硬件操作，按当前任务授权与相应能力边界执行；
  命令列在本文件中不等于授权运行。保留现有模型路由，不为审查或交叉验证擅自切换 Provider 或模型。
- 仅在用户指定或任务符合适用条件时使用 Skill；目录共置或文档示例不代表自动启用。
  领域工作流留在对应 Skill，不作为所有仓库任务的前置步骤。完整计划、多模型、子 agent 和后台流程
  不作为日常任务的默认要求；只有用户或适用规则明确要求时，才将其作为完成条件。

## 按任务读取规则和文档

- 首次进行本项目的架构或实现工作时，先读 `docs/README.md` 的架构总览和权威导航；之后按任务读取相关契约，
  不因引用链遍历全部文档或 Skills。同一任务中已经读取且未变化的内容不反复读取。
- 涉及架构基线、发布验收或当前风险时，读取 `docs/architecture/ARCHITECTURE_AUDIT.md` 的相关部分；
  其中的日期化结论不能替代当前验证。
- 存在 `CURRENT.md` 时，按全局规则先读其权威来源链接，并按任务读取相关内容；只有本次工作改变其记录的
  交接状态、结论或导航时才同步入口。一般说明或规则文字调整不自动触发里程碑更新或既有验收任务。
- 新增或修改扩展时，按职责查阅 `docs/architecture/EXTENSION_MODEL.md` 和 `CONTRIBUTING.md` 的适用路径；
  验证与独立领域审阅要求仅在对应改动触发时适用，不套用到所有任务。

## 产品与架构基线

OpenQuantum 是一个科研 Agent 操作平台。DeepSeek Harness 负责通用 Agent Runtime，量子计算、
性质预测、案例咨询和通用问答等产品能力由 Agent Preset 组合独立的 Harness Skill 与 Tool Provider；
Tool 可以由原生 Tool Plugin 注册，或由 MCP Server 暴露后经 Harness MCP Client 注册，必要时再调用
OpenQuantum Scientific Validator。只有 Tool hook 等 Agent 生命周期行为才在同一 Preset 组合受信任的
agent-scoped Host Plugin。

DeepSeek Harness 的“一切皆 Plugin”是运行时装配原则：可组合模块统一通过 Cordis Plugin row 注入、注册
Interface 并随 scope 回收。Skill、Tool、MCP Server、Validator 等是职责对象；它们说明模块负责什么，
不与 Cordis Plugin 这一装配机制竞争。

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
`SKILL.md`，确定性执行放 Tool implementation，可强制规则放 Validator 或可信 Host Plugin；领域工作流与
科学规则不散落在 Client Plugin 或 Provider 配置里。相关源码可以为维护 locality 共置在
`.agents/skills/<capability-id>/`，但共置不表示 Harness 会自动绑定或启动这些模块。

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

## 扩展选择原则

- Skill 与 Tool 是正交对象：知识/工作流可以只有 Skill，原子动作可以只有 Tool；只有 Skill 确实增加选择、步骤或解释规则时才组合两者，不要求同名或一一绑定。
- 进程内、同语言且无需隔离的确定性动作默认由原生 Tool Provider 注册；只有独立进程、跨语言、远程部署或明确隔离边界才使用 MCP Server + Harness MCP Client。
- Agent 只看到完成用户意图所需的最小深 Tool surface；运行时检查、内部分步函数和可由主动作返回的元数据不单独暴露为 Tool。
- Tool 副作用按一次完整调用的最大可能影响声明。首次调用会下载、安装或写入工作区时，不能标成 `read-only`；若要恢复只读语义，必须把 setup 变成显式、独立且可审计的动作。
- Skill 可以指导 Agent 编排 Harness 已有的通用 Tool；实际调用由 Agent 经 Harness 执行，Skill 本身不执行动作。不要仅为让能力“拥有一个 Tool”而再包装 bash、浏览、文件或审批 Tool。能力策略应记录这些依赖和副作用，只有出现稳定业务合同或安全边界时才增加专用 Tool。
- External API Adapter、Validator、eval 和 benchmark 不因为“统一”而包装成 MCP；先按职责判断，再选择 Cordis Plugin 装配方式。

描述 OpenQuantum 架构时，不用 `MCP/Tool`、`Validator/eval` 或 `Skill Validator` 混称不同职责；
接口按实际归属写为 Harness RPC、Bounded Host Route、Application Interface、External API 或 Model Provider API。
讨论运行时装配时写 `Cordis Plugin`；讨论具体职责时写明 Skill Provider、Tool Provider、Harness MCP Client、
Model Adapter、Host 或 Client Plugin 角色和 scope；上下文已明确时可简称。保留代码标识符、外部正式名称和
引用原文，不为术语规范扩大无关改写。完整定义和选择规则见 `docs/architecture/EXTENSION_MODEL.md`。

## 不变量

- UI 不直接调用 Model Provider、MCP Server、External API 或 Skill 文件系统。
- Harness 中 Session、Turn、Goal、Job 的执行状态以 Session event log 为唯一事实源；配置存在或 UI 展示不能代替执行记录。
  仓库修改、测试和 Git 状态分别以实际文件、检查输出和 Git 证据为准；科学验收按下一条规则判断。
- 运行完成和科学验收是两个状态；Acceptance Profile 只定义规则，只有 central Acceptance Builder 汇聚
  Validator observations 和来源链推导出状态后，才能宣称科学验收通过。
- API Key 不得进入源码、日志、Artifact、Git diff 或提交。
- Provider 配置只引用环境变量名；真实密钥留在忽略的 `.env` 或 credential store。
- 新增研究能力按职责选择 Skill-only、Tool-only 或 Skill + Tool；仅有知识或工作流时可复用已有通用 Tool，
  新增执行动作才注册相应 Tool Provider；有独立科学检查需求时增加 Validator，需要最终科学验收时再接入
  Acceptance Profile、证据物化与 central Acceptance Builder。Agent Preset 独立组合所需 Skill Provider、
  Tool Provider；只有 Harness hook 确实需要时才声明 agent-scoped Host Plugin。
  使用 Validator 时由 Tool 或 Materializer 显式调用；涉及 hook 时由可信 Host Plugin 拥有，
  内部 Scientific Result Adapter 只做 capability 映射。
- 不修改 `node_modules` 中的 DeepSeek Harness 实现；通过 Cordis patch 和 preset 扩展。

## 代码位置

- `runtime/openquantum`：Harness patch、preset、模型 route、品牌和原生 Client Plugin。
- `src/settings/server`：项目 Skill、MCP Server 连接与凭据引用的受控设置实现。
- `.agents/skills`：Harness 原生 Skill 指令，以及为维护 locality 可选共置的领域资源；连接 MCP Server 的
  Harness MCP Client 仍需在 Agent Preset 中独立声明。
- `docs/architecture`：架构决策和边界。

## 常用命令

以下是按任务选择的入口，不是每次修改都要运行的清单；执行仍遵循上文授权边界。

- `npm run dev`：启动 OpenQuantum Harness Web Host 和原生 Web UI。
- `npm run harness:dev`：以自定义参数启动同一个 Harness Host。
- `npm run harness:config`：展开并检查 Harness 组合配置。
- `npm run models:probe -- --provider openquantum-public`：验证模型目录、文本生成和工具调用。
- `npm run capability:diagnostics:test`：验证平台诊断能力包和评分规则。
- `npm run check`：运行 lint、能力声明一致性检查、平台/科学测试并验证 Harness 组合配置。

## 实现规则

- 使用清晰的原生 ESM、明确数据结构和 2 空格缩进。
- 新增能力或改变跨模块行为时，先明确受影响的核心对象、状态、事件和不变量，再选择实现落点；
  局部修复沿用已确定的模型和模式，不为流程完整性重新设计架构。
- 按改动选择验证：纯文档或规则调整检查差异、链接和指令一致性；代码或配置修改运行最相关的检查，
  保留适用贡献路径要求的合同、失败路径、集成测试和领域审阅。涉及广泛影响、发布验收或明确要求时再运行全仓检查。
- 相关检查通过且已授权目标完成后收口；只有新改动、失败或未解决风险才扩大或重复验证。
  失败时先判断与本次改动的关系：修复授权范围内的问题；无关失败或外部条件受阻则如实报告影响和未验证项，
  不擅自扩修，也不将未通过写成通过。
