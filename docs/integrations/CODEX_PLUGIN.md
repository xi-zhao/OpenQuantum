# OpenQuantum Codex 插件

Codex 插件在外层 Codex 对话中提供量子 Skill 和科学 Tool。OpenQuantum 侧边入口只显示能力设置。
项目、线程、聊天、Diff、登录和模型调用由 Codex 管理；量子学习通属于 Desktop。

## 共享内容与发行边界

| 位置 | 职责 |
| --- | --- |
| `.agents/capability-packages.yml`、`.agents/skills/` | 领域能力、源 Skill、MCP implementation 与科学合同的唯一来源 |
| `src/capabilities/` | 原生科学 Tool 定义与实现；不注册宿主 Runtime |
| `runtime/openquantum/agent-presets/openquantum/` | 将共享定义注册到 Harness，按 Harness 需要投影 schema |
| `runtime/chatgpt/` | 将可适配能力投影为本机 MCP，提供设置资源；没有 Agent loop 或模型请求 |
| `src/settings/codex/` | 设置 Application Interface、受控连接、系统凭据库和独立凭据窗口 |
| `distributions/codex-plugin/` | 独立插件版本及运行依赖锁定 |

构建从能力策略和真实 `tools/list` 生成目录、Skill 和完整输入合同，检查重复名称和策略漂移。
当前候选包为 **0.7.8**，基于 Desktop 核心版本 0.6.0 的主线：**131 个 Skill、71 个科学 Tool**。
0.7.8 增加用户主动发起的 GitHub 授权与原地 Star；尚缺真实 GitHub App Client ID，当前已安装版仍为 0.7.7。
一次性注册配置、用户交互及验证边界见 [GitHub Star](GITHUB_STAR.md)。
其中没有执行 Tool 的 Skill 明确提供方法解释与选型参考，不把知识目录数量等同于可执行计算数量。
依赖宿主源码/Shell 的算法总入口、平台诊断、学习通、真实硬件以及尚未适配的按需连接不进入默认插件。

`plugin.json` 使用 Agent Plugins 1.0，并保留 `.codex-plugin/plugin.json` 兼容入口。插件身份仍为
`openquantum@personal`。左侧“…”菜单的全局入口由 `open_openquantum_settings` 提供，名称为
“OpenQuantum 设置”；与插件设置入口共享 `ui://openquantum/settings/<HTML SHA-256>.html`。
独立入口标识避免复用旧工作台路由，内容摘要让页面变化时使用新资源身份。服务端兼容旧 opener 和
`ui://openquantum/workbench.html` 请求，但不再向菜单宣告旧工作台入口。品牌素材复用现有 OpenQuantum 标识。
运行依赖只包括 MCP、UI bridge、JSON Schema、TOML/YAML 和系统凭据库，不包含 DSH、Codex CLI、Electron
或另一套聊天应用。配置和 Token 不进入发行 ZIP。

## 设置实际影响什么

- **Skills**：使用原生 `skills.config` 的 `name="openquantum:<id>"` selector，仅变更本插件的 Skill。
  本机 Codex `0.162.0-alpha.17.2` 已验证此 selector 和升级后保留。更旧宿主应先运行宿主检查。
  按原生规则采用最后一个匹配项，因此在 Codex 原生设置中的后续改动也会正确显示；已有聊天可能需重载。
- **内置工具连接和 Tool**：保存到用户的 `~/.openquantum/plugins/codex/settings.json`。
  禁用同时影响 `tools/list` 和调用入口；缓存中的旧调用也被拒绝，不只是隐藏卡片。已开始的调用不会被强制终止。
- **新增 MCP**：支持本机 stdio 与 Streamable HTTP。地址不接受 URL 密码或查询参数中的 Token。
  HTTP 允许 HTTPS，回环地址允许本机 HTTP；认证支持 HTTP Bearer 或明确命名的 stdio 环境变量。
  新连接与新发现的工具默认关闭。测试连接执行真实握手和目录查询，不调用计算工具。
