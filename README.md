<p align="center">
  <img src="./public/openquantum/mark.svg" width="88" alt="OpenQuantum logo" />
</p>

<h1 align="center">OpenQuantum</h1>

<p align="center">
  <strong>探索开放量子世界</strong>
</p>

<p align="center">
  开源、好用、可以继续开发的量子 Agent 工作台
</p>

<p align="center">
  <a href="https://github.com/xi-zhao/openQuantum/actions/workflows/ci.yml"><img src="https://github.com/xi-zhao/openQuantum/actions/workflows/ci.yml/badge.svg" alt="CI status" /></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT-111111.svg" alt="MIT License" /></a>
  <img src="https://img.shields.io/badge/Node.js-24%2B-3c873a.svg" alt="Node.js 24 or newer" />
  <img src="https://img.shields.io/badge/MCP-ready-5a45ff.svg" alt="MCP ready" />
</p>

<p align="center">
  <a href="#快速开始">快速开始</a> ·
  <a href="#已经接入的量子能力">量子能力</a> ·
  <a href="#开放给二次开发">扩展开发</a> ·
  <a href="./CONTRIBUTING.md">参与贡献</a>
</p>

OpenQuantum 把量子电路、算法、云后端和科研 Agent 放进同一个可视化工作台。你可以用自然语言调用已经接入的工具，也可以通过标准 Skill 和 MCP 接入自己的设备、算法、数据与模型。

它适合直接使用，也适合研究机构和量子公司继续开发。底层复用 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 的会话、工具调度、权限、持久化与执行轨迹，OpenQuantum 专注于量子能力和产品体验。

<table>
  <tr>
    <td width="33%"><strong>对使用者</strong><br />在一个界面里分析电路、查询后端、运行算法，不必先拼装一套工具链。</td>
    <td width="33%"><strong>对团队</strong><br />统一管理模型、MCP、Skill 和量子云凭据，保留每一次任务的执行记录。</td>
    <td width="33%"><strong>对开发者</strong><br />沿用开放协议增加新后端和新方法，不需要学习 OpenQuantum 私有插件格式。</td>
  </tr>
</table>

## 一次真实的量子任务

下面不是设计稿。OpenQuantum 实际运行了一次二量子位基态任务，由 VQE 求解，再用独立计算检查结果。

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

## 已经接入的量子能力

OpenQuantum 尽量直接使用社区已有成果。上游工具可以原样运行时，只固定版本并交给 Harness 管理。只有缺少产品入口、安全边界或领域工作流时，才增加薄桥接、Skill 或 Validator。

