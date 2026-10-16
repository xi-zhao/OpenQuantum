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

## 本地检查

| 检查 | 实际结果与边界 |
| --- | --- |
| `npm run check` | 修复后的运行时代码通过；根测试 620 通过、309 项依赖外部条件的测试跳过。其余合同、能力、语言、lint 与配置检查通过，详细分项见证据 JSON |
| 真实 Qiskit | `OPENQUANTUM_DESKTOP_LIVE=1 node --test --test-name-pattern='real local preparation' tests/desktop-preparation.test.mjs`，1/1 通过；一次准备调用等待后，同一 Agent 执行两次、复用环境并验证禁用与回收 |
| 清洁源码打包 | `22054cab`、Node 24.14.1、`desktop:package -- --dir`；macOS arm64 包中 2,651 个文件摘要通过，`sourceDirty=false` |
| 隔离安装 | `desktop:package:smoke` 通过；重复安装保留模型路由、自建 Skill、Profile、三类显式禁用及原生凭据文件；从独立 cwd 加载成功 |
| 本机保护 | 六份现有配置、25 项 MCP 禁用和原版 Desktop 摘要再次核对不变；本轮 PR 整理未覆盖用户安装 |

完整命令、源码绑定、独立审查范围和本地原始日志摘要见[版本化证据](evidence/desktop-preparation-pr-2026-10-16.json)。
原生窗口验收之后的运行时差异是 Codex 旧入口保留、迁移守卫、连接关闭修复及安装检查脚本；
不把原窗口证据写成这些新差异的现场重跑。新修复以回归、真实 SDK 与安装包检查验证。

GitHub 的 macOS/Windows 源码安装、三平台能力包、quality 和 container-smoke 共七项必过检查，
以 PR 页当前提交为准。本地 macOS 结果不替代其他平台或云端账户验收；PR 不包含合并或发布授权。
