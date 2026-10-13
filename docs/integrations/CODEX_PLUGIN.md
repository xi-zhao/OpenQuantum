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
| `src/settings/codex/` | 设置 Application Interface、受控连接、系统凭据库、卡片内保存和备用凭据窗口 |
| `distributions/codex-plugin/` | 与 Desktop 一致的产品版本及插件运行依赖锁定 |

构建从能力策略和真实 `tools/list` 生成目录、Skill 和完整输入合同，检查重复名称和策略漂移。
0.8.4 Codex 插件包含 **168 个 Skill、87 个科学 Tool**，设置页提供用途分类、搜索和状态筛选。
本轮新增 26 个原生 SDK Skill，并纳入已合并的设置内容一致与服务密钥改动；
原 71 个 Tool 的默认状态不变，新增 8 个凭据服务的 16 个 Tool 均默认关闭。
实际发布状态、源码提交和附件摘要以 Release 的 `release-validation.json` 为准。
其中没有执行 Tool 的 Skill 明确提供方法解释与选型参考，不把知识目录数量等同于可执行计算数量。
SDK workbench 和领域 Skill 支持通过宿主代码工具编写原生程序，随包携带 111 个 SDK/源码环境的导航、
固定依赖、显式 setup 和源码资源；便捷 Tool 的预设案例不再限制原生 API 的使用。
平台诊断、学习通和尚未适配的按需 MCP 连接不进入执行入口；设置目录保留它们的内容和未接入原因。
新增云端与硬件服务不默认启用。
完整范围与逐库工程证据见[原生 SDK 接入](FULL_SDK_ACCESS.md)；SDK 环境并非 111 个不同上游库；本轮新增入口见[生态扩展](SDK_ECOSYSTEM_2026-10-14.md)。

`plugin.json` 使用 Agent Plugins 1.0，并保留 `.codex-plugin/plugin.json` 兼容入口。插件身份仍为
`openquantum@personal`。左侧“…”菜单的全局入口由 `open_openquantum_settings` 提供，名称为
“OpenQuantum 设置”；与插件设置入口共享 `ui://openquantum/settings/<bundle SHA-256>.html`。
资源摘要只标识页面包，排除进程专属的回环端口，允许宿主在另一个 MCP 进程读取。服务端将旧的
`settings/<64位摘要>.html` 与 `ui://openquantum/workbench.html` 作为当前页面的兼容入口，其他 URI 仍拒绝。
只宣告当前入口，品牌素材复用现有 OpenQuantum 标识。
运行依赖只包括 MCP、UI bridge、JSON Schema、TOML/YAML、JWE 加密库和系统凭据库，不包含 DSH、Codex CLI、Electron
或另一套聊天应用。配置和 Token 不进入发行 ZIP。

页首的 GitHub Star 链接只打开 `https://github.com/xi-zhao/OpenQuantum`，由用户在 GitHub
仓库页面自己点击 Star。插件不申请 GitHub 授权、不显示设备授权码、不保存 GitHub Token，也不调用 Star API。
宿主拒绝或打开失败时，设置页显示仓库地址，方便用户手动访问。

## 设置实际影响什么

Desktop 与 Codex 共用 `project-settings-catalog.mjs` 的服务、凭据说明及官方链接，
并共用 `credential-card.mjs` 的完整服务密钥卡片及 `credential-field.mjs` 输入表单。
`component-view.mjs` 统一四个标签、介绍、运行状态标题和组件卡片；Codex 构建期从 Desktop 的
`readProjectSettings` 导出完整展示目录与同一份中文文案，不携带 Desktop Runtime 或用户状态。
Codex 适配层只补充宿主连接、可用范围、字段要求、默认开关和执行注入。
Desktop 使用 Harness credential store；Codex 使用本机系统凭据库。两个入口不复制或自动迁移彼此的密钥。

默认打开“运行状态”，标签顺序与 Desktop“量子组件”一致：运行状态、MCP、Skills、服务密钥。
设置目录显示 Desktop 的全部 183 个 Skill 和 91 个 MCP；未适配条目在原位置标注原因并禁用操作。
目录可见不表示当前宿主具有相同执行能力；真实开关和凭据状态仍来自当前宿主。