| 组件 | 来源与集成方式 | 可以完成的事情 | 默认状态 |
| --- | --- | --- | --- |
| Qiskit Circuits | [Qiskit 官方 MCP](https://github.com/Qiskit/mcp-servers) · 原版接入 + OpenQuantum Skill | 创建、读取、转换和分析 OpenQASM 3 / QPY 电路，比较转译结果 | 开启，无需凭据 |
| Qiskit Docs | [Qiskit 官方 MCP](https://github.com/Qiskit/mcp-servers) · 原版接入 | 查询 Qiskit API、迁移说明、错误码和 IBM Quantum 文档 | 开启，无需凭据 |
| FieldQKit | [FieldQuantum](https://github.com/FieldQuantum/fieldqkit) · 固定上游提交 + 只读桥接 | 发现国内量子云后端，按量子位筛选，查看拓扑和校准摘要 | 开启，只读 |
| IBM Runtime | [Qiskit 官方 MCP](https://github.com/Qiskit/mcp-servers) · 原版接入 + 凭据设置 | 查询 IBM 后端，向 IBM Quantum 提交任务 | 接入，关闭 |
| IBM Transpiler | [Qiskit 官方 MCP](https://github.com/Qiskit/mcp-servers) · 原版接入 + 凭据设置 | 使用 IBM Quantum AI Transpiler 路由和优化电路 | 接入，关闭 |
| Quantum Hardware MCP | [社区项目](https://github.com/Lokesh-2025/quantum-hardware-mcp) · 固定审阅提交 + 安全开关 | 查询 IBM Quantum 与 IonQ 设备，可选提交、取消任务和估算成本 | 接入，关闭 |
| Qiskit Gym | [Qiskit 官方 MCP](https://github.com/Qiskit/mcp-servers) · 原版接入 | 探索强化学习量子电路综合与优化 | 接入，关闭 |
| 量子基态求解 | OpenQuantum 自研 · Skill + MCP + Validator | 求解限定的二量子位 Hamiltonian，并与独立精确解比较 | 开启，本地运行 |
| 量子 SDK 选型 | OpenQuantum 自研 · Skill | 比较 Qiskit、Cirq、PennyLane、Q#、Braket、CUDA-Q 等工具 | 开启 |

第三方组件仍归原作者所有，并继续使用各自的许可证。OpenQuantum 的修改范围、固定版本与许可证边界记录在 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

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

## 后端覆盖

OpenQuantum 已经为本地模拟、IBM Quantum、IonQ 和多家国内量子云提供发现或接入入口。不同后端的能力边界会明确显示，不把只能查询写成可以运行真实任务。

| 后端范围 | 已有能力 | 使用条件 |
| --- | --- | --- |
| 本地 | 模拟器信息、量子基态参考能力 | 无需凭据 |
| IBM Quantum | Runtime、AI Transpiler、硬件查询，可选真实任务提交与取消 | `QISKIT_IBM_TOKEN`，相关 MCP 默认关闭 |
| IonQ | 硬件查询，可选真实任务提交、取消与成本估算 | `IONQ_API_KEY`，相关 MCP 默认关闭 |
| 国内量子云 | 夸父、天衍、国盾、腾讯、本源、FieldQuantum、逻辑比特 | 对应云凭据，当前为只读发现 |

<details>
<summary><strong>查看全部后端与凭据</strong></summary>

| 后端 | 当前能力 | 凭据或使用条件 |
| --- | --- | --- |
| 本地模拟器 | 查看模拟器元数据，运行本地量子基态参考能力 | 无需凭据 |
| IBM Quantum | Runtime、AI Transpiler、硬件查询，可选真实任务提交与取消 | `QISKIT_IBM_TOKEN` |
| IonQ | 硬件查询，可选真实任务提交、取消与成本估算 | `IONQ_API_KEY` |
| 夸父量子云 | 凭据检查、后端发现、量子位筛选、拓扑与校准摘要 | `QUAFU_API_TOKEN`，只读 |
| 天衍量子云 | 凭据检查、后端发现、量子位筛选、拓扑与校准摘要 | `TIANYAN_API_TOKEN`，只读 |
| 国盾量子云 | 凭据检查、后端发现、量子位筛选、拓扑与校准摘要 | `GUODUN_API_TOKEN`，只读 |
| 腾讯量子云 | 凭据检查、后端发现、量子位筛选、拓扑与校准摘要 | `TENCENT_API_TOKEN`，只读 |
| 本源量子云 | 凭据检查、后端发现、量子位筛选、拓扑与校准摘要 | `ORIGIN_API_TOKEN`，只读 |
| FieldQuantum | 云端模拟后端发现 | `FIELDQUANTUM_API_TOKEN`，只读 |
| 逻辑比特量子云 | 凭据检查、后端发现、量子位筛选、拓扑与校准摘要 | `LOGICALQUBIT_API_TOKEN`，只读 |

</details>

可能产生费用、数据外发或硬件副作用的 MCP 都保持默认关闭。用户需要先配置凭据，再主动开启。FieldQKit 当前只做只读发现，不会提交、取消或删除真实任务。

## 为什么保留执行轨迹

量子 Agent 不应该只给出一句结果。DeepSeek Harness 会保留用户请求、Skill 加载、工具调用、权限状态和返回结果。开发者可以判断 Agent 有没有选对方法，实际调用了哪个 MCP，失败发生在模型、工具、权限还是外部服务。

这里展示的是可检查的执行事实，不是模型的隐藏思维过程。

## 科学结论单独验收

任务完成和科学可信是两个状态。

`quantum-ground-state` 是 OpenQuantum 的参考能力。它只处理明确限定的二量子位实 Pauli Hamiltonian，在固定扇区内运行无噪声 statevector VQE，再用独立程序检查能量、态矢、收敛轨迹和数值残差。证据满足规则时，页面才会显示验收通过。

这个能力故意保持很窄。它不会把小型参考算法包装成完整分子模拟、真实硬件实验或量子优势结论。

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

模型地址、模型密钥、MCP、Skill 和量子云凭据都可以从设置中心管理。真实密钥保存在本地环境或 DeepSeek Harness 凭据库中，不会回显，也不会写入项目配置。

没有模型密钥时，可以先运行本地示例。

```bash
npm run demo:quantum-ground-state
npm run mcp:qiskit:probe
```

也可以使用 Docker。

```bash
cp .env.example .env
docker compose up --build
```

## 开放给二次开发

OpenQuantum 沿用 Harness 原生扩展方式，不把社区组件锁进私有格式。

<table>
  <tr>
    <td width="33%"><strong>Skill</strong><br />告诉 Agent 什么时候使用一种方法，以及方法的适用边界。通常从一份标准 <code>SKILL.md</code> 开始。</td>
    <td width="33%"><strong>MCP</strong><br />提供确定性的工具、数据源、量子云或设备连接。可以是 stdio 或 Streamable HTTP 服务。</td>
    <td width="33%"><strong>Validator</strong><br />独立检查单位、阈值、来源和科学一致性。Agent 不能自行宣布验收通过。</td>
  </tr>
</table>

三者可以组合成一项完整能力，但始终是彼此独立的开放组件。接入一个新后端，通常从标准 MCP 开始，再用 Skill 说明适用场景。涉及科学结论时，再加入 Validator 和测试。

开发说明见 [CONTRIBUTING.md](CONTRIBUTING.md)，架构边界见 [ARCHITECTURE_AUDIT.md](docs/architecture/ARCHITECTURE_AUDIT.md)，生态规划见 [QUANTUM_CAPABILITY_CATALOG.md](docs/ecosystem/QUANTUM_CAPABILITY_CATALOG.md)。

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

</details>

## 当前状态

OpenQuantum 已经跑通 Web 工作台、Harness 执行轨迹、量子 Skill 与 MCP、模型与凭据设置，以及量子基态的独立科学验收。

项目仍在早期阶段，DeepSeek Harness 也处于 Developer Preview。真实硬件、外部网络和可能产生费用的能力默认关闭。安全问题请按照 [SECURITY.md](SECURITY.md) 私密报告，不要在公开 Issue 中粘贴密钥或未脱敏数据。

欢迎量子公司、高校实验室、算法团队和工具作者一起接入新的量子后端、算法与工作流。

## License

OpenQuantum 自有代码采用 [MIT License](LICENSE)，版权所有 © 2026 Xi Zhao。

DeepSeek Harness、Qiskit MCP Servers、FieldQKit、Quantum Hardware MCP 和其他第三方组件继续遵循各自的许可证。完整来源与许可证边界见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
