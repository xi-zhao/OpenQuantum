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
- [PR #41](https://github.com/xi-zhao/OpenQuantum/pull/41) 的 Host 鉴权、固定源完整性、科学计算预算/摘要及课堂流程
  七项修复已进入主线（`a120d198`），并完整整合进 #38；真实 Host 与课堂 SDK 回归检查通过。

## Harness 0.2.1 迁移

- 目标已经确定为 Harness `0.2.1-rc.2` / 原版 DSH Desktop `2.0.18`，在
  [PR #38](https://github.com/xi-zhao/OpenQuantum/pull/38) 单独推进；适配记录见[升级记录](docs/releases/2026-10-23-harness-0.2.1.md)。
- 已修复旧模型 route 标识迁移及模型选择保留；容器检查等待健康状态和认证启动地址，生产 Host 集成测试覆盖成功与失败路径。
- 已实际构建固定的 Desktop 2.0.18，并从其源码补齐 59 条遗漏文案；8 种语言的 1278 条新增短语全部逐种重译和 AI 审读，
  不是人工母语认证。审校来源及内容摘要见 `runtime/openquantum/web-locales/translation-review.json`。
- 真实 Web 页面逐一验证八种语言切换、刷新保留、1440px/390px 布局及阿拉伯文 RTL；修复窄屏设置内容被侧栏挤窄的问题。
  本地工程、桌面安装验证及 PR 检查的具体证据见升级记录和 PR；跨平台 CI 不能替代原生 GUI 与真实模型验收。
- 旧的 `c/scalable-quantum-bridges` 迁移线及主工作区改动仅作历史参考，保留原样，不直接混入两个 PR。

## 下一唯一里程碑

#35 和 #41 已经合并；#38 基于这两项基线完成迁移修复，整合后本地检查通过，只有 PR 检查也全部通过才合并。
实际主线提交和合并状态以 GitHub 为准，公开发行仍为 `v0.8.4`。后续发布需另行授权，并补真实原生界面及外部模型验收；
本次工作不替换本机安装，也不把工程检查当成科学验收。

## 已知缺口

- 科学验收：建议优先把 2–3 个高频能力（如电路等价性、QEC 存储实验）推进到 L2/L3，而不是继续扩充 SDK 数量。
- 在线模型：当前公开发行没有新的外部模型 ready 证据；发布前需重跑目标 Provider 的文本生成与 Tool Calling 探针。
- 仓库体积：主页、小红书配图与实验 `.npz` 结果单个约 1–2 MB，未迁出。

## 动作边界

- 此页不授予模型请求、安装、硬件、发布、push 或删除权限；跨会话接手时携带仓库、分支、证据链接和原授权范围，不携带密钥。
