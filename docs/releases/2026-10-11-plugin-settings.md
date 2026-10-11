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
- 在当前任务聊天旁的 MCP 设置标签页读到版本 0.7.4、Skills / MCP 连接 / Tools 三个标签，
  Tools 页显示 71 项配置启用。切换到 MCP 连接页并刷新后，表单正常显示、全部按钮恢复启用，
  状态栏恢复为配置说明；已保存原生页面截图。此检查未改变用户的 Skill、Tool 或 MCP 配置。
- 页面检查中两次 DOM 自动化请求超时；随后截图与只读 DOM 检查成功，未发现页面仍在更新。
  这些工具超时未据此认定为页面故障。

## 仍未验证或存在的限制

- 用户真实 Codex 插件已更新，原生侧边页、开关写入、MCP 添加和握手已实测；完整产品验收暂未通过，
  凭据入口的自动打开路径仍待确认和修复错误处理。下方逐项记录真实界面与独立后端检查的边界。
- 当前宿主默认控制 socket 不存在，也没有 MCP Apps 原生配置写桥。直接 TOML 写入有受保护备份、
  锁、revision 和替换前比较，但与其他 Codex 进程之间不是原子 CAS；最后替换仍存在竞态窗口。
  注释与排版会重新序列化。使用和恢复见[插件说明](../integrations/CODEX_PLUGIN.md)。
- 未验证 Windows/Linux 系统凭据库、真实远程 MCP 账户、HTTP OAuth 或分页目录。
- 未运行完整仓库 `npm run check`、外部模型或真实硬件；此修改不提高既有科学成熟度或 Acceptance 状态。

复跑入口：`plugin:test`、`plugin:build`、`plugin:probe`、`plugin:host-check`。
`plugin:host-check` 中的 `0.7.5-fixture` 仅用于验证缓存路径变化，不是发布版本。

## 原生设置交互验收（2026-10-11）

对象为已安装的 0.7.4，源代码提交仍为 `b6c789dd`；使用当前任务聊天旁的 MCP 设置标签页。
此处“原生页面”均指该标签页，不指左侧“…”菜单里的全局应用。
**结论：核心设置流程部分通过，凭据窗口自动打开路径未通过验收，不能签为完整通过。**
本轮没有修改产品代码、推送或发布。

| 场景 | 结果与直接证据 |
| --- | --- |
| Skill 搜索、关闭、刷新、恢复 | 原生页面关闭 `quantum-guide-algorithms-search` 后，计数从 131 变为 130；刷新后仍关闭；`config.toml` 对应命名空间条目为 `enabled=false`，其余配置值相同；重新开启成功 |
| 内置 Tool 关闭与实际调用 | 原生页面关闭 `quantum_practices` 后，当前对话的真实 Tool 调用返回 `isError=true` 和“Tool 未启用”；重新开启后同一查询成功 |
| HTTP MCP 添加与默认状态 | 原生页面添加回环测试服务，连接默认关闭；没有 Token 时启用被拒绝 |
| Token 表单和系统凭据库 | 单独在 Chrome 打开设置页生成的凭据链接，测试值保存成功、输入清空、按钮禁用；原生页刷新后显示已配置；新后端进程仍能读取凭据状态；设置 JSON 不包含测试值 |
| 带认证的 HTTP 握手 | 原生页面“测试连接”成功，发现一个整数乘二 Tool；新 Tool 默认关闭 |
| MCP Tool 授权和执行 | 仅启用连接时目录不包含该 Tool、调用被拒绝；勾选 Tool 后新启动的已安装插件后端列出它并返回 `3 → 6`；关闭连接后目录和调用重新拒绝 |
| stdio MCP | 在原生页面切换字段、添加 Node fixture、真实握手并勾选连接与 Tool；新启动的已安装插件后端成功返回 `3 → 6` |
| 服务离线 | 停止本轮 HTTP fixture 后，原生页显示连接测试失败，全部按钮恢复可用 |
| 删除保护与清理 | 含已保存 Token 的连接不能直接移除；凭据表单移除测试 Token 后成功删除连接；stdio 关闭后删除；原生页最终为 0 个自定义连接 |
| 配置保留与恢复 | 多次从实际 0.7.4 安装 manifest 启动独立 MCP 后端，均读到已保存状态。结束时 Codex 配置字节恢复到验收前，原本不存在的插件设置文件恢复为不存在，Keychain 测试条目已删除 |

