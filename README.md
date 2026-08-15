<p align="center">
  <img src="./public/openquantum/mark.svg" width="72" alt="OpenQuantum logo" />
</p>

<h1 align="center">OpenQuantum</h1>

<p align="center">
  <strong>让量子工具更好用，也更开放。</strong>
</p>

<p align="center">
  一个可以直接使用，也方便继续开发的开源量子 Agent 工作台。
</p>

OpenQuantum 把量子计算工具、领域方法和智能助手放在同一个界面里。

你可以用自然语言分析量子电路、查询量子后端、运行算法，或者连接已经配置好的量子云。企业和研究机构也可以接入自己的设备、算法、数据与模型，做成内部科研平台或面向客户的产品。

项目复用 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 的会话、工具调度、权限、持久化与执行轨迹。OpenQuantum 专注量子领域的 Skill、MCP、科学检查和产品体验，不再另造一套 Agent Runtime。

<p align="center">
  <img src="./docs/images/openquantum-quantum-result.jpg" width="760" alt="OpenQuantum 运行量子基态任务并完成科学检查" />
</p>

<p align="center"><sub>真实运行截图　量子基态结果与独立科学检查</sub></p>

## 已经接入的量子能力

OpenQuantum 尽量直接使用社区已有成果。上游能原样运行时，只固定版本并交给 Harness 管理。确实缺少产品入口或安全边界时，才增加薄桥接、Skill 工作流或 Validator。

