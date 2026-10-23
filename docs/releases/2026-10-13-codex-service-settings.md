# Codex 服务设置候选验证（2026-10-13）

本轮在 `c/codex-settings-complete` 实施，基线为 `origin/main@05944b3a1f5f528a82edbdea35f34530e822d977`。
用户要求直接复用其截图中的 Desktop“服务密钥”页，并授权更新本机已安装插件。
最终代码提交为 `fb06c7f883d2478598cb503c067efc9bda42695e`，已在本机安装；与后续内容一致改动一并推送到
任务分支 `c/codex-settings-complete`，集成状态见 [PR #21](https://github.com/xi-zhao/OpenQuantum/pull/21)，尚未发布。
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

Codex 卡片经宿主 app-only Tool 通道取得绑定服务、字段及操作的单次 nonce 和进程公钥。
页面使用现有依赖 `jose` 的 JWE（RSA-OAEP-256 / A256GCM）加密输入，只向 MCP 提交 nonce 与密文。
私钥留在进程内存，10 分钟授权在解密前消费；禁止压缩、算法降级、重放与跨进程提交。
写入复用字段校验与锁内合并。结果未知时先刷新状态，不自动重试，并提供独立凭据窗口。

## 原生宿主加载与保存修复

用户提供“未能显示 OpenQuantum 设置”的原生截图；宿主日志对应 `mcp_app_resource_read_failed` / `Unknown resource`。
旧实现把随机回环端口加入页面摘要：宿主在一个 MCP 进程发现资源、另一个进程读取时，地址不一致。
`1d2e2cc1` 将摘要固定为页面包内容，并把旧的 `settings/<64位摘要>.html` 映射到当前进程页面和 CSP；
其他 URI 仍拒绝。已用两个实际 MCP 子进程验证交叉读取及当前进程授权。

独立审查还确认 Codex 生产沙箱不允许页面直接连接 HTTP 回环端口，因此 `fb06c7f8` 改用上述加密
app-only Tool 通道。卡片外观不变，旧回环端点仅供历史页面兼容。没有放宽宿主网络策略。

## 工程检查

使用现有 Node.js 24.14.1。将已在锁文件中的 `jose@6.2.12` 提升为直接依赖，版本不变，补齐 MIT 许可记录。

- 主相关回归 72/72 通过，无跳过：Codex 插件、Desktop 设置、项目设置及并发、FieldQKit MCP、分类交互。
- 展示元数据修改后，受影响的服务、类别、项目设置和 Desktop 回归 37/37 通过。
- 最终 Codex 插件回归 46/46 通过，无跳过；增加跨进程资源、JWE 篡改、算法限制、授权绑定、并发合并、
  过期重放、容量限制、启用时拒绝移除及错误脱敏检查。审查补充压缩和额外 header 拒绝后，相关 6/6 再次通过。
- Keyring 测试只使用随机测试 namespace 中的合成值，验证保存、重建适配器后读回、再移除；测试值已清除。
- 修改范围 ESLint、`git diff --check` 通过。Desktop 与 Codex 客户端均完成构建。
- 独立审查绑定 `fb06c7f883d2478598cb503c067efc9bda42695e`，无剩余阻断项；审查发现的压缩边界已修复。
  审查者额外核验浏览器内存构建及保存成功、格式拒绝、提交响应丢失路径，只发送密文且不自动重试。
- 干净提交构建的安装器 probe 验证 142 个 Skill、87 个科学 Tool（默认 71 个）、13 个服务、8 个可配置服务、
  五个标签资源、跨进程读取、加密提交和重放拒绝、回环兼容信息及禁用后旧调用拒绝。
  Probe 配置与凭据 namespace 均隔离；密文 probe 使用空值，验证拒绝路径而不写入凭据库。

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

最终页面另在真实浏览器 WebCrypto 中完成 JWE 保存、输入清空、邻项草稿保留、取消和确认移除，
清理后所有测试字段均为未配置。此前已检查备用窗口加载、保存合成值和原页状态刷新。

最终安装后，用户明确确认原生 Codex 侧边入口“已显示服务密钥卡片”。
这确认了原生入口恢复显示。电脑控制工具禁止操作 `com.openai.codex`，MCP Apps 浏览接口未列出该全局页；
原生内嵌保存及宿主重启后的保存仍待核验。隔离预览、协议和 Keyring 测试不能替代这些交互验收。

没有使用真实账户、厂商 API、外部模型或 QPU，没有科学验收；`scientificValidation=not_evaluated`。

## 本机安装与读回

- 新版安装代码：`fb06c7f883d2478598cb503c067efc9bda42695e`，构建时工作树干净。
- ZIP SHA-256：`16224cc150c1a9dbf02d5ba27a1ca4141cb5cf32864d98db893fd32b99ac6dea`。
- 使用现有应用配套 CLI `0.162.0-alpha.17.2` 与既有安装器，更新 `openquantum@personal` 到
  `~/.local/share/openquantum/desktop/0.8.3-16224cc150c1a9db/`。安装依赖使用离线缓存。
- 读回 `installed=true`、`enabled=true`；Codex 缓存的 release、manifest、MCP 启动配置与安装来源一致，
  实际 runtime HTML 与构建包逐字节一致。其他已安装插件的列表、来源、启用状态未变。
- 历史候选目录保留供恢复；本轮前一版 `1d2e2cc1` 在 `0.8.3-02d4ca942113b172/`。
- 原始记录在任务工作树 `.openquantum/codex-settings-evidence/`：`sealed-build.txt`、`sealed-install-results.txt`、
  `sealed-install-readback.json`、`sealed-installed-before.json`、`sealed-installed-after.json`、各 `sealed-*-tests.txt`。
  最终截图为 `service-keys-sealed.jpg`，深浅主题和窄屏历史截图保留；截图均来自隔离预览。
