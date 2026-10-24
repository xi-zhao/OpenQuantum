# OpenQuantum 当前交接

核验日期：2026-10-24。此页只记录交接状态；架构以[文档总入口](docs/README.md)为准，执行事实以 Harness
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

- Harness `0.2.1-rc.2` / 原版 DSH Desktop `2.0.18` 已随
  [PR #38](https://github.com/xi-zhao/OpenQuantum/pull/38) 合入主线（`cb765c3c`）；适配记录见[升级记录](docs/releases/2026-10-23-harness-0.2.1.md)。
- 已修复旧模型 route 标识迁移及模型选择保留；容器检查等待健康状态和认证启动地址，生产 Host 集成测试覆盖成功与失败路径。
- 已实际构建固定的 Desktop 2.0.18，并从其源码补齐 59 条遗漏文案；8 种语言的 1278 条新增短语全部逐种重译和 AI 审读，
  不是人工母语认证。审校来源及内容摘要见 `runtime/openquantum/web-locales/translation-review.json`。
- 真实 Web 页面逐一验证八种语言切换、刷新保留、1440px/390px 布局及阿拉伯文 RTL；修复窄屏设置内容被侧栏挤窄的问题。
  本地工程、桌面安装验证及 PR 检查的具体证据见升级记录和 PR；跨平台 CI 不能替代原生 GUI 与真实模型验收。
- 旧的 `c/scalable-quantum-bridges` 迁移线及主工作区改动仅作历史参考，保留原样，不直接混入两个 PR。

## 初次基线恢复（后续已纠正）

- 最初误将第三方 DSH Desktop `2.0.7` 作为恢复目标；在独立任务分支 `c/desktop-2.0.7-baseline`
  恢复配套 Harness `0.1.5-rc.1`，不把 #38 整体反向合并，不撤销 #35、#39、#40、#41 的无关修复。
- 保留原有 `settings.yaml`、自定义模型与凭据引用；拒绝在旧版启动前改写 V4/V5 会话和新版 profile 设置。
  新旧 Home 不做有损转换；现有新版数据与已安装客户端保持原样。
- 所有八语言译文与 #38 的审校摘要保留；活动文案目录恢复到匹配的旧版，只装载旧版实际拥有的界面模块。
- 实施与验证证据见 [恢复记录](docs/releases/2026-10-24-desktop-2.0.7.md)。用户已授权本地检查、推送、PR 与检查通过后合并；
  发布与替换本机安装不在本轮范围内，主线状态仍以 GitHub 为准。
- 简洁个人界面、源码构建、桌面/手机界面检查、真实 Magpie 文件读取与重启恢复完成。主测试 1017 项，704 通过、313 条件跳过。
  根项目、两个 Codex 发行入口与源码桌面实际生产依赖均无匹配的已知安全通告；已安装原版应用未被更新。

## 独立安装包 0.8.5

- #43 已合并（`1658aa25`），但其 `2.0.7` 不是用户最早使用的版本。用户已明确纠正为 **DSH Desktop `2.0.0` / Harness `0.1.0-rc.6`**，固定上游提交 `ee1235e1dd1675bbd6c52cfbe3f27b27bcfcfa81`。
- 本任务分支 `c/desktop-standalone-release` 恢复正确基线；按用户选择，桌面暂保留原生中英文，不为十语言引入新版接口。所有 README 和已有翻译保留。
- 使用原版 HTTP 服务、Session V3 和生命周期；独立 Host 扩展保留本机访问认证，不增加登录页。2.0.7 的旧测试结果不能替代本次验证。
- 用户已授权构建和发布 OpenQuantum 安装包，并在备份后替换本机版本。本次只交付 macOS Apple Silicon 独立 DMG；
  产品源码版本为 `0.8.5`，Codex 公开 Release 仍为 `codex-v0.8.4`。
- 独立应用复用固定上游源码与正式扩展，自带 Node/uv、能力代码和生产依赖；不修改上游实现。
  构建、发布与本机安装证据分别核验，详见 [0.8.5 发布记录](docs/releases/v0.8.5.md)。
- 发布附件采用 ad-hoc 本地签名，没有 Apple Developer ID 分发签名或公证。主线合并、Release 与本机安装状态以实时证据为准。

## 插件优先维护

- 共享 Skills、Tools、MCP Server 与科学合同是核心，DSH/Codex 适配并列，Desktop 是品牌化的交付形态。
- Codex 构建已改为读取共享能力目录；不再调用 Desktop 设置服务。连接地址、凭据和启停状态由各宿主维护。
- 共享执行入口增加静态依赖检查；旧 DSH 品牌适配集中维护。边界与贡献路径见[模块地图](docs/architecture/MODULES.md)。
- 本地完整检查通过：主测试 1024 项，710 通过、314 条件跳过、0 失败；其余合同与能力套件均无失败。
  合并、Release 和本机安装分别以 GitHub 与最终发布验证附件为准，不由本地检查推定。

## 已知缺口

- 科学验收：建议优先把 2–3 个高频能力（如电路等价性、QEC 存储实验）推进到 L2/L3，而不是继续扩充 SDK 数量。
- 在线模型：当前公开发行没有新的外部模型 ready 证据；发布前需重跑目标 Provider 的文本生成与 Tool Calling 探针。
- 仓库体积：主页、小红书配图与实验 `.npz` 结果单个约 1–2 MB，未迁出。

## 动作边界

- 此页不授予模型请求、安装、硬件、发布、push 或删除权限；跨会话接手时携带仓库、分支、证据链接和原授权范围，不携带密钥。
