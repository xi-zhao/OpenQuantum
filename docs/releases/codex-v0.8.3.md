# OpenQuantum Codex 插件 0.8.3

OpenQuantum 0.8.3 为 Codex 设置页加入用途分类、搜索和筛选。插件继续提供 **134 个 Skill、71 个科学 Tool**，聊天、项目、登录和模型由 Codex 管理。

## 本版变化

- Tools、MCP、Skills 按 8 个用途分组，默认折叠并显示数量，减少一次展示的信息。
- 支持名称或用途搜索，以及用途、启用状态组合筛选；切换标签页保留筛选条件，空结果可重置。
- 自定义连接和未知条目归入“其他与自定义”，连接参数按需展开。分类只影响展示，不改变启停、凭据、计算接口或科学验收规则。

## 下载与安装

从本页下载完整安装包 `openquantum-0.8.3-codex-install.zip` 和 `SHA256SUMS`，核对摘要并解压。需要 Node.js 24+、npm 和支持插件的 Codex：

```sh
npm ci --ignore-scripts
npm run plugin:install
```

安装器保留 `openquantum@personal` 身份、其他插件和用户配置。安装后按 Codex 提示重载。完整步骤见[Agent 安装指南](https://github.com/xi-zhao/OpenQuantum/blob/codex-v0.8.3/docs/integrations/CODEX_AGENT_INSTALL.md)。发布本身不会替换用户已有安装。

## 双渠道发行与验证

插件与 [Desktop 能力包 0.8.3](https://github.com/xi-zhao/OpenQuantum/releases/tag/v0.8.3) 使用同一产品版本和已审阅源码提交。Desktop 同时补齐品牌图标；本插件不携带 Desktop 或 Harness Runtime。

GitHub `latest` 和 `openquantum-update.json` 由 `v0.8.3` 提供；`codex-v0.8.3` 不占用 Desktop 更新入口。正式附件要求干净提交构建、完整安装包隔离安装、原生 Codex 宿主检查和附件摘要核对，实际结果记录在本页 `release-validation.json`。

设置页的折叠、搜索、组合筛选、跨标签筛选、空结果重置、自定义连接和窄窗口布局已有界面验证。浏览器预览不替代 Codex 原生全局入口位置的验收；本机宿主检查不代表其他平台或宿主版本全部通过。

未进行真实科研任务、外部模型或真实 Cloud/QPU 验收，`scientificValidation=not_evaluated`。量子 SDK 仍按任务显式准备。
