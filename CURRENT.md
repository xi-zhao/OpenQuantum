# OpenQuantum 当前交接

核验日期：2026-10-23。此页只记录交接状态；架构以[文档总入口](docs/README.md)为准，执行事实以 Harness
Session event log 为准，科学状态以 Acceptance Report 为准。2026-09 至 2026-10-16 的日期化记录已迁至
[交接历史](docs/handoff/HISTORY.md)，内容未删改。接手时先重新查询 Git、PR 与 CI，不把本页当作实时状态。

## 当前基线

- 公开发行：Desktop [v0.8.4](https://github.com/xi-zhao/OpenQuantum/releases/tag/v0.8.4) 与 Codex
  [codex-v0.8.4](https://github.com/xi-zhao/OpenQuantum/releases/tag/codex-v0.8.4)；Harness 固定
  `0.1.5-rc.1`，原版 DSH Desktop `2.0.7`。
- 能力成熟度以 `.agents/capability-packages.yml` 为准；工程检查通过不表示所有能力均通过科学验收。
- [PR #39](https://github.com/xi-zhao/OpenQuantum/pull/39) 的拒绝降级与旧设置入口清理、
  [PR #40](https://github.com/xi-zhao/OpenQuantum/pull/40) 的临时凭据授权生命周期修复已经进入主线；没有发布新版本。
- [PR #35](https://github.com/xi-zhao/OpenQuantum/pull/35) 补齐根项目、Codex 插件和独立安装器的 MCP SDK `1.32.1`，
  更新 sanitize-html `2.18.1` 及受影响的传递依赖；发行依赖与根项目的一致性由打包测试约束。
  学习通生成库通过定向依赖覆盖复用项目已使用的 KaTeX `0.18.7`，避免保留旧版的信任选项漏洞；
  真实依赖解析、公式生成和原型继承失败路径均有回归测试；本地检查与 7 项 PR 检查通过，已合入主线（`38a059d6`）。

## 待完成的 Harness 0.2.1 迁移

- 目标已经确定为 Harness `0.2.1-rc.2` / 原版 DSH Desktop `2.0.18`，在
  [PR #38](https://github.com/xi-zhao/OpenQuantum/pull/38) 单独推进；适配记录见[升级记录](docs/releases/2026-10-23-harness-0.2.1.md)。
- 合并前须修复旧模型 route 标识迁移、同步真实 Desktop 的语言源快照、验证容器认证启动，
  并处理未经审校的八语言机器译文；这些不能由仅通过静态检查替代。
- 旧的 `c/scalable-quantum-bridges` 迁移线及主工作区改动仅作历史参考，保留原样，不直接混入两个 PR。

## 下一唯一里程碑

#35 安全基线已经合并；下一步让 #38 基于该基线通过本地与 PR 检查后合并。迁移完成前主线保持 `0.1.5-rc.1`；
合并不等于发布，不替换本机安装，也不替代真实原生界面或外部模型验收。

## 已知缺口

- 科学验收：建议优先把 2–3 个高频能力（如电路等价性、QEC 存储实验）推进到 L2/L3，而不是继续扩充 SDK 数量。
- 在线模型：当前公开发行没有新的外部模型 ready 证据；发布前需重跑目标 Provider 的文本生成与 Tool Calling 探针。
- 仓库体积：主页、小红书配图与实验 `.npz` 结果单个约 1–2 MB，未迁出。

## 动作边界

- 此页不授予模型请求、安装、硬件、发布、push 或删除权限；跨会话接手时携带仓库、分支、证据链接和原授权范围，不携带密钥。
