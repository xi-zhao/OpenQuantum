# Changelog

OpenQuantum 的重要变更记录在此。格式遵循 [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)，
版本遵循 [Semantic Versioning](https://semver.org/spec/v2.0.0.html)。预发布阶段的合同仍可能发生明确记录的 breaking change。

## [Unreleased]

### Added

- 新增 [MWPF 超图译码](.agents/skills/mwpf-decoding/SKILL.md)、[PPVM 丢失/泄漏模拟](docs/integrations/PPVM.md)、[tropidist 纠错距离界](.agents/skills/tropidist-distance/SKILL.md)与 [ST-GRAPE 多误差源鲁棒脉冲控制](.agents/skills/stgrape-control/SKILL.md)的固定原生 SDK 环境、示例与独立数值检查；源码能力目录现为 193 个内置 Skill、91 个 MCP 连接与 121 个 SDK 环境（均保持 `scientificValidation=not_evaluated`）。
- 升级 [PyZX 0.10.8](docs/releases/2026-11-10-pyzx-production-upgrade.md)、[IBM Runtime RZZ 兼容补丁](docs/releases/2026-11-01-qiskit-runtime.md)、Braket 受控门本地噪声核验与 `ws 8.23.0` 传输依赖。
- 新增 `tests/workflow-gates.test.mjs` 守卫数值 CI 退出码传播，并收敛 SDK 验证工作流与项目文档基线。

### Changed

- 重构主页与 `README.md` 首屏结构，新增项目宣传横幅与演示资料。

### Fixed

- 修复设置页 SDK 版本展示与项目实际固定版本不一致的问题，按各环境选定的发行包报告版本。

## [0.8.11] - 2026-11-09

### Added

- 新增 [SlowQuant 分子响应](docs/integrations/SLOWQUANT.md)、[TNQS 平面张量网络](docs/integrations/TNQS.md)与 [RcmpsCore 连续场论](docs/integrations/RCMPS.md)的原生 SDK 工作流、固定环境及独立数值参考。
- 整理 [44 组状态协议清单](docs/architecture/STATE_LIFECYCLES.md)，明确异步准备、取消、关闭与恢复归属。

### Changed

- Desktop 与 Codex 共用 `src/lib/tool-backend.mjs` 有界 Tool 执行、参数校验、并发限制、权限复查与关闭排空协议，各宿主保留独立注册与执行循环。完整说明见 [v0.8.11](docs/releases/v0.8.11.md) 与 [codex-v0.8.11](docs/releases/codex-v0.8.11.md)。

### Fixed

- 修复计算服务关闭时的在途调用排空与并发关闭共享 Promise，以及设置页环境准备进度的轮询生命周期。

## [0.8.10] - 2026-10-30

### Changed

- 同步优化 Desktop 与 Codex 共享设置页布局：合并品牌与「首页 / Skills / MCP」导航行，收拢重复标题与页尾，显著扩大目录和详情可视高度。完整说明见 [v0.8.10](docs/releases/v0.8.10.md) 与 [codex-v0.8.10](docs/releases/codex-v0.8.10.md)。

### Fixed

- 修复筛选区滚轮不可滚、键盘翻页、窄窗口返回位置丢失及隐藏表单标签引发的页面底部空白溢出。

## [0.8.9] - 2026-10-30

### Changed

- Desktop 与 Codex 统一发布 `0.8.9`，完整适配设置页工作区，保存后回读核对并保留未确认草稿。完整说明见 [v0.8.9](docs/releases/v0.8.9.md) 与 [codex-v0.8.9](docs/releases/codex-v0.8.9.md)。
- Web 与 Desktop 共用 Home 采用一致的文件所有权摘要记录，升级纳入同一可恢复安装事务并在中断后先恢复再加载。

### Fixed

- 拒绝旧 Harness Web HTTP MCP 注册 URL 中内嵌凭据、查询参数与片段，外部服务调用按本次实际读取凭据脱敏。

## [0.8.8] - 2026-10-26

### Changed

- Mac Apple Silicon 独立桌面安装包采用白底圆角应用图标，Dock、独立应用与品牌启动器图标统一；Web 与菜单栏保留透明标志。见 [v0.8.8](docs/releases/v0.8.8.md)。

## [0.8.7] - 2026-10-25

### Changed

- 独立桌面菜单栏精简为 OpenQuantum 图标与「打开 / 退出」两项（跟随中英文设置），固定 compatibility 窗口样式并移除 DSH Terminal / Advanced Mode 菜单入口。见 [v0.8.7](docs/releases/v0.8.7.md)。

## [0.8.6] - 2026-10-25

### Changed

- 简洁桌面「设置 → OpenQuantum」统一采用「首页 / Skills / MCP」布局，与 Codex 共用展示目录与受控设置逻辑，各宿主分别保存配置与凭据。见 [v0.8.6](docs/releases/v0.8.6.md)。

## [0.8.5] - 2026-10-25

### Changed

- 按“共享插件 → Harness 适配 → 品牌/UI”收拢架构边界；独立 macOS Apple Silicon 桌面恢复固定基线 DSH Desktop `2.0.0` / Harness `0.1.0-rc.6`（独立数据目录、捆绑 Node/uv 与锁定依赖，原生中英文）。见 [v0.8.5](docs/releases/v0.8.5.md)。

## [0.8.4] - 2026-10-14

### Added

- 新增 26 个原生 SDK/源码入口，SDK 环境目录增至 111 项、Desktop 源 Skill 增至 183 项；新增 Chromobius / MQT Bench v2（保留 v1）。
- 原 TensorCircuit 入口迁移至 `tensorcircuit-ng==1.10.0`。见 [v0.8.4](docs/releases/v0.8.4.md) 与 [codex-v0.8.4](docs/releases/codex-v0.8.4.md)。

### Changed

- 统一 Desktop 与 Codex 量子组件设置的运行状态、MCP、Skills、服务密钥视图与目录内容。

## [0.8.3] - 2026-10-13

### Changed

- Tools、MCP、Skills 按 8 个用途分类并支持搜索和启用状态筛选；Mac 安装器补充带 OpenQuantum 图标的 `OpenQuantum.app`。见 [v0.8.3](docs/releases/v0.8.3.md) 与 [codex-v0.8.3](docs/releases/codex-v0.8.3.md)。

## [0.8.2] - 2026-10-13

### Added

- 新增 `pasqal-experiments` 中性原子实验工作流（复用 Pulser 1.9.1 与 `pasqal-cloud==0.24.0`），校验执行源码与环境锁摘要。见 [v0.8.2](docs/releases/v0.8.2.md) 与 [codex-v0.8.2](docs/releases/codex-v0.8.2.md)。

### Changed

- 简化 Desktop 能力包初始界面并隐藏未配置示例 Gateway，修复 Profile 依赖隔离与重装配置保留。

## [0.8.1] - 2026-10-12

### Changed

- Desktop、Codex 插件及安装器统一使用 `0.8.1`；同步发行的两个渠道标签指向同一提交，已有发布记录保留。范围见[统一发行说明](docs/releases/v0.8.1.md)。
- 当前安装指南、下载入口和十种语言 README 同步统一版本。SDK 能力、固定依赖和科学验收边界不变。

### Added

- `npm run release:version -- X.Y.Z` 一次更新三个包和三份锁文件；`npm run release:check`、CI 及打包入口检查产品版本一致性。

## [0.7.0] - 2026-10-12

### Added

- 85 个固定 SDK/源码环境的原生公开 API 导航、显式依赖准备和自定义程序路径；便捷 Tool 的预设案例不再定义库的使用范围。
- 13+30+24+18 项逐库工程记录及可离线核对的原始证据归档。检查范围按库记录，不代表穷尽 API、可选后端或跨平台验证；未使用真实科研任务验收。
- 独立 Codex 插件发行入口；同步版本 [0.8.0](docs/releases/codex-v0.8.0.md)提供 133 个 Skill、71 个科学 Tool 和 85 个 SDK 环境入口。

### Changed

- 默认 Harness Preset 将大结果完整保存为 JSON，再返回摘要和文件引用；小结果与科学合同保持不变。
- README 十种语言同步原生 SDK 使用和升级说明；当前源码目录为 156 个 Skill、91 个 MCP 连接和 5 个原生量子 Tool。
- Desktop 继续提供三平台未签名测试安装包；依赖、账户和许可按任务显式准备，科学状态仍为 `not_evaluated`。完整范围见 [v0.7.0 发布说明](docs/releases/v0.7.0.md)。

### Fixed

- 补齐 Flow-VQE 完整源码、CQLib QML、Ocean 元包，以及 QPanda、Qcover、SpinQit、VQNet 的导入依赖与兼容处理。
- 补充 QCEC 的 Qiskit extra、TensorCircuit 的优化/转换依赖，并修复 QAT 共享 console wrapper 的安装校验误报。

## [0.6.0] - 2026-09-29

### Added

- 三批共 52 个 SDK 能力包与 60 个 Tool，覆盖国内外公司和科研机构的可微分电路、编译、仿真、化学、资源估算、光子、网络、控制与云接口；另含 QuEra Bloqade Analog 本地动力学。
- 66 份 quantum-skills 指南的原生适配和 49 项可执行示例；qBraid、Clifft 与 QDMI 互操作，以及 QCut、Compact、OpenQARP、cqlib-qml 和 FlagQuantum 的对应能力。

### Changed

- README 十种语言同步任务入口、SDK 使用范围和升级说明；计算环境按所选能力显式准备，账户与鉴权由用户配置。
- 当前静态目录包含 154 个 Skill、90 个 MCP 连接和 281 个可配置 Tool 名称；实际可用集合受平台、环境、连接与工具范围影响。
- 本次发布沿用固定 Harness / Desktop 版本和三平台未签名测试安装包流程。完整范围见 [v0.6.0 发布说明](docs/releases/v0.6.0.md)。

### Fixed

- 资料检索 Harness 测试按请求中的 Tool 结果推进；会话命名等辅助模型请求不会再提前消耗测试用例。

## [0.5.1] - 2026-09-20

### Added

- Mac Apple Silicon / Intel 和 Windows x64 桌面安装包，内置固定 Node.js、uv / uvx；用户数据独立保存。
- 安装、真实 Host / renderer 启动、自定义配置保留、本地 Tool 与版本更新清单验证。安装文件为未签名测试构建，见 [v0.5.1 发布说明](docs/releases/v0.5.1.md)。

## [0.5.0] - 2026-09-20

版本更新提醒与以下早期主线能力已随此版本交付；不将旧的 Unreleased 记录计作 v0.6.0 新增功能。

### Added

- 面向量子公司和科研团队的 Harness 原生 Skill / Tool Provider / Fork 二次开发路径。
- `quantum-ground-state` 原生 Skill、确定性 Validator 与 stdio MCP 科学计算纵切。
- Skill、Tool、MCP Server、External API、Validator 与 Composition 的权威扩展对象模型。
- 设置中心 Runtime Readiness 首页：被动展示当前 Model Route、Skill Registry 与 Tool Registry 证据，
  并把未检查的 MCP 连接、模型 Endpoint 和下游服务可达性明确保留为 `not_checked`。

### Changed

- 开源贡献、安全披露、Issue 和 CI 流程从原网站克隆模板迁移为 OpenQuantum 项目流程。
- 产品架构收缩为 DeepSeek Harness 量子科研发行版，不再建设独立 Runtime、插件市场或安装协议。
- 默认 Web 界面切换为 DeepSeek Harness 原生 Web UI；OpenQuantum 只通过官方扩展点注入品牌与量子能力。
- 删除旧网站模板、平行 Next.js UI、浏览器 BFF 和 Session adapter，只保留 Harness 原生 Web 产品链。
- Capability policy 与 conformance report 升级到 `1.1`：`mcpServers` 显式列出 MCP-exposed Tool、
  `nativeTools` 显式列出原生 Tool Plugin，两者都必须声明 activation、合同检查入口和最大副作用；本地
  MCP Server 合同测试直接读取 policy，报告作用域明确为 `static-declaration`；旧 `servers` / `runners`
  形状不再接受，runner 不能独立充当 Agent 执行入口。

## [0.4.0] - 2026-08-14

### Added

- DeepSeek Harness UI Runtime、双 WebSocket 事件流、重连重基线和 approval/question 交互。
- Capability、Result Package、Acceptance、Score、Reproduction 与 Result Commit v1.1 可信合同。
- 平台诊断 Reference Capability 与四层架构验收。
- OpenAI-compatible 模型路由和本地开发栈。

### Changed

- 产品从网站克隆模板重构为 OpenQuantum 开源科研 Agent 平台。
- 科学状态改由 central Acceptance Builder 基于版本化 Acceptance Profile、Validator observations 与 provenance 推导，不再由模型或 UI 自报。

### Security

- 浏览器只能通过同源白名单 BFF/事件网关访问 Harness。
- 服务端凭证不进入浏览器配置；Result Contract 增加路径、digest、秘密与伪造检查。

更早的实验性实现仍可在 Git 历史中审计，但不属于当前 OpenQuantum 产品线。
