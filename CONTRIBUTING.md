# Contributing to OpenQuantum

OpenQuantum 是 DeepSeek Harness 的开源量子科研发行版。最常见的二次开发方式是 Fork 仓库，
直接增加 Harness 原生 Skill、Tool Provider 或经过审查的 Host Plugin，而不是接入 OpenQuantum 私有市场或包协议。

第一次参与项目前，先阅读[扩展对象模型](docs/architecture/EXTENSION_MODEL.md)、
[模块地图](docs/architecture/MODULES.md)和[仓库地图](docs/REPOSITORY_GUIDE.md)。前者严格区分 Skill、Tool、
MCP Server、Harness MCP Client、External API、Validator 与 Composition，后两者说明模块 Interface、依赖方向、目录和配置权威；完整文档入口见
[docs/README.md](docs/README.md)。

## 先判断变更放在哪里

- **UI**：通用科研交互、事件和 Artifact 展示；不要加入公司或算法专用执行逻辑。
- **Deployment/Home Patch**：Provider Route、默认模型、默认 Agent Preset、品牌、deployment-scoped Host Plugin 和 Client Plugin。
- **Agent Preset**：组合彼此独立的 Skill Provider、原生 Tool Plugin、Harness MCP Client、Agent 策略，以及确有需要的 agent-scoped Host Plugin。
- **Skill**：量子工作流、Prompt、适用范围和工具使用说明；不拥有或自动启动 MCP Server。
- **Tool**：Agent 可调用的原子动作；拥有 schema、错误语义和副作用分类。
- **Tool Provider**：在 Harness 侧把 Tool 注册进 Registry；原生 Tool Plugin 与 Harness MCP Client 都属于此类。
- **MCP Server**：通过 stdio 或 Streamable HTTP 暴露 Tool；不是 Tool 的同义词。
- **Harness MCP Client**：连接 MCP Server，并把 MCP-exposed Tool 注册进 Harness Tool Registry。
- **Application Interface**：统一拥有用例命令、状态转换和安全规则；Bounded Host Route 只做传输边界并委托它。
- **External API**：Tool implementation 使用的下游网络合同；UI 和 Skill 不直连。
- **Scientific Validator**：确定性重算 observations；由 Tool、Materializer 或 CI 显式调用，不是 Skill 子模块。
- **Scientific Result Materializer**：原子物化、重读和校验真实字节，再把结构化证据交给 Validator。
- **Scientific Result Adapter**：可信 Host Plugin 内部的 capability 映射；不拥有 hook、不可独立安装、不是 Tool Provider。
- **Acceptance Profile**：版本化规则数据，定义作用域、必选 observations、阈值和 provenance 要求。
- **central Acceptance Builder**：汇聚 Profile、observations 和 provenance，唯一地推导最终 Acceptance。
- **Eval / Benchmark**：开发和发布期证据，不进入用户请求的运行链。
- **Host Plugin**：只有原生 Skill、Tool Provider 和配置无法表达的宿主行为；它拥有 Harness hook，必须作为可信代码审查，并按 hook 所有者归入 Agent 或 Deployment scope。
- **Host Adapter**：Browser、Desktop 或消息渠道这类产品入口；不装载宿主生命周期代码。
- **Model**：通过 Harness Provider route 配置厂商模型、协议和凭证引用。

常见接入只有三条最小路径，不要一开始把所有对象都堆进同一个能力：

| 产品需求 | 最小组合 | 黄金样板 | 最小验证 |
| --- | --- | --- | --- |
| 只增加知识、选择方法或工作步骤 | Skill | [`quantum-sdk-advisor`](.agents/skills/quantum-sdk-advisor/SKILL.md) | `npm run check` 中的 Skill discovery 与文档审查 |
| 让 Agent 执行一个动作 | Skill（按需）+ Tool + Tool Provider | [`qpanda-qubo`](.agents/skills/qpanda-qubo/) | `npm run capability:qpanda-qubo:test`，再确认 Harness Tool Registry |
| 对科学主张给出可回放验收 | Skill（按需）+ Tool + Tool Provider + Validator + Materializer + Acceptance Profile + central Acceptance Builder 接入；只有通过 `post-execute` 自动物化时才增加 agent-scoped Host Plugin/内部 Adapter | [`quantum-ground-state`](.agents/skills/quantum-ground-state/) | `npm run capability:quantum-ground-state:test`，再运行 Result Commit/Session 回放测试 |

