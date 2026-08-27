---
name: platform-diagnostics
description: 审计 OpenQuantum 的 UI、Harness、Skill 和 Model 四层是否真实连通，并生成可验证、可追溯的诊断报告。用于架构验收、联调排障和发布前健康检查。
---

# OpenQuantum 平台诊断

本能力只诊断四层架构，不实现量子业务功能。默认执行只读检查；除非用户明确授权，不修改配置、
不启动长期后台进程、不写入生产系统。

## 核心对象

诊断对象是一份 `platform-diagnostics` 报告。报告中的每个检查项必须有可复核证据；Capability Validator
根据检查结果推导的是诊断报告聚合状态，不是 Scientific Acceptance，也不能由模型自行宣称。

开始前读取并按 Capability Contract v1 校验 `capability.yaml`。生成报告时读取
`artifacts/diagnostic-report.schema.json`；验收时运行 `validators/validate-report.mjs`。

## 检查流程

1. UI：确认 UI 只通过 Harness transport adapter 发出会话命令，不直接调用 Model Provider 或 MCP Server。
2. Harness 配置：运行 `npm run harness:config`，确认组合能展开且默认模型属于 OpenQuantum route。
3. Harness Host：检查 Host 根页面、`session.list` 和 `llm.models` Harness RPC；未启动时记录 `not_checked`，
   不把静态配置当成运行证据。
4. Skill：通过 Harness `skill.list` 或当前成功加载的 Skill 上下文证明项目 Skill 可发现。
5. Model：运行 `npm run models:probe -- --provider openquantum-public`，分别验证目录、文本生成和
   强制函数调用。不要把“接口返回 200”替代工具调用验收。
6. 端到端：有 Provider 凭据时运行 `npm run e2e:quantum-harness -- --provider openquantum-public`，确认
   真实模型在 Harness Session 中产生 QGS `tool/call` / `tool/result`，且 Result Commit 与中央 Acceptance
   通过复核。绕过 Harness MCP Client 直接调用 MCP Server SDK 不能替代这条证据。
7. 可选路由：私有网关不可达时记录 `warn` 或可选检查项 `fail`；只要它不是当前任务的硬性要求，
   不得覆盖公开主路由的有效证据。
8. 按 schema 生成 JSON 报告，不得写入 API Key、Authorization header、完整 Prompt 或敏感科研数据。
9. 运行 `node .agents/skills/platform-diagnostics/validators/validate-report.mjs <report.json>`。
   只有 Validator 成功，报告才算形成有效评分。

## 判定规则

- 任一必需检查为 `fail`：整体 `blocked`。
- 无必需失败，但存在 `warn`、`not_checked` 或可选失败：整体 `degraded`。
- 所有检查均为 `pass`：整体 `ready`。
- `pass` 必须有运行证据；推测、配置存在、模型自述都不算证据。
- 非 `pass` 检查必须给出 `nextAction`。

输出先给结论，再给证据和下一步。不要把运行成功等同于科学验收；具体量子能力的 Scientific Validator
只产生运行时 observations，Acceptance Profile 定义规则，central Acceptance Builder 推导验收；开发期
eval evidence 只用于回归和发布门禁。
