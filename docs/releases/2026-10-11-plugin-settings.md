# Codex 能力插件与设置页：本地候选验收

日期：2026-10-11。任务分支 `c/openquantum-plugin-settings`，实施基线为远端 main 的
`16b621e674c58e206f54f4180ad304dd82bee06f`。本记录分别描述候选验证与随后本机安装，
不代表已推送、公开发布或通过最终科学 Acceptance。

## 交付行为

- 以现有能力策略为源，生成 0.7.4 Codex 插件：131 个 Skill、71 个科学 Tool（133 项可适配能力中有 2 项只提供 Tool）。
- 共享原生科学定义提取至 `src/capabilities`，Harness 和 Codex 引用同一份实现。
- OpenQuantum 侧边入口只配置 Skill、内置工具连接、Tool、用户新增的 MCP 和 Token。
- Codex 原生项目、聊天、线程、模型和登录继续由宿主管理；插件不含第二个 Runtime 或量子学习通。
- Token 经专用回环窗口存入系统凭据库，配置只显示是否已保存。连接和新发现的工具默认关闭。
- 安装器保留 `openquantum@personal` 身份和设置，复用原安装位置约定，使用原生 CLI 注册插件。

## 实际验证

| 层级 | 结果与范围 |
| --- | --- |
| 插件后端与打包单元测试 | 14 项通过，包含真实 HTTP Bearer MCP fixture、目录与调用双重禁用、Token 回显拒绝、并发 revision、失效锁、连接实例绑定和路径边界 |
| 系统凭据库 | 上述测试含 macOS Keychain 的随机隔离条目存取与删除；没有真实 Token |
| 共享科学实现回归 | 15 项通过，涵盖基态事实与独立 observations、QMClaw、Metriq、资料检索与用户数值预算 |
| Harness 集成 | 本地模型协议夹具驱动资料检索，成功/失败返回与 Session 结果重读通过；没有外部模型调用 |
| 能力声明 | 163 项静态 conformance 通过；不把静态通过当作运行或科学验收 |
| 原生 Codex 安装与升级 | CLI `0.162.0-alpha.17.2`，隔离 HOME/CODEX_HOME 实际安装候选包，目录、Skill 关闭/重开、其他 Skill 保留，以及缓存路径升级后的关闭状态通过 |
| 打包后服务 | 独立安装 101 项传递 Node 依赖，MCP 启动、设置资源、真实资料检索与旧缓存 Tool 调用被禁用均通过 |
| 浏览器交互 | 同一设置前端的本机预览：搜索、Skill 开关、Tool 开关、新增 stdio MCP、真实握手、勾选连接内 Tool、Token 窗口，以及进程重启后配置保留通过；420 px 侧栏下字段切换和布局通过 |
| 独立审查 | 审查了权限、凭据、持久化、升级、命名与打包；发现问题已修复，最后一轮相关 14 项测试通过，未发现新的阻断 |

重要修复：原生 Skill selector 使用 `openquantum:<id>`，并遵循最后匹配项优先；外部 Tool 名称采用
无歧义组合摘要；凭据窗口绑定连接实例；远程目录不能把 Token 写入明文设置；自有锁能恢复已死进程。
输入与输出合同未退化为仅供展示的开关，服务调用入口同样执行禁用检查。

## 本机安装补充（2026-10-11）

用户反馈重启后仍是旧版，检查发现旧安装来源仍指向 0.7.3。随后使用本仓库安装器将
`openquantum@personal` 实际更新至 0.7.4；原生 `codex plugin list --marketplace personal --json`
读回 `installed=true`、`enabled=true`、`version=0.7.4`。

- 安装源为用户目录下 `.local/share/openquantum/desktop/0.7.4-034a81bc15f89a67/plugin`。
- 安装包 SHA-256 为 `034a81bc15f89a6785eacdc65bedb299449b2278dc61431aa2b3bc9d2f0f0206`，
  对应代码提交 `b6c789dd044277c71a8e66ca740654f6cae3d75d`。
- 安装器启动检查再次读到 131 个 Skill、71 个科学 Tool，资料检索与禁用检查通过。
- 当前对话的插件工具目录随后更新，真实 `quantum_practices` 只读调用成功。
- 在当前任务的原生 MCP Apps 侧边页读到版本 0.7.4、Skills / MCP 连接 / Tools 三个标签，
  Tools 页显示 71 项配置启用。切换到 MCP 连接页并刷新后，表单正常显示、全部按钮恢复启用，
  状态栏恢复为配置说明；已保存原生页面截图。此检查未改变用户的 Skill、Tool 或 MCP 配置。
- 页面检查中两次 DOM 自动化请求超时；随后截图与只读 DOM 检查成功，未发现页面仍在更新。
  这些工具超时未据此认定为页面故障。

## 仍未验证或存在的限制

- 用户真实 Codex 插件已更新，原生侧边页显示与只读刷新已实测。真实宿主内的 Skill / Tool 开关写入、
  添加 MCP 连接及打开本机凭据链接尚未实测；本地浏览器、隔离 CLI 与原生页面的证据分别记录，
  不把局部检查等同于完整桌面产品验收。
- 当前宿主默认控制 socket 不存在，也没有 MCP Apps 原生配置写桥。直接 TOML 写入有受保护备份、
  锁、revision 和替换前比较，但与其他 Codex 进程之间不是原子 CAS；最后替换仍存在竞态窗口。
  注释与排版会重新序列化。使用和恢复见[插件说明](../integrations/CODEX_PLUGIN.md)。
- 未验证 Windows/Linux 系统凭据库、真实远程 MCP 账户、HTTP OAuth 或分页目录。
- 未运行完整仓库 `npm run check`、外部模型或真实硬件；此修改不提高既有科学成熟度或 Acceptance 状态。

复跑入口：`plugin:test`、`plugin:build`、`plugin:probe`、`plugin:host-check`。
`plugin:host-check` 中的 `0.7.5-fixture` 仅用于验证缓存路径变化，不是发布版本。

## Desktop 入口清理（独立修改）

`scripts/lib/product-ui-policy.mjs` 在受控 Home patch 中停用上游已存在的账户、账户控制器、插件市场与
插件管理 UI row：`ui-settings-account`、`account-controller`、`ui-plugin-manager`、
`ui-settings-plugin-inventory`、`ui-settings-plugins`。DeepSeek 登录、余额和充值入口随账户界面停用。
内部 Cordis Plugin、Skill 和 MCP 装配仍保留；模型路由、聊天、项目与学习通继续使用已有实现。

策略读取固定上游 patch 并只输出存在的 row，兼容基线 Harness `0.1.5-rc.1` 的模块差异，
不修改 `node_modules`。主工作区 `0.2.0-rc.2` 固定源码的五个目标 row 已静态核对。

- 两项策略与真实 Cordis 组合测试通过；只关闭目标 UI row，底层注册模块仍在。
- 接入策略后 Harness 资料检索集成测试通过。Desktop 固定来源检查通过；本工作树尚未构建
  原生 Desktop，因此另外两项原生安装检查跳过。没有把配置测试记为真实桌面显示验收。
- 尚未替换用户 Desktop 安装或创建 Desktop 发行包；原生界面的隐藏效果仍需安装验收。