不要在 OpenQuantum 中重新实现 Session、Agent loop、Tool Registry、Skill Registry、Harness MCP Client、Host Plugin 或 Client Plugin 系统、
审批、权限、沙箱、模型路由或持久化。若 Harness 缺少通用能力，优先向 DeepSeek Harness 上游贡献；
OpenQuantum 只保留无法上游化且确实必要的薄适配。

## 开发环境

要求 Node.js 24+，并安装 Qiskit MCP 使用的 `uv` / `uvx`。Fork 仓库并从 `main` 创建短生命周期分支：

```bash
git clone <your-openquantum-fork>
cd openQuantum
npm ci
cp .env.example .env
npm run mcp:qiskit:probe
npm run demo:quantum-ground-state
npm run check
```

`.env` 只放本地凭证，不能进入 Issue、日志、Artifact、截图、Git diff 或提交。

`demo:quantum-ground-state` 是第一条参考纵切的零密钥黄金案例。它通过 Harness MCP Client 调用仓库内
stdio Server 暴露的 Tool，检查所有计算级 required observation，并保持 provenance / Acceptance 未推导。若你的 Fork
替换了量子后端，先让这个层级的正例和失败例稳定，再接 Harness preset 和真实模型 Tool Calling。
配置公开或私有 Provider 后，使用 `npm run e2e:quantum-harness -- --provider openquantum-public` 验证
真实模型是否经过 Harness AgentLoop 调用 MCP-exposed Tool，并形成可复核的 Result Commit。这个在线探针使用临时
Session/workspace，不进入默认离线 CI，也不能用 Mock 结果替代。

## 增加量子 Skill

在 `.agents/skills/<skill-name>/` 中使用 Harness 原生 `SKILL.md` 作为入口。一个首版 Skill 通常包含：

```text
.agents/skills/<skill-name>/
├── SKILL.md
├── references/       # 领域规范与来源
├── scripts/          # 可选：与工作流共置的仓库辅助程序
├── schemas/          # 可选：输入与 Artifact schema
├── validators/       # 可选：独立的确定性科学检查
└── test/             # 正例、负例和边界测试
```

其中只有 `SKILL.md` 会被 Harness Skill provider 当作 Skill 加载。其余目录只是为了让同一科研纵切的
源码便于审查而共置；Harness 不会因此自动启动程序、连接 MCP Server、注册 Tool 或执行 Validator。

保持作用域小而明确。`SKILL.md` 可以指导 Agent，但以下规则不能只写在 Prompt 中：

- 数值阈值、单位和适用范围；
- Artifact 结构；
- 必须失败的科学检查；
- 文件、网络、子进程和外部数据风险；
- “科学验收通过”的推导规则。

这些规则应由 Tool implementation、Scientific Validator、schema 或 Harness 权限配置强制执行；
MCP Server 只提供协议边界，不自动使规则可信。

仓库发行版自带的 Skill 还必须登记在 `.agents/capability-packages.yml`。L0–L3 是开发证据等级，不是
Harness 运行状态：L1 绑定 Agent Preset 声明的 Tool Provider、activation、Tool contract 和合同检查入口，L2 额外通过共享
`loadCapability` 验证科学合同，L3 还必须
声明真实 Harness 物化 Adapter 和回放测试。用户本地 Skill 与 Git 忽略的上游挂载不进入这个发行版清单。
`npm run capability:conformance` 输出的 `scope` 固定为 `static-declaration`，只证明声明互相一致；本地
Tool surface 由 `npm run capability:contracts:test` 直接按 policy 中的 `contractCheck` 实际查询，Qiskit 等需下载上游依赖的 surface 由显式 probe 验证，二者都不能
被静态 `pass` 替代。

