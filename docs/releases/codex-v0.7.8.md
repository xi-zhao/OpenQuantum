# OpenQuantum Codex 插件 0.7.8

这是 OpenQuantum Codex 插件的首个正式下载包，使用独立标签 `codex-v0.7.8`。
它在 Codex 中提供 **131 个 Skill、71 个科学 Tool**，以及管理 Skills、MCP 连接和 Tools 的全局设置页。
聊天、项目、线程、登录和模型继续使用 Codex。Desktop 版本和它的更新通道保持独立。

## 下载和安装

首次安装下载 [完整安装包](https://github.com/xi-zhao/OpenQuantum/releases/download/codex-v0.7.8/openquantum-0.7.8-codex-install.zip)，
并与 [Release](https://github.com/xi-zhao/OpenQuantum/releases/tag/codex-v0.7.8) 的 `SHA256SUMS` 核对。
包内已包含插件 ZIP、安装器、锁文件和 Agent 安装指南，无需另行取得源码。

需要 Node.js 24+、npm，以及支持插件和全局应用的 Codex。在解压目录中执行：

```sh
npm ci --ignore-scripts
npm run plugin:install
```

也可把下面这段话交给 Codex：

```text
请按 https://github.com/xi-zhao/OpenQuantum/blob/codex-v0.7.8/docs/integrations/CODEX_AGENT_INSTALL.md
安装 OpenQuantum Codex 插件 0.7.8。从该版本 Release 下载完整安装包与 SHA256SUMS，
核对摘要并检查依赖，使用包内安装器安装。保留已有插件和用户配置，核对 Skills、MCP 工具及全局设置入口。
```

已有安装器时可单独下载 `openquantum-0.7.8-codex-plugin.zip`。安装器保留用户配置和其他插件。
安装后按提示重载 Codex，从左侧“…”→“OpenQuantum 设置”进入；已有聊天可能需要重新加载能力。

## 本版变化

- 将已有的插件、安装器与依赖锁文件组成可独立安装的发布材料，并提供 SHA-256 校验和。
- 保留 OpenQuantum 品牌介绍与 GitHub 仓库链接。Star 由用户在 GitHub 自行点击，无需插件授权。
- 修复宿主拒绝打开 MCP 凭据窗口时仍显示成功提示的问题。设置页提供可复制的短时本机地址，
  可在浏览器继续操作；Token 不经聊天、Tool 参数或配置 JSON 传递。
- README 包含安装话术、下载链接、使用说明和真实 Codex 全局设置页截图。

## 验证范围

插件测试覆盖 Skill 配置保留、MCP 握手、Tool 禁用、系统凭据库和开链失败路径。
发布包通过独立解压目录与临时 HOME/CODEX_HOME 验证安装，不使用开发工作区的 Node 依赖。
原生宿主检查覆盖 Skills 发现、关闭、缓存路径升级后保留及重新开启。
本次包的提交、摘要、宿主版本和实际检查结果随 Release 的 `release-validation.json` 提供。

macOS arm64、本机 Codex CLI `0.162.0-alpha.17.2` 为已验证环境；其他操作系统和宿主版本仍需检查兼容性。
全局入口的真实显示证据来自用户确认的 0.7.5 截图；0.7.8 凭据备用入口使用真实设置前端和凭据表单，
在模拟宿主拒绝开链的隔离浏览器夹具中验证。未将该夹具记为原生自动开窗或完整 Codex 重启验收。

科学计算的 Python/SDK 环境按具体能力准备。安装与工具调用检查不等于所有 SDK、真实远程账户或科学
Acceptance 已验证。详细配置边界见[插件说明](../integrations/CODEX_PLUGIN.md)。
