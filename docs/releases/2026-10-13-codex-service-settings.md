# Codex 服务设置候选验证（2026-10-13）

本轮在 `c/codex-settings-complete` 实施，基线为 `origin/main@05944b3a1f5f528a82edbdea35f34530e822d977`。
用户要求直接复用其截图中的 Desktop“服务密钥”页，并授权更新本机已安装插件。
截图版代码提交为 `c6b56a11ca8ac62a1d2b35ef43393677e0e3bdb8`，已在本机安装；尚未推送、合并或发布。
沿用 0.8.3 产品版本号，但这不是已发布的 0.8.3 附件。现有 DSH Desktop 安装未变。

## 用户得到的行为

- 默认进入“服务密钥”，沿用 Desktop 双列卡片；窄窗口变为单列。每个字段显示名称、变量名、配置状态、
  用途、获取凭据链接、输入框和保存按钮。夸父、天衍、国盾、腾讯等平台分别显示。
- 13 个服务共有 23 个独立字段；共用的 IBM Token 合并为一张卡片。可按服务、用途、变量名和状态筛选。
- 8 个已接入服务的 17 个字段支持卡片内保存：Superstaq、Classiq、Q-CTRL、QCArchive、AQT、OQC、
  Quantum Inspire、FieldQKit。后者有 7 个可选 Token。
- IBM Runtime、IBM Transpiler、Quantum Hardware、QPanda3 Runtime 的内置执行入口尚未适配；
  Pasqal 经宿主代码工具的 SDK 环境认证。这 5 项保留要求和文档，字段明确显示“需单独配置”并禁用保存。
- 保存后清空输入、自动刷新状态，已有值不回显。单卡保存保留同服务其他字段及其他卡片的未提交草稿。
  离开服务密钥标签时清除密钥草稿。移除只影响当前字段，须关闭对应服务，并在卡片内二次确认。
- QCArchive 允许逐项保存地址、用户名、密码；缺少配对字段会显示未完成配置。公开服务可仅填写地址。
  保存和启用都不调用厂商 API，不表示账户认证成功。
- 服务概览、MCP、Skills、Tools 保留各自入口；服务开关与逐项 Tool 开关分开。新增服务及其 16 个 Tool 默认关闭。

## 直接复用 Desktop

`src/settings/server/project-settings-catalog.mjs` 是服务名称、用途、凭据说明和官方链接的共同来源。
Codex 字段回归逐项对照 Desktop 的 `credentialed-mcp-client` 声明，覆盖全部既有凭据引用。

完整服务密钥卡片及样式抽到 `src/settings/credential-card.mjs`，底层输入表单在 `credential-field.mjs`。
Desktop React 页面和 Codex DOM 页面共用整张卡片；共享模块只渲染，宿主分别提供事件和存储。
Desktop 继续使用 Harness credential store，Codex 使用系统 Keyring，不复制或自动迁移用户密钥。

Codex 卡片先经 app-only MCP 请求取得字段授权，真实值只由页面直接发往回环端点。
授权绑定服务、字段、操作与页面 Origin，10 分钟有效，写入前单次消费；Host、CORS、字段白名单和锁内合并均受约束。
当前回环端口同时进入 CSP 和 HTML 摘要，避免进程重启后沿用旧端口页面。失败不自动重试写入。
传输结果未知时提示先查看刷新后的状态，并提供独立凭据窗口；输入格式错误直接显示可操作提示。

## 工程检查

使用现有 Node.js 24.14.1 和锁定依赖，无新增运行依赖。

- 主相关回归 72/72 通过，无跳过：Codex 插件、Desktop 设置、项目设置及并发、FieldQKit MCP、分类交互。
- 展示元数据修改后，受影响的服务、类别、项目设置和 Desktop 回归 37/37 通过。
- 最后单字段保存、隔离 Keyring 和入口回归 12/12 通过；覆盖 Origin/Host、字段与操作绑定、nonce 类型隔离、
  单次消费、并发合并、过期与重放、启用时拒绝移除、失败脱敏、CSP 与资源身份变化。