Tool 最大副作用和证据来源也必须分开登记：本地 MCP Server 通常使用 `mcp-annotations`；不提供 annotations
的固定上游版本使用 `reviewed-source`、以 `effectEvidenceRef` 指向逐 Tool 审查记录，并由显式 probe 拒绝矛盾声明；Harness 原生 Tool 使用
`conservative-provider`，按 Provider 能力保守分类。`effectEvidence` 不是“运行时已连接”的证明。

## 增加 Tool 或 MCP Server

先定义 Agent 真正需要的最小 Tool surface：名称、输入输出 schema、错误语义、副作用、超时和审批要求。
如果 Tool 需要进程隔离、语言无关协议或远程部署，再用 MCP Server 暴露 Tool，并由 Harness MCP Client
注册；不要仅仅因为实现使用 Python，或为了“使用 MCP”而额外增加一层空转发。

需要 MCP Server 边界时，优先使用 Harness MCP Client 支持的 stdio 或 Streamable HTTP 协议：

1. 为每个 Tool 定义小而清楚的输入输出 schema；
2. 让错误、超时和不支持的输入显式失败；
3. 外部厂商 API 只由 Tool implementation 调用，不把 API Key 写进 Skill、Tool 参数或 Artifact；
4. 只有具备幂等键或已证明安全的读操作才能自动重试；QPU 提交、取消等写操作不得盲目重试；
5. 在 `runtime/openquantum/` 的 Agent Preset/Cordis 配置中声明连接该 Server 的 Harness MCP Client；
6. 在 `.agents/capability-packages.yml` 的 `mcpServers[]` 中登记 Server 的 `activation`、`contractCheck` 和
   `effectEvidence`；仓库内 Server 还必须把当前 capability 目录内的安全 canonical POSIX path 显式登记为唯一 `entrypoint`，
   并在 `tools` 中登记每个 Agent-facing Tool 及 `read-only` / `workspace-write` / `external-write` 最大副作用级别；
7. 增加 MCP 集成测试和至少一条 Harness 端到端测试。

Harness 会把同一个 Agent preset 在一个进程中挂载一次，再由多个 Session 共享。修改
`agent.cordis.yml` 后应重启本地 Harness；开发期热更新会保留旧 composition generation，两个 generation
若同时声明相同 MCP `serverName`，Harness MCP Client 会按唯一性规则拒绝新 generation。不要因此把
model-facing MCP 移到全局 Cordis 层，它会破坏 preset 的工具作用域。

进程内即可实现的动作默认使用原生 Tool Plugin；只有确实需要进程隔离、跨语言或远程边界时才增加
MCP Server。进入 MCP 方案后，本地 stdio 是可复现科研计算的最小传输选择；需要远程部署时再使用
受控 Streamable HTTP，并明确网络、成本、数据外发和审批要求。

若一个可靠科学动作天然要求“计算后立即做独立检查”，优先把它收敛为一个原子 MCP-exposed Tool，而不是要求
Model 在两次调用之间复制大型结构化 bundle。仍可保留 facts-only 和 materialized-validation Tool 作为高级
接口。原子 Tool 只能报告它真正检查过的维度；缺少 Harness 物化来源链时必须返回 `not_checked`，不能填充
假的 Session、Artifact path 或 digest。

OpenQuantum 参考实现使用受信任的 Host Plugin 拥有 Harness `tools/post-execute` hook。Plugin 从真实
Agent/Session/Tool call 取得执行身份，并查询内部 Scientific Result Adapter。Materializer 通过 `ctx.fs`
在 Session workspace 的 `results/openquantum/` 下原子写入、重读和校验 input、Artifact 与合同文件；
Validator 只接收重读后的结构化证据，central Acceptance Builder 再消费 Profile、observations 和
provenance。MCP Server 本身仍不写
文件、不管理 Session，也不能自报最终验收。

### 增加 Harness 原生 Tool

