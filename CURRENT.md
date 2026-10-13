# OpenQuantum 当前交接

量子依赖核验日期：2026-09-22；平台升级记录日期：2026-09-10；原模型验收交接记录日期：2026-09-05。此页只记录工作交接；架构以[文档总入口](docs/README.md)为准，执行事实以 Harness Session event log 为准，科学状态以 Acceptance Report 为准。

## 原生 SDK 生态扩展（2026-10-14，源码候选）

- 从本轮清单剔除旧运行栈的 QuCumber，增加 26 个原生 SDK/源码入口；既有 TensorCircuit 迁移到 TensorCircuit-NG，MQT Bench 单独增加 v2 的 21 例。
- SDK 环境目录现为 111 项，源码 Skill 为 183 项；复用宿主代码工具，不增加科学 Tool 或 MCP 连接数量。
- 版本、许可、源码与构建条件见[生态扩展记录](docs/integrations/SDK_ECOSYSTEM_2026-10-14.md)。26/26 个新增入口的实际 API 检查、全仓检查和打包回归通过，独立审查无未解决 P1/P2；[持久证据](docs/integrations/evidence/sdk-ecosystem-2026-10-14.json)保留版本、结果和摘要，科学状态仍为 `not_evaluated`。
- 在 `origin/main@ac00ceba` 的隔离任务分支实施；本轮尚未推送、合并、安装为用户插件或发布。

## Codex 与 Desktop 量子组件内容一致（2026-10-13，本地）

