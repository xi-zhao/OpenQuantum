<h1 align="center">
  <img src="./packages/openquantum-web-branding/assets/lockup.svg" width="430" alt="OpenQuantum" />
</h1>

<p align="center"><a href="./README.md">简体中文</a> · <a href="./docs/readme/README.en.md">English</a> · <a href="./docs/readme/README.ja.md">日本語</a> · <a href="./docs/readme/README.ko.md">한국어</a> · <a href="./docs/readme/README.es.md">Español</a> · <a href="./docs/readme/README.fr.md">Français</a> · <a href="./docs/readme/README.de.md">Deutsch</a> · <a href="./docs/readme/README.pt.md">Português</a> · <a href="./docs/readme/README.ru.md">Русский</a> · <a href="./docs/readme/README.ar.md">العربية</a></p>

<p align="center">
  <strong>OpenQuantum，共建可信的量子科研智能。</strong><br />
  <sub>把量子科研的专业积累，汇聚到一个 OpenQuantum</sub>
</p>

<p align="center">
  <a href="https://github.com/xi-zhao/openQuantum/actions/workflows/ci.yml"><img src="https://github.com/xi-zhao/openQuantum/actions/workflows/ci.yml/badge.svg" alt="CI status" /></a>
  <a href="./THIRD_PARTY_NOTICES.md"><img src="https://img.shields.io/badge/licenses-MIT%20%2B%20component%20licenses-111111.svg" alt="MIT 与组件许可证" /></a>
  <img src="https://img.shields.io/badge/Node.js-24%2B-3c873a.svg" alt="Node.js 24 or newer" />
</p>

OpenQuantum 是开源开放的量子科研 AI 平台，连接开源社区的优秀软件、算法与公开研究成果，让 AI 围绕你的研究问题开展分析、选择方法、执行计算并核对结果，把专业积累转化为实际的科研能力。

从一个研究问题、一篇论文或一段现有程序出发，让 AI 参与科研探索。保留程序、参数与核对记录，让一次研究成为下一次的起点。

OpenQuantum 的核心是一套通用量子科研插件，由 Skills、Tools 和 MCP Server 组成；再通过适配器接入不同 Harness。选择适合你的安装入口，两者复用同一份领域能力：**[Codex 插件](docs/integrations/CODEX_PLUGIN.md)** 将量子 Skill 与科学 Tool 接入 Codex 原生对话，侧边入口用于管理能力开关、MCP 连接和 Token；**Desktop** 是简洁的个人 Harness，保留对话、工作区、文件、工具执行和历史，模型服务可自行配置。

