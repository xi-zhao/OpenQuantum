# OpenQuantum

OpenQuantum 是一个基于 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 的开源量子科研发行版。
它不重新实现 Agent Runtime，也不建设独立插件市场；它在 Harness 已有能力之上，提供量子科研 preset、
初级 Skill、MCP、科学 Validator、必要 UI 和一层很薄的传输适配。

目标是让量子公司和科研团队可以直接 Fork 仓库，沿用 Harness 原生方式增加自己的 Skill、MCP 或
`dsh-plugin`，而不必先学习一套 OpenQuantum 私有扩展协议。

## 架构原则

系统保持四层：

1. **UI**：展示会话、工具调用、科研产物和验收结果，只通过薄 transport adapter 与 Harness 通信。
2. **Harness**：直接复用 DeepSeek Harness 的 Session、Agent、Tool、Skill、MCP、Plugin、审批、权限、
   沙箱、模型路由、事件日志和持久化。
3. **Skill**：保存量子领域工作流、Prompt、Tool/MCP 使用方法、科研产物约定、Validator 和 eval。
4. **Model**：通过 Harness Provider route 接入云厂商模型；OpenQuantum 不另建模型调用 Runtime。

OpenQuantum 的原则是：

> Harness 已经提供的通用机制不重做；量子差异优先写成原生 Skill、MCP 或可信插件。

详细边界见
[`docs/architecture/ARCHITECTURE_AUDIT.md`](docs/architecture/ARCHITECTURE_AUDIT.md)，MVP 路线见
[`docs/roadmap/DEVELOPMENT_PLAN.md`](docs/roadmap/DEVELOPMENT_PLAN.md)。

## OpenQuantum 只增加什么

- 一个面向量子科研的 Harness preset；
- 第一批作用域清楚、可测试的量子 Skill；
- 通过 Harness 原生 MCP client 接入的科学计算工具；
- 在原生配置不足时才使用的、经过审查的 `dsh-plugin`；
- 与 Skill 同目录维护的确定性科学 Validator 和 eval；
- 展示科研产物与“执行状态 / 科学验收状态”的必要 UI；
- 隔离 Harness 预览版接口变化的薄 `HarnessTransportAdapter`。

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
- `quantum-ground-state` 参考 Skill 与 Harness 原生 stdio MCP。
- 隔离启动真实 Harness、验证 Skill 发现和 MCP Tool 进入 `request/header` 的 CI 测试；
- 从 Harness 原生 `tool/call` / `tool/result` 重建的科学记录卡片，运行状态与科学状态分开展示。
- 普通量子请求可用一个原子 MCP Tool 完成求解和计算级独立检查，不要求 Model 手工搬运 Artifact bundle。
- 受信任的 Harness `tools/post-execute` Adapter 复用 `ctx.fs`，在 `results/openquantum/` 中原子写入
  input、六类 Artifact、Result Package 和 Acceptance Report；它不执行量子算法，也不管理 Session。
- UI 只在中央 Acceptance builder 对已物化字节完成推导后显示“验收：通过 / 有条件 / 未通过”。

## 本地启动

要求 Node.js 24+。

```bash
npm install
cp .env.example .env
npm run demo:quantum-ground-state
npm run dev:stack
```

`demo:quantum-ground-state` 使用官方 MCP Client 启动本地 stdio server，并调用
`solve_and_validate_ground_state` 黄金案例；它不需要模型密钥。输出中的
`observations_available` 表示计算级逐项检查已生成，`provenance=not_checked` 和
`acceptance=not_derived` 表示尚未经过 Harness Result Package 物化，不能冒充最终科学验收。
这是刻意保留的“纯 MCP”层测试；进入真实 Harness Session 后，同一原子 Tool 的结构化结果会由
Harness Adapter 物化并重新验收。

- OpenQuantum UI：<http://127.0.0.1:3000>
- Harness Web Host：<http://127.0.0.1:3080>

真实密钥只放在被 Git 忽略的 `.env` 或 Harness credential store 中。仓库配置只能引用环境变量名。

## 验证

```bash
npm run harness:config
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

当前无需云模型即可验证 QGS 数值程序、Validator、MCP 协议和 Harness 原生注册。完整的真实模型
Tool Calling 仍要求先配置 `OPENQUANTUM_PUBLIC_API_KEY` 或 `OPENQUANTUM_PRIVATE_API_KEY`；没有凭据时，
诊断会诚实记录为 `not_checked`，不会用 Mock 或直接 MCP 调用替代。

## 安全与科学不变量

- UI 不直接调用 Model、MCP 或 Skill 文件系统；
- API Key 不进入客户端 bundle、Artifact、日志或 Git；
- Session event log 是执行事实的来源；
- Harness 执行完成不等于科学验收通过；
- 只有真实 Result Package 字节通过 Skill Validator，且中央 Profile 规则派生为 `passed` 后，UI 才能显示“验收：通过”。
