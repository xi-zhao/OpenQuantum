<h1 align="center">
  <img src="./packages/openquantum-web-branding/assets/lockup.svg" width="430" alt="OpenQuantum" />
</h1>

<p align="center">
  <strong>量子计算，就在指尖</strong><br />
  <sub>Quantum computing, right at your fingertips.</sub>
</p>

<p align="center">
  面向量子研究者、实验室与技术团队的开源科研 Agent 工作台<br />
  把量子工具组织成工作流，把计算结果连接到可复核的证据
</p>

<p align="center">
  <a href="https://github.com/xi-zhao/openQuantum/actions/workflows/ci.yml"><img src="https://github.com/xi-zhao/openQuantum/actions/workflows/ci.yml/badge.svg" alt="CI status" /></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT-111111.svg" alt="MIT License" /></a>
  <img src="https://img.shields.io/badge/Node.js-24%2B-3c873a.svg" alt="Node.js 24 or newer" />
</p>

<p align="center">
  <a href="#为什么是-openquantum">为什么 OpenQuantum</a> ·
  <a href="#快速开始">快速开始</a> ·
  <a href="#从一个真实任务开始">运行证据</a> ·
  <a href="#模型由你选择">模型选择</a> ·
  <a href="#已集成的量子工具与能力">量子能力</a> ·
  <a href="#把你的量子能力接进来">扩展开发</a> ·
  <a href="./docs/README.md#架构总览">架构</a> ·
  <a href="./docs/communications/openquantum-wechat-launch.md">项目故事</a> ·
  <a href="./CONTRIBUTING.md">参与贡献</a>
</p>

**OpenQuantum 是一个开源的量子科研 Agent 工作台，让研究者从自然语言提出任务，经由真实工具执行，走向有依据、可追溯的结果。** 你可以从桌面、网页或配置好的微信、飞书入口使用它，也可以接入自己的模型、算法和科研工作流。

一项量子任务，往往要跨过 SDK 文档、计算脚本、运行环境和云端接口。得到一个数字之后，还要回答：用了什么输入和方法？工具是否真的执行？结果通过了哪些检查？

OpenQuantum 把这些环节组织在同一个工作台里：Agent 理解任务，量子工具负责计算，执行轨迹记录过程；具备完整科学验收流程的能力，再用独立检查和结构化证据支持结论。研究者可以把注意力放回问题本身，团队也能把方法、工具和检查规则一起留在代码仓库中。

