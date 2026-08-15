# Changelog

OpenQuantum 的重要变更记录在此。格式遵循 [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)，
版本遵循 [Semantic Versioning](https://semver.org/spec/v2.0.0.html)。预发布阶段的合同仍可能发生明确记录的 breaking change。

## [Unreleased]

### Added

- 面向量子公司和科研团队的 Harness 原生 Skill / MCP / Fork 二次开发路径。
- `quantum-ground-state` 原生 Skill、确定性 Validator 与 stdio MCP 科学计算纵切。

### Changed

- 开源贡献、安全披露、Issue 和 CI 流程从原网站克隆模板迁移为 OpenQuantum 项目流程。
- 产品架构收缩为 DeepSeek Harness 量子科研发行版，不再建设独立 Runtime、插件市场或安装协议。
- 默认 Web 界面切换为 DeepSeek Harness 原生 Web UI；OpenQuantum 只通过官方扩展点注入品牌与量子能力。
- 删除旧网站模板、平行 Next.js UI、浏览器 BFF 和 Session adapter，只保留 Harness 原生 Web 产品链。

## [0.4.0] - 2026-08-14

### Added

- DeepSeek Harness UI Runtime、双 WebSocket 事件流、重连重基线和 approval/question 交互。
- Capability、Result Package、Acceptance、Score、Reproduction 与 Result Commit v1.1 可信合同。
- 平台诊断 Reference Capability 与四层架构验收。
- OpenAI-compatible 模型路由和本地开发栈。

### Changed

- 产品从网站克隆模板重构为 OpenQuantum 开源科研 Agent 平台。
- 科学状态改由版本化 Validator/Profile 推导，不再由模型或 UI 自报。

### Security

- 浏览器只能通过同源白名单 BFF/事件网关访问 Harness。
- 服务端凭证不进入浏览器配置；Result Contract 增加路径、digest、秘密与伪造检查。

更早的实验性实现仍可在 Git 历史中审计，但不属于当前 OpenQuantum 产品线。