**[安装 Codex 插件](#codex-plugin)**　·　[安装 Desktop](#桌面安装包)　·　[先看计算与结果](#使用与结果)　·　[访问官网](https://xi-zhao.github.io/OpenQuantum/)

**先看实测案例：**[PennyLane Pauli 对易子计算](#pennylane-rust-case)完整调用提速 **5.09 倍**；[QuTiP Wigner 函数计算](#qutip-rust-case)完整调用提速 **5.69 倍**，均保留性能对照、结果核对与复跑记录。

**Desktop 0.8.10：**[Mac Apple Silicon 独立安装包](https://github.com/xi-zhao/OpenQuantum/releases/tag/v0.8.10) · **Codex 插件 0.8.10：**[下载与发布说明](https://github.com/xi-zhao/OpenQuantum/releases/tag/codex-v0.8.10)。以各 Release 附件为准。

- **更容易找到能力：** Tools、MCP、Skills 按 8 类用途分组，支持搜索和状态筛选。
- **简洁个人桌面：** Mac Apple Silicon 的 `OpenQuantum.app` 自带运行环境；设置包含通用、模型与 OpenQuantum 插件。插件页沿用首页、Skills、MCP 三栏，展开卡片配置环境、账户与工具限制。

<p align="center">
  <a href="#为什么选择-openquantum">为什么选择</a> ·
  <a href="#optimization-cases">优化实测</a> ·
  <a href="#可以用它做什么">浏览能力</a> ·
  <a href="#codex-plugin">Codex 插件</a> ·
  <a href="#快速开始">开始使用</a> ·
  <a href="#使用与结果">使用与结果</a> ·
  <a href="#把你的量子能力接进来">开发与扩展</a> ·
  <a href="#长期发展规划">路线与 RSI</a> ·
  <a href="#一起建设-openquantum">参与建设</a> ·
  <a href="#开源生态与致谢">开源生态</a>
</p>

<p align="center">
  <img src="./docs/images/openquantum-desktop-20261013.jpg" width="100%" alt="原版 DSH Desktop 中的 OpenQuantum 工作台：品牌、新会话、量子学习通与自行添加模型的提示" /><br />
  <sub>早期版本界面参考；0.8.10 简洁版已收拢侧栏和设置。在设置中添加自己的模型服务，即可开始新会话。</sub>
</p>

<details>
<summary><strong>查看 Tools、MCP、Skills 的分类设置</strong></summary>

按用途展开所需分组，再用搜索或启用状态缩小范围。Tools 用于查看可调用的动作，MCP 用于管理服务连接，Skills 用于选择任务方法与指南。

![Desktop 中按用途分组的 MCP 连接、搜索和状态筛选](./docs/images/openquantum-settings-categories-20261013.jpg)

图为 2026-10-13 在原版客户端中验证分类功能时的实际界面，截图来源见[图片说明](docs/images/README.md)。配置启用不代表服务已经在线。

</details>

<a id="为什么做-openquantum"></a>

## 为什么选择 OpenQuantum

### 覆盖广，让研究思路有路可走

从量子算法与线路模拟，到量子化学、多体计算和量子纠错，持续拓展专业方向，打通工具与方法之间的衔接。让研究者少花时间准备工具，多花时间探索问题。Qiskit、PennyLane、QuTiP、PyZX、TeNPy、Stim / PyMatching 等社区项目，为这些研究方向提供专业积累。

### 计算快，让更多想法得到验证

持续优化关键计算环节，缩短等待，支持更多比较与尝试。在针对性优化案例中，[PennyLane Pauli 对易子计算](#pennylane-rust-case)与 [QuTiP Wigner 函数计算](#qutip-rust-case)的完整调用，分别实现了 **5.09 倍**和 **5.69 倍**加速，结果均经过原库对照与独立参考计算核对。

### 开放共建，让科研能力不断向前

持续引入有价值的开源项目与论文方法，在适配、优化和实际使用中共同改进。OpenQuantum 围绕这些成果建设 Agent 工作流、计算接口与验证记录，让新的工具、方法与经验成为平台继续生长的力量。欢迎所有人[参与建设](#一起建设-openquantum)，一起把社区的专业积累建设成研究者用得上、能检验、愿意信赖的量子科研智能。

<a id="从问题出发调用专业能力"></a>
<a id="对不同的工作解决不同的难点"></a>

### 从你的工作开始

| 你的工作 | 核心难点 | OpenQuantum 的价值 |
| --- | --- | --- |
| **科研与算法研究** | 验证一个新想法，常要反复实现方法、寻找对照、核对结果。 | 从算法示例与专业 SDK 起步，改输入、做对照，结合已支持的独立检查，留下可复用的程序与结果。见[计算与结果](#使用与结果)。 |
| **应用与 Agent 开发** | 想在现有应用中加入量子计算，还缺专业方法与可用的调用路径。 | 接入已有 Skill、Tool 与原生 SDK，让应用使用专业软件，并保留自己的界面与流程。见[开发与扩展](#把你的量子能力接进来)。 |
| **行业研发与技术评估** | 有了应用方向，还需要依据来选择计算方法、估算资源、确定研发路线。 | 从已支持的任务做初步对照，查看方法条件、资源假设与结果来源，为后续研究准备依据。见[参考资料与选型](docs/CAPABILITIES.md#参考资料与选型)。 |
| **教学与课程建设** | 想把抽象概念变成学生能动手的课程，材料、实验与课件却分散。 | 用开源算例设计实验，借量子学习通组织材料与课件。教学功能与课程建设进度见[量子学习通](#量子学习通)。 |
| **学习与动手探索** | 概念读懂了，还不知道怎样运行算法、调整输入、解释结果。 | 运行示例、修改参数，结合指南与可用参考结果，理解方法为什么适用、有什么限制。见[算法学习与方法比较](#算法学习与方法比较)。 |
| **研究软件与生态建设** | 已有论文方法、研究代码或 SDK，还需要工作流、接口与示例，让别人用起来。 | 将方法整理为 Skill、需要执行的动作接为 Tool，或接入完整应用；保留来源与贡献归属，让他人继续使用和扩展。见[能力接入](#把你的量子能力接进来)。 |

<a id="开源让能力可以检查修改和延续"></a>

### 开源：把能力掌握在自己手中

你可以查看平台与接入代码，了解方法的来源，按相应许可修改、部署和维护自己的工具组合。模型服务与计算后端可以按需选择，研究数据是否共享也由你决定。作者、许可证和贡献归属继续保留，让已有工作能够随项目延续。

<a id="全面让方法选择与组合有共同起点"></a>

### 全面：让一个问题有更多方法可选

OpenQuantum 汇聚算法、编译、仿真、量子信息、化学与多体、优化、纠错、动力学、控制和网络等方向的软件与研究方法。从指南与开源示例，到原生 SDK 和计算 Tool，你可以按任务选择所需能力，也可以组合工具、设计新的对照。各能力的输入、准备条件与支持范围见[能力目录](#可以用它做什么)。

例如，分别用 PyZX 做电路优化、QCEC 检查等价性，再用噪声模拟研究含噪表现，可以围绕“电路更简洁，结果是否更好”设计对照。跨工具组合还需要核对模型、单位、位序和预算，当前范围见[计算与资源配置](docs/integrations/SCALABLE_BRIDGES.md)。

<a id="让一次研究成为下一次的起点"></a>
<a id="agent-时代让专业能力进入工作并持续积累"></a>
<a id="agent-时代让想法接上专业能力"></a>

### 让 AI 用上专业科研能力

Agent 可以帮你阅读材料、编写程序和调用工具。安装 OpenQuantum 后，你可以围绕已支持的任务，按需要准备依赖和服务配置，让 AI 用上量子领域的方法与计算能力。Skill 说明方法与步骤，Tool 执行具体动作，原生 SDK 也可通过宿主代码工具使用。

记录程序、结果与适用的检查，让后续工作有据可循。有依据的负结果也值得保留，帮助判断方法何时适用、何时需要换一条路线。程序故障与科学结果要分别看待；相关记录可以用于[复核与复用](#执行记录与科学验收)，科学判断仍由使用者负责。

<a id="把你的方法变成别人能用的能力"></a>

**把开源库与论文方法变成可用的 Agent 能力，支撑着平台的持续建设。** 为此，我们梳理方法、编写工作流、接入软件，并保留来源与使用条件。你也可以把自己的方法、程序或完整应用接进来，让一次开发成为更多人的起点。

这些积累也为[下一轮研究能力的改进](#rsi)提供基础，相关方向与进度在长期规划中说明。

**[先运行一个任务](#快速开始)**　·　[把你的能力接进来](#把你的量子能力接进来)

## 快速开始

选择适合自己的入口。本页的能力说明对应源码主线；已发布安装包的功能与验证范围以各自 Release 为准。

| 你想怎样使用 | 安装入口 | 适用范围 |
| --- | --- | --- |
| 在 Codex 原生聊天中使用量子能力 | [Codex 插件 0.8.10](#codex-plugin) | 需要支持插件的 Codex、Node.js 24+ 和 npm |
| 使用独立桌面应用 | [Desktop 0.8.10](#桌面安装包) | macOS Apple Silicon；自带 Node / uv 与运行依赖 |
| 使用主线能力或参与开发 | [从源码运行](#安装源码) | Git、Node.js 24；计算环境按任务准备 |

<a id="codex-plugin"></a>

### Codex 插件

**让 Codex 帮你安装：** 新建聊天，复制下面的请求：

```text
请帮我安装 OpenQuantum Codex 插件 0.8.10。先阅读安装指南：
https://github.com/xi-zhao/OpenQuantum/blob/codex-v0.8.10/docs/integrations/CODEX_AGENT_INSTALL.md
从 https://github.com/xi-zhao/OpenQuantum/releases/tag/codex-v0.8.10 下载完整安装包与 SHA256SUMS，
核对摘要后，检查 Codex、Node.js 24+ 和 npm，使用包内安装器完成安装。
请保留已有插件和用户配置，核对 Skills、MCP 工具和左侧全局“OpenQuantum 设置”入口。
需要我重载应用时，告诉我具体操作。最后报告实际验证的结果，以及仍需准备的科学计算依赖。
```

安装后按提示重载 Codex，在新聊天中直接提出量子任务；通过 OpenQuantum 设置页管理能力和连接。科学计算依赖按需准备，插件安装本身不表示所有 SDK 已就绪。

[完整安装包与校验摘要](https://github.com/xi-zhao/OpenQuantum/releases/tag/codex-v0.8.10) · [手动安装与故障处理](docs/integrations/CODEX_AGENT_INSTALL.md) · [插件功能与宿主边界](docs/integrations/CODEX_PLUGIN.md)

### 桌面安装包

Mac Apple Silicon 下载 **[OpenQuantum 0.8.10 DMG](https://github.com/xi-zhao/OpenQuantum/releases/download/v0.8.10/OpenQuantum-0.8.10-macOS-arm64.dmg)**，按 [SHA256SUMS](https://github.com/xi-zhao/OpenQuantum/releases/tag/v0.8.10) 核对摘要后，将 `OpenQuantum.app` 拖入「应用程序」。模型服务在「设置 → 模型」中配置。

安装包采用 ad-hoc 本地签名，尚无 Apple 分发签名或公证；首次打开、升级备份与数据保留见[安装说明](docs/DESKTOP_INSTALLERS.md)。Intel Mac 与 Windows 暂使用 [0.8.4 能力包](https://github.com/xi-zhao/OpenQuantum/releases/tag/v0.8.4)及其配套说明，或选择源码路径。

<a id="安装源码"></a>

### 从源码运行

```bash
git clone https://github.com/xi-zhao/openQuantum.git
cd openQuantum
npm ci
npm run dev
```

打开启动日志中带登录令牌的本机地址，认证后进入工作台。

<a id="配置模型"></a>

在「设置 → 模型」添加服务地址、模型名称和 API Key。Agent 执行任务需要模型支持 **Tool Calling**；模型凭据与量子云凭据分别配置。无需模型密钥也可以先运行下方的[固定本地案例](#跑通第一个任务)。

<a id="桌面客户端"></a>
<a id="量子学习通安装"></a>

<details>
<summary><strong>可选入口：源码桌面、学习通与消息渠道</strong></summary>

| 入口 | 源码目录中的准备 / 启动命令 | 详细说明 |
| --- | --- | --- |
| 桌面客户端 | `npm run desktop:setup` → `npm run desktop:verify-install` → `npm run desktop -- --source` | [源码构建与运行条件](docs/DEPLOYMENT.md#方式三原生桌面工作台) |
| 量子学习通 | `npm run learning:ui:setup` | [教学应用、启动与数据备份](docs/integrations/OPENMAIC.md) |
| 微信、飞书等消息渠道 | `npm run cc-connect:setup` | [渠道连接与凭据配置](docs/integrations/CC_CONNECT.md) |

源码桌面另需 Corepack 与系统 C++ 构建工具。Web 与源码 Desktop 共用本机 Home，切换入口前先退出正在运行的进程。各入口的完整步骤以对应文档为准。

</details>

[模型与部署配置](docs/DEPLOYMENT.md) · [按需准备计算环境](docs/integrations/LOCAL_ENVIRONMENTS.md) · [升级与数据保留](docs/UPDATES.md) · [故障排查](docs/TROUBLESHOOTING.md)

<a id="openquantum-的核心能力"></a>
<a id="已集成的量子工具与能力"></a>

## 可以用它做什么

按任务选择能力，使用既有计算入口，或通过 SDK 工作台编写自己的研究程序。

| 研究任务 | 代表能力与使用入口 | 需要核对的边界 |
| --- | --- | --- |
| <a id="算法学习与方法比较"></a>学习算法、比较方法 | [49 项可执行示例](examples/quantum-algorithms/README.md)：QFT、HHL、VQE、QAOA、QSP、态制备等 | 默认输入用于教学；实际误差、收敛和方法适用条件逐项检查 |
| 电路编译、仿真与信息分析 | Qiskit、PennyLane、PyZX、Graphix、QCEC、密度矩阵审计；[任务与接口](docs/CAPABILITIES.md#电路与量子信息) | 门集、位序、噪声模型与等价性检查范围 |
| 基态、化学与多体计算 | VQE、SQD、TeNPy、OpenFermion；[方法选择](docs/CAPABILITIES.md#基态化学与优化) | 活性空间、粒子扇区、收敛和独立参考 |
| 分子激发态与光谱 | [SlowQuant](.agents/skills/slowquant-response/SKILL.md)：酉波函数、量子线性响应、跃迁性质与吸收谱 | 活性空间、响应近似与独立参考；[使用与验证边界](docs/integrations/SLOWQUANT.md) |
| 误差缓解与量子纠错 | Mitiq、Stim / PyMatching、LDPC、Chromobius；[纠错能力](docs/CAPABILITIES.md#误差缓解与量子纠错) | 采样预算、统计误差及解码器的适用模型 |
| <a id="纠错模型静态诊断"></a>检查 detector error model | [emlint](.agents/skills/emlint-dem-audit/SKILL.md)：结构诊断、反例及不完整检查状态 | 保留告警、跳过项和缺失上下文；不证明码距或解码正确性 |
| 动力学与实验模拟 | Trotter / qDrift、Dynamiqs、OQuPy、Bloqade、Pulser、PairInteraction；[模拟与硬件入口](docs/CAPABILITIES.md#哈密顿量模拟与开放系统) | 单位、截断、时间步长；模拟与真实设备操作分别说明 |
| 光子计算与量子网络 | Perceval、Piquasso、Lightworks、SimQN、NetQASM；[使用范围](docs/CAPABILITIES.md#光子计算与量子网络) | 后端、损耗模型、采样与网络协议 |
| <a id="数学与物理形式化"></a>形式化数学与物理命题 | [Lean 4、mathlib、physlib](.agents/skills/lean-physics/SKILL.md)：复用定理、检查证明与依赖公理 | 证明只覆盖文件中的定义、假设和公理，不证明物理模型真实 |
| 查询方法与公开基准 | [Quantum-Practices 与 Metriq](docs/CAPABILITIES.md#参考资料与选型) | 固定资料和历史记录，不代表当前设备性能 |
| <a id="量子学习通"></a>组织教学材料与课堂 | [量子学习通 / OpenMAIC](docs/integrations/OPENMAIC.md)：材料、课件、测验与课堂 | 完整课程体系仍在建设，真实在线 AI 教学流程尚未完整验收 |

SlowQuant 使用 `slowquant-response` 入口：先显式运行 `node scripts/setup-sdk.mjs slowquant-response`，再通过 SDK 工作台运行自定义程序。已验证小规模离线响应；Qiskit 分子谱学与硬件另行核验。

<a id="能力接口目录"></a>
<a id="内置-skills"></a>
<a id="mcp-服务目录"></a>
<a id="原生量子-tools"></a>

当前源码分发 **187 个内置 Skill、91 个 MCP 服务连接、5 个原生量子 Tool**，并为 **115 个 SDK/源码环境**提供原生 API 使用路径。清单数量、配置启用、环境就绪与科学验收是不同状态；每项能力按需准备，平台、账户和许可限制见对应说明。

[完整 Skill 目录](docs/CAPABILITIES.md#内置-skills) · [MCP 服务及默认开关](docs/CAPABILITIES.md#mcp-服务目录) · [原生 Tool 与副作用](docs/CAPABILITIES.md#原生量子-tools) · [SDK API 与逐库验证](docs/integrations/FULL_SDK_ACCESS.md) · [相近方法怎么选](docs/integrations/CAPABILITY_SELECTION.md)

<a id="从一个量子任务开始"></a>
<a id="更多可复制的计算任务"></a>

## 跑通第一个任务

### 无需模型密钥：复算基态案例

完成源码的 `npm ci` 后，运行固定二量子位 VQE 案例，并与独立参考比较：

```bash
npm run demo:quantum-ground-state
```

该命令给出本地计算及逐项检查；完整科学验收还需要会话来源和可重读的验收报告。[输入、历史结果与验证边界](docs/EXAMPLES.md#不需要模型密钥复算一个固定案例)均已保留。

### 让 Agent 执行：Bell 态采样

在源码目录先显式准备 FatQat 的固定环境（需要 uv），再在已配置模型的工作台中发起任务：

```bash
node scripts/setup-paper-tools.mjs fatqat-workbench
```

> 用 FatQat 从双量子位全零态出发，对 q0 施加 H，再以 q0 为控制位、q1 为目标位施加 CX。返回无噪声精确概率，并用 1024 次采样、seed=7 比较频数。

理想概率是 `00`、`11` 各 50%，有限采样会波动。查看实际 Tool 调用、输入和输出，再调整参数比较结果。[完整说明与更多可复制任务](docs/EXAMPLES.md) · [直接运行 HHL 等算法示例](docs/EXAMPLES.md#直接运行开源算法示例)

<a id="执行记录与科学验收"></a>

## 使用与结果

日常使用遵循 **发现 → 准备 → 执行**：先查能力和条件，再为所选 SDK 准备依赖与连接，最后执行计算。环境缺失时按提示准备；计算调用本身不隐式安装本地科学依赖。

- **看实际执行记录。** 配置启用和模型的文字回复，不能替代 Tool 调用、程序与结果文件。
- **分清检查范围。** 工程 CI、数值参考对照、形式证明和科学验收分别说明。只有支持完整证据链的能力，才能按相应合同产生科学验收结论。
- **保留可复算材料。** 记录输入、单位、随机种子、依赖版本、程序、结果和检查状态，也保留失败与负结果。
- **按需连接外部资源。** 本地数值计算无需量子云账户；真实硬件和付费服务需要另行配置凭据、权限及额度。

[结果与证据说明](docs/EXAMPLES.md#方法与结果可以继续复用) · [能力与宿主边界](docs/README.md) · [常见问题](docs/TROUBLESHOOTING.md)

<a id="optimization-cases"></a>
<a id="pennylane-rust-case"></a>
<a id="qutip-rust-case"></a>

## 实测案例

针对固定科研计算的优化，公开完整调用计时、输出和独立参考检查，便于复跑与评估。

| 计算任务 | 原实现 → 优化后 | 测量条件与证据 |
| --- | --- | --- |
| PennyLane Pauli 对易子 | 30.62 ms → **6.02 ms（5.09 倍）** | 32 量子位局域模型；Apple M4、PennyLane 0.45.1、9 轮热运行中位数；[程序、原始计时与独立核验](experiments/pennylane-rust-commutator/README.md) |
| QuTiP Wigner 函数 | 171.77 ms → **30.18 ms（5.69 倍）** | 64 维 Fock 空间、201×201 网格；Apple M4、QuTiP 5.3.1、单线程、9 轮热运行中位数；[程序、原始计时与独立核验](experiments/qutip-rust-wigner/README.md) |

两项计时包含输入输出转换，不含环境准备与编译；收益限于各报告定义的任务与条件，不能推广为所有量子计算的加速比。

<a id="把你的量子能力接进来"></a>
<a id="一起建设-openquantum"></a>
<a id="开发与验证"></a>

## 开发与贡献

优先复用社区已有实现，让研究方法进入共享插件，再适配 DSH、Codex 等宿主。共享实现只维护一份，不新增通用 Agent Runtime。

| 你想贡献什么 | 从哪里开始 |
| --- | --- |
| 领域方法、操作步骤或工具选择 | 编写 Skill；[贡献指南](CONTRIBUTING.md)与[现有 Skill](.agents/skills/README.md) |
| 计算、查询或设备动作 | 按边界选择原生 Tool Provider 或 MCP Server；[扩展模型](docs/architecture/EXTENSION_MODEL.md) |
| 科学检查与验收 | 使用 Validator、科学合同与相应证据链；[四条贡献路径](docs/README.md#四条贡献路径) |
| 应用、课程或可复算案例 | 说明用户任务、输入输出、来源、许可与验证范围；[GitHub Issues](https://github.com/xi-zhao/OpenQuantum/issues) |

按改动选择检查；全仓质量入口为 `npm run check`，具体数值与宿主验证见[开发验证示例](docs/EXAMPLES.md#开发与验证)。新增能力需同步本页的任务说明与使用入口；逐项接口、依赖和验证细节放入[能力参考](docs/CAPABILITIES.md)及对应接入文档。

<a id="长期发展规划"></a>
<a id="rsi"></a>

长期方向包括专业软件接入、量子与经典计算协同、教学应用和经验证的研究能力改进。**完整 RSI 闭环尚未实现**；愿景、评估条件与权限边界见[长期发展规划](docs/roadmap/VISION.md)。

## 文档导航

| 想查什么 | 文档 |
| --- | --- |
| 安装、部署、升级与故障 | [Desktop](docs/DESKTOP_INSTALLERS.md) · [Codex](docs/integrations/CODEX_AGENT_INSTALL.md) · [部署](docs/DEPLOYMENT.md) · [升级](docs/UPDATES.md) · [排障](docs/TROUBLESHOOTING.md) |
| 能力、接口、SDK 与准备条件 | [能力参考](docs/CAPABILITIES.md) · [完整 SDK](docs/integrations/FULL_SDK_ACCESS.md) · [环境准备](docs/integrations/LOCAL_ENVIRONMENTS.md) |
| 任务、结果与验证命令 | [任务示例](docs/EXAMPLES.md) · [算法示例](examples/quantum-algorithms/README.md) |
| 架构、代码归属与贡献规则 | [文档总入口](docs/README.md) · [全项目架构图](docs/architecture/PROJECT_ARCHITECTURE.md) · [贡献指南](CONTRIBUTING.md) |
| 版本变化与长期方向 | [GitHub Releases](https://github.com/xi-zhao/OpenQuantum/releases) · [长期规划](docs/roadmap/VISION.md) |
| 界面与截图来源 | [图片说明](docs/images/README.md) |

<a id="开源生态与致谢"></a>

## 开源生态与许可

OpenQuantum 建立在量子开源社区和宿主平台的工作之上，保留原作者、项目来源与贡献归属。[上游项目及适配关系](docs/CAPABILITIES.md#开源生态与致谢)与 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) 集中列出来源和许可。

自有代码除单独声明的目录外采用 [MIT License](LICENSE)，© 2026 Xi Zhao。Mitiq 能力目录采用 [GPL-3.0-only](.agents/skills/mitiq-error-mitigation/LICENSE)，Metriq 数据快照采用 [CC-BY-4.0](src/metriq-data/upstream/LICENSE)；对应 NOTICE 与发行约束继续适用。

欢迎贡献问题、代码、教学材料和复现记录。只分享已获授权的内容，安全问题按[安全政策](SECURITY.md)私密报告。

**OpenQuantum · 量子计算，就在指尖。**