### 阻断与尚未覆盖

- 原生侧边页的“配置 Token”和后续“打开本机凭据窗口”均未在可访问的浏览器标签页中产生可核实的窗口。
  页面仍提示去凭据窗口保存。直接打开生成的链接能正常工作，因此这次绕行不能记为原生入口通过。
  Codex 宿主确认弹窗不可由当前自动化读取，是否被该弹窗拦住尚未确认。
- 已确认的代码缺口：`runtime/chatgpt/ui/app.mjs` 的 `openCredential` 只等待 `app.openLink`，没有检查
  返回的 `isError`。已安装 SDK 的合同明确允许宿主通过 `{ isError: true }` 拒绝开链，未必抛异常；
  当前实现会继续显示后续操作提示。应检查结果、显示失败原因并提供明确的人工打开方式，然后重做原生入口验收。
- Skill 的新聊天加载、完整 Codex 退出重启恢复、刚加入的自定义 Tool 在新聊天中的自动发现未在本轮验证。
  独立 MCP 后端重启证据不替代整个 Codex 重启；当前对话的内置 Tool 调用和独立后端的自定义 Tool 调用分别记录。
- Token 仅用于本机整数乘二 fixture，不是任何真实远程账户；未测试 OAuth 或真实第三方权限。

本机复查材料位于本任务 `implementation/` 工件目录：`native-acceptance-probes.jsonl`、
`native-acceptance-cleanup.json`，以及 `acceptance-skill-disabled.png`、`acceptance-tool-disabled.png`、
`acceptance-http-enabled.png`、`acceptance-token-saved.png`、`acceptance-token-removed.png`、
`acceptance-mcp-offline.png` 和最终恢复截图。真实凭据与用户配置快照不进入验收材料。

## 全局入口升级修复（0.7.5，2026-10-11）

用户指定的入口是左侧“…”→“OpenQuantum 设置”。此前已验收的聊天旁标签页不是这个入口。
本机 Codex 静态加载代码 `view-page` 将全局页面作为 app 生命周期保留，实例身份包含 Tool 名称和
resource URI；旧实现同时沿用 `open_openquantum` 与 `ui://openquantum/workbench.html`。
这确认了旧身份被复用的条件；尚未直接读取用户所见全局页面，不能据此断言唯一根因。

- 全局菜单改为专用 `open_openquantum_settings`，只宣告一个 OpenQuantum 全局项，标题仍为“OpenQuantum 设置”。
- 全局入口与插件设置入口共用当前设置 HTML；资源 URI 包含其 SHA-256，HTML 变化时资源身份随之变化。
- 旧 opener/resource 请求若由宿主转发，服务端仍返回当前设置；旧工作台不再被宣告为全局入口。
  这不承诺宿主能继续解析旧 Tool 名称的已保存导航地址，应使用当前菜单项。
- `plugin:probe` 必须实际发现唯一全局入口、调用它、读取其资源并核对 HTML 摘要和三个设置标签。
  检查结果仍保留 `hostPlacementVerified=false`，防止把协议检查写成界面验收。
- 相关测试 16 项中 15 项通过，Keychain 隔离条目测试本轮未启用而跳过；目标文件 ESLint 与 diff 检查通过。
  新增回归覆盖入口绑定、同内容重启 URI 稳定、HTML 更新后 URI 变化，以及旧协议请求兼容。
- 此段记录源码检查；安装后版本、实际全局显示与剩余限制另行记录。

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
