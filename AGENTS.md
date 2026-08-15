<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# OpenQuantum

OpenQuantum 是一个科研 Agent 操作平台。DeepSeek Harness 负责通用 Agent Runtime，量子计算、
性质预测、案例咨询和通用问答等产品能力由 Agent preset 组合独立的 Harness Skill、MCP/Tool 和
OpenQuantum Validator/eval 提供。

开始架构或实现工作前，先阅读 `docs/architecture/ARCHITECTURE_AUDIT.md`。

## 四层边界

1. UI：展示、输入和交互，只通过 Harness transport adapter 发命令、收事件。
2. Harness：Session、Turn、Step、Goal、Job、事件日志、工具调度、审批、沙箱和持久化。
3. 量子扩展内容：Harness Skill 保存领域工作流和 Prompt；MCP/Tool 提供执行能力；Validator/eval
   保存可强制的科学规则。三者是独立模块，由 preset / Cordis 组合。
4. Model：Provider route、模型能力元数据、协议适配、鉴权引用、超时和可用性探测。

不要新增独立的 OpenQuantum domain/platform Runtime。通用执行机制放 Harness；领域指令放原生
`SKILL.md`，确定性执行放 MCP/Tool，可强制规则放 Validator 或可信插件。相关源码可以为维护 locality
共置在 `.agents/skills/<capability-id>/`，但共置不表示 Harness 会自动绑定或启动这些模块。

## 不变量

- UI 不直接调用 Model、MCP 或 Skill 文件系统。
- Session event log 是执行事实的唯一来源。
- 运行完成和科学验收是两个状态；只有 Validator 通过才能宣称科学验收通过。
- API Key 不得进入源码、日志、Artifact、Git diff 或提交。
- Provider 配置只引用环境变量名；真实密钥留在忽略的 `.env` 或 credential store。
- 新增研究能力优先增加由 preset 组合的原生 Skill、MCP/Tool 和必要 Validator，不修改 Harness 核心。
- 不修改 `node_modules` 中的 DeepSeek Harness 实现；通过 Cordis patch 和 preset 扩展。

## 代码位置

- `src/app`、`src/components/openquantum`：UI。
- `src/harness`：UI 与 Harness 之间唯一的 transport adapter seam。
- `runtime/openquantum`：Harness profile、preset 和模型 route 配置。
- `.agents/skills`：Harness 原生 Skill 指令，以及为维护 locality 可选共置的领域资源；MCP 仍需在
  preset 中独立注册。
- `docs/architecture`：架构决策和边界。

## 常用命令

- `npm run dev`：启动 Next.js UI。
- `npm run harness:dev`：启动 OpenQuantum Harness Web Host。
- `npm run harness:config`：展开并检查 Harness 组合配置。
- `npm run models:probe -- --provider openquantum-public`：验证模型目录、文本生成和工具调用。
- `npm run capability:diagnostics:test`：验证平台诊断能力包和评分规则。
- `npm run check`：运行 lint、类型检查和生产构建。

## 实现规则

- TypeScript strict，避免 `any`；命名清晰，2 空格缩进。
- 领域指令放 Skill；可强制规则放 MCP/Tool、Validator 或可信插件，不散落在 React 组件、API route
  或 Provider 配置里。
- 先定义核心对象、状态、事件和不变量，再选择文件与框架实现。
- 每次变更运行最相关的检查，并明确报告未通过或未验证的部分。