- **Token**：设置页打开仅绑定回环地址的专用窗口，将值直接写入系统凭据库。已有值不回显，不经过聊天、
  MCP Tool 参数、设置 JSON 或日志。窗口带限时、一次性的访问标识，并绑定连接实例；不提供明文回退。
  关闭连接后才能移除其 Token。远程工具目录若回显此连接的 Token，会被拒绝持久化。
- **科学状态**：调用成功或 Validator observations 不构成最终科学 Acceptance。插件没有 Harness Session
  证据物化和 central Acceptance Builder 链；不能声称已经生成 Harness Acceptance Report。

自定义连接单次目录查询 15 秒、调用 180 秒、结果 2 MiB；最多同时执行两个操作。
内置工具使用同样的调用预算，支持 `execution` 时最多两个数值线程。需要独立 Python/SDK 的工具沿用显式
setup 规则，插件安装不会批量下载数值环境；缺少依赖时应报告具体错误。

## 构建、检查与安装

需要 Node.js 24+。在仓库根目录执行：

```sh
npm ci
npm run plugin:test
npm run plugin:build
npm ci --prefix dist/codex-plugin/openquantum/server --ignore-scripts
npm run plugin:probe
npm run plugin:host-check
```

`plugin:host-check` 使用本机 Codex CLI，在一次性 HOME/CODEX_HOME 中安装候选插件，验证真实宿主目录、
Skill 关闭、其他 Skill 保留、缓存路径升级后的状态与重新开启。结束清理临时安装；不调用模型，不改真实用户配置。
可通过 `OPENQUANTUM_CODEX_CLI` 指定 CLI 路径。Keychain 集成测试另用
`OPENQUANTUM_TEST_KEYCHAIN=1 npm run plugin:test`，只创建并清理随机测试服务条目。

产物为 `dist/codex-plugin/openquantum-0.7.8-codex-plugin.zip`。构建不会安装到当前用户。明确安装时执行：

```sh
npm run plugin:install
```

安装器保留原 `openquantum@personal` 身份和其他市场条目；把大体积服务文件及 Node 依赖放在
`~/.local/share/openquantum/desktop/<version>-<digest>/runtime`，然后通过原生 `codex plugin add` 安装轻量插件。
目录名沿用旧安装器以便升级，不表示启动 Desktop Runtime。插件升级不删除用户设置、Token 或以前的运行目录。
安装器只接管自己管理的原 OpenQuantum 本地来源；其他来源冲突会明确报错。安装后按宿主提示重载。

开发预览使用 `npm run plugin:preview`。做交互测试时应设置独立 `CODEX_HOME` 和
`OPENQUANTUM_PLUGIN_SETTINGS_HOME`，避免修改真实 Skill 开关。预览只监听 `127.0.0.1`，写请求需要访问标识与同源校验。

## 当前限制与恢复

当前 Desktop 没有可用的原生 config-write bridge/control socket。Skill 设置通过受控 TOML 写入，
保留无关配置值；TOML 注释和排版会被重新序列化。每次修改前把原配置保存在同目录的
`config.toml.openquantum-backup`，文件权限为 0600；该备份不得上传到报告、仓库或日志。
写入用互斥锁、页面 revision 和替换前原文检查。自有进程崩溃后的锁可恢复。
**这些检查不是跨原生 Codex 进程的原子 CAS**：同时操作原生设置与本页仍有极小替换竞态。
避免同时写入；遇到冲突刷新核对，需要恢复时先备份当前配置，再比较上一次受保护备份。
不能为取得配置 RPC 自动启动第二个 Codex daemon。

HTTP OAuth、分页 MCP 目录、跨电脑密钥同步不在此版本范围。用户需要逐项启用自定义工具。
本地浏览器预览、协议握手、原生 CLI 安装检查、聊天旁 MCP 设置标签页和左侧菜单的全局入口
是不同验收层级。必须从左侧“…”→“OpenQuantum 设置”进入，确认三个标签及关键配置操作；
聊天旁标签页显示新版不能证明全局入口已经更新。
[本轮验收记录](../releases/2026-10-11-plugin-settings.md)分别记录这些结果。
