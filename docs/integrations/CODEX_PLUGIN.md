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

构建从能力策略与已审阅的 Tool 合同生成目录、Skill 和完整输入合同，检查重复名称和策略漂移。
FlagQuantum 构建复用已审阅的固定版本 `upstream-tools.json`，无需为打包安装其 Python 环境；
真实调用仍核对服务返回的完整 schema 和副作用声明，漂移时拒绝执行。
已发布 0.8.4 包含 **168 个 Skill、87 个科学 Tool**；当前源码加入原先未接入的本地和外部 MCP、
平台诊断与 SDK 选型入口。默认允许 Agent 按任务选择，保留明确禁用列表；旧 Codex 的默认关闭
没有写入禁用列表，不视为用户禁止。允许使用不安装环境、不启动服务，也不授权任意云端操作。
Desktop 的旧 preset 关闭状态则保守迁移为禁止，详见[Desktop 原生准备](DESKTOP_PREPARATION.md)。
实际发布状态、源码提交和附件摘要以 Release 的 `release-validation.json` 为准。
其中没有执行 Tool 的 Skill 明确提供方法解释与选型参考，不把知识目录数量等同于可执行计算数量。
SDK workbench 和领域 Skill 支持通过宿主代码工具编写原生程序，随包携带 112 个 SDK/源码环境的导航、
固定依赖、显式 setup 和源码资源；便捷 Tool 的预设案例不再限制原生 API 的使用。
平台诊断使用本机只读检查；学习通仍属于 Desktop。平台、驱动或许可条件按具体 SDK 检查，不能以目录可见代替环境就绪。
云端请求与硬件操作仍遵守任务授权、Tool 副作用声明和宿主权限。
完整范围与逐库工程证据见[原生 SDK 接入](FULL_SDK_ACCESS.md)；SDK 环境并非 112 个不同上游库；本轮新增入口见[生态扩展](SDK_ECOSYSTEM_2026-10-14.md)。