“服务密钥”沿用 Desktop 双列卡片，窄窗口改为单列。每个字段单独显示名称、环境变量、
配置状态、用途、获取凭据链接、输入框和保存按钮。共有 23 个独立字段，重复的 IBM Token 合并显示。
搜索支持服务名称、用途和变量名。可直接配置 Superstaq、Classiq、Q-CTRL、QCArchive、AQT、OQC Cloud、
Quantum Inspire 和 FieldQKit 的 17 个字段。
服务开关、逐项工具开关和密钥跳转集中在对应 MCP 卡片。原生工具服务及全部 Tool 开关放在
“运行状态 → Tools”中；搜索栏随工具详情展开，减少初始页面的操作负担。

另列 IBM Runtime、IBM Transpiler、Quantum Hardware、QPanda3 Runtime 和 Pasqal：
前四项尚未适配当前插件的内置执行入口，页面展示认证要求与官方说明；Pasqal 已有 Skill，
但 SDK 从宿主进程环境读取认证，不读取本页系统凭据库。页面不提供无效的保存入口。

- **凭据状态**：区分未配置、已保存但认证未验证、可选凭据、凭据库不可用和需单独配置。
  不因目录握手成功就声称账户认证成功或 SDK 已准备。无需账户的本地准备、模拟操作不读取凭据库。
- **多字段配置**：QCArchive 地址必填，公开服务可匿名；私有服务用户名和密码需成对填写。
  OQC 地址可留空使用默认官方地址，填写时只接受官方域名与 HTTPS 默认端口。
  每个服务的值作为一个记录保存在系统凭据库，单卡保存通过锁内合并保留其他字段。空白输入不可保存。
  页面只返回字段是否已保存，值不回显，保存后自动刷新并清空输入。用户名和密码可以逐项保存，未配齐会显示缺失项。
  移除前须关闭相应服务，并在卡片内点击“确认移除”；不会依赖宿主可能禁止的原生弹窗。
- **执行注入**：只向对应服务注入受审计环境变量；构建和目录握手不携带凭据。
  新服务与其工具分别默认关闭，旧设置升级不会自动启用云功能。开启本地功能不要求填写远程 Token。
  保存与启用不调用厂商 API，实际远程操作仍按工具副作用和任务授权执行。

- **Skills**：使用原生 `skills.config` 的 `name="openquantum:<id>"` selector，仅变更本插件的 Skill。
  本机 Codex `0.162.0-alpha.17.2` 已验证此 selector 和升级后保留。更旧宿主应先运行宿主检查。
  按原生规则采用最后一个匹配项，因此在 Codex 原生设置中的后续改动也会正确显示；已有聊天可能需重载。
- **内置工具连接和 Tool**：保存到用户的 `~/.openquantum/plugins/codex/settings.json`。
  禁用同时影响 `tools/list` 和调用入口；缓存中的旧调用也被拒绝，不只是隐藏卡片。已开始的调用不会被强制终止。
- **新增 MCP**：支持本机 stdio 与 Streamable HTTP。地址不接受 URL 密码或查询参数中的 Token。
  HTTP 允许 HTTPS，回环地址允许本机 HTTP；认证支持 HTTP Bearer 或明确命名的 stdio 环境变量。
  新连接与新发现的工具默认关闭。测试连接执行真实握手和目录查询，不调用计算工具。
- **服务密钥**：卡片通过宿主正式的 app-only Tool 通道保存。`credential.field.prepare` 返回绑定服务、字段和
  操作的单次 nonce 与本进程公钥；页面使用 `jose` 的 JWE（RSA-OAEP-256 / A256GCM）加密新值，再通过
  `credential.field.commit` 提交 nonce 和密文。密钥明文不进入 MCP 参数、聊天、配置 JSON 或日志；已有值不回显。
  私钥只留在进程内存；nonce 在解密前消费，10 分钟失效，最多 32 个，禁止压缩、算法降级、重放与跨进程提交。
  写入复用字段校验和锁内合并；结果未知时先刷新状态，不自动重试。WebCrypto 或宿主通道不可用时提供独立凭据窗口。
  Codex 生产沙箱禁止页面直接请求 HTTP 回环服务，卡片不再依赖这条连接；旧回环端点仅保留给已有页面兼容。
