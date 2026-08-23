# OpenQuantum 文档导航

这组文档分别服务于使用者、二次开发者和维护者。第一次接触项目时，不需要从架构审计开始通读。

## 使用 OpenQuantum

- [部署与启动](DEPLOYMENT.md)：本地、Docker、模型配置和启动后的检查方法。
- [常见问题与故障排查](TROUBLESHOOTING.md)：按 UI、模型、MCP、凭据和 Docker 分层定位问题。
- [消息渠道接入](integrations/CC_CONNECT.md)：通过 CC Connect 和 ACP 把 OpenQuantum 接入飞书、Slack、钉钉等平台。
- [项目首页](../README.md)：产品能力、已集成工具和快速开始。

## 二次开发

- [参与贡献](../CONTRIBUTING.md)：新增 Skill、MCP、Validator 或 Harness 扩展的规则。
- [仓库地图](REPOSITORY_GUIDE.md)：目录职责、配置权威和实际编排关系。
- [量子能力候选清单](ecosystem/QUANTUM_CAPABILITY_CATALOG.md)：当前集成和后续候选。

## 架构与维护

- [架构基线](architecture/ARCHITECTURE_AUDIT.md)：UI、Harness、量子扩展内容和 Model 四层职责。
- [领域语言](../CONTEXT.md)：项目中的核心术语及应避免的重复概念。
- [ADR-001：知情审批与失败关闭](architecture/ADR-001-INFORMED-APPROVAL-FAIL-CLOSED.md)。
- [ADR-002：Harness 原生扩展优先](architecture/ADR-002-HARNESS-NATIVE-EXTENSIONS-FIRST.md)。
- [ADR-003：Desktop 作为 Harness Host Adapter](architecture/ADR-003-DESKTOP-AS-HARNESS-HOST-ADAPTER.md)。
- [开发计划](roadmap/DEVELOPMENT_PLAN.md)：当前里程碑、验证标准和后续工作。

## 阅读原则

出现冲突时，按以下顺序判断：

1. 实际 Harness 配置与自动测试；
2. 已接受的架构决策和架构基线；
3. 贡献指南；
4. 路线图和候选清单。

路线图描述计划，不代表功能已经可用；README 中的“已接入”必须有当前配置或测试证据。
