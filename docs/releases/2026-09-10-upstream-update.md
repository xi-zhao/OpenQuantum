# 2026-09-10 上游升级记录

本次更新 OpenQuantum 的 Web、Desktop、消息接入和量子学习通，并更新已核实有新版的量子组件。
所有运行入口仍复用 Harness；模型选择、Provider 地址、已有渠道和凭据配置保持原样。

## 固定版本

| 组件 | 本次固定点 |
| --- | --- |
| DeepSeek Harness | `0.1.5-rc.1`，直接依赖同族 |
| DSH Desktop | `5184a2ab7ab197e7405c1053feb324003409a142`，上游 `2.0.7` 源码构建，尚非正式发行包 |
| Desktop Electron | 上游锁定 `43.3.0`，原生模块按其 ABI 构建 |
| OpenMAIC / 量子学习通 | `29735f10d0081859ac3db1a50a0cc92f46436004`，保留原版界面、应用服务与品牌适配 |
| 量子学习通 Web 依赖 | Next.js `16.3.4`、React `19.3.0`、KaTeX `0.18.7`，提交冻结锁文件 |
| CC Connect | `1.5.1-beta.1` |
| TyxonQ | `1.3.0` |
| MQT QCEC | `3.10.0` |
| Quantum Hardware MCP | `55dd9a7bcee32a2a99654db6816dad705c0b6f62`，默认关闭 |
| 其他基础依赖 | AJV `8.20.0`、pnpm `11.26.0`、embedded-postgres `16.14.0-beta.17`、ESLint `9.39.5`、globals `17.12.0` |

Qiskit 两项核心 MCP、QPanda、QMClaw、FieldQKit、Stim、PyMatching 和 toqito 的固定点本轮保持原样。
源码和许可证来源见 [Third-party notices](../../THIRD_PARTY_NOTICES.md)。

## 兼容性修改

- 正式 ACP Profile 替代已移除的 `dsh-acp-demo`。复用共享模型路由与 Agent Preset，待 Adapter 注册后才接受首次握手。
  仅迁移 OpenQuantum 生成的精确旧启动命令；修改前保存私有备份，渠道和其他用户配置不重写。
- Harness 的会话配置、事件读取和 persona 配置使用新版公开接口。验证程序同步新版命名参数 RPC、浏览器认证和会话流读取。
- Desktop 改为独立固定源码构建，使用上游自带的 Harness 依赖和原生构建过程。OpenQuantum Host 扩展放在活动 Profile 自己的依赖目录中，满足新版 Desktop 的目录约束。
- Desktop 显式向课堂服务提供 Node.js 启动器，避免把 Electron 当作 Node；课堂进程使用独立进程组，退出和启动超时回收 Next.js 子进程。
- 保留量子学习通的原版首页、专业工作台、课堂、编辑器及 OpenQuantum 样式适配；上游新增的 Pro 切换、网络重定向等修复通过针对性回归。
- 修正升级检查中仍引用旧版接口、旧组件版本和遗漏学习能力的断言；科学验收算法和阈值没有调整。

## 已完成验证

- 依赖安装完成，根 npm 审计为 0 项已知漏洞（仅该依赖树，不覆盖所有外部源码环境）。
- 源码 ESLint、能力一致性审计和 Harness 组合配置检查通过。
- `test:p1`：主测试 174 通过、3 个显式真实数值探针默认跳过；合同 119、QGS 33、能力合同 59、benchmark 3 项通过，诊断能力评估通过。
- 显式执行真实数值探针后 3 项通过：Bell 态、位序、相位干涉、振幅阻尼；QCEC 的相同、不同及仅全局相位不同分类。
- 真实 Harness + 本机模型桩 + OpenMAIC SDK 完成建课、持久化及重复请求检查；跨会话 Tool 注册通过。
- CC Connect 真实 stdio 握手、首轮模型路由、原生与 MCP Tool 注册、管理服务及旧配置迁移检查通过。
- OpenMAIC 相关 71 项测试、TypeScript 检查通过。macOS 桌面实际打开，量子学习通首页及专业工作台可切换；修正 Node 启动路径后，实际退出验证确认 Next 主/子进程都结束且 3037 端口释放。
- 在旧 Home 副本中，12 份历史会话均经新版官方持久化接口完整读取，原始日志字节不改写；正式桌面侧栏显示原有 5 份未归档会话，并成功打开历史学习会话。
- 硬件 MCP 真实 `tools/list` 为 53 项；源码/许可证摘要验证、安装器及设置门控通过；35 项上游离线检查通过、2 项跳过。新增 Turso 分支另有本地桩回归。
- 新版认证流程下的 Host 品牌和 RPC 冒烟通过。macOS/Windows Desktop 构建及容器 CI 已更新，本机未执行 Windows 或 Docker。

本地原有未跟踪资源输出 `outputs/01a08166-quantum-learning-resources/library/library.js` 有一处非标准空白，
全目录 `npm run check` 会在 lint 阶段受其阻挡。该文件未改动；本轮使用 `npm run lint -- --ignore-pattern 'outputs/**'`
检查源码，再分别执行其余完整质量门。不能将此结果写成未经排除的 `npm run check` 通过。

本轮未重跑外部真实模型端点，未提交 QPU 作业，也未向消息平台发送消息。此前外部模型连接问题仍需独立验收；
本机桩模型和 SDK 测试不代表原版 UI 的在线 AI 建课、问答与编辑均已验收。

## 硬件接入的数据与费用边界

53 个 Tool 的参数、返回注解和副作用上界不变。新版本增加可选 Turso 查询和 SQLite 回退；只有同时配置
`TURSO_DATABASE_URL`、`TURSO_AUTH_TOKEN` 才使用新的云数据库读取面。独立快照采集命令可上传校准数据，
本集成没有调用该命令或设置这些凭据。真机提交与取消保持原有权限、默认关闭和费用边界。
详见[逐 Tool 审查](../integrations/OPT_IN_MCP_EFFECT_REVIEW.md)。

## 安装与恢复

```sh
npm ci
npm run desktop:setup
npm run learning:ui:setup
npm run cc-connect:setup
npm run desktop:verify-install
npm run desktop
```

两个源码安装器都固定完整 commit；量子学习通还验证已管理文件摘要，拒绝覆盖额外本地修改。
硬件源码安装器拒绝覆盖非当前固定点的目录。升级旧硬件目录时先停止服务，将其完整移到私有备份位置，
重新运行 `npm run mcp:quantum-hardware:setup`，再恢复原 `.env`、`devices.db` 及 SQLite sidecar；不要覆盖新版源码或来源标记。

本机保留 `.openquantum/upgrade-backup-20260910/`：旧依赖树、锁文件、Harness Home、CC Connect 配置、
学习数据和旧硬件目录。CC Connect 另有 `.pre-dsh-0.1.5` 配置备份。恢复时先停止当前 Web/Desktop，保留升级后
新增数据，再成套恢复旧代码、锁文件、依赖和 Home；不要让旧版 Runtime 写入新版状态。此次未执行恢复演练。