`plugin.json` 使用 Agent Plugins 1.0，并保留 `.codex-plugin/plugin.json` 兼容入口。插件身份仍为
`openquantum@personal`。左侧“…”菜单的全局入口由 `open_openquantum_settings` 提供，名称为
“OpenQuantum 设置”，打开现有的 `ui://openquantum/settings/<bundle SHA-256>.html` 自定义设置页。
仅声明 `global` 入口；按 [OpenAI MCP Extensions 0.2.0](https://github.com/openai/mcp-extensions/blob/0d606217705e0e71eb21fff009619b67b80611dc/CHANGELOG.md)
移除的旧 `type: "settings"` 入口不再声明。宿主插件详情页中的原生设置使用独立的 `openai/settings`
协议；当前自定义设置页不依赖它，分类、搜索、能力开关与凭据卡片保持原有交互。
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
共享页面按服务组织凭据组，复用 `credential-card.mjs` 的样式及 `credential-field.mjs` 输入表单。
`component-view.mjs` 复用组件卡片；Codex 构建期从共享 `component-directory.mjs` 读取完整展示目录，
从 `src/settings/locales/openquantum-source.json` 读取同一份产品文案。目录以能力声明和 Skill 元数据为源，
不调用 Desktop 的设置服务，不读取其 preset 或用户状态；连接地址、权限与凭据要求由当前宿主补充。
Codex 适配层只补充宿主连接、可用范围、字段要求、默认开关和执行注入。
Desktop 使用 Harness credential store；Codex 使用本机系统凭据库。两个入口不复制或自动迁移彼此的密钥。

默认打开只读“首页”，导航固定为“首页 / Skills / MCP”，与 Desktop 共用布局。
Tool 开关、环境和凭据配置放在对应的 Skill 或 MCP 卡片中，不增加“高级设置”或独立凭据页。
设置目录从共享声明生成，包括没有 MCP 的原生 SDK 环境入口；安装前展示平台、驱动和许可条件。
目录可见不表示当前宿主具有相同执行能力；真实开关和凭据状态仍来自当前宿主。

Skill 默认显示“最近选择”，首次使用时提示在聊天中描述任务。可搜索全部目录或筛选已禁止、需要处理。
卡片只显示名称、简短用途、“允许 Agent 选择”和一条准备状态；“关联配置”提供手动检查、修复、
按需凭据及 Tool、MCP 使用限制。允许选择与环境安装分开保存，不自动恢复任何禁用。
关系来自显式声明，支持一个 Skill 对应多个 Tool、多个 Skill 复用同一环境或 MCP。
只复用环境不推导出 MCP 依赖；纯知识 Skill 显示“无需安装”，多环境 Skill 先选择再显示对应配置。
源码 ID、完整 Tool 合同和修复操作收在详情中。

凭据在相关 Skill 或 MCP 的配置卡片中按服务组织，窄窗口为单列。
QCArchive 地址、用户名与密码归为一组，OQC Token 与可选地址归为一组，Pasqal 的两种认证方式集中说明；
重复的 IBM Token 只出现一次。FieldQKit 的七个平台归为一组，各平台 Token 独立可选。
展开服务后逐项保存，必填、选填、待补全与已保存状态分别标明。环境变量收在字段详情中，
搜索变量名仍显示所属服务的完整配置。可直接配置 Superstaq、Classiq、Q-CTRL、QCArchive、AQT、OQC Cloud、
Quantum Inspire、FieldQKit、Pasqal、IBM Quantum、Quantum Hardware 与 QPanda Runtime。
Skill 与 MCP 中的关联凭据共用同一份记录与保存通道，不复制密钥。
卡片内的 Tools 汇总调用开关和准备状态，完整技术合同保留在详情。
“MCP”页显示连接开关与已准备 Tool 数量，安装和凭据配置默认折叠。
本地免凭据 Tool 与联网 Tool 分别判断状态，凭据保存不代表远端账户认证通过。

IBM Runtime、IBM Transpiler 与 Quantum Hardware 共用 IBM 凭据字段；同一凭据不要求重复输入。
Pasqal 可直接填写 Token 或用户名和密码，固定云端工作流从凭据库读取，本地模拟不需要凭据。
固定入口与 SDK 定位器均遵守关联 Skill、Tool、MCP 禁用策略。

- **凭据状态**：区分未配置、已保存但认证未验证、可选凭据、凭据库不可用和需单独配置。
  不因目录握手成功就声称账户认证成功或 SDK 已准备。无需账户的本地准备、模拟操作不读取凭据库。
- **多字段配置**：QCArchive 地址必填，公开服务可匿名；私有服务用户名和密码需成对填写。
  OQC 未保存地址时使用默认官方地址；留空保留已有地址，移除后恢复默认。填写时只接受官方域名与 HTTPS 默认端口。
  每个服务的值作为一个记录保存在系统凭据库，逐字段保存通过锁内合并保留其他字段。空白输入不可保存。
  页面只返回字段是否已保存，值不回显，保存后自动刷新并清空输入。用户名和密码可以逐项保存，未配齐会显示缺失项。
  移除在卡片内点击“确认移除”；不要求取消允许使用。后续需要认证的调用会提示补齐，使用限制不变。
- **执行注入**：只向对应服务注入受审计环境变量；构建和目录握手不携带凭据。
  默认允许按需选择，但不安装、不调用厂商 API。明确禁用在调用前重新检查，本地功能不要求远程 Token。
  凭据只在本次选择的 Tool 或云端工作流需要时检查，保存不执行云端操作。

- **Skills**：使用原生 `skills.config` 的 `name="openquantum:<id>"` selector，仅变更本插件的 Skill。
  本机 Codex `0.162.0-alpha.17.2` 已验证此 selector 和升级后保留。更旧宿主应先运行宿主检查。
  按原生规则采用最后一个匹配项；兼容同一插件缓存下旧版本的 path selector，保持禁用。
  原生 Skill 简介的刷新由宿主管理；后端策略对后续准备和调用立即生效。
- **内置工具连接和 Tool**：保存到用户的 `~/.openquantum/plugins/codex/settings.json`。
  禁用同时影响发现结果和执行入口；缓存中的旧调用也被拒绝，不只是隐藏卡片。已开始的调用不会被强制终止。
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
setup 规则，插件安装不会批量下载数值环境。

凭据入口共享 [`createCredentialRequests`](../../src/settings/codex/credential-requests.mjs) 管理临时授权：
签发、按作用域读取、同步消费、过期回收和关闭失效。加密通道独立持有一组请求；独立窗口与兼容回环表单
共用另一组，每组最多 32 个。模块只保存授权元数据，不保存密钥；JWE、HTTP 校验和凭据写入仍由各自模块负责。
独立窗口查看字段状态不会消费授权，实际保存前重新检查有效期；窗口关闭后不能再次签发授权。

## 按需安装、配置与启动

Agent 先根据原生 Skill 简介选择；完整指令按需要读取，`find_openquantum_skills` 可补充搜索并检查单项状态。
发现与状态读取没有安装或服务启动副作用。只有执行确实需要时调用 `prepare_openquantum_skill`，
明确选择一个 Tool 或 SDK；多目标 Skill 不会安装整个目录。纯知识 Skill 无需准备。
准备入口复用已有环境，缺失时启动固定依赖安装；缺凭据返回所需字段与聚焦的同一设置表单，
凭据明文不进入聊天。取消、失败或中断后需显式重试；已有安装的检查失败仍重试检查。
Python 安装要求本机已有 `uv`，Julia 要求已有 Julia；许可环境和不支持的平台明确返回配置状态。

允许的科学 Tool 在环境安装前就提供合同，因此首次准备完成可在同一聊天直接执行，
不依赖跨进程 `tools/list_changed` 或重载。若跳过准备，科学 Tool 返回带下一步的文本错误，
不把准备数据伪装成科学输出。运行时仍重新检查禁用，不能通过通用 SDK 工作台或 Pasqal 固定入口绕过。
调用 Tool 才启动对应服务，完成后关闭。关闭 Skill 保留环境、凭据与独立的 MCP、Tool 选择。
最近选择、准备结果及使用时间保存在 `activity.json`（最多 20 项），不保存任务文本或凭据。
“需要处理”按当前环境与凭据状态判断，完成配置后不会继续显示旧的缺失提示。

13 个新增本地服务均无必填 Token。QDMI 可选择已审阅的驱动清单；留空准备官方示例，返回模拟设备信息。
NetQASM 默认只准备公开的程序编译环境；SquidASM / NetSquid 许可仿真使用用户另行准备的解释器。
CUDA-Q 便捷 Tool 使用 CPU，无需 GPU。各卡片统一显示用途、平台条件、必要或可选配置及安装反馈。

环境默认位于 `~/.openquantum/plugins/codex/environments/`，与插件版本目录分离，升级保留。
安装与检查记录位于同一设置目录的 `installations/`；`OPENQUANTUM_PLUGIN_SETTINGS_HOME` 可指定整个目录。
固定依赖、解释器、配置或关键文件改变后须重新检查；这不是科学结果验收。
有限安装进程复用现有 SDK 安装器，退出或重开页面不丢失操作状态。取消会等待其拥有的子进程退出后才允许重试；
异常退出可重新检查或安装。每个环境的安装、配置与插件 Tool 执行互斥，其他环境可独立工作。
原生 SDK 经宿主代码工具执行时，执行与取消由当前宿主管理，不受插件的 Tool 租约管理。

MCP 初始化和设置读取只加载构建清单与状态，不启动科学服务、不导入数值 SDK。
实际调用才连接选中的服务，核对实时 Tool 合同，调用完成或取消后关闭连接。
首次计算仍可能因 Python 模块导入或 JIT 编译耗时；该时间与设置页面加载分开记录。

## 发现、执行与保存恢复

Codex 面向模型的内置入口固定为 `find_openquantum_skills`、`prepare_openquantum_skill` 和
`execute_openquantum_tool`。发现只返回相关候选，选定后提供精确参数、结果合同与副作用声明；
目录中只有 Tool 的能力也可使用。准备只安装所选环境；执行委托现有实现，不隐式安装，
也不改变科学结果。用户自建外部 MCP 的已启用 Tool 仍按原合同暴露。Desktop 保留原生 Tool Registry。

算法 SDK 默认只准备 NumPy、SciPy、Qiskit。`dependencyGroups` 可按任务增加
`gradients`、`pennylane`、`tensor`、`chemistry`；化学自动包含 tensor，不能省略所选 Skill 必需的组。
旧的完整环境继续可用；新环境按组记录，缺组、安装中断或取消均不报告就绪。
检查与发现不会安装，已有组不会因扩装被移除。

设置命令绑定点击时看到的版本；连接操作还绑定具体连接实例，旧请求不能操作同名的新连接。
保存后重新读取核对；回复丢失只进行读取，不自动重发写入。读取仍失败时保留草稿并阻止后续设置写入，
刷新核对后再继续。新增或编辑连接若丢失实例回执，保持“未确认”，不凭相同地址推定成功。
连接编辑保留未改动的启动参数；无修改时不提交，移除前提供明确确认和取消。

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

当前 Codex Desktop 没有可用的原生 config-write bridge/control socket。Skill 设置通过受控 TOML 写入，
保留无关配置值；TOML 注释和排版会被重新序列化。每次修改前把原配置保存在同目录的
`config.toml.openquantum-backup`，文件权限为 0600；该备份不得上传到报告、仓库或日志。
写入用互斥锁、页面 revision 和替换前原文检查。自有进程崩溃后的锁可恢复。
**这些检查不是跨原生 Codex 进程的原子 CAS**：同时操作原生设置与本页仍有极小替换竞态。
避免同时写入；遇到冲突刷新核对，需要恢复时先备份当前配置，再比较上一次受保护备份。
不能为取得配置 RPC 自动启动第二个 Codex daemon。

HTTP OAuth、分页 MCP 目录、跨电脑密钥同步不在此版本范围。用户需要逐项启用自定义工具。
本地浏览器预览、协议握手、原生 CLI 安装检查、聊天旁 MCP 设置标签页和左侧菜单的全局入口
是不同验收层级。安装候选版后需从“OpenQuantum 设置”进入，确认概览、Skill、凭据及高级设置中的 Tool、MCP 和关键配置操作；
聊天旁标签页显示新版不能证明全局入口已经更新。卡片保存应核验宿主 WebCrypto 与 app-only Tool 通道；
独立凭据窗口另行核验打开与保存。CSP 声明不能替代宿主内的实际交互检查。
[历史验收记录](../releases/2026-10-11-plugin-settings.md)记录此前的已安装入口结果；
[本轮服务设置验收](../releases/2026-10-13-codex-service-settings.md)记录候选版的本地验证范围。
