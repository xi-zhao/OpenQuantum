# Codex 服务设置候选验证（2026-10-13）

本轮在 `c/codex-settings-complete` 实施，基线为 `origin/main@05944b3a1f5f528a82edbdea35f34530e822d977`。
这是本地源码候选，尚未推送、合并、安装或发布；保留现有产品版本号，不覆盖已发布的 0.8.3。

## 用户得到的行为

- 设置页列出 13 个需要账户或凭据的服务。搜索支持服务、用途和环境变量名称。
- 8 个服务可以在独立窗口配置：Superstaq、Classiq、Q-CTRL、QCArchive、AQT、OQC、Quantum Inspire、FieldQKit。
  FieldQKit 包含夸父、天衍、国盾、腾讯、本源、FieldQuantum、逻辑比特 7 个可选 Token。
- IBM Runtime、IBM Transpiler、Quantum Hardware、QPanda3 Runtime 的内置执行入口尚未适配；
  Pasqal 经宿主代码工具的 SDK 环境认证。这 5 项展示要求和文档，明确标注当前路径。
- 服务卡片先展示用途、缺失项和操作；环境变量和完整 Tool 说明按需展开。
  服务开关与逐项 Tool 开关分开；新服务和新增的 16 个 Tool 默认关闭。
- QCArchive 支持匿名地址或成对的用户名、密码。更新时空白保留旧值，可单独移除字段。
  已启用服务可更新凭据，但需关闭后才能移除。保存完成清空输入，只显示字段配置状态。
- MCP 表单草稿在切换标签或保存失败后保留。原 Skills、MCP 连接和 Tools 页面仍可使用。

## 直接复用 Desktop

`src/settings/server/project-settings-catalog.mjs` 继续作为服务名称、用途说明、凭据说明和官方链接的共同来源。
新增回归将 Codex 字段逐项对照 Desktop 的 `credentialed-mcp-client` 声明，覆盖全部既有凭据引用。

Desktop 的输入表单抽到 `src/settings/credential-field.mjs`，由 Desktop React 页面和 Codex 凭据窗口共用。
共享模块只渲染字段。Desktop 仍调用 Harness credential store，Codex 仍调用系统 Keyring；
不复制用户密钥，不把 Harness Runtime 或其配置写入接口带入 Codex。
Desktop 客户端沿既有 Home 准备流程打包，共享字段代码也显式纳入 Codex 包。

## 工程检查

使用现有 Node.js 24.14.1、仓库锁定依赖，不新增运行依赖：

```sh
OPENQUANTUM_TEST_KEYCHAIN=1 node --test tests/codex-plugin-*.test.mjs \
  tests/harness-web-capabilities.test.mjs tests/project-settings.test.mjs \
  tests/project-settings-concurrency.test.mjs .agents/skills/fieldqkit-hardware/test/mcp.test.mjs
node --test tests/settings-categories.test.mjs
node scripts/build-codex-plugin.mjs
node scripts/probe-chatgpt.mjs dist/codex-plugin/openquantum
```

- 主相关测试 60/60 通过，类别交互测试 3/3 通过，无跳过；修改范围 ESLint 与 `git diff --check` 通过。
- Keyring 测试只创建、读回、删除随机测试服务中的合成值。界面预览使用独立设置文件和内存凭据替身。
- 实际 provider 握手不携带凭据；FieldQKit 检查只接收相应环境白名单。
  取消测试经过真实 MCP 取消消息，并确认合成 worker 退出。
- 密钥脱敏覆盖嵌套 JSON、引号和反斜杠，保留 MCP 判别字段。用户名与公开地址不参与秘密子串替换。
  凭据库异常不阻断整个设置页，也不阻断无需凭据的本地工具。
- 包内目录为 142 个 Skill、87 个科学 Tool，其中默认启用 71 个 Tool。
  真实 stdio probe 验证设置入口、四个标签资源、13 个服务、8 个可配置服务、默认关闭和禁用后的旧调用拒绝。
  Probe 的配置目录与 Keyring namespace 均独立。
- 独立审查发现的脱敏、纯本地操作、OQC 地址端口、Desktop 测试加载与 Probe 凭据隔离问题已修复；
  最终差异复核没有剩余阻断项。

## 界面验证及限制

隔离浏览器已实测：凭据名搜索、多字段填写、保存后输入清空、状态读回、服务与工具分别开启、
刷新后开关保留、重新打开不回显、移除私有用户名与密码后保留匿名地址、MCP 草稿跨标签保留。
420 像素视口下，概览变为两列、服务卡片变为单列；内容没有横向溢出，工具列表可展开，完整说明默认折叠。
原始日志与截图保留在任务工作树的 `.openquantum/codex-settings-evidence/`。

没有使用真实账户或调用厂商 API，没有 QPU、外部模型或科学验收。
浏览器预览与协议检查不替代已安装 Codex 的左侧全局入口验收；本轮没有更新用户现有 Codex 或 DSH Desktop 安装。
`scientificValidation=not_evaluated`。
