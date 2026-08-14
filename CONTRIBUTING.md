# Contributing to OpenQuantum

OpenQuantum 是 DeepSeek Harness 的开源量子科研发行版。最常见的二次开发方式是 Fork 仓库，
直接增加 Harness 原生 Skill、MCP 或经过审查的 `dsh-plugin`，而不是接入 OpenQuantum 私有市场或包协议。

## 先判断变更放在哪里

- **UI**：通用科研交互、事件和 Artifact 展示；不要加入公司或算法专用执行逻辑。
- **Harness 配置**：Agent preset、Skill/MCP 组合、权限和模型 route；优先复用 Harness 原生能力。
- **Skill**：量子工作流、Prompt、适用范围、科研产物、Validator、eval 和风险规则。
- **MCP**：确定性计算、科学数据库或外部后端的工具接口。
- **dsh-plugin**：只有原生 Skill、MCP 和配置无法表达的宿主行为；必须作为可信代码审查。
- **Model**：通过 Harness Provider route 配置厂商模型、协议和凭证引用。

不要在 OpenQuantum 中重新实现 Session、Agent loop、Tool registry、Skill registry、MCP client、Plugin 系统、
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

`demo:quantum-ground-state` 是第一条参考纵切的零密钥黄金案例。它通过官方 MCP Client 调用仓库内
stdio server，检查所有计算级 required observation，并保持 provenance / Acceptance 未推导。若你的 Fork
替换了量子后端，先让这个层级的正例和失败例稳定，再接 Harness preset 和真实模型 Tool Calling。
配置公开或私有 Provider 后，使用 `npm run e2e:quantum-harness -- --provider openquantum-public` 验证
真实模型是否经过 Harness AgentLoop 调用你的 MCP，并形成可复核的 Result Commit。这个在线探针使用临时
Session/workspace，不进入默认离线 CI，也不能用 Mock 结果替代。

## 增加量子 Skill

在 `.agents/skills/<skill-name>/` 中使用 Harness 原生 `SKILL.md` 作为入口。一个首版 Skill 通常包含：

```text
.agents/skills/<skill-name>/
├── SKILL.md
├── references/       # 领域规范与来源
├── scripts/          # 可选：Skill 内部辅助程序
├── schemas/          # 可选：输入与 Artifact schema
├── validators/       # 确定性科学检查
└── test/             # 正例、负例和边界测试
```

保持作用域小而明确。`SKILL.md` 可以指导 Agent，但以下规则不能只写在 Prompt 中：

- 数值阈值、单位和适用范围；
- Artifact 结构；
- 必须失败的科学检查；
- 文件、网络、子进程和外部数据风险；
- “科学验收通过”的推导规则。

这些规则应由 Tool、MCP、Validator、schema 或 Harness 权限配置强制执行。

## 增加 MCP

优先使用 Harness 原生 MCP client 支持的 stdio 或 Streamable HTTP 协议：

1. 为每个 Tool 定义小而清楚的输入输出 schema；
2. 让错误、超时和不支持的输入显式失败；
3. 不把 API Key 写进 Skill、MCP 参数或 Artifact；
4. 在 `runtime/openquantum/` 的 preset / Cordis 配置中声明 MCP；
5. 增加 MCP 集成测试和至少一条 Harness 端到端测试。

Harness 会把同一个 Agent preset 在一个进程中挂载一次，再由多个 Session 共享。修改
`agent.cordis.yml` 后应重启本地 Harness；开发期热更新会保留旧 composition generation，两个 generation
若同时声明相同 MCP `serverName`，官方 MCP client 会按唯一性规则拒绝新 generation。不要因此把
model-facing MCP 移到全局 Cordis 层，它会破坏 preset 的工具作用域。

首选本地 stdio MCP 作为可复现科研计算的最小方案。需要访问云端数据或算力时，再使用受控 HTTP MCP，
并明确网络、成本、数据外发和审批要求。