| 能力 | 上游来源 | OpenQuantum 所做工作 | 用户可以完成的事情 | 状态 |
| --- | --- | --- | --- | --- |
| Qiskit Circuits | [Qiskit MCP Servers](https://github.com/Qiskit/mcp-servers) | 固定官方 MCP 版本，增加 `qiskit-circuit-workbench` Skill | 创建、读取、转换和分析 OpenQASM 3 / QPY 电路，比较转译结果 | 默认开启，无需凭据 |
| Qiskit Docs | [Qiskit MCP Servers](https://github.com/Qiskit/mcp-servers) | 由 Harness 启动官方文档 MCP | 查询 Qiskit API、迁移说明、错误码和 IBM Quantum 文档 | 默认开启，无需凭据 |
| FieldQKit 后端发现 | [FieldQuantum/fieldqkit](https://github.com/FieldQuantum/fieldqkit) | 固定上游提交，增加只读 MCP 桥接、凭据隔离和 `fieldqkit-hardware` Skill | 发现国内量子云后端，按量子位数筛选，查看拓扑和校准摘要 | 默认开启，只读 |
| IBM Runtime | [Qiskit MCP Servers](https://github.com/Qiskit/mcp-servers) | 增加设置入口和 Harness 安全凭据引用 | 查询 IBM 后端并向 IBM Quantum 提交任务 | 已接入，默认关闭 |
| IBM Transpiler | [Qiskit MCP Servers](https://github.com/Qiskit/mcp-servers) | 增加设置入口和 Harness 安全凭据引用 | 使用 IBM Quantum AI Transpiler 完成电路路由与优化 | 已接入，默认关闭 |
| Quantum Hardware MCP | [Lokesh-2025/quantum-hardware-mcp](https://github.com/Lokesh-2025/quantum-hardware-mcp) | 固定审阅过的源码提交，增加安装校验、凭据注入和安全开关 | 查询 IBM Quantum 与 IonQ 设备，可选提交、取消任务和估算成本 | 已接入，默认关闭 |
| Qiskit Gym | [Qiskit MCP Servers](https://github.com/Qiskit/mcp-servers) | 固定官方 MCP 版本并提供启停配置 | 探索强化学习量子电路综合与优化 | 已接入，默认关闭 |
| 量子基态求解 | OpenQuantum | 自研 Skill、本地 MCP、Validator、测试和评测 | 对限定的二量子位 Hamiltonian 运行 VQE，与独立精确解比较 | 默认开启，本地运行 |
| 量子 SDK 选型 | OpenQuantum | 自研 `quantum-sdk-advisor` Skill | 比较 Qiskit、Cirq、PennyLane、Q#、Braket、CUDA-Q 等工具 | 默认开启 |

<p align="center">
  <img src="./docs/images/openquantum-quantum-settings.jpg" width="760" alt="OpenQuantum 量子组件设置中心" />
</p>

<p align="center"><sub>真实运行截图　MCP、Skill 与安全凭据各自管理</sub></p>

## 目前覆盖的量子后端

| 后端 | 当前能力 | 凭据或使用条件 |
| --- | --- | --- |
| 本地模拟器 | 查看模拟器元数据，运行本地量子基态参考能力 | 无需凭据 |
| IBM Quantum | Runtime、AI Transpiler、硬件查询，可选真实任务提交与取消 | `QISKIT_IBM_TOKEN`，相关 MCP 默认关闭 |
| IonQ | 硬件查询，可选真实任务提交、取消与成本估算 | `IONQ_API_KEY`，Quantum Hardware MCP 默认关闭 |
| 夸父量子云 | 凭据检查、后端发现、量子位筛选、拓扑与校准摘要 | `QUAFU_API_TOKEN`，只读 |
| 天衍量子云 | 凭据检查、后端发现、量子位筛选、拓扑与校准摘要 | `TIANYAN_API_TOKEN`，只读 |
| 国盾量子云 | 凭据检查、后端发现、量子位筛选、拓扑与校准摘要 | `GUODUN_API_TOKEN`，只读 |
| 腾讯量子云 | 凭据检查、后端发现、量子位筛选、拓扑与校准摘要 | `TENCENT_API_TOKEN`，只读 |
| 本源量子云 | 凭据检查、后端发现、量子位筛选、拓扑与校准摘要 | `ORIGIN_API_TOKEN`，只读 |
| FieldQuantum | 云端模拟后端发现 | `FIELDQUANTUM_API_TOKEN`，只读 |
| 逻辑比特量子云 | 凭据检查、后端发现、量子位筛选、拓扑与校准摘要 | `LOGICALQUBIT_API_TOKEN`，只读 |

不同后端的接入深度并不相同。FieldQKit 当前只开放只读发现，不会提交、取消或删除真实任务。可能产生费用、数据外发或硬件副作用的 MCP 都保持默认关闭，由用户明确配置凭据并主动开启。

## 每一次执行都能看见

DeepSeek Harness 会保留 Agent 的请求、步骤、Skill 加载、工具调用和结果。开发者可以沿着轨迹判断 Agent 有没有选对方法，实际调用了哪个 MCP，失败发生在模型、工具、权限还是外部服务。

轨迹展示的是可观察的执行事实，不是模型的隐藏思维过程。

<p align="center">
  <img src="./docs/images/openquantum-trajectory.jpg" width="760" alt="OpenQuantum Harness 量子任务执行轨迹" />
</p>

<p align="center"><sub>真实运行截图　从量子任务请求追溯到 MCP 工具结果</sub></p>

## 科学结论要单独检查

Agent 说任务完成了，不等于科学结果已经可信。

`quantum-ground-state` 是 OpenQuantum 的参考能力。它只处理明确限定的二量子位实 Pauli Hamiltonian，在固定扇区内运行无噪声 statevector VQE，再用独立计算检查能量、态矢、收敛轨迹和数值残差。证据满足规则时，页面才会显示验收通过。

这个能力故意做得很窄。它不会把一个小型参考算法包装成完整分子模拟、真实硬件实验或量子优势结论。

## 开放给二次开发

OpenQuantum 直接采用 Harness 原生扩展方式，社区开发的组件不会被锁进私有格式。

| 组件 | 负责什么 | 常见形式 |
| --- | --- | --- |
| Skill | 告诉 Agent 什么时候使用某种方法，以及方法的边界 | 一个标准 `SKILL.md`，可带参考资料和测试 |
| MCP | 提供确定性的工具、数据源、量子云或设备连接 | stdio 或 Streamable HTTP 服务 |
| Validator | 检查单位、阈值、作用域、来源和科学一致性 | 可信程序、规则与评测用例 |

三者可以组合成一项完整能力，但仍是彼此独立的开放组件。新的量子后端通常只需要提供标准 MCP，再配上一份 Skill 说明适用场景。有科学结论时，再加入 Validator 和测试。

开发说明见 [CONTRIBUTING.md](CONTRIBUTING.md)，架构边界见 [ARCHITECTURE_AUDIT.md](docs/architecture/ARCHITECTURE_AUDIT.md)，后续生态规划见 [QUANTUM_CAPABILITY_CATALOG.md](docs/ecosystem/QUANTUM_CAPABILITY_CATALOG.md)。

## 快速开始

需要 Node.js 24，以及用于启动 Qiskit 工具的 [uv / uvx](https://docs.astral.sh/uv/getting-started/installation/)。

```bash
git clone https://github.com/xi-zhao/openQuantum.git
cd openQuantum
npm ci
cp .env.example .env
npm run dev
```

打开 <http://127.0.0.1:3000>。

模型地址、模型密钥、MCP、Skill 和量子云凭据都可以从设置中心管理。真实密钥保存在本地环境或 DeepSeek Harness 凭据库中，不会回显，也不会写入项目配置。

没有模型密钥，也可以先运行本地示例。

```bash
npm run demo:quantum-ground-state
npm run mcp:qiskit:probe
```

也可以用 Docker 启动。

```bash
cp .env.example .env
docker compose up --build
```

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

## 项目状态

OpenQuantum 已经跑通 Web 工作台、Harness 执行轨迹、量子 Skill 与 MCP、模型与凭据设置，以及量子基态的独立科学验收。

项目仍在早期阶段，DeepSeek Harness 也处于 Developer Preview。真实硬件、外部网络和可能产生费用的能力默认关闭。安全问题请按照 [SECURITY.md](SECURITY.md) 私密报告，不要在公开 Issue 中粘贴密钥或未脱敏数据。

欢迎量子公司、高校实验室、算法团队和工具作者一起接入新的量子后端、算法与工作流。

## License

OpenQuantum 自有代码采用 [MIT License](LICENSE)，版权所有 © 2026 Xi Zhao。

DeepSeek Harness、Qiskit MCP Servers、FieldQKit、Quantum Hardware MCP 和其他第三方组件继续遵循各自的许可证。来源、集成方式与许可证边界见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
