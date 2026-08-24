# OpenQuantum 仓库地图

OpenQuantum 是 DeepSeek Harness 的量子科研发行版。仓库只增加量子内容、组合配置和必要的产品扩展，
不维护第二套 Agent Runtime。

目录只回答“代码在哪里”；核心对象、对外 Interface 和允许的依赖方向以
[模块地图](architecture/MODULES.md)为准。

## 一眼看懂运行关系

```text
浏览器 / DSH Desktop
  -> DeepSeek Harness 原生 Web UI
     -> DSH Home 中由 runtime/openquantum/cordis.patch.yml 生成的统一 patch
        -> OpenQuantum Agent preset
           -> .agents/skills/*/SKILL.md        领域工作流
           -> Harness MCP client              确定性工具与外部后端
           -> OpenQuantum Validator/eval      科学检查
           -> Harness Model route             模型与凭据引用
```

Skill、MCP 和 Validator 可以共同组成一项量子能力，但它们是三个独立模块：

- Harness 只会把标准 `SKILL.md` 发现为 Skill；
- MCP 必须在 Agent preset / Cordis 配置中独立注册；
- Validator 必须由 Tool、可信插件或测试显式调用。

为了让一条科研纵切可以一起审查，MCP、Validator、schema 和 eval 可以与 `SKILL.md` 共置。这是源码
locality，不是运行时包含关系。

## 目录职责

| 路径 | 负责什么 | 不负责什么 |
| --- | --- | --- |
| `.agents/skills/` | Harness Skill 入口和与科研纵切共置的领域资源 | 不自动注册 MCP，不自动运行 Validator |
| `.agents/skill-contracts/` | 科学结果、验收、评分和复现的共享合同 | 不是插件市场、安装系统或 Agent Runtime |
| `runtime/openquantum/` | Harness patch、OpenQuantum preset、MCP 注册和原生 Web 扩展 | 不复制 Session、Tool registry 或模型调用 |
| `src/settings/server/` | 设置中心的受控读写 Interface，以及与状态机分离的 Integration Catalog | 不保存真实凭据，不执行 MCP |
| `scripts/` | 启动、诊断、安装固定社区依赖和显式 E2E | 不是生产 Runtime |
| `tests/` | 平台级集成、配置和 UI 扩展测试 | 不代替真实 provider / 硬件验证 |
| `docs/` | 使用、架构、路线和生态说明 | 路线图不等于当前功能事实 |
| `.openquantum/` | 本地 Harness 状态和受控外部源码，Git 忽略 | 不能提交或当作源码权威 |
| `results/` | 本地科研结果，Git 忽略 | 不能作为仓库内固定证据 |

## 配置权威

同一事实应只在一个地方维护，其余位置读取或展示它。

| 事实 | 权威位置 | 修改方式 |
| --- | --- | --- |
| Web / Desktop Host 的 Provider route、品牌和设置插件 | `runtime/openquantum/cordis.patch.yml` | 审阅 patch 后运行 `npm run harness:config` 与 `npm run desktop:check` |
| OpenQuantum Agent 的 Tool、MCP、Skill 和权限组合 | `runtime/openquantum/agent-presets/openquantum/agent.cordis.yml` | 设置中心或受审查的配置修改；修改后重启 Harness |
| 发行版 Capability 的 L0–L3 与证据引用 | `.agents/capability-packages.yml` | 新增/提升能力时更新，并运行 `npm run capability:conformance` |
| MCP/Skill 设置写入规则 | `src/settings/server/project-settings.mjs` | 通过其导出的设置 Interface，不在 UI 重写规则 |
| MCP 和凭据的展示元数据 | `src/settings/server/project-settings-catalog.mjs` | 新增/升级集成时更新；不在设置事务或 UI 中复制 |
| 固定社区 MCP 的来源与提交 | `src/settings/server/quantum-hardware-mcp.mjs` | 升级时同时审阅源码、许可证、Tool schema 和副作用 |
| Skill 指令 | `.agents/skills/<name>/SKILL.md` | 使用 Harness 原生 Skill 格式 |
| 科学阈值和验收规则 | 对应 profile、Validator 和 `.agents/skill-contracts/` | 修改规则必须增加测试和版本化证据 |
| 模型或云端密钥 | `.env` 或 Harness credential store | 只保存值；项目配置仅引用凭据名 |

设置中心显示的 MCP 与 Skill 来自这些权威文件。UI 不是第二份配置数据库。

## 常见改动应该去哪里

### 新增一个知识或工作流 Skill

1. 新建 `.agents/skills/<name>/SKILL.md`；
2. 写清适用范围、禁用范围和允许使用的工具；
3. 增加最小正例与失败例；
4. 用 Harness `skill.list` 或对应测试确认实际可发现。

### 接入一个 MCP

1. 优先采用上游维护的 stdio 或 Streamable HTTP MCP；
2. 在 OpenQuantum Agent preset 中独立注册；
3. 无凭据且无副作用的服务才考虑默认开启；
4. 云端、付费或真实硬件服务默认关闭；
5. 凭据只引用 Harness credential store；
6. 增加 Tool 清单探针和 Harness 集成测试。

### 增加一个科学 Validator

1. 先定义结构化输入、检查项、单位和阈值；
2. Validator 只输出检查事实，不接受模型自报最终状态；
3. 由共享合同推导 Acceptance / Score / Reproduction；
4. 覆盖篡改、缺字段、非有限数值和作用域外输入。

### 修改 UI

优先使用 Harness Client Plugin、Slot 和 Settings seam。UI 只展示和收集意图，不直接调用 MCP、模型或
Skill 文件系统，也不保存第二份 Session 状态。

## 本地生成内容

以下内容不属于源码，也不能进入提交：

- `.env` 中的真实密钥；
- `.openquantum/` 下的 Harness 状态、凭据库和外部源码；
- `results/` 下的本地科研结果；
- 日志、截图中的未脱敏 Token 或私有 Endpoint。

发布或提交前至少运行：

```bash
git status --short
npm run check
git diff --check
```
