# Codex 能力插件与设置页：本地候选验收

日期：2026-10-11。任务分支 `c/openquantum-plugin-settings`，实施基线为远端 main 的
`16b621e674c58e206f54f4180ad304dd82bee06f`。本记录描述本地实现与测试，不代表已推送、发布、
安装到真实用户环境或通过最终科学 Acceptance。

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

## 仍未验证或存在的限制

- 用户真实 Codex 安装未更新；原生 GUI 的侧边栏入口、宿主 bridge 及打开本机凭据链接尚未实测。
  本地浏览器预览和原生 CLI 安装检查分别提供前端与宿主目录证据，不能合称真实桌面产品验收。
- 当前宿主默认控制 socket 不存在，也没有 MCP Apps 原生配置写桥。直接 TOML 写入有受保护备份、
  锁、revision 和替换前比较，但与其他 Codex 进程之间不是原子 CAS；最后替换仍存在竞态窗口。
  注释与排版会重新序列化。使用和恢复见[插件说明](../integrations/CODEX_PLUGIN.md)。
- 未验证 Windows/Linux 系统凭据库、真实远程 MCP 账户、HTTP OAuth 或分页目录。
- 未运行完整仓库 `npm run check`、外部模型或真实硬件；此修改不提高既有科学成熟度或 Acceptance 状态。

复跑入口：`plugin:test`、`plugin:build`、`plugin:probe`、`plugin:host-check`。
`plugin:host-check` 中的 `0.7.5-fixture` 仅用于验证缓存路径变化，不是发布版本。