它基于 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 构建：Harness 负责通用 Agent 运行机制，OpenQuantum 聚焦量子领域的工作方法、工具接入和科学证据。[架构总览](docs/README.md#架构总览)解释了两者的清晰分工。

**先体验一个本地量子任务 → [快速开始](#快速开始)**　｜　**把自己的能力接进来 → [贡献指南](CONTRIBUTING.md)**

当前以源码分发，适合本地试用与二次开发。真实硬件和付费任务入口默认关闭；已有完整科学验收流程的能力是限定的量子基态求解与量子信息审计，不代表所有任务都已实现科学验收。

## 为什么是 OpenQuantum

### 更容易开始一项量子任务

从检查电路、构建 QUBO，到模拟量子纠错实验，已接入的工具可以由 Agent 在对话中调用。桌面、Web 与消息渠道复用同一套领域能力；换一个入口，不需要另写一套算法和工作方法。模型地址与凭据由使用者配置，依赖和权限要求在能力目录中明确说明。

### 让结果有据可查

一次工具调用是否完成，与一个科学结论是否成立，是两件事。OpenQuantum 保留执行轨迹，并在完整验收能力中把输入、结果文件、独立检查与来源链连起来。你可以查看结果，也可以追问它是怎样得到的、哪些条件仍然没有验证。

### 让方法成为团队可以复用的能力

把领域经验写成 Skill，把确定性操作接成 Tool，把检查规则留在 Validator 和验收合同中。团队可以在同一个仓库里审查、版本化和扩展这些内容；模型或使用入口的变化，不需要重新定义科学规则。这里的复用依靠开放代码与明确接口，不依赖一个专有的插件市场。

| 如果你是 | 可以从这里开始 | 希望留下什么 |
| --- | --- | --- |
| 量子研究者 | 用已有电路、优化与量子信息工具完成一个有界任务 | 输入、结果和可追溯的执行记录 |
| 高校实验室或科研团队 | 把常用步骤、算法和检查规则组织成能力 | 能被同事理解、审查和继续维护的科研方法 |
| 量子软件、硬件或平台团队 | 通过明确的 Tool 与模型接口扩展工作台 | 基于开放代码、围绕自身设备与服务构建的产品 |

团队复用指代码与工作流复用；当前本地部署不是面向不受信任用户的多租户托管服务。

## 从一个真实任务开始

以仓库内固定的[二量子位 Pauli Hamiltonian](.agents/skills/quantum-ground-state/evals/fixtures/requests/protocol-fixture.json)为例，OpenQuantum 在指定粒子扇区内运行无噪声 VQE，再用独立闭式计算作为参考。下面的数值来自这一个有界案例，任务结果、工具调用和科学验收可以沿同一条轨迹复核。

<table>
  <tr>
    <td align="center"><strong>-1.85727503 Ha</strong><br /><sub>VQE 能量</sub></td>
    <td align="center"><strong>-1.85727503 Ha</strong><br /><sub>独立精确参考</sub></td>
    <td align="center"><strong>4.44 × 10⁻¹⁶ Ha</strong><br /><sub>能量差</sub></td>
    <td align="center"><strong>通过</strong><br /><sub>科学验收</sub></td>
  </tr>
</table>

<p align="center">
  <img src="./docs/images/openquantum-quantum-result.jpg" width="720" alt="OpenQuantum 运行量子基态任务并完成科学检查" />
</p>

<p align="center"><sub>真实运行画面　从任务结果到独立科学检查</sub></p>

这个案例展示的是从输入、工具执行到科学证据的完整路径，不是通用分子求解、量子优势或真实硬件性能的证明。你可以用 `npm run demo:quantum-ground-state` 先运行同类本地参考流程；模型驱动的完整 Harness 验收需要另行配置模型。

## 模型由你选择

OpenQuantum 不把量子能力绑定到一个模型。你可以在设置中心管理模型服务地址、凭据引用与模型标识，由 Harness 的 Model Provider Route 接入；领域工具与科学验收规则保持独立。支持的协议以当前 Harness Adapter 为准，具体服务是否可用需要实测。

2026-09-05 的一轮受控网关测试，以 **10 个模型标识为固定分母**：

| 检查层次 | 本轮结果 | 它证明什么 |
| --- | --- | --- |
| 文本、函数调用与工具结果回传 | 8/10 通过 | 基础对话与工具协议能够完成往返 |
| 真实 Harness 科学执行链 | 6/10 通过 | 固定量子任务形成了可重读、验收通过的证据 |
| 严格端到端验收 | 4/10 通过 | 同时满足输入一致、恰好调用一次、任务正常完成和指定回复格式 |

严格通过的网关模型标识为 `kimi-k3`、`deepseek-v4-pro`、`deepseek-v4-flash` 和 `glm-5.1`。这是一次固定案例的兼容性记录，不是默认模型清单、模型能力排名或其他服务商的兼容承诺；网关别名也不能证明底层模型身份。权限、输出格式与预算限制分别记录在[脱敏验收摘要](docs/integrations/MODEL_COMPATIBILITY_2026-09-05.md)中。

服务地址和真实密钥由使用者在本地配置；仓库不附带本次测试网关地址、密钥或账户信息。

## 快速开始

准备 Git、Node.js 24，以及用于启动 Qiskit 工具的 [uv / uvx](https://docs.astral.sh/uv/getting-started/installation/)。

```bash
git clone https://github.com/xi-zhao/openQuantum.git
cd openQuantum
npm ci
npm run dev
```

浏览器打开 <http://127.0.0.1:3000>。

模型地址、模型密钥、MCP Server 连接、Skill 和量子云凭据都可以从设置中心管理。量子组件默认先展示当前 Model、Skill、Tool Registry 的只读运行证据，再把 MCP Server 连接、Skill 加载策略和安全凭据分栏配置；“配置已启用”不会被当成“当前已就绪”。密钥保存在本地环境或 DeepSeek Harness 凭据库中，项目配置只保留凭据引用。

如果不用设置中心，而是通过本地环境文件配置模型，macOS 终端运行 `cp .env.example .env`，Windows PowerShell 运行 `Copy-Item .env.example .env`，再填写需要的值。

### 也可以直接打开桌面客户端

请按[桌面客户端](#桌面客户端)中的完整源码安装流程执行。客户端能力、状态共享边界与故障检查见[部署与启动](docs/DEPLOYMENT.md)。

还没有配置模型时，也可以先运行无需模型密钥、无需云端 QPU 的本地量子示例：

```bash
npm run demo:quantum-ground-state
```

安装好 `uv` 后，可以单独检查 Qiskit 接入；首次运行可能下载依赖：

```bash
npm run mcp:qiskit:probe
```

### 把量子计算带进微信、飞书和更多消息平台

OpenQuantum 集成了 [CC Connect](https://github.com/chenhg5/cc-connect)。它通过标准 ACP 连接 DeepSeek Harness，让手机里的对话直接通向 OpenQuantum 已有的 Skill Provider、Tool Provider 和科学验收流程。

```bash
npm run cc-connect:setup
npm run cc-connect:feishu
npm run cc-connect:start

# 在另一个终端打开本地管理后台，继续管理消息平台及其凭据
npm run cc-connect:web
```

飞书也可以替换为微信、钉钉、企业微信、Slack、Telegram、Discord、QQ 等 CC Connect 支持的平台。第一项平台需要先按上游方式完成配置，服务才会启动。消息平台的 Token 只保存在被 Git 忽略的 CC Connect 本地配置中。详细说明见[消息渠道接入](docs/integrations/CC_CONNECT.md)。

Linux 用户也可以让容器通过 host network 在本机回环地址运行。Harness 不允许监听 `0.0.0.0`，因此这不是远程服务器暴露方式。

```bash
cp .env.example .env
docker compose up --build
```

更完整的启动方式见[部署与启动](docs/DEPLOYMENT.md)。模型 Provider、MCP Server 与 Harness MCP Client 连接、凭据或 Harness 遇到问题时，可以从[故障排查](docs/TROUBLESHOOTING.md)快速找到对应入口。

## 桌面客户端

OpenQuantum 可从源码启动 macOS 和 Windows 桌面客户端，提供系统托盘、原生终端和桌面通知。桌面窗口使用同一套 Session、量子能力、模型设置和科学验收；当前不提供 OpenQuantum 品牌的 `.dmg` 或 `.exe` 安装包。

桌面客户端基于社区开源的 [DSH Desktop](https://github.com/anywhere-labs/deepseek-harness-desktop) 适配。OpenQuantum 只接入桌面宿主，不复制 Harness Runtime，也不维护另一套会话和科研状态。

<details>
<summary><strong>展开桌面客户端源码安装步骤</strong></summary>

当前发布方式是从 OpenQuantum 仓库启动客户端，不是下载 `.dmg` 或 `.exe` 安装包。请先安装 [Git](https://git-scm.com/downloads) 和 Node.js 24，然后执行：

```bash
git clone https://github.com/xi-zhao/openQuantum.git
cd openQuantum
npm ci --include=dev
npm run desktop:verify-install
npm run desktop
```

首次启动会准备 Desktop profile，并可能继续下载 Electron 运行文件；终端出现这类提示时保持窗口开启即可。客户端打开后，在“设置 → 模型”中配置 Provider。要使用内置 Qiskit 等量子工具，还需要安装 [uv / uvx](https://docs.astral.sh/uv/getting-started/installation/)。

如果希望通过本地 `.env` 提供模型配置，macOS 终端运行 `cp .env.example .env`，Windows PowerShell 运行 `Copy-Item .env.example .env`，再填写所需值；直接使用设置中心时不需要创建 `.env`。

不要使用 `npm install -g dsh-plugin-desktop` 或 `npx dsh-plugin-desktop` 代替上面的命令：那会启动上游默认客户端，不会加载 OpenQuantum Agent Preset、Skill Provider、Tool Provider 和科学验收组合。OpenQuantum 品牌安装包仍属于后续发布工作。

Web 与 Desktop 共用 `.openquantum/dsh` 中的本地状态，请先停止 `npm run dev` 再切换到桌面客户端。

</details>

## 让微信成为量子计算的入口

手机可以成为发起任务的入口。配置好消息渠道和运行环境后，你可以在微信或飞书中提出请求，由 OpenQuantum 调用已启用的量子工具，执行记录仍可在工作台中查看。

```text
你在微信里提出问题
  → OpenQuantum 判断应该使用哪个 Skill
  → DeepSeek Harness 调用原生或由 MCP Server 暴露的 Tool
  → 结果回到对话，完整执行轨迹留在工作台
```

你可以让它检查一段 OpenQASM 电路，比较不同转译方案，查询 IBM Quantum、IonQ 或国内量子云后端，也可以运行 OpenQuantum 已验收的量子基态算法。需要真实硬件或付费服务时，再由使用者配置对应凭据并明确开启。

消息渠道通过 [CC Connect](docs/integrations/CC_CONNECT.md) 和标准 ACP 接入 Harness，复用已有的工具与科学规则，不另建一套执行系统。

## 近期能力升级：从能调用到能复核

先按科研问题选择能力，再看它的使用条件和证据范围。已有能力覆盖以下任务，具体来源与默认开关见后面的集成目录。

| 科研任务 | 使用的能力 | 用户现在可以做什么 | 证据范围 |
| --- | --- | --- | --- |
| 检查量子态 | toqito + 独立科学检查 | 检查密度矩阵合法性、纯度、部分转置谱和 negativity | Bell 态参考案例与篡改负例；可物化完整验收报告 |
| 构建约束优化问题 | QPanda QUBO + 独立枚举 | 把命名目标与线性等式约束编译成 QUBO，检查 penalty 并比较求解结果 | 有界二值问题的计算与独立复核，不作量子加速承诺 |
| 检查电路重写 | MQT QCEC | 检查两份无测量 OpenQASM 2 电路的等价性 | 有界 unitary 电路；可能返回等价、不等价或信息不足 |
| 运行量子纠错实验 | Stim + PyMatching | 运行 surface-code memory 采样和 MWPM 解码，报告有限 shots 统计 | 固定参数、seed 与统计区间；不把一次采样当作 threshold |
| 探索超导调校流程 | QMClaw 工作流与本地模拟 | 组织 S21、Rabi、Ramsey、T1、DRAG、RB 等 13 类实验 | 有界合成数据模拟；真实仪器和参数写回未开启 |
| 维护电路能力回归 | MQT Bench 固定语料 | 用同一批 GHZ-3、QFT-3、BV-4 案例检查版本变化 | 固定 3-case manifest；开发证据，不是科研性能排名 |

目前量子基态与量子信息审计具备两条完整 L3 科学验收流程。其他能力的计算级检查与最终科学验收分开记录；缺少结果文件和 Session 来源链时，保留 `provenance.not_checked`。固定版本、测试与能力等级见[架构审计](docs/architecture/ARCHITECTURE_AUDIT.md)。

## 已集成的量子工具与能力

Qiskit、FieldQKit、QPanda、QMClaw 与 OpenQuantum 自有能力按各自职责接入。目录里的“连接配置开启”只表示加载策略，不保证当前环境、凭据或外部服务已经就绪；首次使用前请在设置中心查看运行证据。

<details>
<summary><strong>查看完整集成目录、来源与默认开关</strong></summary>

| 组件 | 来源与集成方式 | 可以完成的事情 | 默认配置 / 执行位置 |
| --- | --- | --- | --- |
| Qiskit Circuits | [Qiskit 官方 MCP Server](https://github.com/Qiskit/mcp-servers) · Harness MCP Client + OpenQuantum Skill | 创建、读取、转换和分析 OpenQASM 3 / QPY 电路，比较转译结果 | 连接配置开启，无需凭据 |
| Qiskit Docs | [Qiskit 官方 MCP Server](https://github.com/Qiskit/mcp-servers) · Harness MCP Client | 查询 Qiskit API、迁移说明、错误码和 IBM Quantum 文档 | 连接配置开启，无需凭据 |
| 量子电路等价性验证 | [MQT QCEC](https://github.com/munich-quantum-toolkit/qcec) · 固定版本 + 本地 MCP Server + Harness MCP Client + OpenQuantum Skill | 检查两份有界、无测量 OpenQASM 2 电路是否严格等价、相位等价或不等价 | 连接配置开启，本地运行 |
| 量子信息审计 | [toqito](https://github.com/vprusso/toqito) · 固定版本 + 本地 MCP Server + Harness MCP Client + Validator + Materializer + agent-scoped Host Plugin + 内部 Scientific Result Adapter + Acceptance Profile + central Acceptance Builder | 审计有界密度矩阵的迹、Hermiticity、正半定性、纯度、部分转置谱和 negativity，并生成 Result Package、Acceptance Report 与回放投影 | 连接配置开启，本地运行 |
| QEC Memory 实验 | [Stim](https://github.com/quantumlib/Stim) + [PyMatching](https://github.com/oscarhiggott/PyMatching) · 固定版本 + 本地 MCP Server + Harness MCP Client + OpenQuantum Skill | 运行有界 rotated surface-code X/Z memory 实验、MWPM 解码和有限 shots 逻辑错误率统计 | 连接配置开启，本地运行 |
| FieldQKit | [FieldQuantum](https://github.com/FieldQuantum/fieldqkit) · 固定上游提交 + 非破坏性桥接 | 发现国内量子云后端，按量子位筛选，查看拓扑和校准摘要 | 云端只读；首次发现可能写入固定本地 Python 环境 |
| TyxonQ Local | [TyxonQ](https://github.com/QureGenAI-Biotech/TyxonQ) · 固定 PyPI 版本 + 本地 MCP Server + Harness MCP Client + OpenQuantum Skill | 运行小规模 statevector 电路、有限 shots 与 density-matrix 噪声仿真 | 连接配置关闭，本地能力已接入 |
| QMClaw 超导测控 | [QMC-AI/QMClaw](https://github.com/QMC-AI/QMClaw) · 固定审阅提交 + OpenQuantum Skill + 原生 Tool Provider | 运行 13 类有界、带 seed 的超导量子比特实验模拟，组织单比特调校流程 | Tool 默认注册，仅合成数据；LabRAD、参数写回和真实仪器关闭 |
| IBM Runtime | [Qiskit 官方 MCP Server](https://github.com/Qiskit/mcp-servers) · Harness MCP Client + 凭据设置 | 查询 IBM 后端，向 IBM Quantum 提交任务 | 连接配置关闭，远程执行 |
| IBM Transpiler | [Qiskit 官方 MCP Server](https://github.com/Qiskit/mcp-servers) · Harness MCP Client + 凭据设置 | 使用 IBM Quantum AI Transpiler 路由和优化电路 | 连接配置关闭，远程执行 |
| Quantum Hardware MCP | [社区项目](https://github.com/Lokesh-2025/quantum-hardware-mcp) · 固定审阅提交 + 安全开关 | 查询 IBM Quantum 与 IonQ 设备，可选提交、取消任务和估算成本 | 连接配置关闭，远程执行 |
| QPanda3 Runtime | [OriginQ 官方 MCP Server](https://github.com/OriginQ/qpanda3-runtime-mcp-server) · Harness MCP Client + 固定审阅提交 + 凭据设置 | 查询本源悟空 QPU 设备，向本源量子云提交采样、期望值与批量任务并管理任务 | 连接配置关闭，远程执行 |
| QPanda3 编程 Skill | [OriginQ 官方 Skill](https://github.com/OriginQ/pyqpanda3-skill) · 固定提交检出到 .agents/skills | pyqpanda3 电路构建、QAOA/Grover/VQE/QSVM 算法模板、pyqpanda→pyqpanda3 迁移与 QCloud 使用指导 | 尚未加载，需运行 setup |
| QPanda QUBO | [pyqpanda_alg](https://github.com/OriginQ/pyqpanda-algorithm) · 固定版本 + 本地 MCP Server 桥 + Harness MCP Client + OpenQuantum Skill | 把命名目标和线性等式约束编译成 QUBO，独立枚举检查可行最优与 penalty，再运行经典求解或可选 QAOA | 连接配置开启，本地运行 |
| Qiskit Gym | [Qiskit 官方 MCP Server](https://github.com/Qiskit/mcp-servers) · Harness MCP Client | 探索强化学习量子电路综合与优化 | 连接配置关闭，远程依赖 |
| 量子基态求解 | OpenQuantum 自研 · Skill + 原生 Tool Provider + Validator + Materializer + agent-scoped Host Plugin + 内部 Scientific Result Adapter + Acceptance Profile + central Acceptance Builder | 用一个原子 Tool 求解限定的二量子位 Hamiltonian、运行独立检查，并生成可回放 Result Commit 与 Acceptance Report | Tool 默认注册，本地运行 |
| 量子 SDK 选型 | OpenQuantum 自研 · Skill | 比较 Qiskit、Cirq、PennyLane、Q#、Braket、CUDA-Q 等工具 | 自动加载允许 |
| 固定量子能力 Benchmark | [MQT Bench](https://github.com/munich-quantum-toolkit/bench) · 固定 3-case QASM 语料 + manifest + 离线校验 | 为电路能力回归提供固定分母，分列交付、语义正确性、Validator 稳定性和 benchmark 版本 | CI 启用，不注册为 Agent Tool |

第三方组件保留原项目的版权与许可证。对应的版本、来源和 OpenQuantum 集成内容记录在 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

</details>

<table>
  <tr>
    <td width="50%" align="center">
      <img src="./docs/images/openquantum-quantum-settings.jpg" width="100%" alt="OpenQuantum 量子组件设置中心" />
    </td>
    <td width="50%" align="center">
      <img src="./docs/images/openquantum-trajectory.jpg" width="100%" alt="OpenQuantum Harness 量子任务执行轨迹" />
    </td>
  </tr>
  <tr>
    <td align="center"><sub>量子 Skill、MCP Server 连接与安全凭据</sub></td>
    <td align="center"><sub>从用户请求追溯到 Tool 结果</sub></td>
  </tr>
</table>

## 可以连接哪些量子后端

OpenQuantum 为本地模拟、IBM Quantum、IonQ 和多家国内量子云保留明确的接入边界：先发现后端，再由使用者决定是否配置并启用任务接口。下表是集成范围，不是这些服务当前在线可用的证明。

<details>
<summary><strong>查看量子后端与凭据要求</strong></summary>

| 后端 | 当前能力 | 凭据或使用条件 |
| --- | --- | --- |
| 本地模拟器 | 查看模拟器元数据，运行本地量子基态参考能力 | 无需凭据 |
| IBM Quantum | Runtime、AI Transpiler、硬件查询，可选真实任务提交与取消 | `QISKIT_IBM_TOKEN`，任务类 MCP Server 连接按需开启 |
| IonQ | 硬件查询，可选真实任务提交、取消与成本估算 | `IONQ_API_KEY`，任务类 MCP Server 连接按需开启 |
| 夸父量子云 | 凭据检查、后端发现、量子位筛选、拓扑与校准摘要 | `QUAFU_API_TOKEN`，只读 |
| 天衍量子云 | 凭据检查、后端发现、量子位筛选、拓扑与校准摘要 | `TIANYAN_API_TOKEN`，只读 |
| 国盾量子云 | 凭据检查、后端发现、量子位筛选、拓扑与校准摘要 | `GUODUN_API_TOKEN`，只读 |
| 腾讯量子云 | 凭据检查、后端发现、量子位筛选、拓扑与校准摘要 | `TENCENT_API_TOKEN`，只读 |
| 本源量子云 | 只读后端发现（FieldQKit）；另经 QPanda3 Runtime MCP Server 查询悟空 QPU，并可选提交采样、期望值与批量任务 | `ORIGIN_API_TOKEN` 只读发现；`QPANDA3_API_KEY` 可选开启真机任务 |
| FieldQuantum | 云端模拟后端发现 | `FIELDQUANTUM_API_TOKEN`，只读 |
| 逻辑比特量子云 | 凭据检查、后端发现、量子位筛选、拓扑与校准摘要 | `LOGICALQUBIT_API_TOKEN`，只读 |

</details>

硬件任务和付费服务按需开启。后端发现类能力保持只读，适合先了解设备、拓扑和校准信息，再决定是否进入真实任务流程。

这里的“只读”仅指不改变云端/QPU 状态。部分固定 Python 能力会在首次调用时由 `uv` 下载依赖并在
`.openquantum/python-envs/` 创建环境，因此 Tool 合同按完整调用如实声明为 `workspace-write`；环境准备完成后，
科学计算本身仍不写外部系统。

例如，本源量子（OriginQ）官方的 [QPanda3 Runtime MCP Server](https://github.com/OriginQ/qpanda3-runtime-mcp-server) 已接入且默认关闭。可以通过 `npm run mcp:qpanda-runtime:setup` 检出固定审阅提交，再配置凭据并验证连接；真实任务需要可用账户、额度与明确授权。候选能力及取舍见[量子能力清单](docs/ecosystem/QUANTUM_CAPABILITY_CATALOG.md)。

## 每一步，都看得见

做量子任务时，一个结果往往不够。OpenQuantum 会把用户请求、Skill 加载、工具调用、权限状态和返回结果连成一条清晰的执行轨迹。

使用者可以知道 Agent 调用了什么，开发者也可以沿着这条轨迹定位模型、工具、权限和外部服务中的问题。对科研工作来说，这份过程记录和最终数字一样重要。

## 运行完成之后，还有科学验收

OpenQuantum 把任务运行和科学验收分开显示。`quantum-ground-state` 是一个小而完整的参考能力，它在固定扇区内运行二量子位无噪声 statevector VQE，再用独立程序检查能量、态矢、收敛轨迹和数值残差。

当前已有两条完整 L3 科学验收纵切：明确限定的二量子位实 Pauli Hamiltonian，以及有界密度矩阵的量子信息审计。QUBO、电路等价性验证和 QEC memory 实验目前具备计算级独立 observations，但在结果文件和 Session Event Log 来源链没有物化时不会自行升级成最终 Acceptance。这个分层展示了一项量子能力怎样从计算、证据一路走到可复核结论，也为社区开发更丰富的 Skill、Tool Provider 和 Validator 提供了可以直接参考的起点。

## 把你的量子能力接进来

OpenQuantum 沿用 DeepSeek Harness 的“一切皆 Plugin”装配方式：可组合能力统一通过 Cordis Plugin 进入
Runtime、获得依赖并随 scope 回收；但 Plugin 只是装配机制，产品职责按下面六组理解：

| 层级 | 核心对象 | 它解决什么问题 |
| --- | --- | --- |
| 产品 | Capability、Application Interface | 用户获得什么能力；同一用例的规则由谁统一拥有 |
| 装配 | Cordis Plugin、Agent Preset、Deployment Composition | 模块怎样进入 Runtime，以及 Agent/Host 分别组合什么 |
| Agent Interface | Skill、Tool | Agent 怎样理解任务；唯一可以直接调用什么动作 |
| 集成 | Tool Provider、Harness MCP Client、MCP Server、External API Adapter | Tool 怎样注册，以及进程外、远程或厂商能力怎样接入 |
| 科学证据 | Materializer、Validator、Acceptance Profile、central Acceptance Builder | 怎样从真实证据形成 observations，并唯一推导 Acceptance |
| 开发证据 | Eval、Benchmark、Capability conformance | 怎样在开发和发布期发现回归；不进入用户请求链 |

因此，“一切皆 Plugin”回答能力怎样进入 DSH；Skill、Tool、MCP Server、Validator 等名称回答能力负责什么。
Scientific Validator 或领域算法可以是 Plugin 内部的普通模块，不需要为了形式统一而各自成为 Plugin。

接入新能力时，先定义 Agent 真正需要的最小 Tool surface：进程内、同语言且无需隔离时默认使用原生 Tool Provider；只有独立进程、跨语言、远程部署或明确隔离边界才使用 MCP Server + Harness MCP Client。Skill 与 Tool 相互独立，只有 Skill 确实增加领域选择、工作步骤或解释边界时才组合。涉及科学主张时，再增加 Validator、Acceptance Profile、Materializer 和测试，由 central Acceptance Builder 唯一推导最终状态。

这些边界也进入回归检查：发行版 13 个 MCP 连接均有合同归属，包括默认关闭项；五个本地 Python 能力
把环境检查收进主动作，随计算结果报告包版本。Tool 副作用包含首次准备环境与后置证据保存。
外部接入的[固定源码与副作用审查](docs/integrations/OPT_IN_MCP_EFFECT_REVIEW.md)不等于在线可用性或正式启用。

先读[文档与架构入口](docs/README.md)，再按任务进入[贡献指南](CONTRIBUTING.md)、
[扩展对象模型](docs/architecture/EXTENSION_MODEL.md)、[模块地图](docs/architecture/MODULES.md)或
[架构审计](docs/architecture/ARCHITECTURE_AUDIT.md)。

<details>
<summary><strong>开发与验证命令</strong></summary>

```bash
# 检查 Harness 组合配置
npm run harness:config

# 运行完整离线质量检查
npm run check

# 配置模型后运行真实 Agent 端到端测试
npm run e2e:quantum-harness -- --provider openquantum-public
```

```text
.agents/skills/          量子 Skill 与科学资源
runtime/openquantum/     Agent Preset、原生 Tool Provider、Harness MCP Client 声明和 Harness 界面扩展
src/settings/server/     设置中心的服务端配置边界
src/readiness/server/    当前 Harness Registry 的只读运行状态边界
scripts/                 启动、诊断和端到端测试
tests/                   平台集成测试
docs/                    架构、路线与生态文档
```

更完整的文档入口见 [docs/README.md](docs/README.md)。

</details>

## 一起建设 OpenQuantum

一个工作台的价值，不只在于今天能调用多少工具，更在于明天加入一种方法、一项检查或一个后端时，已有的科研工作仍然清楚、可追溯、可维护。

这也是 OpenQuantum 的长期方向：让研究者从问题开始，让实验室把经验变成可以复用的方法，让量子工具与设备团队把能力交到使用者手中。模型、设备和算法会继续变化，科研方法与证据应当留在使用者能够掌握的开放代码里。

你可以先[跑一个本地示例](#快速开始)，再带着一个具体任务加入：补充可重现案例、完善一个 Skill、接入一个 Tool Provider，或为已有结果增加独立检查。贡献方式见[贡献指南](CONTRIBUTING.md)，安全问题请按[安全政策](SECURITY.md)私密报告。

**量子计算，就在指尖。方法与证据，留在你的工作台。**

## License

OpenQuantum 自有代码采用 [MIT License](LICENSE)，版权所有 © 2026 Xi Zhao。

DeepSeek Harness、Qiskit MCP Servers、FieldQKit、Quantum Hardware MCP 和其他第三方组件沿用各自的许可证，详细来源见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