- Keyring 测试只使用随机测试 namespace 中的合成值，验证保存、重建适配器后读回、再移除；测试值已清除。
- 修改范围 ESLint、`git diff --check` 通过。Desktop 与 Codex 客户端均完成构建。
- 独立审查绑定 `c6b56a11`，无剩余阻断项。审查发现的原生 confirm 兼容问题和状态刷新竞态已修复；
  审查者独立核验了刷新顺序、执行时读取 revision、失败后队列恢复和两个入口的内存构建。
- 干净提交构建的安装器 probe 验证 142 个 Skill、87 个科学 Tool（默认 71 个）、13 个服务、8 个可配置服务、
  五个标签资源、回环 Origin/CSP 一致性和禁用后旧调用拒绝。Probe 配置与凭据 namespace 均隔离。

复跑入口：

```sh
OPENQUANTUM_TEST_KEYCHAIN=1 node --test tests/codex-plugin-*.test.mjs \
  tests/harness-web-capabilities.test.mjs tests/project-settings.test.mjs \
  tests/project-settings-concurrency.test.mjs .agents/skills/fieldqkit-hardware/test/mcp.test.mjs \
  tests/settings-categories.test.mjs
node scripts/build-codex-plugin.mjs
node scripts/probe-chatgpt.mjs dist/codex-plugin/openquantum
```

## 界面验证及限制

内置浏览器使用独立设置目录和内存凭据替身，已实测：单字段保存、另一字段草稿保留、保存后输入清空、
取消移除、确认单项移除且保留邻项、QCArchive 多项并发保存、无效地址提示及纠正后保存、变量名搜索、
共用 Token 去重、未接入字段禁用、服务概览跳转。420 像素视口变为单列，没有横向溢出；深浅主题均检查。

模拟阻断回环端点后，页面报告未知保存结果、没有自动重试，并显示备用窗口；备用窗口可加载 FieldQKit
字段、保存合成值并在原页读回，测试值随后移除。此模拟不代表真实 Codex 已授予 Local Network Access。

电脑控制工具明确禁止操作 `com.openai.codex` 原生窗口；用户尚未打开可检查的 MCP Apps 设置页。
已请求用户从左侧“…”→“OpenQuantum 设置”打开。真实全局入口、内嵌保存及宿主重启后的操作仍待核验。
本地预览、协议、Keyring 测试和安装读回不能替代这一层验收。

没有使用真实账户、厂商 API、外部模型或 QPU，没有科学验收；`scientificValidation=not_evaluated`。

## 本机安装与读回

- 新版安装代码：`c6b56a11ca8ac62a1d2b35ef43393677e0e3bdb8`，构建时工作树干净。
- ZIP SHA-256：`19ae51db052e333d8b58efc67f0f4004a42ee0ebc080f7bda7c26f63c9032f45`。
- 使用现有应用配套 CLI `0.162.0-alpha.17.2` 与既有安装器，更新 `openquantum@personal` 到
  `~/.local/share/openquantum/desktop/0.8.3-19ae51db052e333d/`。
- 读回 `installed=true`、`enabled=true`；Codex 缓存的 release、manifest、MCP 启动配置与安装来源一致，
  实际 runtime HTML 与构建包逐字节一致。其他已安装插件的列表、来源、启用状态未变。
- 上一轮 `b4586dfb` 候选安装在 `0.8.3-3b45e10b09c74216/`，保留供恢复；现已被截图版替换。
- 原始记录在任务工作树 `.openquantum/codex-settings-evidence/`：`card-build.txt`、`card-install-results.txt`、
  `card-install-readback.json`、`card-installed-before.json`、`card-installed-after.json`、各 `card-*-tests.txt`。
  效果截图为 `service-keys-final.jpg`、`service-keys-light.jpg`、`service-keys-narrow.jpg`；截图来自隔离预览。