- 统一运行状态、MCP、Skills、服务密钥四个标签与共享卡片。Codex 目录完整展示 Desktop 的 157 个 Skill、91 个 MCP；未适配项目保留说明，操作不误启用。
- 服务与 Tool 控制仍有效，当前状态按各宿主读取，不复制用户配置或凭据。源码提交为 `af6f66fe`、`5381b0bc`、`00571050`，已推送到任务分支 `c/codex-settings-complete`；集成状态以 [PR #21](https://github.com/xi-zhao/OpenQuantum/pull/21) 为准，尚未发布。
- 61 项相关回归及 10 项受影响入口/语言检查通过；浏览器实测覆盖开关、筛选、加密保存、连续输入和窄侧栏。用户随后确认原生侧边页“现在正常了”，显示验收项已关闭；该确认不扩展为原生密钥保存验收。详情见[内容一致验证记录](docs/releases/2026-10-13-component-parity.md)。

## Codex 服务设置候选（2026-10-13，本地已安装、未发布）

- 按用户截图复用 Desktop 完整“服务密钥”卡片，默认显示双列布局、逐项用途和卡内保存；23 个独立字段中，8 个已接入服务的 17 项可配置。
- 相关回归、隔离 Keyring 保存与重建读回、浏览器交互和打包 probe 通过，独立审查无阻断项。范围及限制见[候选验收](docs/releases/2026-10-13-codex-service-settings.md)。
- 已按用户授权将本机 `openquantum@personal` 更新到 `fb06c7f8` 的干净构建；插件启用、缓存和实际 HTML 与包一致，其他插件未变。修复跨 MCP 进程读取资源失败；卡片改用 JWE 密文经 app-only Tool 通道保存，适配生产宿主的网络限制。
- 用户已在最终安装后确认原生侧边入口显示服务密钥卡片。46/46 插件回归、隔离浏览器保存及 Keyring 检查通过；原生内嵌保存和宿主重启后的保存尚未验收，不能以本地预览代替。
- 本候选与后续内容一致改动已一并推送到任务分支 `c/codex-settings-complete`，集成状态见 [PR #21](https://github.com/xi-zhao/OpenQuantum/pull/21)；尚未发布，现有 DSH Desktop 安装未变，未使用真实账户、厂商 API、外部模型或 QPU。

## OpenQuantum 0.8.3 发行入口（2026-10-13）

- Desktop 能力包、Codex 插件及安装器统一为 `0.8.3`；本轮只更新发行版本与说明，依赖版本不变。
- [Desktop 说明](docs/releases/v0.8.3.md)包含设置用途分类、搜索筛选和品牌启动图标；[Codex 说明](docs/releases/codex-v0.8.3.md)包含相同的设置分类。功能来源为已合并的 PR #17、#18。
- `v0.8.3` 与 `codex-v0.8.3` 使用同一已审阅提交；正式源码、CI、附件摘要及实际发布状态以两个 Release 和各自的 `release-validation.json` 为准。Desktop Release 保留 `latest` 与稳定更新清单。
- 本机 Finder 图标、Desktop 启动、原生重启和设置分类已有实际验证；164 个既有配置及 Skill 文件摘要未变。Dock 与 Windows 任务栏仍未完成视觉核验；跨平台工程检查不替代原生视觉验收。
- 原版 DSH Desktop 保持 `2.0.7`，Harness 保持 `0.1.5-rc.1`；发布不替换本机已有安装，不使用真实科研任务验收，`scientificValidation=not_evaluated`。

## OpenQuantum 0.8.2 双渠道发行与分支保护（2026-10-13）

- `main` 已启用 GitHub 分支保护：必须经 PR、当前 7 项 GitHub Actions 检查必过、包含最新目标基线、管理员同样受限，禁止强推和删除。不额外要求固定数量的人工批准。
- [PR #14](https://github.com/xi-zhao/OpenQuantum/pull/14) 已在独立审查与 7/7 检查通过后合并为 `3935b45a`，移除能力包工作流的路径过滤，确保文档 PR 也能产生全部必过检查。
- Desktop 能力包与 Codex 插件统一为 `0.8.2`，两个发布标签固定到已审阅的 `64004f9fcef58afa2a8a05d965eebcaa6c9477ab`。后续文档更正不改变发行源码或附件；实际发布状态和逐包验证以 Release 为准。
- [Desktop 说明](docs/releases/v0.8.2.md)提供三平台能力包安装方式；[Codex 说明](docs/releases/codex-v0.8.2.md)包含 134 个 Skill、71 个科学 Tool。原版 DSH Desktop 保持 `2.0.7`，Harness 保持 `0.1.5-rc.1`。
- 双渠道公开后，GitHub `latest` 指向带稳定更新清单的 `v0.8.2`；`codex-v0.8.2` 不占用 Desktop 更新入口。旧私有 DMG/EXE 不再作为安装入口，Git 标签、源码历史和旧 Codex Release 保留。
- 不使用真实科研任务验收，`scientificValidation=not_evaluated`；工程结果与原生界面验收范围见两个 Release 的验证记录。

## Pasqal 实验工作流与 Cloud SDK（2026-10-13，已合并 main）

- `pasqal-experiments` 接入从实验想法到结果分析的七阶段流程；复用 `pulser-dynamics` 的 Pulser 1.9.1 环境，增加固定版 `pasqal-cloud==0.24.0` 完整原生 API，不新增 Runtime 或云 MCP。
- 云辅助器支持设备快照、可审阅计划、批次创建/追加/关闭/取消、单次 HTTP 提交、未知结果恢复和原始数据采集；保留请求索引、失效点与科学未验状态。
- 初次真实 Pulser 数值、Cloud SDK 传输夹具、Harness 会话执行/读回、Codex 包资源与离线流程验证通过；后续 GitHub 审查指出代码依赖与执行环境绑定缺口。范围和原始工件见 [Pasqal 集成记录](docs/integrations/PASQAL.md)。
- 2026-10-13 在独立分支整合 `main@45461051`，保留 Desktop 交接记录；补齐 Skill 目录与数量断言，修复单文件代码绑定和计划环境核对。完整 `npm run check`、28 项 Python 回归、4 项 Pasqal/Harness 检查通过；独立审查无未解决 P1/P2，另行复跑 6 项关键回归通过。见[本轮修复验证](docs/integrations/evidence/pasqal-review-2026-10-13.json)。本轮验收时修复尚未推送，GitHub 检查需更新分支后重跑。
- [PR #13](https://github.com/xi-zhao/OpenQuantum/pull/13) 已合并到 `main@046ac876`；合并提交的 [CI](https://github.com/xi-zhao/OpenQuantum/actions/runs/38324720753) 与 [能力包检查](https://github.com/xi-zhao/OpenQuantum/actions/runs/38324720702) 共 7/7 通过。0.8.2 的 Codex 发行内容与安装方式见[版本说明](docs/releases/codex-v0.8.2.md)，最终发布提交和附件以 Release 为准。未调用真实 Cloud/QPU 或外部模型，`scientificValidation=not_evaluated`。

## 原版第三方 Desktop（2026-10-12）

- 后续桌面交付改为原版 `anywhere-labs/dsh-desktop` 客户端 + OpenQuantum 能力包；兼容基线仍为 Desktop `2.0.7` / Harness `0.1.5-rc.1`。
- 调整最初在本机 `0.8.1` 内容中验证，正式双渠道发行使用上节的 `0.8.2`。第三方客户端保留自己的版本、原生界面与更新渠道；此前私有 DMG/EXE 不再作为安装入口，Git 标签与源码保留。
- 保留品牌、量子组件、量子学习通与更新入口；移除 Desktop 中未配置的示例 Gateway 与默认模型，模型由用户在原生设置中添加。隐藏内测声明，简化两个量子模式的简介和设置页终端标签。
- 空模型目录提示用户去原生设置添加模型；量子组件使用 Tools、MCP、Skills 名称，中文说明按用途和操作组织，未配置、未启动会话与读取失败分别显示，原始状态保留在折叠诊断中。
- Desktop 扩展通过 `desktop` Profile bundle 启用，与依赖保持同一作用域；其他原生 Profile 可独立使用，用户 Profile 配置保持上游覆盖顺序。
- 安装与迁移边界、包名和工程检查见[桌面说明](docs/DESKTOP_INSTALLERS.md)。本地实施和验证不等于已合并或已发布；实际源码与附件以 main / Release 为准。
- 新版 V4 Home 保留，禁止旧运行时降级写入；本轮仍不使用真实科研任务验收。

## 统一产品版本（2026-10-12）

- Desktop、Codex 插件和安装器从 `0.8.1` 起共用一个产品版本；根 `package.json` 为唯一来源，`npm run release:version -- X.Y.Z` 同时更新三个包及其锁文件。CI 和打包检查拒绝版本漂移。
- 同步发行的 `vX.Y.Z` 与 `codex-vX.Y.Z` 标签指向同一提交，前缀只区分渠道；Desktop 保留 `latest` 与稳定更新清单。此前独立编号的已发布记录不改写。
- 范围见[统一发行说明](docs/releases/v0.8.1.md)；实际发布与逐包验证以 [Desktop Release](https://github.com/xi-zhao/OpenQuantum/releases/tag/v0.8.1) 和 [Codex Release](https://github.com/xi-zhao/OpenQuantum/releases/tag/codex-v0.8.1) 为准。
- 本轮只统一版本管理与发行，沿用既有 SDK 接入和科学边界；仍不使用真实科研任务验收，`scientificValidation=not_evaluated`。

## 完整 SDK 接入发行（2026-10-12）

- Desktop / 源码版本 `0.7.0`，Codex 插件及安装器版本 `0.8.0`；共享 85 个原生 SDK 环境入口，Codex 包含 133 个 Skill、71 个科学 Tool。完整接入不表示穷尽上游 API 或跨平台科学验证。
- 发行范围与安装方式见 [Desktop 说明](docs/releases/v0.7.0.md)和 [Codex 说明](docs/releases/codex-v0.8.0.md)。实际发布状态、附件及逐包验证以 [v0.7.0 Release](https://github.com/xi-zhao/OpenQuantum/releases/tag/v0.7.0)和 [codex-v0.8.0 Release](https://github.com/xi-zhao/OpenQuantum/releases/tag/codex-v0.8.0)为准。
- Desktop 发布要求当前提交的 CI、三平台安装包验证、附件摘要与更新清单核对；Codex 发布要求干净提交构建、隔离安装和原生宿主检查。Desktop 安装包仍为未签名测试构建，Codex 保持独立版本通道。
- 按用户要求不使用真实科研任务验收，`scientificValidation=not_evaluated`。本次发布不更新运行中的安装；已有主工作区改动继续保留。

## 原生 SDK 完整接入（2026-10-12）

- 全量梳理 85 个 SDK/源码环境入口，增加宿主代码工具使用完整原生 API 的路径；源 Skill、算法指南和 Codex 插件不再将便捷 Tool 的预设案例作为功能范围。
- 补齐 Flow-VQE 完整源码、CQLib QML 完整包、Ocean 元包，以及 QPanda/Qcover/SpinQit/VQNet 导入依赖与兼容处理。安装与计算保持分离，不新增任意代码执行 MCP。
- 剩余三批 72 个环境已逐库完成原生 API 工程检查：30/30、24/24、18/18。加上首批 13 项，85 个环境均有明确范围的工程记录；不表示穷尽上游 API。补齐 QCEC 的 Qiskit extra、TensorCircuit 的优化/转换依赖，并修复 QAT 共享 console wrapper 的安装校验误报。
- 原始收据、程序、完整工件和日志已无损归档到仓库，可在不含原工作区或 SDK 的新目录中离线复核。
- 分批状态、复跑命令、实际通过项与未验证平台见[完整接入记录](docs/integrations/FULL_SDK_ACCESS.md)及其版本化工程证据；静态目录覆盖不等于全部 API 已验证。本轮按用户要求不使用真实科研任务验收。
- 源码交付状态以 [main](https://github.com/xi-zhao/OpenQuantum/tree/main) 与 [CI](https://github.com/xi-zhao/OpenQuantum/actions/workflows/ci.yml?query=branch%3Amain) 为准。原接入 PR #8 只交付源码；后续发行见上节。已有主工作区改动由原任务保留。

## Codex 能力插件与设置页（2026-10-11，独立发行）

- 新增独立 Codex 插件发行定义，共享 Skill、Tool implementation 和科学合同；当时发行版本为 0.7.8，131 个 Skill、71 个科学 Tool。
- 0.7.8 提供完整安装包、独立插件 ZIP、校验和及 Agent 安装指南；发布事实与逐包验收以 [codex-v0.7.8 Release](https://github.com/xi-zhao/OpenQuantum/releases/tag/codex-v0.7.8) 为准。发布准备、修复和验证范围见[版本说明](docs/releases/codex-v0.7.8.md)。
- 凭据开链已检查宿主拒绝结果，并提供可复制的短时本机地址；拒绝提示、地址打开表单、测试值保存和状态刷新已在隔离浏览器夹具中验证。它不替代原生自动开窗与完整应用重启验收。
- Codex 原生界面负责聊天、项目、线程和登录，侧边页只管理本插件的 Skill、MCP、Tool 和系统凭据；不接入学习通。
- 临时原生 Codex 安装、Skill 关闭/重开及缓存路径升级检查通过。随后本机 Codex 已从 0.7.3 更新并启用 0.7.4；聊天旁的 MCP 设置标签页已显示 Skills、MCP 连接、Tools，切换与刷新检查通过。此证据不覆盖左侧菜单的全局入口。Desktop 安装未替换。
- 0.7.5 已安装并启用，为全局设置入口使用独立的 opener 和带 HTML 摘要的资源地址；用户已提供左侧全局应用截图并确认正常，版本、三个设置标签及 Skill 列表显示验收通过。用户配置保持不变；此确认不扩展为所有配置操作的完整验收。
- 0.7.6 已安装并启用，将设置页顶部的操作说明替换为 OpenQuantum 品牌介绍，沿用“让量子想法运行起来”的项目主张；设置功能和能力目录保持不变。已检查本机预览排版及实际安装内容，详情见验收记录。
- 0.7.7 在品牌介绍下新增 GitHub Star 入口，指向 `xi-zhao/OpenQuantum`；原生宿主通过 `openLink` 打开，拒绝或失败时显示可复制的仓库地址。已安装启用，本机浏览器预览的宽窄排版及实际跳转通过，安装内容读回一致；用户配置摘要保持不变。
- Star 的最终交互为“点击插件链接 → 打开 GitHub 仓库 → 用户自己点 Star”。曾撤回未安装、未发布的 0.7.8 授权试验，当时源码恢复为 0.7.7；本次正式 0.7.8 沿用普通链接。插件不申请 GitHub 授权、不保存 GitHub Token，也不自动提交 Star。
- 0.7.4 时的原生交互验收验证了 Skill 配置写入、内置 Tool 实际禁用、HTTP/stdio MCP 握手及启停；测试配置和凭据已恢复。当时凭据表单单独打开可用，原生自动开窗未通过，`openLink.isError` 未检查；0.7.8 已补齐错误处理与备用入口。
- Desktop 的受控 Home patch 停用 DeepSeek 账户、充值与插件管理/市场界面；保留 Cordis 内部装配。配置组合检查通过，原生 Desktop 显示尚未验收。
- 历史实现与验收范围、尚未验证的原生交互及配置并发限制见[验收记录](docs/releases/2026-10-11-plugin-settings.md)，使用和恢复见[插件说明](docs/integrations/CODEX_PLUGIN.md)。插件独立发布不改变下方既有模型或科学验收状态。

## 大结果交付（2026-10-11）

- 默认 Harness Preset 对共享科学 envelope 的大结果先保存并校验完整 JSON，再向 Agent 提供摘要和文件引用；小结果及 MCP 输出合同保留原样，科学状态不变。
- 已验证真实 Harness/MCP 链路中的摘要、原生文件读取与进程重启后读取，以及只读会话、取消、冲突和越界失败路径。模型与数值计算采用本地协议夹具，未进行外部模型、SDK 数值或科学 Acceptance 验收。
- 实现边界与复跑命令见[大结果交付说明](docs/integrations/SCIENCE_RESULT_DELIVERY.md)。源码交付状态见[远端 main](https://github.com/xi-zhao/OpenQuantum/tree/main)与[持续集成](https://github.com/xi-zhao/OpenQuantum/actions/workflows/ci.yml?query=branch%3Amain)；本轮不包含部署或发布。

## v0.6.0 发行内容与入口（2026-09-29）

- 产品版本提升为 `0.6.0`；[版本说明](docs/releases/v0.6.0.md)汇集自 v0.5.1 后的算法、互操作、Bloqade 与三批 52 个 SDK 能力包，README 十种语言同步用户任务、依赖准备与配置范围。
- Harness `0.1.5-rc.1`、Desktop `2.0.7` 保持不变。安装包包含适配代码；SDK 环境、账户、鉴权、许可与可选连接仍由用户准备和配置，既有用户改动按安装版更新规则保留。
- 本次发布要求精确提交的源码 CI、Mac arm64 / x64 与 Windows x64 原生安装检查和附件摘要核对；发布及稳定更新清单的实际状态以 [v0.6.0 Release](https://github.com/xi-zhao/OpenQuantum/releases/tag/v0.6.0)及对应工作流为准，下面各批次记录保留其原始验证范围。
- 修复资料检索 Harness 测试中辅助模型请求提前消耗用例的时序问题，并显式覆盖先请求会话标题、再调用检索 Tool 的顺序。

## 网络、控制、光学与云 SDK 接入（2026-09-28）

- 继续新增 [15 个能力包](docs/integrations/SDK_GAPS.md)、15 个 Skill、15 个独立 MCP 连接与 18 个 Tool，覆盖 SimQN、Qcover、VQNet、pyChemiQ、Qblox Scheduler、Qililab、Guppy/Selene、OQC QAT/QCaaS、MrMustard、MerLin、MIMIQ Exaqt、myQLM、AQT 和 Quantum Inspire。
- 当前源码共 154 个 Skill（141 个自动可选、13 个手动索引）、90 个 MCP 连接、281 个可配置 Tool 名称；本轮 7 个连接默认开启、8 个按需启用。鉴权、账户权限及适用许可仍由用户配置。
- 15 个固定依赖环境均已显式准备。26 项合同检查、30 项真实 SDK/MCP 检查及 1 项 Harness 集成检查通过；后者从 Session 日志重读 14 项成功和 5 项预期失败。完整 `npm run check` 通过，其默认跳过的外部/可选 live 测试不计作实跑；本轮 live 检查另外显式运行。
- 独立复核修复 pyChemiQ 默认剪枝导致微小系数变零的问题，并检查了长乘积、小残差和不可表示的下溢。MerLin 使用完整 Fock 空间，VQNet 保持系数双精度；[版本化证据](docs/integrations/evidence/sdk-gaps-2026-09-28.json)记录来源哈希、环境、数值边界和复核结果。
- 实际平台为 macOS arm64；云接口使用真实 SDK 加受控 HTTP 响应，Harness 使用本地模型协议夹具。未验证真实账户、收费云提交、QPU、实验室设备或外部模型，仍为 L1 / `scientificValidation=not_evaluated`。MrMustard 已归档，作为可选固定兼容适配；Qblox Scheduler 固定预发布版，原生 SDK 平台限制见说明。
- 本轮实现提交为 `4386e3d`；源码交付状态见[远端 main](https://github.com/xi-zhao/OpenQuantum/tree/main)和[持续集成](https://github.com/xi-zhao/OpenQuantum/actions/workflows/ci.yml?query=branch%3Amain)。源码接入不创建正式 Release；使用已有工作台时需更新源码、显式准备所需环境并重启 Harness。

## 公司与机构 SDK 补充接入（2026-09-28）

- 在前一批厂商能力之外，新增 [20 个能力包](docs/integrations/SDK_EXPANSION.md)、20 个 Skill、20 个 MCP 连接及 23 个 Tool；覆盖 QSteed、QuAIRKit、QCompute、Qibo、Qrisp、Lightworks、Braket、QURI Parts、QDK、Qualtran、OpenFermion、MQT DDSIM/QMAP、Classiq、Q-CTRL、QUA、LabOne Q、QCArchive、CUDA-Q 和 NetQASM/SquidASM。
- 当前源码目录为 139 个 Skill（126 个自动可选、13 个手动索引）、75 个 MCP 连接与 263 个可配置 Tool 名称。新增连接 14 个默认开启、6 个按需启用；账户、凭据、许可与服务权限由用户配置。
- 20 个公开依赖环境已显式准备并核对锁定版本；35 项新增合同检查、41 项真实 SDK/MCP/Harness 测试及完整 `npm run check` 通过。Harness 使用本地模型协议夹具，从 Session 日志重读 19 项成功及 4 项预期失败。独立复核发现的 Qrisp 大整数精度问题已修复，并覆盖 54–80 位输入；[版本化证据](docs/integrations/evidence/sdk-expansion-2026-09-28.json)记录源文件哈希、复核与验证范围。
- 实际执行验证限于 macOS arm64。本批未使用真实云账户、QPU、实验室仪器或外部模型；Classiq/Q-CTRL 使用真实 SDK 加传输夹具，QCArchive 使用真实 QCPortal 加回环服务。NetQASM 编译已验证，SquidASM/NetSquid 数值测试因私有依赖未准备而跳过；不把适配代码存在写成后端已实跑。所有新能力仍为 L1 / `scientificValidation=not_evaluated`。
- 本批实现提交为 `15104b0`；源码交付状态见[远端 main](https://github.com/xi-zhao/OpenQuantum/tree/main)和[持续集成](https://github.com/xi-zhao/OpenQuantum/actions/workflows/ci.yml?query=branch%3Amain)。源码接入不创建正式 Release；需要部署时，更新源码、显式准备所需环境并重启 Harness。

## 国内外厂商 SDK 接入（2026-09-27）

- [17 个新增能力包](docs/integrations/VENDOR_SDKS.md)覆盖国内 DeepQuantum、TensorCircuit、MindQuantum、Kaiwu Community、SpinQit、QuTrunk，以及 PennyLane、TKET、Ocean、pyQuil、Perceval、IQM、Alice & Bob、Pulser、QoolQit、IonQ 和 Superstaq。既有 QPanda、Stim、Bloqade 等继续复用。
- 新增 17 个 Skill、17 个独立 Python MCP 连接和 19 个 Tool。当前源码共 119 个内置 Skill、55 个 MCP 连接、240 个可配置 Tool 名称；106 个 Skill 自动可选、13 个分类索引手动调用。QoolQit 与 Superstaq 默认关闭。
- 全部 17 个锁定环境已显式准备；45 项新合同测试、35 项真实 SDK/MCP/Harness 测试全过且无跳过，完整 `npm run check` 通过。数值与独立审阅见[证据汇总](docs/integrations/evidence/vendor-sdks-2026-09-27.json)。新增连接增加集成测试进程数，平台测试并发度降为 2；会话创建回归单独预留 30 秒初始化全部连接，普通 RPC 仍保持 5 秒截止时间。
- 真实执行验证限于 macOS arm64；Harness 使用本地模型协议夹具，Superstaq 远程路径使用真实 SDK 加 HTTP 传输夹具，没有在线账户、远程编译、QPU 或外部模型验收。全部新能力保持 L1 / `scientificValidation=not_evaluated`。
- Bloqade Analog（`5d995fa`）与本批厂商 SDK（`3f344ad`）已合入 `main`；远端版本与持续集成状态分别见 [main](https://github.com/xi-zhao/OpenQuantum/tree/main) 和 [CI](https://github.com/xi-zhao/OpenQuantum/actions/workflows/ci.yml?query=branch%3Amain)。此次源码合并未创建正式 Release；已有工作台需更新源码、显式准备所需环境并重启后加载新能力。

## 全量扩展治理（2026-09-24）

- [治理清单](docs/architecture/EXTENSION_GOVERNANCE.md)中的 B1/B2/B3 已完成，逐项覆盖 101 个 Skill、37 个 MCP 连接和 220 个可配置 Tool 名称，保留全部原名。88 个 Skill 自动可选，13 个分类索引手动调用；数量不等于同时在线。
- 26 个 Python 计算桥接迁到[显式准备](docs/integrations/LOCAL_ENVIRONMENTS.md)，复用旧环境位置；Hamiltonian 共用同一检查，失败准备不保留成功标记。Julia、C 驱动与上游服务保留各自边界。
- 49 个算法示例延迟导入并按依赖组准备，无参数命令仍完整安装。最小环境、按组补装、已有组保留、49 方法数值回归及实际 Harness 通过。
- 相近入口共用[选择说明](docs/integrations/CAPABILITY_SELECTION.md)；Gym、硬件和 FlagQuantum 的专业工具范围由 Harness 原生 scoped restriction 实现，默认 full 与关闭开关兼容旧配置。诊断 Skill 已更新当前 RPC 并按授权范围选择探针。
- 完整 `npm run check`、迁移协议/取消、真实 SDK 与 Harness 会话重读通过；[证据摘要](docs/integrations/evidence/extension-governance-2026-09-24.json)记录数量与范围。未修改科学阈值，未做外部模型、云任务或硬件验收，未发布安装包。

## UnitaryLab 开源适配（2026-09-24）

- 固定 quantum-skills 的全部 66 份指南已对应原生 Skill；49 个可运行开源示例覆盖原算法库的全部 39 个模块和指南独有方法。
  执行合同集中于 `quantum-algorithms` 能力，复用 Harness `bash` / `pwsh`；其余适配 Skill 不重复建立 Tool 或 MCP。
- 原始参考库保持只读资料边界，全部条目指向本地适配路径；Cartan、DMRG/CVD 等实现差异逐项披露，未宣称原 Python API 全兼容。
- 新增 `hamiltonian-simulation` Skill 与 `hamiltonian_local` 连接，使用 Qiskit/NumPy/SciPy 适配 MIT 算法序列。
  计算前显式 setup；计算调用不安装、不联网或写结果文件，不引入 UnitaryLab 模拟器依赖。
- 数值、合同和本地协议替身驱动的 Harness 验证见[集成说明](docs/integrations/UNITARYLAB_OPEN_ADAPTATION.md)。
  这是 L1 源码接入，不表示外部模型验收、科学 Acceptance 或新安装包发布。
- 与同日互操作适配合并后，源码目录为 101 个内置 Skill、37 个 MCP 连接和 5 个原生量子 Tool。
- 合并树通过完整 `npm run check`，并复跑 Hamiltonian 数值检查、Hamiltonian Harness 调用及全部 66 个适配 Skill 的发现与 HHL/QSVT 执行；模型为本地协议替身。

## 本地互操作接入（2026-09-24）

- Clifft 0.10.1 新增 Stim 格式固定 shots 记录接口；qBraid 0.12.2 新增 Qiskit/Cirq 双向酉电路转换；QDMI 1.3.3 提供默认关闭、显式准备驱动的只读查询。
- 属于 L1 执行能力；本地真实库、Harness 协议夹具和独立领域审阅的范围见[接入说明](docs/integrations/QUANTUM_INTEROP.md)与[验证记录](docs/integrations/evidence/interop-2026-09-24.json)。没有验证外部模型、真实硬件或最终科学 Acceptance。
- 该互操作提交时源码目录为 34 个内置 Skill、36 个 MCP 连接和 5 个原生量子 Tool；不代表已发布安装包。

## 量子库更新（2026-09-22）

- Compact 0.2.3、Qiskit 2.5.2、Clifft 0.10.1 与 Graphix 0.4 已更新固定依赖；Graphix 迁移资源图、空间调度和分支结果 API。
- Stim 开发构建和 FlagQuantum 固定 SDK 提交仅在隔离开发环境验证，发行版稳定锁保持不变；MQT core/QCEC 保持配套版本。
- 版本、复跑命令、预发布标记与数值/执行边界见[升级记录](docs/releases/2026-09-22-quantum-upstream-update.md)。本次源码更新不是新安装包或应用 Release。

## 桌面测试安装包（2026-09-20）

- 本次发行版本为 `0.5.1`，包含三平台未签名测试安装包；[版本说明](docs/releases/v0.5.1.md)、
  [Release 附件与实际发布状态](https://github.com/xi-zhao/OpenQuantum/releases/tag/v0.5.1)。
- 增加原生 macOS / Windows 打包入口、固定 Node / uv 运行环境、独立用户数据和分发清单更新。
  未签名模式用于测试，正式签名与公证仍需维护者配置证书；安装包不是后台 OTA 安装。
- 首次设置和恢复界面纳入统一品牌适配；OpenQuantum Host / Client 包随应用分发，避免首次 Profile
  依赖初始化移走扩展。构建、数据保留和逐平台验证边界见[安装包说明](docs/DESKTOP_INSTALLERS.md)。
- Apple Silicon / Intel Mac 的 DMG 复制安装、Windows EXE 的静默安装，均通过两次真实工作台启动、
  配置与 Skill 保留、本地工具检查；[三平台原生 CI 证据](https://github.com/xi-zhao/OpenQuantum/actions/runs/35507856665)。
  Apple Silicon 另有本地首次向导 UI 检查；测试构建不自动创建 Release。

## 版本提醒（2026-09-20）

- Web 与 Desktop 共用 OpenQuantum 正式版本检查和提醒偏好；支持每日自动检查、手动检查、稍后提醒、跳过版本与十语言文案。
- Desktop 的上游更新插件在桌面组合中禁用；原有公开检查入口委托 OpenQuantum 服务，避免引导安装 DSH Desktop。
- GitHub 正式 Release 的更新清单由现有质量、双平台桌面安装和容器检查通过后生成；普通 main 推送不触发更新发布。
- 版本提醒自 `0.5.0` 引入，当前版本为 `0.5.1`；变更与升级范围见 [v0.5.1 发布说明](docs/releases/v0.5.1.md)，公开发布状态和清单以对应 GitHub Release 及发布工作流为准。
- 本地完整 `npm run check`、macOS Desktop 安装检查及真实 Host/ACP 检查已通过，界面使用隔离的测试版本清单核对中文、英文及阿拉伯语；这些检查不替代安装包或真实外部模型验收。
- 当前只提供提醒、版本说明和升级指南。自动下载安装待正式安装包阶段；合同、发布流程与升级步骤见[版本更新](docs/UPDATES.md)。

## 本轮升级

- Harness `0.1.5-rc.1`、Desktop `2.0.7` 固定源码、量子学习通上游修复、CC Connect 与两项量子数值库已升级。
- 范围、固定版本、验证和恢复说明见[2026-09-10 升级记录](docs/releases/2026-09-10-upstream-update.md)。
- 真实外部模型、真机硬件和发布验收不由本次本地升级替代；原模型验收里程碑仍保留。

## PairInteraction 独立接入（2026-10-09）

- 在独立工作树新增 `pairinteraction-rydberg` Skill、`pairinteraction_local` MCP 连接与有界原子对计算 Tool；FatQat 保持独立，未修改其代码或版本锁。
- 固定 PairInteraction 2.7.0、独立 Python 3.12 环境和数据库 v2.0 的逐文件快照。计算前校验本地数据，显式 setup 才安装或下载。
- 已通过实际 S–S / S–P 数值检查、解析与完整性测试、MCP 合同、FatQat 合同回归，以及本地协议替身驱动的真实 Harness 调用与会话重读。
- 范围、单位、微扰失效示例和版本治理见 [PairInteraction 接入说明](docs/integrations/PAIRINTERACTION.md)。当前 L1、`scientificValidation=not_evaluated`；未做论文全案例复现、独立领域审阅、外部模型验收或部署。
- 主线集成以 `0e8221ad` 为基线，仅合入此能力，保留主线 Harness `0.1.5-rc.1` 和模型配置；适配共享环境摘要与资源策略。完整 `npm run check`、相关合同和真实计算/Harness 重读通过；[集成记录](docs/integrations/evidence/pairinteraction-main-2026-10-09.json)区分先前工作分支的 `0.2.0-rc.2` 证据。

## FatQat 接入（2026-09-11）

- 新增 `fatqat-workbench` Skill 与默认开启的 `fatqat_local` MCP 连接，提供电路/硬件约束和脉冲动力学两个 Tool。
- 量子组件设置页同步适配 DSH 当前的 `remote.credentials` 接口，修复打开连接目录时的凭据读取报错。
- 固定版本、验证命令与边界见 [FatQat 接入说明](docs/integrations/FATQAT.md)。独立的真实模型验收里程碑保持不变。
- 2026-09-11 主线合并前，在独立工作目录通过完整 `npm run check`，并补齐 FatQat 的目录数量与合同测试清单；此次未运行外部模型或真实硬件探针。

## 论文方法接入（2026-09-12）

- 新增 SQD、TJM、LSD、RandomMeas、Flow-VQE 和 TeNPy 六个 L1 能力、六个本地 MCP Tool 和对应 Skill；默认开启，GARI 仍为候补。
- 已运行固定依赖的真实数值回归，以及本地模型协议替身驱动的真实 Harness 六工具端到端检查。后者不替代外部模型自主任务验收。
- 上游版本、安装命令、物理边界和证据位置见[论文方法计算接入](docs/integrations/PAPER_BACKED_TOOLS.md)。运行中的 OpenQuantum 需重启加载新增 Preset 连接。
- 2026-09-12 主线合并前，在独立工作目录通过完整 `npm run check`；资源脚本的格式阻断已由 `bfe8055` 修复。合并检查日志保存在原工作目录的 `.openquantum/merge-paper-tools-evidence/`。

## Quantum-Practices 与 PDE 原型（2026-09-12）

- 默认 Preset 新增原生只读 `quantum_practices` Tool，检索固定 MIT 上游的 60 份算法参考；
  当前 Harness 的注册、真实调用、失败返回和会话重读已由本地模型协议替身验证，未运行外部模型自主验收。
- [接入说明](docs/integrations/QUANTUM_PRACTICES.md)记录版本、许可、输入边界与证据；运行中的 Host 需重启后加载。
- [一维热方程独立实验](experiments/schrodingerization-heat1d/README.md)使用开源数值库验证薛定谔化精度与成本，
  尚未成为产品计算 Tool；没有引入 UnitaryLab 闭源模拟器或 Agent。
- 2026-09-13 主线合并前，在独立工作目录通过完整 `npm run check` 与 4 项热方程数值测试；
  补齐新增原生 Tool 的合同测试清单。本次验证没有调用外部模型或真实硬件。

## Mitiq 误差缓解接入（2026-09-14）

- 新增 `mitiq-error-mitigation` Skill 和默认开启的 `mitiq_local` 连接，以一个有界 Tool 提供 ZNE、REM、PEC、CDR 本地实验。
- 固定 Mitiq 1.1.0 与独立 Python 3.12 环境；采样比较包含校准/训练成本，保留有限样本下的变差结果。
- 四种方法已运行真实数值检查，并由本地模型协议替身驱动真实 Harness 调用及 Session 结果重读；未验证外部模型或 QPU。
- 完整 `npm run check`、独立 Python 科学检查和安装器幂等复查通过；[版本化验证摘要](docs/integrations/evidence/mitiq-2026-09-14.json)保留输入、数值、源码与日志摘要。
- 范围、验证命令、GPL 许可和证据目录见 [Mitiq 接入说明](docs/integrations/MITIQ.md)。当前为 L1、`scientificValidation=not_evaluated`；运行中的 Host 需重启加载。

## 原交接基线（历史）

- 写入本页前的本地 HEAD：`e4e3e4dbc697`，分支 `main`；后续接手先重新查询 Git，不把本页当作实时分支状态。
- 已核实提交与文件：Skill/Tool 正交、完整副作用声明和 MCP 合同补审已进入本地提交；最新提交补充了 Skill 与 MCP 服务目录。详细范围见[日期化审计](docs/architecture/ARCHITECTURE_AUDIT.md)。
- 原有 `agent.cordis.yml` 未提交改动属于已有工作；本页不覆盖它，也不把配置存在等同于服务在线可用。

## Unitary 生态接入（2026-09-14）

- 新增 Dynamiqs、Clifft、OQuPy、Deltakit 四个 Skill 和四个默认开启的本地计算 Tool；Metriq 以原生只读 Tool 查询固定公开快照的 410 条去重记录。
- 四个 Python 3.12 锁定环境已实际安装，真实数值回归与独立领域审阅已完成；修复了 TEMPO 整步数取整和 Deltakit 等价电路目标顺序造成的重现性问题。
- 本地模型协议替身驱动真实 Harness，完成五项成功调用、一次预期查询失败及会话重读；完整 `npm run check` 已通过。此次没有运行外部模型或真实硬件，五项均为 L1、`scientificValidation=not_evaluated`。
- [接入说明](docs/integrations/UNITARY_ECOSYSTEM.md)包含版本、安装、使用示例和证据。运行中的 Harness 需重启后加载新增 Preset 行；原模型验收里程碑保持独立。

## 电路与代数能力（2026-09-14）

- 新增 PyZX 电路优化、Graphix 测量式计算、Symmer 对称性降比特和 PauLie 代数分析；各有独立 Skill 与默认开启的本地 MCP Tool，依赖固定在隔离 Python 3.12 环境。
- 26 个真实数值输入、MCP 合同与目录一致性、四次真实 Harness Tool 调用、一次预期错误及 Session 重读通过；Harness 使用本地模型协议替身，没有调用外部模型或真实硬件。
- 独立领域审阅另复核 50 个输入及 80 条 MBQC 采样分支；固定版本、范围、安装与证据见[电路与代数工具接入](docs/integrations/UNITARY_NEXT_TOOLS.md)。Graphix 已处理 NumPy 兼容性和旋转角单位转换。
- 当前四项均为 L1、`scientificValidation=not_evaluated`；全仓 `npm run check` 通过。运行中的 Harness 需重启加载新连接，原模型验收任务保持独立。

## 计算桥接扩展（2026-09-14）

- TeNPy、TJM、Flow-VQE、Clifft 的主计算已与小系统精确参考分开；SQD 新增分子、基组和活性空间输入，包含冻结核贡献。
- 五项统一提供 `referenceMode=auto|required|skip`，未运行参考时返回原因与 null 参考字段；保持 L1、`scientificValidation=not_evaluated`。
- 新旧实际数值回归与本地模型协议替身驱动的真实 Harness 五项调用、会话结果重读均已通过。算例与验证记录见[计算工具使用说明](docs/integrations/SCALABLE_BRIDGES.md)。
- 未调用外部模型或真实硬件；运行中的 Harness 需在后续重启后加载新合同，不替代原模型验收里程碑。

## 用户自行配置计算资源（2026-09-15）

- 全部 23 项本地计算适配（21 个 MCP 服务及 QMClaw、内置基态两项原生计算能力）按用户选择的规模和求解参数执行，移除人为规模与工作量上限，保留所提供的物理模型、输入结构和后端数据表示要求。
- 主计算、可选参考、Graphix 模拟和 PauLie 闭包分别配置；`required` 在所请求的规模尝试参考。15 项共享科学服务支持逐次 `execution`，其余本地 MCP 计算使用部署变量；worker 默认无时间或输出上限，连接超时可在设置中心修改。
- 内置基态的粗网格与评价预算由请求指定；资源检查规则升级为 Profile `1.1.0` 并返回使用比例，旧 `1.0.0` 文件保留用于历史溯源。
- README 按功能介绍能力；模型、输入输出与资源设置见[本地计算说明](docs/integrations/SCALABLE_BRIDGES.md)。本地算例与版本作为补充材料，见[核验记录](docs/integrations/evidence/local-compute-scale-2026-09-15.json)。
- 合并后全仓 `npm run check` 通过；另运行 18 个旧适配输入、7 个资源配置输入，以及真实 Harness 的四项调用、预期错误和会话重读。Harness 使用本地模型协议替身；未调用外部模型或真实硬件。本次资源调整不改变各能力的科学验收等级。

## 候选库接入与主线合并（2026-09-20）

- QCut 门切割、Compact 线路优化、OpenQARP VQD 新增默认开启的 Skill 与 MCP Tool；cqlib-qml angle 核适配及 FlagQuantum 原生 MCP 新增可选入口，默认关闭。
- 四个适配 Tool 与一个上游 MCP 已运行真实依赖、实际调用及本地模型协议替身驱动的 Harness 会话；完成独立科学复审。L1 数值结果不等于最终科学 Acceptance。
- CleitonForge 回归样本与 qec-burst-scaling 实验模块只进入开发证据；固定 Stim 的未闭合 tag EOF 缺陷通过短超时子进程隔离并单列，不宣称修复上游。
- [接入说明](docs/integrations/CANDIDATE_LIBRARIES.md)及[版本化证据](docs/integrations/evidence/candidates-2026-09-20.json)记录锁定版本、使用入口和验收边界。基于 `e92bf0b`（v0.5.1）合并；主线已有 Graphix/PyZX/Symmer/PauLie 能力保留，原工作树未提交改动未混入。
- 合并适配主线的资源继承规则：四个计算 Tool 的 `execution` 缺省继承部署配置，QCut 可省略线程数，FlagQuantum 启动器保留用户数值线程/设备设置；新增连接超时沿用主线。当前目录为 32 个 Skill、34 个 MCP 连接和 5 个原生量子 Tool。
- 合并树在本机 macOS 通过完整 `npm run check`、15 个新增数值输入、FlagQuantum 实际调用、10+5 项开发回归；真实 Harness 会话完成五项成功调用及一次预期拒绝。首次与全仓并行时 Harness HTTP 请求超时，单独复测通过，记录保留在本地证据目录。
- 接入合并提交为 [`e9da4cd`](https://github.com/xi-zhao/OpenQuantum/commit/e9da4cdd42df3ae2c3737cf4a165f11783f1e05e)；源码同步与云端检查以 [GitHub main](https://github.com/xi-zhao/OpenQuantum/tree/main) 和 [CI 记录](https://github.com/xi-zhao/OpenQuantum/actions/workflows/ci.yml)为准。本次未发布或修改运行中的 Host，未调用外部模型或提交硬件作业。部署仍需按相应环境准备依赖并重启 Harness。

## 下一唯一里程碑

收口当前模型接入验收：对原执行任务已经选定的模型逐项归档“文本生成、Tool Calling、科研主动作、证据完整性”的结果与未验证项。该任务仍由原执行会话负责；本页不启动第二份验收。

## 验收与证据

- 静态边界检查入口是 `npm run check`；在线验收必须另有目标 Provider、模型版本、时间和 Session 证据，不能用静态通过替代。
- 科研成功由 central Acceptance Builder 推导；检查 [Scientific Result 协议相关测试](tests/scientific-result-materialization.test.mjs)及[架构审计](docs/architecture/ARCHITECTURE_AUDIT.md)所指证据。
- 原交接时仅核对 Git、文档和本页链接；该历史记录未包含全仓检查、模型调用或硬件调用。后续检查见上方日期化条目。

## 待核实与动作边界

- 最新在线验收的固定模型清单、预算、执行中状态和报告位置尚未在本页核实；由原执行任务补入脱敏报告链接后才能标记完成。
- 允许：读取证据、更新此页、在已有授权范围内维护本地实现和相关检查。
- 此页不授予新的模型请求、安装、硬件、发布或 push 权限；跨 ChatGPT/Codex 接手时携带仓库、分支、证据链接和原授权范围，不携带密钥。

## Bloqade Analog 接入（2026-09-27）

- 新增 `bloqade-analog` Skill 与默认加载的 `bloqade_local` 连接，提供二维 Rydberg 原子阵列、全局分段线性脉冲的本地 Python 仿真，返回占据、振幅和位串概率。
- 固定 Bloqade Analog 0.16.9 与 NumPy 2.4.2，依赖经显式 setup 准备；计算不自动安装、不提交云或 QPU 任务。
- 7 项数值回归、11 项独立领域检查、真实 MCP 与本地模型协议替身驱动的 Harness 调用及会话结果重读已通过。全部能力合同 108 项通过、1 项既有 opt-in 检查跳过；相关目录/设置/多语言检查、lint 和配置展开通过。
- 当前为 L1、`scientificValidation=not_evaluated`；没有外部模型或真实硬件验收，未运行完整仓库检查。范围、使用方法和版本化证据见 [Bloqade Analog](docs/integrations/BLOQADE_ANALOG.md)。使用本分支源码时需重启 Harness 加载新连接。