- **自定义连接 Token**：使用专用凭据窗口，带限时、一次性且绑定连接实例的访问标识。
  打开失败时显示可复制的短时本机地址；关闭连接后才能移除 Token。远程目录若回显此连接 Token，会拒绝持久化。
- **科学状态**：调用成功或 Validator observations 不构成最终科学 Acceptance。插件没有 Harness Session
  证据物化和 central Acceptance Builder 链；不能声称已经生成 Harness Acceptance Report。

自定义连接单次目录查询 15 秒、调用 180 秒、结果 2 MiB；最多同时执行两个操作。
内置工具使用同样的调用预算，支持 `execution` 时最多两个数值线程。需要独立 Python/SDK 的工具沿用显式
setup 规则，插件安装不会批量下载数值环境；缺少依赖时应报告具体错误。

## 构建、检查与安装

正式包见 [codex-v0.8.4 Release](https://github.com/xi-zhao/OpenQuantum/releases/tag/codex-v0.8.4)。
首次安装下载 `openquantum-0.8.4-codex-install.zip`，其中已包含安装器、锁文件与插件 ZIP；
解压后执行 `npm ci --ignore-scripts` 和 `npm run plugin:install`。

让 Codex Agent 代为安装时，使用[面向 Agent 的安装指南](CODEX_AGENT_INSTALL.md)。指南包含现成插件包与
源码构建两条路径、环境检查、安装后验收和可直接交给 Codex 的话。

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

产物为 `dist/codex-plugin/openquantum-0.8.4-codex-plugin.zip`。构建不会安装到当前用户。明确安装时执行：

```sh
npm run plugin:install
```

安装器保留原 `openquantum@personal` 身份和其他市场条目；把大体积服务文件及 Node 依赖放在
`~/.local/share/openquantum/desktop/<version>-<digest>/runtime`，然后通过原生 `codex plugin add` 安装轻量插件。
目录名沿用旧安装器以便升级，不表示启动 Desktop Runtime。插件升级不删除用户设置、Token 或以前的运行目录。
安装器只接管自己管理的原 OpenQuantum 本地来源；其他来源冲突会明确报错。安装后按宿主提示重载。

维护者运行 `npm run plugin:release` 生成独立插件 ZIP、完整安装包与 `SHA256SUMS`；要求干净的提交。
完整安装包回归使用 `node scripts/verify-codex-release.mjs dist/codex-release/openquantum-0.8.4-codex-install.zip`。
使用 `npm run release:version -- X.Y.Z` 统一更新产品版本，`npm run release:check` 检查所有副本；
构建会拒绝不一致的版本。同步发行时，`vX.Y.Z` 和 `codex-vX.Y.Z` 指向同一提交。
0.8.4 同时提供原版 DSH Desktop 的 OpenQuantum 能力包；两个渠道固定到同一提交。GitHub `latest` 与 Desktop 更新清单属于 `v0.8.4`，Codex 插件使用 `codex-v0.8.4`，不附带 Desktop 更新清单。完整规则见[发布流程](../UPDATES.md#publishing-a-stable-update)。

开发预览使用 `npm run plugin:preview`。做交互测试时应设置独立 `CODEX_HOME`、
`OPENQUANTUM_PLUGIN_SETTINGS_HOME` 和随机的 `OPENQUANTUM_PLUGIN_CREDENTIAL_SERVICE`，隔离用户配置与系统凭据库命名空间。
`plugin:probe` 自动隔离这三项。预览只监听 `127.0.0.1`，写请求需要访问标识与同源校验。

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
是不同验收层级。安装候选版后需从左侧“…”→“OpenQuantum 设置”进入，确认运行状态、MCP、Skills、服务密钥四个标签及关键配置操作；
聊天旁标签页显示新版不能证明全局入口已经更新。卡片保存应核验宿主 WebCrypto 与 app-only Tool 通道；
独立凭据窗口另行核验打开与保存。CSP 声明不能替代宿主内的实际交互检查。
[历史验收记录](../releases/2026-10-11-plugin-settings.md)记录此前的已安装入口结果；
[本轮服务设置验收](../releases/2026-10-13-codex-service-settings.md)记录候选版的本地验证范围。
