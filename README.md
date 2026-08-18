<h1 align="center">
  <img src="./public/openquantum/lockup.svg" width="430" alt="OpenQuantum" />
</h1>

<p align="center">
  <strong>量子计算，就在指尖</strong><br />
  <sub>Quantum computing, right at your fingertips.</sub>
</p>

<p align="center">
  从网页到微信，用一句话连接量子算法、工具与云端后端
</p>

<p align="center">
  <a href="https://github.com/xi-zhao/openQuantum/actions/workflows/ci.yml"><img src="https://github.com/xi-zhao/openQuantum/actions/workflows/ci.yml/badge.svg" alt="CI status" /></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT-111111.svg" alt="MIT License" /></a>
  <img src="https://img.shields.io/badge/Node.js-24%2B-3c873a.svg" alt="Node.js 24 or newer" />
  <img src="https://img.shields.io/badge/MCP-ready-5a45ff.svg" alt="MCP ready" />
</p>

<p align="center">
  <a href="#快速开始">快速开始</a> ·
  <a href="#已集成的量子工具与能力">量子能力</a> ·
  <a href="#把你的量子能力接进来">扩展开发</a> ·
  <a href="./docs/communications/openquantum-wechat-launch.md">项目故事</a> ·
  <a href="./CONTRIBUTING.md">参与贡献</a>
</p>

打开网页，或者把 OpenQuantum 接入微信、飞书，你就可以用一句话开始一项量子任务。让 Agent 分析量子电路、查询量子云后端、运行算法，再把结果和完整过程交还给你。

这就是 OpenQuantum，一个开源的量子 Agent 工作台。它把原本散落在代码、文档、云平台和设备接口里的量子能力，放进同一个看得见、用得上的入口。

你可以直接使用已经集成的 Qiskit、FieldQKit 和量子算法能力，也可以把自己的设备、数据、方法和模型做成 Skill 或 MCP，交给同一个 Agent 调用。普通用户可以从自然语言开始，研究机构可以组织科研工作流，量子公司也可以在这套基础上继续开发自己的产品。

OpenQuantum 基于 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 构建。Harness 提供会话、工具调度、权限、持久化和执行轨迹，OpenQuantum 在上面组织量子工具、算法 Skill、科学验收和更适合量子工作的产品界面。

OpenQuantum 的第一版，是在 DeepSeek Harness 发布后的三天里做出来的。它从一个很直接的想法开始，把散落在不同仓库、云平台和文档里的量子工具放进同一个工作台，让用户可以直接使用，也让研究机构和量子公司可以继续接入自己的能力。

<table>
  <tr>
    <td width="33%"><strong>一句话开始</strong><br />从网页、微信或飞书发出请求，分析电路、查询后端、运行算法。</td>
    <td width="33%"><strong>每一步看得见</strong><br />工具调用、权限状态、计算结果和科学检查都保留在任务轨迹里。</td>
    <td width="33%"><strong>能力可以生长</strong><br />沿用 Skill、MCP 等开放方式，继续接入设备、算法和科研工作流。</td>
  </tr>
</table>

## 让微信成为量子计算的入口

量子计算过去常常从安装 SDK、配置环境和翻文档开始。OpenQuantum 希望把入口往前推一步。配置好消息渠道后，你可以直接在微信或飞书里发出一条消息，让同一个 OpenQuantum Agent 去调用量子工具。

```text
你在微信里提出问题
  → OpenQuantum 判断应该使用哪个 Skill
  → DeepSeek Harness 调用 Qiskit、量子算法或云端 MCP
  → 结果回到对话，完整执行轨迹留在工作台
```

你可以让它检查一段 OpenQASM 电路，比较不同转译方案，查询 IBM Quantum、IonQ 或国内量子云后端，也可以运行 OpenQuantum 已验收的量子基态算法。需要真实硬件或付费服务时，再由使用者配置对应凭据并明确开启。

