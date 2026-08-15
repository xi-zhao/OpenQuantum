# OpenQuantum

OpenQuantum 是一个基于 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 的开源量子科研发行版。
它不重新实现 Agent Runtime，也不建设独立插件市场；它在 Harness 已有能力之上，提供量子科研 preset、
初级 Skill、MCP、科学 Validator、必要 UI 和一层很薄的传输适配。

目标是让量子公司和科研团队可以直接 Fork 仓库，沿用 Harness 原生方式增加自己的 Skill、MCP 或
`dsh-plugin`，而不必先学习一套 OpenQuantum 私有扩展协议。

## 架构原则

系统保持四层：

1. **UI**：默认直接使用 DeepSeek Harness 原生 Web UI；OpenQuantum 只注入品牌和量子科研展示扩展。
2. **Harness**：直接复用 DeepSeek Harness 的 Session、Agent、Tool、Skill、MCP、Plugin、审批、权限、
   沙箱、模型路由、事件日志和持久化。
3. **量子扩展内容**：Harness Skill 保存领域工作流和 Prompt；独立 MCP/Tool 负责执行；OpenQuantum
   Validator/eval 负责可强制的科学规则。三者由 Agent preset 组合，不存在 Skill 自动绑定 MCP 的机制。
4. **Model**：通过 Harness Provider route 接入云厂商模型；OpenQuantum 不另建模型调用 Runtime。

OpenQuantum 的原则是：

> Harness 已经提供的通用机制不重做；量子差异优先写成原生 Skill、MCP 或可信插件。

详细边界见
[`docs/architecture/ARCHITECTURE_AUDIT.md`](docs/architecture/ARCHITECTURE_AUDIT.md)，MVP 路线见
[`docs/roadmap/DEVELOPMENT_PLAN.md`](docs/roadmap/DEVELOPMENT_PLAN.md)。量子 Skill / MCP 的精选队列见
[`docs/ecosystem/QUANTUM_CAPABILITY_CATALOG.md`](docs/ecosystem/QUANTUM_CAPABILITY_CATALOG.md)。

## OpenQuantum 只增加什么

- 一个面向量子科研的 Harness preset；
- 第一批作用域清楚、可测试的量子 Skill；
- 通过 Harness 原生 MCP client 接入的科学计算工具；
- 在原生配置不足时才使用的、经过审查的 `dsh-plugin`；
- 可为维护 locality 与 Skill 共置、但由 Tool/插件独立调用的科学 Validator 和 eval；
- 通过 Harness 原生 Client Plugin / Slot 展示科研产物与“执行状态 / 科学验收状态”的必要 UI；
- 只在 Harness 尚未提供所需扩展点时保留薄兼容 Adapter，不维护第二套 Agent Web Runtime。

第一版明确不做：独立 Runtime、私有 `.oqcap` 包格式、插件市场、安装锁、签名与发布治理、
多租户 SaaS 控制面，以及一套平行于 Harness 的权限或持久化系统。

## MVP

第一版只打通一个可信纵切：

```text
用户问题
→ Harness Session / Agent
→ quantum-ground-state Skill
→ 原生 stdio MCP solve_and_validate_ground_state
→ 六类结构化事实 + 计算级 Validator observations
→ Harness ctx.fs 原子物化 Result Package
→ 独立 Validator 重读真实字节 + 中央规则派生最终科学验收
→ UI 分别展示执行结果和科学验收结果
```

`quantum-ground-state` 的首个范围是：用户提供二量子位实 Pauli Hamiltonian，在固定
`hamming-weight=1` 扇区内完成无噪 statevector VQE，并用独立精确解进行验收。它不宣称覆盖
分子几何到 Hamiltonian、噪声、真实量子硬件或多量子位通用求解。

## 二次开发

量子公司推荐采用以下方式扩展：

1. Fork OpenQuantum；
2. 在 `.agents/skills/<skill-name>/` 增加 Harness 原生 `SKILL.md` 和该 Skill 所需的科学资源；
3. 将确定性计算封装成 Harness 支持的 stdio 或 Streamable HTTP MCP；
4. 只有需要新增 Harness 宿主行为时才增加受审查的 `dsh-plugin`；
5. 在 `runtime/openquantum/` 的 preset / Cordis 配置中组合这些能力；
6. 用固定正例、负例和 Harness 端到端测试证明作用域与失败行为。

开发规范见 [`CONTRIBUTING.md`](CONTRIBUTING.md)。

## 当前底座

