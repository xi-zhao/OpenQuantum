# OpenQuantum 模块地图与演进契约

- 状态：当前模块边界
- 日期：2026-08-24
- 适用范围：新增能力、接入 SDK/MCP、修改设置、升级 Harness、增加科研验收

## 1. 这张地图解决什么问题

OpenQuantum 会持续增加量子算法、SDK、云后端和科研 Validator。真正需要控制的不是目录数量，而是每项变化
进入哪个业务对象、由谁拥有状态、通过什么 Interface 接入，以及不能反向依赖什么。

平台的核心模型保持不变：

> Harness 推进一次执行；Capability Package 提供领域能力；Scientific Contract 判断证据是否足以支持科研主张。

OpenQuantum 不创建第二套 Session、Agent loop、Tool registry 或事件日志。新增能力默认沿
`Skill -> MCP/Tool -> Validator/eval` 纵向扩展，由 Agent preset 组合；只有宿主层行为无法用原生配置表达时，
才增加小型 Harness Adapter。

## 2. 核心对象

| 核心对象 | 状态或内容 | 权威模块 | 关键不变量 |
| --- | --- | --- | --- |
| Harness Session | Turn、Step、Tool 事件、审批、取消、恢复 | DeepSeek Harness | Session event log 是执行事实唯一来源 |
| Agent Composition | Skill、MCP、权限、模型 route 的组合 | `runtime/openquantum/agent-presets/` | 只组合，不实现领域算法 |
| Capability Package | 作用域、工作流、执行器、schema、Validator、eval | `.agents/skills/<capability-id>/` | 共置是源码 locality，不是自动运行时绑定 |
| Capability Package Policy | 发行版能力清单、L0–L3、执行与测试证据引用 | `.agents/capability-packages.yml` | 只做开发期 conformance，不参与 Harness 运行时绑定 |
| Scientific Result Package | 输入、Artifact、合同版本和摘要 | `.agents/skill-contracts/` | 必须引用真实物化字节，不能只信模型或 Tool 自报 |
| Acceptance Report | Profile、逐项 observation、最终科学状态 | `.agents/skill-contracts/` + capability profile/Validator | 执行成功不等于科学验收通过 |
| Settings Projection | 当前 Skill/MCP、启停、凭据引用、revision | `src/settings/server/project-settings.mjs` | UI 只提交意图；服务端校验并原子写入 |
| Integration Catalog Entry | 名称、来源、固定版本、安装要求、凭据说明 | `src/settings/server/project-settings-catalog.mjs` | 只描述产品目录，不保存运行状态或密钥 |
| Model Route | Provider、模型能力、Endpoint、凭据名 | `runtime/openquantum/cordis.patch.yml` | 只引用环境变量名，不承载科学规则 |
| Eval / Benchmark Evidence | 固定案例、评分、复现和诊断报告 | capability `evals/`、`evidence/`、共享合同 | 测试证据与在线可用性证据必须区分 |

## 3. 一级模块边界

| 模块 | 对外 Interface | 负责 | 明确不负责 | 主要验证 |
| --- | --- | --- | --- | --- |
| Host Adapter | Browser / DSH Desktop / 消息渠道进入 Harness 的标准入口 | 承载原生 Web UI、窗口或渠道协议 | Session 状态机、模型调用、科学判定 | Desktop、CC Connect、Web 集成测试 |
| Harness Composition | `cordis.patch.yml`、`preset.yml`、`agent.cordis.yml` | 组合 Host、Agent、Skill provider、MCP、权限和模型 | 领域算法、设置数据库、私有 Runtime | `npm run harness:config`、真实 Host 测试 |
| Native Web Extensions | Harness Client Plugin、Slot、Settings route | 品牌、设置表单、科研结果只读展示 | 直接调用 Model/MCP、保存第二份 Session | Web branding/capabilities 测试 |
| Project Settings Interface | `readProjectSettings` 与受控 update/register/remove 命令 | 校验意图、revision CAS、路径约束、原子文件写入 | MCP 产品目录、真实凭据、执行 MCP | project-settings 与 web-capabilities 测试 |
| Integration Catalog | `mcpCatalogEntry`、`mcpCredentialCatalogEntry` | MCP/凭据的产品元数据与固定来源 | 配置事务、启停状态、密钥值 | 通过 Settings 投影和 setup 测试 |
| Capability Package | 原生 `SKILL.md`；独立 MCP Tool；可选 Validator/Profile | 一个有界领域问题的工作流、确定性执行和科学规则 | Harness 生命周期、全局设置、Provider 鉴权 | package 内 unit/MCP/eval 测试 |
| Capability Conformance | `auditCapabilityPackages({ projectRoot })` | 对照 Git 跟踪的 Skill 检查 policy、MCP 注册、科学合同、依赖锁和 L3 物化证据 | 执行量子算法、替代科学 Validator、自动注册 MCP | `npm run capability:conformance` 与失败关闭测试 |
| Scientific Contracts | `.agents/skill-contracts/index.mjs` | Result、Acceptance、Score、Reproduction 的共享 schema 与构建规则 | 具体量子算法、Session 持久化、UI | contract/profile/report 测试 |
| Scientific Result Materialization | `defineScientificResultMaterializer(definition)` | 统一完成 workspace 路径约束、原子写入、真实字节重读、中央 Acceptance 与 Result Commit | 领域数值计算、领域 observation、Harness 生命周期 | QGS/QI materialization 测试 |
| Scientific Result Adapter Registry | `scientificResultAdapter(toolName)` | 将受支持 Tool 映射到领域投影、Materializer 与声明的 Artifact 类型 | 自动发现任意 Skill、执行 MCP、创造平行 Runtime | projection 与双 L3 回放测试 |
| Model Routes | Harness `llm.models` / Provider adapter | 模型目录、协议适配、超时和凭据引用 | 量子数值计算、科学结论 | model probe、真实 Tool Calling E2E |
| Evidence & Diagnostics | 版本化 eval、诊断 JSON、独立 Validator | 证明当前能力和连接状态 | 用历史 PASS 代替当前在线检查 | package eval、platform diagnostics validator |