只要 Tool 能安全地在 Harness 进程内实现，且不需要独立进程、跨语言或远程边界，就优先选择原生 Tool Plugin；
它既可以调用普通本地 Module/SDK，也可以按需使用 Harness 宿主能力：

1. 在 Tool Plugin 中定义 Tool 名称、schema、错误和副作用，不把业务规则塞进 Cordis 配置；
2. 在 Agent Preset 中以稳定 Plugin 名声明 Provider，并配置需要的平台或审批条件；
3. 在 `.agents/capability-packages.yml` 的 `nativeTools` 中登记 `name`、`providerPlugin`、`activation`、
   `contractCheck`、`effect` 和 `effectEvidence`；
4. 增加 Tool schema、权限/审批、失败语义和 Harness 注册测试。

原生 Tool 可以在内部调用本地 Module 或程序，但这些 runner 不能另行登记为 Agent 执行面。
Conformance 只接受 Agent Preset 中 `id: tool-*` 的 Provider 声明，并通过 `providerPlugin` 与 `activation`
匹配；实际 Tool Registry surface 仍由 `contractCheck` 指向的 Harness 测试验证。

### 复用外部 MCP

优先直接采用上游维护的 MCP，而不是把第三方 Tool 复制进仓库。Qiskit 官方服务是参考做法：

- 在 `agent.cordis.yml` 中为每个 server 使用独立、稳定的 `serverName`；
- `uvx --from package==version command` 固定上游顶层包版本；
- 无凭据的核心服务可以默认开启，涉及网络、费用或真实硬件的服务默认关闭；
- 凭据只使用 Harness credential reference，禁止写入 Cordis YAML、Skill、Tool 参数、日志或 Artifact；
- 默认测试验证静态配置和薄 Adapter，真实上游探针作为显式命令，避免离线 CI 隐式下载依赖；
- 上游版本升级必须重新运行工具清单探针，并审查 Tool schema、网络面和许可证变化。

如果 stdio MCP 需要把 Harness 凭据传给子进程，复用 preset 内的 `credentialed-mcp-client.mjs` 薄 Adapter。
它只负责 credential reference → 子进程环境变量的启动期映射；连接、Tool 注册、超时和重连仍由
`@deepseek-ai/dsh-mcp-client` 负责。不要在 Adapter 中添加第二套 MCP 生命周期。

`quantum-hardware-mcp` 展示了没有稳定 Release 时的保守接入方式：来源 URL、完整 commit SHA、安装位置和
来源标记集中在 `src/settings/server/quantum-hardware-mcp.mjs`；安装器只物化该固定源码，preset 仍默认关闭。
升级它时必须同时完成：

1. 审阅旧 SHA 到新 SHA 的源码、依赖、许可证、Tool schema、云端副作用和凭据变化；
2. 只更新这一份集成描述，不在 UI、脚本和 preset 中散落第二份版本常量；
3. 运行安装器幂等/篡改测试、设置门控测试、`harness:config` 和显式 MCP Tool 清单探针；
4. 在 Release Notes 中写清真实硬件、费用、网络和数据外发面的变化。

不要把“固定 commit”误解为沙箱：本地社区 MCP 仍是宿主进程，默认关闭与代码审查是当前边界。

设置中心创建的自定义 MCP 必须默认关闭、使用独立 `serverName`，参数以数组直接交给进程，禁止拼成 Shell
命令。从 Git、复制或外部工具加入的自定义 Skill 必须使用标准 `SKILL.md`；设置中心只管理发现后的
加载策略，不创建 Skill。复杂科研扩展可以把脚本、schema、Validator 或 eval 与 Skill
共置在 `.agents/skills/<name>` 以便审查，但连接 MCP Server 的 Client 仍需在 Agent Preset 中独立声明；
Validator 仍需由 Tool、Materializer 或 CI 显式调用；若从 Harness hook 起步，hook 由可信 Host Plugin
拥有，内部 Scientific Result Adapter 只负责 capability 映射。不要让 UI 成为绕过代码审查的远程安装器。