若一个可靠科学动作天然要求“计算后立即做独立检查”，优先把它收敛为一个原子 MCP Tool，而不是要求
Model 在两次调用之间复制大型结构化 bundle。仍可保留 facts-only 和 materialized-validation Tool 作为高级
接口。原子 Tool 只能报告它真正检查过的维度；缺少 Harness 物化来源链时必须返回 `not_checked`，不能填充
假的 Session、Artifact path 或 digest。

OpenQuantum 参考实现随后在受信任的 Harness `tools/post-execute` Adapter 中完成物化：Adapter 从真实
Agent/Session/Tool call 取得执行身份，通过 `ctx.fs` 在 Session workspace 的 `results/openquantum/` 下原子
写入 input、Artifact 与合同文件，再调用同一个独立 Validator 和中央 Acceptance builder。MCP 本身仍不写
文件、不管理 Session，也不能自报最终验收。

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

### 让科学结果在 UI 中可回放

Harness 的 MCP bridge 负责进程、重连、Tool registry 和调用；不要在 Skill 中复制这些职责。MCP
`structuredContent` 是执行期结构化值。若某些摘要必须在刷新或 Session resume 后继续展示，应通过仓库内
可信的 `tools/post-execute` Adapter 生成一个有界展示投影，使它随 Harness 原生 `tool/result` 持久化。

参考实现拆成三个深模块：

- `scientific-result-protocol.mjs`：可在 Host/UI 两侧重放的有界协议；
- `scientific-result-materializer.mjs`：Harness workspace 物化、Validator 与中央 Acceptance 编排；
- `scientific-result-projection.mjs`：只连接 `tools/post-execute`、`ctx.fs` 和上述两个模块。

增加第二个科学 Tool 时：

1. 在该深模块的 Tool descriptor / projector registry 增加一种明确映射；
2. 只投影 UI 真正需要的有限字段和受校验 Result Commit，不把 Artifact 正文或凭证塞进 Session event；
3. 在 `HarnessUiPort` 中保持 Runtime 状态和 Scientific 状态为两个字段；
4. 增加 `tool/call`、成功 `tool/result`、失败结果、恶意 envelope 与刷新回放测试；
5. 不新增 OpenQuantum 私有 Session event、第二份会话数据库或 Tool Runtime。

## 增加 dsh-plugin

`dsh-plugin` 运行在 Harness 宿主中，审查标准高于 Skill 和远程 MCP。提交时必须解释：

- 为什么 Harness 原生 Skill、MCP 或配置无法完成；
- 插件获得哪些文件、网络、子进程或凭证能力；
- 如何限制输入、失败时如何 fail closed；
- 能否向 DeepSeek Harness 上游贡献，避免长期维护 Fork 特例。

第一版不接受自动下载并执行的未信任插件。

## 科学验证

执行状态与科学状态必须分开：Harness `idle` 或模型给出答案，不表示科学验收通过。科学结论必须来自
与 Skill 一起维护的确定性 Validator，并有固定正例、负例、篡改例和作用域外案例。

Skill 实现者不能单独放宽自己的科学门槛。涉及阈值、作用域或验收结论的改动，应由独立领域审阅者复核。

## 平台贡献

修改 UI、transport adapter 或 Harness 配置前，请说明：

1. 解决的产品问题；
2. 受影响的 Harness 原生对象和事件；
3. 为什么不能只通过 Skill、MCP 或 preset 完成；
4. 是否可以贡献给 DeepSeek Harness 上游；
5. 自动测试和失败路径。

常用验证命令：

```bash
npm run lint
npm run typecheck
npm run demo:quantum-ground-state
npm run test:p1
npm run build
npm run check
```

## Pull Request

一个 PR 只承载一个可独立理解和回滚的改进。请写清楚业务影响、架构归属、权限变化、科学作用域、
验证命令和剩余风险。不要把模型密钥、私有 Endpoint 或无关格式化改动带入提交。

参与即表示同意遵守 [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md)。安全漏洞不要公开披露，请按
[`SECURITY.md`](SECURITY.md) 使用私密渠道报告。
