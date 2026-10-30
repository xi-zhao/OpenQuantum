# OpenQuantum Codex 插件 0.8.9

此版本与 [Desktop 0.8.9](v0.8.9.md) 来自同一源码提交。插件继续使用 Codex 的原生对话、模型与执行循环，共享量子 Skill、Tool implementation 和 MCP Server；全局 OpenQuantum 设置入口管理本插件的能力与账户。

设置页提供首页 / Skills / MCP 的完整工作区布局，按相关卡片配置环境、凭据和 Tool 限制。外部调用按实际使用的凭据脱敏，覆盖凭据轮换和调用期间新增凭据；宿主设置及凭据继续隔离保存。

从 [codex-v0.8.9 Release](https://github.com/xi-zhao/OpenQuantum/releases/tag/codex-v0.8.9) 下载 `openquantum-0.8.9-codex-install.zip` 与 `SHA256SUMS`，按 [安装指南](../integrations/CODEX_AGENT_INSTALL.md) 核对、安装并重载插件。已有安装保留 `openquantum@personal` 身份、明确禁用列表、凭据与计算环境。科学 SDK 按任务准备，不随插件批量安装。

最终 Skill/Tool 数量、源码提交、原生宿主安装和协议验收以包内 `release.json` 与 Release 的 `release-validation.json` 为准。安装与协议检查不能代替全局界面验收，也不表示量子云认证或科学验收通过。Desktop Release 保持 GitHub latest，Codex Release 不携带 Desktop 更新清单。