- 固定 DeepSeek Harness `0.1.0-rc.6`；
- OpenAI-compatible 模型路由，可接入 Kimi / GLM 等云厂商模型；
- OpenQuantum 项目级 Agent preset；
- 真实 Session 创建、历史、消息、取消、审批与问题响应；
- `events.mux` / `events.host` WebSocket 事件、重连和 history 重基线；
- 同源白名单代理，浏览器不能读取模型凭证或调用任意 Host 管理方法；
- `platform-diagnostics` 诊断 Skill；
- `quantum-ground-state` 参考 Skill 与 Harness 原生 stdio MCP；
- `qiskit-circuit-workbench` 电路审查 Skill 与 `quantum-sdk-advisor` 量子软件栈选型 Skill；
- 默认启用 Qiskit 官方 `qiskit-mcp-server` 与 `qiskit-docs-mcp-server`；
- 可在设置中心启用 IBM Quantum Runtime / Transpiler，并通过 Harness 凭据库保存 Token；
- 可选接入固定源码版本的社区 Quantum Hardware MCP，复用 Harness 的 MCP 生命周期和安全凭据；
- 隔离启动真实 Harness、验证 Skill 发现和 MCP Tool 进入 `request/header` 的 CI 测试；
- 从 Harness 原生 `tool/call` / `tool/result` 重建的科学记录卡片，运行状态与科学状态分开展示。
- 普通量子请求可用一个原子 MCP Tool 完成求解和计算级独立检查，不要求 Model 手工搬运 Artifact bundle。
- 受信任的 Harness `tools/post-execute` Adapter 复用 `ctx.fs`，在 `results/openquantum/` 中原子写入
  input、六类 Artifact、Result Package 和 Acceptance Report；它不执行量子算法，也不管理 Session。
- UI 只在中央 Acceptance builder 对已物化字节完成推导后显示“验收：通过 / 有条件 / 未通过”。

## 本地启动

