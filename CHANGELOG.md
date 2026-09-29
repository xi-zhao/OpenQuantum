# Changelog

OpenQuantum 的重要变更记录在此。格式遵循 [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)，
版本遵循 [Semantic Versioning](https://semver.org/spec/v2.0.0.html)。预发布阶段的合同仍可能发生明确记录的 breaking change。

## [Unreleased]

## [0.6.0] - 2026-09-29

### Added

- 三批共 52 个 SDK 能力包与 60 个 Tool，覆盖国内外公司和科研机构的可微分电路、编译、仿真、化学、资源估算、光子、网络、控制与云接口；另含 QuEra Bloqade Analog 本地动力学。
- 66 份 quantum-skills 指南的原生适配和 49 项可执行示例；qBraid、Clifft 与 QDMI 互操作，以及 QCut、Compact、OpenQARP、cqlib-qml 和 FlagQuantum 的对应能力。

### Changed

- README 十种语言同步任务入口、SDK 使用范围和升级说明；计算环境按所选能力显式准备，账户与鉴权由用户配置。
- 当前静态目录包含 154 个 Skill、90 个 MCP 连接和 281 个可配置 Tool 名称；实际可用集合受平台、环境、连接与工具范围影响。
- 本次发布沿用固定 Harness / Desktop 版本和三平台未签名测试安装包流程。完整范围见 [v0.6.0 发布说明](docs/releases/v0.6.0.md)。

### Fixed

- 资料检索 Harness 测试按请求中的 Tool 结果推进；会话命名等辅助模型请求不会再提前消耗测试用例。

## [0.5.1] - 2026-09-20

### Added

- Mac Apple Silicon / Intel 和 Windows x64 桌面安装包，内置固定 Node.js、uv / uvx；用户数据独立保存。
- 安装、真实 Host / renderer 启动、自定义配置保留、本地 Tool 与版本更新清单验证。安装文件为未签名测试构建，见 [v0.5.1 发布说明](docs/releases/v0.5.1.md)。

## [0.5.0] - 2026-09-20

版本更新提醒与以下早期主线能力已随此版本交付；不将旧的 Unreleased 记录计作 v0.6.0 新增功能。

### Added

- 面向量子公司和科研团队的 Harness 原生 Skill / Tool Provider / Fork 二次开发路径。
- `quantum-ground-state` 原生 Skill、确定性 Validator 与 stdio MCP 科学计算纵切。
- Skill、Tool、MCP Server、External API、Validator 与 Composition 的权威扩展对象模型。
- 设置中心 Runtime Readiness 首页：被动展示当前 Model Route、Skill Registry 与 Tool Registry 证据，
  并把未检查的 MCP 连接、模型 Endpoint 和下游服务可达性明确保留为 `not_checked`。

### Changed

- 开源贡献、安全披露、Issue 和 CI 流程从原网站克隆模板迁移为 OpenQuantum 项目流程。
- 产品架构收缩为 DeepSeek Harness 量子科研发行版，不再建设独立 Runtime、插件市场或安装协议。
- 默认 Web 界面切换为 DeepSeek Harness 原生 Web UI；OpenQuantum 只通过官方扩展点注入品牌与量子能力。
- 删除旧网站模板、平行 Next.js UI、浏览器 BFF 和 Session adapter，只保留 Harness 原生 Web 产品链。
- Capability policy 与 conformance report 升级到 `1.1`：`mcpServers` 显式列出 MCP-exposed Tool、
  `nativeTools` 显式列出原生 Tool Plugin，两者都必须声明 activation、合同检查入口和最大副作用；本地
  MCP Server 合同测试直接读取 policy，报告作用域明确为 `static-declaration`；旧 `servers` / `runners`
  形状不再接受，runner 不能独立充当 Agent 执行入口。

## [0.4.0] - 2026-08-14

### Added

- DeepSeek Harness UI Runtime、双 WebSocket 事件流、重连重基线和 approval/question 交互。
- Capability、Result Package、Acceptance、Score、Reproduction 与 Result Commit v1.1 可信合同。
- 平台诊断 Reference Capability 与四层架构验收。
- OpenAI-compatible 模型路由和本地开发栈。

### Changed

- 产品从网站克隆模板重构为 OpenQuantum 开源科研 Agent 平台。
- 科学状态改由 central Acceptance Builder 基于版本化 Acceptance Profile、Validator observations 与 provenance 推导，不再由模型或 UI 自报。

### Security

- 浏览器只能通过同源白名单 BFF/事件网关访问 Harness。
- 服务端凭证不进入浏览器配置；Result Contract 增加路径、digest、秘密与伪造检查。

更早的实验性实现仍可在 Git 历史中审计，但不属于当前 OpenQuantum 产品线。