`Project Settings Interface` 与 `Integration Catalog` 已刻意拆开。新增一个 MCP 的名称、版本和文档不应触碰
文件锁、路径安全和 CAS 规则；调整设置事务也不应修改所有集成条目。

QGS 与 `quantum-information-audit` 已形成两个真实 Adapter。Registry 只登记明确支持的 Tool；通用物化 Module
隐藏 workspace 写入、字节重读和中央合同编排，领域 Adapter 继续拥有输入规范化、Artifact 形态与 Validator。
这不是根据 Skill 自动执行任意代码的 Capability Runtime。

## 4. 依赖方向

```text
Browser / Desktop / Message Channel
  -> Harness native UI and transport
     -> Harness Session / Agent / Tool / MCP / Model registries
        -> Agent Composition
           -> Capability SKILL.md
           -> independently registered MCP / Tool
              -> capability domain code
              -> optional deterministic Validator
           -> optional trusted result adapter
              -> Scientific Contracts + capability Profile
              -> Harness workspace + native tool/result event

Harness Settings UI
  -> Native Web Extension route
     -> Project Settings Interface
        -> Integration Catalog (read-only metadata)
        -> authoritative Skill / Cordis configuration files
```

禁止的反向边包括：

- UI -> Model、MCP 或 Skill 文件系统；
- Skill -> UI 或 Provider 凭据；
- Capability Package -> Project Settings；
- Integration Catalog -> 设置文件写入；
- Validator -> Session 生命周期或最终 UI 状态；
- Model 输出 -> 科学通过状态；
- OpenQuantum 任意模块 -> `node_modules` 内 Harness 私有实现修改。

## 5. Capability Package 的标准形态

一个能力包按真实需要逐层增加文件，不要求为了目录整齐创建空模块：

```text
.agents/skills/<capability-id>/
├── SKILL.md                    # 必需：作用域、工作流、工具选择和禁用范围
├── agents/openai.yaml          # 可选：其他 Agent/Codex 的 UI 元数据
├── references/                # 可选：领域约定、公式和来源
├── inputs/                     # 有结构化输入时增加
├── modeling/ 或 scripts/       # 确定性领域模型；不含 Harness 状态
├── mcp/                        # 需要执行或外部系统时增加；必须在 preset 独立注册
├── validators/                # 有可强制主张时增加
├── acceptance-profiles/       # 需要中央验收时增加
├── reproduction-profiles/     # 需要独立复现时增加
├── artifacts/                 # 结构化科研产物 schema
├── evals/                     # 固定正例、边界、失败和篡改案例
├── test/                      # 单元与 MCP 合同测试
├── capability.yaml            # 进入审计/验收层时增加的仓库科学元数据
└── pyproject.toml / uv.lock    # 使用 Python 时固定依赖
```

### 开发成熟度，不是运行时状态

| 等级 | 最小证据 | 可以对外声称 |
| --- | --- | --- |
| L0 工作流 | `SKILL.md` + 作用域边界 | 能指导模型选择方法，不能声称已执行 |
| L1 可执行 | L0 + 已注册 Tool/MCP + 合同测试 | 能在声明范围内执行；不等于科学验收 |
| L2 可审计 | L1 + schema + 独立 Validator/eval | 能输出可复核 observation；仍需明确证据作用域 |
| L3 可物化验收 | L2 + Profile + Result Package + Harness 物化/重读 + Result Commit | 能基于物化证据给出版本化 Acceptance |