手机负责提出问题，OpenQuantum 负责连接工具，DeepSeek Harness 负责把整个过程可靠地跑起来。

量子计算，就在指尖。

## 从一个真实任务开始

下面是一段 OpenQuantum 的实际运行记录。Agent 完成了一次二量子位基态任务，先用 VQE 求解，再用独立计算检查结果。任务结果、工具调用和科学验收都保留在同一条轨迹里。

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

## 已集成的量子工具与能力

这里既有 Qiskit 提供的官方 MCP，也有 FieldQKit、Quantum Hardware MCP 等社区项目，还有 OpenQuantum 自己维护的算法 Skill 和科学 Validator。每一项都写明了来源、集成方式和默认状态，方便使用，也方便后续维护和扩展。

| 组件 | 来源与集成方式 | 可以完成的事情 | 默认状态 |
| --- | --- | --- | --- |
| Qiskit Circuits | [Qiskit 官方 MCP](https://github.com/Qiskit/mcp-servers) · 原版接入 + OpenQuantum Skill | 创建、读取、转换和分析 OpenQASM 3 / QPY 电路，比较转译结果 | 开启，无需凭据 |
| Qiskit Docs | [Qiskit 官方 MCP](https://github.com/Qiskit/mcp-servers) · 原版接入 | 查询 Qiskit API、迁移说明、错误码和 IBM Quantum 文档 | 开启，无需凭据 |
| FieldQKit | [FieldQuantum](https://github.com/FieldQuantum/fieldqkit) · 固定上游提交 + 只读桥接 | 发现国内量子云后端，按量子位筛选，查看拓扑和校准摘要 | 开启，只读 |
| TyxonQ Local | [TyxonQ](https://github.com/QureGenAI-Biotech/TyxonQ) · 固定 PyPI 版本 + 本地 MCP + OpenQuantum Skill | 运行小规模 statevector 电路、有限 shots 与 density-matrix 噪声仿真 | 接入，关闭 |
| IBM Runtime | [Qiskit 官方 MCP](https://github.com/Qiskit/mcp-servers) · 原版接入 + 凭据设置 | 查询 IBM 后端，向 IBM Quantum 提交任务 | 接入，关闭 |
| IBM Transpiler | [Qiskit 官方 MCP](https://github.com/Qiskit/mcp-servers) · 原版接入 + 凭据设置 | 使用 IBM Quantum AI Transpiler 路由和优化电路 | 接入，关闭 |
| Quantum Hardware MCP | [社区项目](https://github.com/Lokesh-2025/quantum-hardware-mcp) · 固定审阅提交 + 安全开关 | 查询 IBM Quantum 与 IonQ 设备，可选提交、取消任务和估算成本 | 接入，关闭 |
| Qiskit Gym | [Qiskit 官方 MCP](https://github.com/Qiskit/mcp-servers) · 原版接入 | 探索强化学习量子电路综合与优化 | 接入，关闭 |
| 量子基态求解 | OpenQuantum 自研 · Skill + MCP + Validator | 求解限定的二量子位 Hamiltonian，并与独立精确解比较 | 开启，本地运行 |
| 量子 SDK 选型 | OpenQuantum 自研 · Skill | 比较 Qiskit、Cirq、PennyLane、Q#、Braket、CUDA-Q 等工具 | 开启 |

第三方组件保留原项目的版权与许可证。对应的版本、来源和 OpenQuantum 集成内容记录在 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

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
    <td align="center"><sub>量子组件、Skill、MCP 与安全凭据</sub></td>
    <td align="center"><sub>从用户请求追溯到 MCP 工具结果</sub></td>
  </tr>
</table>

## 可以连接哪些量子后端

OpenQuantum 已经为本地模拟、IBM Quantum、IonQ 和多家国内量子云准备了入口。每个平台当前可以做什么、需要什么凭据，都可以在这里直接看到。

| 后端 | 当前能力 | 凭据或使用条件 |
| --- | --- | --- |
| 本地模拟器 | 查看模拟器元数据，运行本地量子基态参考能力 | 无需凭据 |
| IBM Quantum | Runtime、AI Transpiler、硬件查询，可选真实任务提交与取消 | `QISKIT_IBM_TOKEN`，任务类 MCP 按需开启 |
| IonQ | 硬件查询，可选真实任务提交、取消与成本估算 | `IONQ_API_KEY`，任务类 MCP 按需开启 |
| 夸父量子云 | 凭据检查、后端发现、量子位筛选、拓扑与校准摘要 | `QUAFU_API_TOKEN`，只读 |
| 天衍量子云 | 凭据检查、后端发现、量子位筛选、拓扑与校准摘要 | `TIANYAN_API_TOKEN`，只读 |
| 国盾量子云 | 凭据检查、后端发现、量子位筛选、拓扑与校准摘要 | `GUODUN_API_TOKEN`，只读 |
| 腾讯量子云 | 凭据检查、后端发现、量子位筛选、拓扑与校准摘要 | `TENCENT_API_TOKEN`，只读 |
| 本源量子云 | 凭据检查、后端发现、量子位筛选、拓扑与校准摘要 | `ORIGIN_API_TOKEN`，只读 |
| FieldQuantum | 云端模拟后端发现 | `FIELDQUANTUM_API_TOKEN`，只读 |
| 逻辑比特量子云 | 凭据检查、后端发现、量子位筛选、拓扑与校准摘要 | `LOGICALQUBIT_API_TOKEN`，只读 |

硬件任务和付费服务按需开启。后端发现类能力保持只读，适合先了解设备、拓扑和校准信息，再决定是否进入真实任务流程。

国产量子云正在从“只读发现”走向“真机执行”：本源量子（OriginQ）官方的 [QPanda3 Runtime MCP](https://github.com/OriginQ/qpanda3-runtime-mcp-server) 已列入下一批接入候选，默认关闭，由使用者配置凭据后再连接悟空真机。完整的本源生态候选与取舍见 [量子能力清单](docs/ecosystem/QUANTUM_CAPABILITY_CATALOG.md)。

## 每一步，都看得见

做量子任务时，一个结果往往不够。OpenQuantum 会把用户请求、Skill 加载、工具调用、权限状态和返回结果连成一条清晰的执行轨迹。

使用者可以知道 Agent 调用了什么，开发者也可以沿着这条轨迹定位模型、工具、权限和外部服务中的问题。对科研工作来说，这份过程记录和最终数字一样重要。

## 运行完成之后，还有科学验收

OpenQuantum 把任务运行和科学验收分开显示。`quantum-ground-state` 是一个小而完整的参考能力，它在固定扇区内运行二量子位无噪声 statevector VQE，再用独立程序检查能量、态矢、收敛轨迹和数值残差。

当前的科学边界是明确限定的二量子位实 Pauli Hamiltonian。这个例子展示了一项量子能力怎样从计算、证据一路走到可复核的结论，也为社区开发更丰富的算法 Skill 和 Validator 提供了可以直接参考的起点。

## 快速开始

准备 Node.js 24，以及用于启动 Qiskit 工具的 [uv / uvx](https://docs.astral.sh/uv/getting-started/installation/)。

```bash
git clone https://github.com/xi-zhao/openQuantum.git
cd openQuantum
npm ci
cp .env.example .env
npm run dev
```

浏览器打开 <http://127.0.0.1:3000>。

模型地址、模型密钥、MCP、Skill 和量子云凭据都可以从设置中心管理。密钥保存在本地环境或 DeepSeek Harness 凭据库中，项目配置只保留凭据引用。

还没有配置模型时，也可以先运行本地量子示例。

```bash
npm run demo:quantum-ground-state
npm run mcp:qiskit:probe
```

### 把量子计算带进微信、飞书和更多消息平台

OpenQuantum 集成了 [CC Connect](https://github.com/chenhg5/cc-connect)。它通过标准 ACP 连接 DeepSeek Harness，让手机里的对话直接通向 OpenQuantum 已有的 Skill、MCP 和科学验收能力。

```bash
npm run cc-connect:setup
npm run cc-connect:feishu
npm run cc-connect:start

# 在另一个终端打开本地管理后台，继续管理消息平台及其凭据
npm run cc-connect:web
```

飞书也可以替换为微信、钉钉、企业微信、Slack、Telegram、Discord、QQ 等 CC Connect 支持的平台。第一项平台需要先按上游方式完成配置，服务才会启动。消息平台的 Token 只保存在被 Git 忽略的 CC Connect 本地配置中。详细说明见[消息渠道接入](docs/integrations/CC_CONNECT.md)。

也可以使用 Docker。

```bash
cp .env.example .env
docker compose up --build
```

更完整的启动方式见[部署与启动](docs/DEPLOYMENT.md)。模型、MCP、凭据或 Harness 遇到问题时，可以从[故障排查](docs/TROUBLESHOOTING.md)快速找到对应入口。

## 把你的量子能力接进来

OpenQuantum 沿用 DeepSeek Harness 的原生扩展方式。Skill、MCP 和 Validator 各自解决一类清楚的问题，也可以组合成一项完整的量子能力。

<table>
  <tr>
    <td width="33%"><strong>Skill</strong><br />告诉 Agent 什么时候使用一种方法，以及这项方法适合解决什么问题。通常从一份标准 <code>SKILL.md</code> 开始。</td>
    <td width="33%"><strong>MCP</strong><br />把工具、数据源、量子云和设备连接交给 Agent 调用，可以使用 stdio 或 Streamable HTTP。</td>
    <td width="33%"><strong>Validator</strong><br />独立检查单位、阈值、来源和科学一致性，为科研结果提供可复核的验收结论。</td>
  </tr>
</table>

接入一个新后端，通常从 MCP 开始，再用 Skill 说明适用场景。涉及科学结论时，可以继续加入 Validator 和测试。每一层都有现成示例，开发者可以只做自己需要的部分，也可以完成一条从工具到科研验收的完整链路。

开发说明见 [CONTRIBUTING.md](CONTRIBUTING.md)，目录和配置权威见[仓库地图](docs/REPOSITORY_GUIDE.md)，架构边界见
[ARCHITECTURE_AUDIT.md](docs/architecture/ARCHITECTURE_AUDIT.md)，生态规划见
[QUANTUM_CAPABILITY_CATALOG.md](docs/ecosystem/QUANTUM_CAPABILITY_CATALOG.md)。

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
runtime/openquantum/     OpenQuantum 模式、MCP 和 Harness 界面扩展
src/settings/server/     设置中心的服务端配置边界
scripts/                 启动、诊断和端到端测试
tests/                   平台集成测试
docs/                    架构、路线与生态文档
```

更完整的文档入口见 [docs/README.md](docs/README.md)。

</details>

## 一起建设 OpenQuantum

当前版本已经包含 Web 工作台、Harness 执行轨迹、量子 Skill 与 MCP、模型与凭据设置，以及量子基态的独立科学验收。真实硬件和付费服务由使用者按需配置与开启。

我们希望 OpenQuantum 成为一块开放的底板。量子公司可以在这里接入设备和服务，高校实验室可以沉淀自己的科研流程，算法团队和工具作者也可以把新的方法交给更多人使用。

如果你想贡献代码、Skill、MCP、Validator、文档或案例，欢迎阅读 [CONTRIBUTING.md](CONTRIBUTING.md)。安全问题可以按照 [SECURITY.md](SECURITY.md) 提供的方式私密报告。

## License

OpenQuantum 自有代码采用 [MIT License](LICENSE)，版权所有 © 2026 Xi Zhao。

DeepSeek Harness、Qiskit MCP Servers、FieldQKit、Quantum Hardware MCP 和其他第三方组件沿用各自的许可证，详细来源见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
