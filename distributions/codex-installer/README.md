# OpenQuantum Codex 插件安装包

这个完整安装包包含插件 ZIP、安装器与依赖锁文件。无需克隆 OpenQuantum 源码。
安装后同时获得 Skills、本机 MCP 服务与科学 Tools、全局 OpenQuantum 设置页。

需要 Node.js 24+、npm，以及支持插件和全局应用的 Codex。先按同目录的 `INSTALL.md`
确认 Codex CLI，再在解压目录执行：

```sh
npm ci --ignore-scripts
npm run plugin:install
```

若安装器未找到目标 Codex CLI，使用 `OPENQUANTUM_CODEX_CLI` 指定实际路径。
安装会下载插件的 Node 依赖；Python 与科学 SDK 仍按具体能力准备。
安装器保留已有插件和用户配置。按 Codex 提示重载后，从左侧“…”进入“OpenQuantum 设置”。

发布页提供 `SHA256SUMS`，应先核对下载包的 SHA-256。
macOS arm64 原生安装与设置入口已验证；其他平台和宿主版本需检查兼容性。
窗口未打开时，凭据设置提供本机地址，可复制到浏览器继续；不要把这个临时地址或 Token 发到聊天中。