### 让科学结果在 UI 中可回放

Harness MCP Client 负责 MCP Server 进程、重连、Tool Registry 注册和调用；不要在 Skill 中复制这些职责。MCP
`structuredContent` 是执行期结构化值。若某些摘要必须在刷新或 Session resume 后继续展示，应通过仓库内
可信的 `tools/post-execute` Adapter 生成一个有界展示投影，使它随 Harness 原生 `tool/result` 持久化。

当前 QGS 与 QI 两条 L3 纵切拆成四个深模块：其中 `scientific-result-projection.mjs`
是拥有 hook 的可信 Host Plugin，Adapter Registry 只是该 Plugin 的内部 Interface。

- `scientific-result-protocol.mjs`：可在 Host/UI 两侧重放的有界协议；
- `scientific-result-materializer.mjs`：Harness workspace 路径约束、物化、真实字节重读与中央合同编排；
- `scientific-result-adapters.mjs`：显式登记 Tool、领域投影、Artifact 类型和 capability Validator；
- `scientific-result-projection.mjs`：只连接 `tools/post-execute`、`ctx.fs` 与 Adapter registry。

第二个真实能力已经证明并形成 capability adapter Interface。继续接入 L3 能力时：

1. 先实现该能力自己的 Artifact、Validator、Profile 和物化测试，再显式登记 Tool descriptor / Adapter；
2. 只投影 UI 真正需要的有限字段和受校验 Result Commit，不把 Artifact 正文或凭证塞进 Session event；
3. 在 Harness 原生 `tool/result` 展示投影中保持 Runtime 状态和 Scientific 状态为两个字段；
4. 增加 `tool/call`、成功 `tool/result`、失败结果、恶意 envelope 与刷新回放测试；
5. 不新增 OpenQuantum 私有 Session event、第二份会话数据库或 Tool Runtime。

不要把 registry 改成扫描所有 Skill 后自动执行；第三个真实变化点出现前，也不要扩大 Materializer Interface。

## 增加 dsh-plugin

Host Plugin 运行在 Harness 宿主中，审查标准高于 Skill 和远程 MCP Server。提交时必须解释：

- 为什么 Harness 原生 Skill、Tool Provider 或配置无法完成；
- 插件获得哪些文件、网络、子进程或凭证能力；
- 如何限制输入、失败时如何 fail closed；
- 能否向 DeepSeek Harness 上游贡献，避免长期维护 Fork 特例。

第一版不接受自动下载并执行的未信任插件。

## 科学验证

执行状态与科学状态必须分开：Harness `idle` 或模型给出答案，不表示科学验收通过。科学结论必须来自
独立 Validator 的 observations、版本化 Profile 和中央 Acceptance Builder；它们可以与 Skill 一起维护，
但不会由 Skill Registry 自动执行，并且必须有固定正例、负例、篡改例和作用域外案例。

Skill 实现者不能单独放宽自己的科学门槛。涉及阈值、作用域或验收结论的改动，应由独立领域审阅者复核。

## 平台贡献

修改 Harness Client Plugin、Web Host 扩展或 Harness 配置前，请说明：

1. 解决的产品问题；
2. 受影响的 Harness 原生对象和事件；
3. 为什么不能只通过 Skill、Tool Provider 或 Agent Preset 完成；
4. 是否可以贡献给 DeepSeek Harness 上游；
5. 自动测试和失败路径。

常用验证命令：

```bash
npm run lint
npm run capability:conformance
npm run demo:quantum-ground-state
npm run test:p1
npm run harness:config
npm run check
```

## Pull Request

一个 PR 只承载一个可独立理解和回滚的改进。请写清楚业务影响、架构归属、权限变化、科学作用域、
验证命令和剩余风险。不要把模型密钥、私有 Endpoint 或无关格式化改动带入提交。

参与即表示同意遵守 [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md)。安全漏洞不要公开披露，请按
[`SECURITY.md`](SECURITY.md) 使用私密渠道报告。