要求 Node.js 24+，以及 Qiskit 官方 MCP 推荐的
[`uv` / `uvx`](https://docs.astral.sh/uv/getting-started/installation/)；Python 由 `uvx` 管理，官方 MCP
包版本固定在 Agent preset 中。

```bash
npm install
cp .env.example .env
npm run mcp:qiskit:probe
npm run demo:quantum-ground-state
npm run dev:stack
```

`demo:quantum-ground-state` 使用官方 MCP Client 启动本地 stdio server，并调用
`solve_and_validate_ground_state` 黄金案例；它不需要模型密钥。输出中的
`observations_available` 表示计算级逐项检查已生成，`provenance=not_checked` 和
`acceptance=not_derived` 表示尚未经过 Harness Result Package 物化，不能冒充最终科学验收。
这是刻意保留的“纯 MCP”层测试；进入真实 Harness Session 后，同一原子 Tool 的结构化结果会由
Harness Adapter 物化并重新验收。

- OpenQuantum（DeepSeek Harness 原生 Web UI）：<http://127.0.0.1:3000>

默认启动链只运行一个 Harness Web Host。OpenQuantum 通过 Harness 官方 `tapIndex` 扩展点替换浏览器标题、
图标和侧栏字标，不复制或修改 `node_modules` 中的前端源码。仓库中的旧 Next.js UI 仅暂留作迁移期兼容面，
可用 `npm run dev:legacy-ui` 单独启动；新功能不再优先添加到这套平行 UI。

真实密钥只放在被 Git 忽略的 `.env` 或 Harness credential store 中。仓库配置只能引用环境变量名。

### Qiskit 官方 MCP

OpenQuantum 直接通过 DeepSeek Harness 原生 MCP Client 使用
[`Qiskit/mcp-servers`](https://github.com/Qiskit/mcp-servers)，不复制它的 Runtime 或 Tool 实现：

| 服务 | 默认状态 | 当前固定版本 | 凭据 |
|---|---|---:|---|
| Qiskit Circuits | 开启 | `qiskit-mcp-server==0.3.1` | 无 |
| Qiskit Docs | 开启 | `qiskit-docs-mcp-server==0.3.0`（含代理兼容 `socksio==1.0.0`） | 无 |
| IBM Quantum Runtime | 关闭 | `qiskit-ibm-runtime-mcp-server==0.6.1` | `QISKIT_IBM_TOKEN` |
| IBM Quantum Transpiler | 关闭 | `qiskit-ibm-transpiler-mcp-server==0.4.1` | `QISKIT_IBM_TOKEN` |
| Qiskit Gym | 关闭 | `qiskit-gym-mcp-server==0.4.1` | 无 |

打开 UI 的“设置中心 → MCP 服务”可以修改启停、超时和重连策略。IBM 两个云服务共用一个 Token；Token
通过 Harness `credentials.set` 写入本地凭据库，设置快照只返回“是否已配置”，不会返回明文。修改 MCP
配置或 Token 后需重启 Harness。IBM 云服务可能访问外部网络、提交有配额或成本的任务，因此保持显式选择，
不会随项目默认启动。

`quantum-ground-state` 不被官方 MCP 替代：它的 Skill 负责窄作用域工作流，独立本地 MCP 负责求解，
Validator 与中央规则负责科学验收；这些模块由 OpenQuantum Agent preset 组合。官方 Qiskit MCP 则独立
提供通用电路、文档及可选云后端能力。

### 社区 Quantum Hardware MCP

OpenQuantum 也预置了社区项目
[`Lokesh-2025/quantum-hardware-mcp`](https://github.com/Lokesh-2025/quantum-hardware-mcp)，用于查询 IBM / IonQ
硬件，并暴露任务提交、取消和成本估算等工具。它不是 OpenQuantum 自建 Runtime：DeepSeek Harness 仍通过
原生 MCP Client 管理 stdio 进程、Tool registry、超时与重连。

这个连接器默认关闭。上游目前没有稳定 Release，因此安装器只检出项目审阅过的 commit
`13fbe9f13fd68c409086491b9598ce2d25f5210a`，不会在运行时跟随 `master`：

```bash
npm run mcp:quantum-hardware:setup
```

安装完成后，在“设置中心 → MCP 服务”中：

1. 保存必需的 `QISKIT_IBM_TOKEN`；
2. 如需 IonQ，再保存可选的 `IONQ_API_KEY`；
3. 审阅源码、云厂商费用和数据外发风险后，再显式启用 `Quantum Hardware MCP`；
4. 重启 Harness 使配置生效。

源码保存在被 Git 忽略的 `.openquantum/external/quantum-hardware-mcp/`。首次启动由 `uv` 根据固定源码中的
`requirements.txt` 建立隔离环境，可能需要访问 Python 包仓库。启用该 MCP 会让 Agent 看见真实任务提交和
取消工具；当前 Harness MCP Client 没有对单个上游 Tool 做通用白名单或逐次成本审批，因此启用本身应视为
对该受审连接器能力的授权。不要在生产账户上使用无配额限制的凭据。

### 添加项目扩展

设置中心也提供一个小而稳定的项目扩展 Interface：

- MCP 可以新增本地 `stdio` 进程或无鉴权的 Streamable HTTP 端点；新条目一律先以关闭状态写入
  `agent.cordis.yml`，审阅后再启用；
- 内置 `stdio` MCP 可以声明必需及可选的多个 Harness credential reference；设置中心只展示配置状态，
  值不会写入 Agent preset。自定义 MCP 的首版表单仍提供一个凭据引用；
- Skill 可以从名称、能力描述和 Markdown 指令生成标准 `.agents/skills/<name>/SKILL.md`，随后仍由
  DeepSeek Harness 原生文件系统 Provider 发现；
- 只有设置中心创建的项目扩展可以在 UI 中移除。内置、科学验收或手工安装的扩展受到保护；自定义 Skill
  会移入 `.openquantum/trash/skills`，方便恢复。

这是项目级配置，不是远程插件市场。复杂 Skill、多个凭据或带鉴权 HTTP MCP 仍应通过仓库文件审阅后接入。
任何自定义 `stdio` command 都会在 Harness 权限下执行，因此只应使用明确可信且最好固定版本的来源。

## 验证

```bash
npm run harness:config
npm run mcp:qiskit:probe
npm run e2e:qiskit-harness
npm run demo:quantum-ground-state
npm run capability:quantum-ground-state:test
npm run models:probe -- --provider openquantum-public
npm run e2e:quantum-harness -- --provider openquantum-public
npm run capability:diagnostics:test
npm run check
```

`models:probe` 会产生少量真实模型调用。`e2e:quantum-harness` 使用隔离的临时 Harness Home 和
workspace，让真实模型完成一次 QGS MCP Tool Calling，并复核 Session 事件、六类 Artifact、Result Package、
Acceptance Report 与 Result Commit；结束后自动清理。普通本地开发不需要每次运行这两个在线探针。

`mcp:qiskit:probe` 会让 `uvx` 安装/复用缓存中的固定版本并直接核对官方 Tool 清单；
`e2e:qiskit-harness` 再启动隔离 Harness，确认这些 Tool 真正进入 Agent 的 `request/header`；测试还会向
临时 Harness 凭据库写入不可用的占位 Token，仅验证 IBM Runtime Tool 注册和凭据注入。两者可能访问
PyPI，但不会调用 IBM Quantum Tool、硬件或提交任务，因此不放进默认离线 CI。

当前无需云模型即可验证 QGS 数值程序、Validator、MCP 协议和 Harness 原生注册。完整的真实模型
Tool Calling 仍要求先配置 `OPENQUANTUM_PUBLIC_API_KEY` 或 `OPENQUANTUM_PRIVATE_API_KEY`；没有凭据时，
诊断会诚实记录为 `not_checked`，不会用 Mock 或直接 MCP 调用替代。

## 安全与科学不变量

- UI 不直接调用 Model、MCP 或 Skill 文件系统；
- API Key 不进入客户端 bundle、Artifact、日志或 Git；
- Session event log 是执行事实的来源；
- Harness 执行完成不等于科学验收通过；
- 只有真实 Result Package 字节通过 OpenQuantum Validator，且中央 Profile 规则派生为 `passed` 后，UI 才能显示“验收：通过”。