这个等级只用于规划开发和 README 用词，不进入 Harness Session 状态机，也不能由模型自行提升。

发行版能力的等级和证据引用只在 `.agents/capability-packages.yml` 声明。只读检查通过 Git 跟踪的
`SKILL.md` 确认清单覆盖，通过真实 Cordis preset 确认 MCP 注册；L2/L3 继续调用共享合同的
`loadCapability`，不复制科学 schema。用户本地创建或 Git 忽略的外部 Skill 不会被误当成发行版能力。

当前参考：

| 能力 | 当前等级 | 说明 |
| --- | --- | --- |
| `quantum-sdk-advisor` | L0 | 选型工作流，不执行付费或真实硬件操作 |
| `qiskit-circuit-workbench` | L1 | 使用独立注册的 Qiskit MCP |
| `fieldqkit-hardware`、`qpanda-qubo`、`quantum-circuit-verification`、`qec-memory-experiment`、`tyxonq-workbench` | L1 | 有界本地/只读执行与合同测试；不宣称最终科学验收 |
| `platform-diagnostics` | L2 | 报告 schema、固定检查和独立 Validator |
| `quantum-information-audit` | L3 | 独立重算、Profile/eval，并经 Harness 物化、真实字节重读、验收和回放 |
| `quantum-ground-state` | L3 | 完整 Result Package -> Acceptance -> Result Commit 参考纵切 |

## 6. 常见需求的落点

| 需求 | 首选落点 | 需要同时修改 |
| --- | --- | --- |
| 新增算法知识/步骤 | 新 Capability `SKILL.md` | 触发边界、负例、Skill discovery 测试 |
| 新增本地 SDK 能力 | capability `modeling/scripts` + `mcp` | preset 注册、依赖锁、MCP test |
| 新增云后端 | MCP + credential reference | Integration Catalog、默认关闭、审批/成本说明、setup probe |
| 增加科学判定 | capability Validator/Profile | schema、篡改测试、共享合同；不能只改 Prompt |
| 需要刷新后展示科研验收 | 可信 result adapter | 真实字节物化、重读、Result Commit、Session 回放测试 |
| 新增设置字段 | Project Settings Interface | revision/校验测试和 Web Plugin 调用；不在 UI 复制规则 |
| 升级 Harness | lockfile + composition adapter | config、Host、Skill、MCP、UI、Desktop、真实模型分层验证 |
| 增加品牌或只读卡片 | Native Web Extension | 不引入业务状态或直接执行路径 |

新增或提升发行版 Capability 时还必须更新 `.agents/capability-packages.yml`；声明的等级高于实际证据、
仓库新增已跟踪 Skill 却未登记、MCP 未注册、Python 未锁依赖或 v1.1 digest 漂移都会让检查失败。

## 7. 何时才新增抽象

满足以下条件之一才增加共享 Interface：

1. 两个已实现能力需要同一种变化点；
2. 一个不可破坏的业务规则需要集中强制；
3. 上游 Harness 变更需要用小 Adapter 隔离；
4. 同类测试已重复且重复来自同一领域模型。

第二个 L3 能力已经证明以下共同需求，并已据此提取：

- Tool 识别与 capability adapter registry；
- Artifact 类型与 bounded projection Interface；
- workspace 物化、真实字节重读、Profile 和 Validator 调用合同；
- 失败时保持原生 Tool 结果但禁止伪造 Acceptance 的规则。

继续延后的是自动发现任意 Skill、任意 Artifact 编排和通用 Capability Runtime；只有第三个真实变化点出现时，
才继续扩大 Adapter Interface。

## 8. 持续开发检查表

每项能力合并前至少回答：

1. 业务问题与支持边界是什么？
2. 事实由 Tool 产生，还是由 Validator 独立重算？
3. MCP 是否在 preset 独立注册，而不是被误认为由 Skill 自动启动？
4. 最终状态属于 Harness 执行，还是科学验收？
5. 配置、凭据、阈值和来源各自的唯一权威在哪里？
6. 是否有正常、边界、失败、篡改和无凭据路径？
7. 是否需要真实 Provider/硬件证据；若未运行，是否明确写成 `not_checked`？
8. 这次变化是否引入反向依赖或让 UI/Prompt 承担了业务规则？

架构基线和当前审计结论见 [架构审计](ARCHITECTURE_AUDIT.md)，实际目录与配置权威见
[仓库地图](../REPOSITORY_GUIDE.md)。
