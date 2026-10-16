# Desktop 原生插件 PR 整合与验证

本次从 `main@1f172ac37612c4a5ebade4264a5976f8eab4add2` 建立独立任务分支，整理
Desktop 原生插件、安装等待及其必需的共享设置和准备实现。原开发分支保留。

## 范围与基线

Desktop 直接使用共享 Backend、Settings Application、环境安装器、凭据字段和 Tool 合同。
因此本 PR 同时包含 Codex 对这些共享合同的兼容改动、七套固定外部 MCP 环境及其锁文件；
不能只搬入 Desktop 目录。锁文件占主要新增行数，不代表新增同等规模的业务逻辑。
独立依赖审查确认动态启动器、SDK 根目录适配和打包入口均需保留。

Codex 旧 `settings` 入口声明维持 main；此前独立的 Codex 入口清理及日期化历史验收材料不包含在本 PR。
主工作区的其他改动没有搬入。产品版本、DSH 依赖、Desktop runtime lock 和模型路由均未变化。

## 原生验收的适用范围

[原版 Desktop 验收](DESKTOP_PREPARATION_WAIT_2026-10-16.md)绑定原候选 `734554d2`，
使用用户指定的 `deepseek-v4.1-flash`。同一聊天中，QCEC 准备调用等待 9.237 秒后返回 `ready`，
等待期间没有额外状态查询，随后执行成功。真实 Host 重启后复用环境，缺 Pasqal 凭据提示和
SimQN 明确禁用拒绝均保留。执行成功不构成科学 Acceptance。

PR 整理期间再次只读核对本机安装：六份配置完整摘要、25 项禁用选择、已安装代码与原版
Desktop 程序摘要均保持不变。PR 没有覆盖现有安装或迁移真实用户配置。
当前 PR 的源码、打包和 CI 检查另行绑定其实际提交；历史窗口验收不冒充新提交的现场重跑。

## 独立审查与修复

独立审查在 `3f3d4ed2` 找到三个 P2：旧原生 Provider 禁用未迁移、自定义受管 MCP 参数会丢失、
已经从列表移除的连接可能尚未完成回收。`8a356b3f` 修复全部三项；独立复核 33 项通过、
1 项 live 条件跳过，额外验证 JS 布尔禁用与未知表达式拒绝，未发现新的 P1/P2。
`22054cab` 再把显式 Skill、Tool、MCP 禁用与原生凭据保留加入三平台重复安装检查，独立审阅通过。

迁移检查在写入用户设置前完成。自定义 command、args、env、凭据引用、调用预算、删除的配置项
或无法识别的禁用条件不会被默认值取代；会保留原文件、指出对应 row，并要求先核对再升级。

## 干净环境与跨平台修复

PR 首轮 CI 在 `b4d75624` 暴露三个此前本地检查未覆盖的问题，`563d019e` 已修复：

- 并行测试前先从源码生成共享合同目录，消除对本地 `dist/chatgpt` 缓存的依赖。运行时仍只读已校验的目录，不会因此批量启动 MCP。
- Desktop 源码安装检查核对七个具体扩展依赖，包含新增的 capability Host Plugin。
- Windows 检出保持 Metriq 审计快照原始字节，防止 CRLF 转换使 MCP 在启动时校验失败；保留严格摘要检查。构建发现失败同时标出具体 Provider。

独立复核上述六文件差异，未发现 P1/P2；12 项针对性测试全部通过。真实 Git Windows
换行过滤已验证，Desktop 源码集成 3/3 通过且无跳过。移走旧共享合同产物后，完整检查再次通过。
Windows 实际安装包与两平台 Desktop 启动结果仍以 PR 当前提交的 CI 为准。

## 合并前的迁移恢复入口

GitHub 审查指出旧版 `qiskit_gym`、`quantum_hardware` Profile 迁入的单项 Tool 禁用
无法通过新的聚合 Tool 开关恢复。设置页现只在相关 Tool 下折叠显示已有的单独选择，
允许恢复或再次禁止；恢复记录在重开后仍可修改。跨 MCP 同名 Tool 沿用原有共同选择，
同时显示受影响的 MCP，不暗中改变策略范围。

新命令只接受固定合同与当前 Provider 同时声明、且已有单独选择的操作；账户管理、未知操作、
不匹配的 Tool 和旧设置版本均拒绝。父 Skill、Tool、MCP 的禁用不变，操作不安装或启动服务。
两组针对性测试 34 通过、1 项 live 条件跳过；Codex 回归 117 通过、7 项 live 条件跳过。
独立复核另补六项父级禁用与非法恢复检查，全部通过，未发现 P1/P2。

使用隔离配置和真实 Desktop 设置 API，在浏览器验证展开入口、恢复、刷新重开保留与再次禁止，
无浏览器错误；其他 Tool、Skill、MCP 限制保持不变。此验证未操作已安装的 Desktop 或用户配置，
也不替代前述原版窗口的历史验收。

## 本地检查

| 检查 | 实际结果与边界 |
| --- | --- |
| `npm run check` | 移走旧合同目录后重新构建并通过；根测试 622 通过、309 项依赖外部条件的测试跳过。其余合同、能力、语言、lint 与配置检查通过，详细分项见证据 JSON |
| Desktop 源码集成 | 固定上游源码构建后的 `tests/desktop-integration.test.mjs`，3/3 通过，无跳过；确认扩展解析、重复准备保留覆盖设置、上游 Desktop 文件未修改 |
| 真实 Qiskit | `OPENQUANTUM_DESKTOP_LIVE=1 node --test --test-name-pattern='real local preparation' tests/desktop-preparation.test.mjs`，1/1 通过；一次准备调用等待后，同一 Agent 执行两次、复用环境并验证禁用与回收 |
| 清洁源码打包 | `22054cab`、Node 24.14.1、`desktop:package -- --dir`；macOS arm64 包中 2,651 个文件摘要通过，`sourceDirty=false` |
| 隔离安装 | `desktop:package:smoke` 通过；重复安装保留模型路由、自建 Skill、Profile、三类显式禁用及原生凭据文件；从独立 cwd 加载成功 |
| 本机保护 | 六份现有配置、25 项 MCP 禁用和原版 Desktop 摘要再次核对不变；本轮 PR 整理未覆盖用户安装 |

完整命令、源码绑定、独立审查范围和本地原始日志摘要见[版本化证据](evidence/desktop-preparation-pr-2026-10-16.json)。
原生窗口验收之后的运行时差异是 Codex 旧入口保留、迁移守卫、连接关闭修复及安装检查脚本，
另增加跨平台快照保留、构建错误定位和检查入口修复；
不把原窗口证据写成这些新差异的现场重跑。新修复以回归、真实 SDK 与安装包检查验证。

GitHub 的 macOS/Windows 源码安装、三平台能力包、quality 和 container-smoke 共七项必过检查，
以 PR 页当前提交为准。本地 macOS 结果不替代其他平台或云端账户验收；PR 不包含合并或发布授权。
