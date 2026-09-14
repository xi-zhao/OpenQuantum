<h1 align="center">
  <img src="./packages/openquantum-web-branding/assets/lockup.svg" width="430" alt="OpenQuantum" />
</h1>

<p align="center">
  <strong>量子计算，就在指尖</strong><br />
  <sub>Quantum computing, right at your fingertips.</sub>
</p>

<p align="center">
  开源量子 Agent 平台 · 把你的量子方法变成可调用的能力<br />
  量子 Skill、MCP 桥接、原生 Tool 与科学检查，在一个工作台中组合使用
</p>

<p align="center">
  <a href="https://github.com/xi-zhao/openQuantum/actions/workflows/ci.yml"><img src="https://github.com/xi-zhao/openQuantum/actions/workflows/ci.yml/badge.svg" alt="CI status" /></a>
  <a href="./THIRD_PARTY_NOTICES.md"><img src="https://img.shields.io/badge/licenses-MIT%20%2B%20component%20licenses-111111.svg" alt="MIT 与组件许可证" /></a>
  <img src="https://img.shields.io/badge/Node.js-24%2B-3c873a.svg" alt="Node.js 24 or newer" />
</p>

<p align="center">
  <a href="#openquantum-的核心能力">核心能力</a> ·
  <a href="#内置-skills">Skills</a> ·
  <a href="#mcp-服务目录">MCP</a> ·
  <a href="#原生量子-tools">Tools</a> ·
  <a href="#从一个真实任务开始">计算实例</a> ·
  <a href="#快速开始">快速开始</a> ·
  <a href="#长期发展规划">长期规划</a> ·
  <a href="./docs/README.md">开发文档</a> ·
  <a href="#开源生态与致谢">生态与致谢</a>
</p>

**把量子问题带进对话，把研究方法留下来复用。** OpenQuantum 是一个开源量子 Agent 平台。我们围绕量子任务编写领域 Skill、开发 MCP 桥接与原生 Tool，并为部分能力建立独立科学检查和证据流程，让你在同一个工作台中提出问题、执行计算、检查结果。

研究者可以从基态求解、电路验证或密度矩阵审计开始；开发者可以把自己的算法与工作流程接进来；学习者与授课者可以通过计算实例和「量子学习通」探索量子知识。

- **让 Agent 懂方法**：23 个领域 Skill 写明工具选择、研究步骤和结果解释规则，供任务按需使用。[查看 Skills](#内置-skills)
- **让方法能执行**：18 个本地 MCP 桥接实现与 5 个原生量子 Tool，把计算、查询和实验模拟变成 Agent 可调用的动作。[查看 MCP](#mcp-服务目录) · [查看 Tools](#原生量子-tools)
- **让结果有依据**：在支持的能力中返回精确参考、独立检查或统计误差；基态求解与量子信息审计还可形成带会话来源的科学验收报告。[查看计算与证据](#从一个真实任务开始)

**[安装并开始](#快速开始)**　·　[先看本地计算示例](#从一个真实任务开始)（无需模型密钥）　·　[了解量子学习通](#量子学习通)

## OpenQuantum 全景

从科研计算到学习教学，都有清晰的任务入口。科研工作台组合量子 Skill 与工具，量子学习通组织课程与课堂；模型服务和计算后端可以按需要配置。

<table>
  <tr>
    <td width="50%" align="center">
      <a href="./docs/images/openquantum-workbench-20260912.jpg"><img src="./docs/images/openquantum-workbench-20260912.jpg" width="100%" alt="科研工作台：新会话、工作区与量子学习通入口" /></a><br />
      <strong>科研工作台</strong><br /><sub>发起任务，选择工具，查看结果</sub>
    </td>
    <td width="50%" align="center">
      <a href="./docs/images/openquantum-learning-20260912.jpg"><img src="./docs/images/openquantum-learning-20260912.jpg" width="100%" alt="量子学习通：课程材料、课堂与课件编辑入口" /></a><br />
      <strong>量子学习通</strong><br /><sub>组织材料、课程与课堂；课程体系正在建设</sub>
    </td>
  </tr>
</table>

点击截图可查看原图。科研任务支持网页、桌面和配置好的消息入口；教学应用从工作台侧栏打开，详见[产品体验](#产品体验)。

## 长期发展规划

**让更多人把量子想法变成可以计算、验证和实践的成果。** 我们希望持续建设一个更智能、更高效的开源量子 Agent 平台，让专业方法、量子与经典算力、实验仪器和课程在同一个工作台中协同，为研究者、开发者和学习者提供不断成长的能力。

| 长期主线 | 我们将持续建设什么 |
| --- | --- |
| **0 · 更智能、更高效的平台** | 提升任务理解、方法选择、能力编排、结果检查与失败恢复，让复杂任务更顺畅地完成，减少反复试错和人工协调。以真实任务的完成质量、时间与成本衡量进步。 |
| **1 · 更多高质量 Skill** | 持续开发和接入专业 Skill，沉淀可靠的方法、适用条件和实践经验，配合可验证的执行工具，让好方法更容易被发现、组合和复用。 |
| **2 · 更多量子与经典算力后端** | 连接本地 CPU、远程 GPU、高性能计算（HPC）、量子模拟器与量子处理器（QPU），按任务的规模、精度、时间和预算组织混合计算，让方法找到适合的算力。 |
| **3 · 面向智能实验仪器的接口** | 预留标准化设备接口，逐步连接支持程序控制的实验仪器，探索设备发现、实验控制、测量分析与反馈，让计算与真实实验相互衔接。 |
| **4 · 更多高质量课程** | 建立从基础到前沿的知识地图，持续打造初、中、高阶段的课程，允许按基础和兴趣跨级学习，把概念讲解、动手实验与能力评估连起来。 |

仪器接口方向将参考 Anthropic 的 [Model Hardware Standard（MHS）](https://www.anthropic.com/news/model-hardware-standard-research-preview) 等探索，从模拟设备与合作实验逐步验证；实时控制与设备约束由相应驱动和控制系统落实。

以上是长期建设方向，当前已交付能力及验证范围见[当前接入范围与验证记录](#当前接入范围与验证记录)。欢迎带着研究方法、算力资源、仪器接口或教学经验，[一起建设 OpenQuantum](#一起建设-openquantum)。

<a id="已集成的量子工具与能力"></a>

## OpenQuantum 的核心能力

**OpenQuantum 把领域方法、工具接口与结果检查组织成可复用的量子能力。** 你可以直接使用已有能力，也可以沿用同一套扩展方式接入自己的研究方法。

| OpenQuantum 提供什么 | 为你的任务解决什么问题 | 从哪里开始 |
| --- | --- | --- |
| **领域 Skill** | 把方法选择、执行步骤和物理边界写成 Agent 可读取的工作流 | 基态求解、量子信息审计、电路验证、SDK 选型 |
| **MCP 桥接实现** | 为不同计算库提供有界输入、依赖准备和结果返回，让 Agent 能调用跨语言工具 | 量子态审计、纠错实验、优化、动力学 |
| **原生量子 Tool** | 在工作台中直接完成计算与查询，返回结构化结果 | 基态求解与独立检查、实验模拟、算法资料与基准检索 |
| **科学检查与证据流程** | 将支持能力的输入、结果、独立检查与会话来源连起来，便于复核 | 限定二量子位基态、密度矩阵审计的完整科学验收流程 |

当前源码分发 **23 个内置 Skill、25 个 MCP 服务连接、5 个原生量子 Tool**。其中 18 个 MCP 服务使用 OpenQuantum 的本地桥接实现。Skill 指导工作方法，Tool 执行动作，MCP Server 通过协议提供 Tool；三者职责不同，数量分别统计。

下面先展示 OpenQuantum 维护的 Skill、桥接实现和原生 Tool。上游算法库、外部 MCP Server 与应用基础的分工见后文[开源生态与致谢](#开源生态与致谢)。

<p>
  <a href="#内置-skills">Skill 目录</a> ·
  <a href="#mcp-服务目录">MCP 服务目录</a> ·
  <a href="#原生量子-tools">原生量子 Tools</a> ·
  <a href="#可以连接哪些量子后端">量子后端范围</a>
</p>

### 内置 Skills

这 23 个 Skill 是 OpenQuantum 随源码维护的量子工作流，覆盖方法选择、计算实验、结果解释和平台诊断，由 Harness 按任务需要发现和加载。点击名称即可查看完整的 `SKILL.md`，也可作为编写自己 Skill 的起点；所需工具与连接分别配置。

下表按**研究方法与用途**介绍能力。实际可执行的模型、规模和格式见[当前接入范围](#当前接入范围与验证记录)及各 Tool 接口；本地验证记录单独说明测过的算例，不用这些算例定义方法或上游软件的能力上限。

| Skill | 研究方法与用途 | 执行入口 |
| --- | --- | --- |
| [`quantum-ground-state`](.agents/skills/quantum-ground-state/SKILL.md) | 变分量子本征求解（VQE）、基态能量估计与独立精确参考比较 | 原生 `solve_and_validate_ground_state`；支持完整科学验收流程 |
| [`quantum-information-audit`](.agents/skills/quantum-information-audit/SKILL.md) | 量子态合法性检查、密度矩阵性质分析与纠缠诊断 | `toqito_audit`；支持完整科学验收流程 |
| [`quantum-circuit-verification`](.agents/skills/quantum-circuit-verification/SKILL.md) | 量子电路等价性验证、优化前后对照与全局相位差异判定 | `qcec_local` |
| [`qpanda-qubo`](.agents/skills/qpanda-qubo/SKILL.md) | 组合优化问题的 QUBO 建模、约束转换、经典求解与本地 QAOA 对照 | `qpanda_qubo` |
| [`qec-memory-experiment`](.agents/skills/qec-memory-experiment/SKILL.md) | 表面码存储实验、噪声采样、MWPM 译码与逻辑错误率分析 | `qec_local` |
| [`qmclaw-workbench`](.agents/skills/qmclaw-workbench/SKILL.md) | 超导量子比特调校实验设计、测量流程模拟与合成数据分析，覆盖 S21、Rabi、Ramsey、T₁ 等 | 原生 `list_qmclaw_experiments`、`simulate_qmclaw_experiment` |
| [`quantum-sdk-advisor`](.agents/skills/quantum-sdk-advisor/SKILL.md) | 量子 SDK 选型、迁移比较与 PoC 技术路线规划 | 知识型 Skill，按任务使用已有通用 Tool |
| [`fieldqkit-hardware`](.agents/skills/fieldqkit-hardware/SKILL.md) | 量子云设备发现、量子位与拓扑筛选、接入条件检查 | `fieldqkit`；只读设备发现 |
| [`platform-diagnostics`](.agents/skills/platform-diagnostics/SKILL.md) | 工作台、工具与模型联调排障，形成可追溯的诊断报告 | Harness 通用 Tool 与本地诊断脚本 |
| [`qiskit-circuit-workbench`](.agents/skills/qiskit-circuit-workbench/SKILL.md) | 量子电路分析、格式转换、转译比较与 Qiskit 文档查证 | `qiskit`、`qiskit_docs` |
| [`tyxonq-workbench`](.agents/skills/tyxonq-workbench/SKILL.md) | 门电路仿真、态矢演化、量子噪声与采样分布分析 | `tyxonq_local` |
| [`fatqat-workbench`](.agents/skills/fatqat-workbench/SKILL.md) | 量子电路与硬件原生门约束分析、transmon 泄漏及里德堡原子动力学 | `fatqat_local`；[使用说明](docs/integrations/FATQAT.md) |
| [`mitiq-error-mitigation`](.agents/skills/mitiq-error-mitigation/SKILL.md) | 量子误差缓解方法比较、采样预算规划与误差成本分析，涵盖 ZNE、REM、PEC、CDR | `mitiq_local`；[使用说明](docs/integrations/MITIQ.md) |
| [`dynamiqs-dynamics`](.agents/skills/dynamiqs-dynamics/SKILL.md) | 开放系统 Lindblad 动力学、驱动参数扫描与自动微分灵敏度分析 | `dynamiqs_local` |
| [`clifft-sampling`](.agents/skills/clifft-sampling/SKILL.md) | Clifford+T 电路模拟、非 Clifford 门干涉与噪声采样分析 | `clifft_local` |
| [`oqupy-dynamics`](.agents/skills/oqupy-dynamics/SKILL.md) | 非马尔可夫开放系统动力学、环境记忆效应与 TEMPO 数值收敛分析 | `oqupy_local` |
| [`deltakit-qec`](.agents/skills/deltakit-qec/SKILL.md) | 表面码码片建模、噪声实验、采样与译码性能分析 | `deltakit_local` |
| [`sqd-chemistry`](.agents/skills/sqd-chemistry/SKILL.md) | 量子化学的采样子空间对角化、测量频数后处理与电子基态能量分析 | `sqd_local` |
| [`tjm-dynamics`](.agents/skills/tjm-dynamics/SKILL.md) | 开放多体系统的张量跳跃轨迹模拟、耗散演化与参考结果比较 | `tjm_local` |
| [`ldpc-decoding`](.agents/skills/ldpc-decoding/SKILL.md) | 二元校验矩阵的 BP+LSD 解码与 syndrome 一致性检查 | `ldpc_local` |
| [`randomized-measurements`](.agents/skills/randomized-measurements/SKILL.md) | 局域随机测量、子区纯度估计与有限样本误差分析 | `random_meas_local` |
| [`flow-vqe`](.agents/skills/flow-vqe/SKILL.md) | 流模型辅助的 VQE 参数学习、低能量态搜索与基线比较 | `flow_vqe_local` |
| [`tenpy-ground-state`](.agents/skills/tenpy-ground-state/SKILL.md) | 张量网络 DMRG 基态求解、磁性观测量与纠缠结构分析 | `tenpy_local` |

### MCP 服务目录

**OpenQuantum 为 18 项计算与设备发现能力开发了本地 MCP 桥接**，把所用 SDK 或数值库转换成 Agent 可调用的有界 Tool。下表先列出这些桥接实现：连接名链接到本仓库源码，旁边保留所用上游的链接；末尾再列 7 个直接接入的上游 MCP 服务。

默认 Preset 共声明 25 个 MCP 服务连接：**19 个默认开启（其中 Qiskit 两项可通过离线开关关闭），6 个按需启用**。连接名对应配置中的 `serverName`；“默认开启”表示配置策略，使用前仍需准备依赖和必要凭据。

这些 MCP Server 都由本机以 `stdio` 方式启动，不是 OpenQuantum 提供的公共托管端点。其中一部分 Tool 在本地计算，另一部分再访问厂商文档或量子云；“本地启动 MCP Server”不代表所有数据处理都留在本地。

| MCP 服务 / 连接名 | 能提供什么工具能力 | 默认配置 | 使用条件与边界 |
| --- | --- | --- | --- |
| [`toqito_audit`](.agents/skills/quantum-information-audit/mcp/server.mjs) · [toqito](https://github.com/vprusso/toqito) | 密度矩阵与纠缠指标计算、独立检查；可接物化验收链 | 默认开启 | `uv`；本地运行，无需云凭据；完整调用会保存科研证据 |
| [`qcec_local`](.agents/skills/quantum-circuit-verification/mcp/server.mjs) · [MQT QCEC](https://github.com/munich-quantum-toolkit/qcec) | unitary 电路等价性检查 | 默认开启 | `uv`；本地运行，无需云凭据；不接受动态电路或任意文件路径 |
| [`qec_local`](.agents/skills/qec-memory-experiment/mcp/server.mjs) · [Stim](https://github.com/quantumlib/Stim) + [PyMatching](https://github.com/oscarhiggott/PyMatching) | surface-code memory 实验、MWPM 解码与逻辑错误率统计 | 默认开启 | `uv`；本地运行，无需云凭据；固定预算、seed 与统计范围 |
| [`qpanda_qubo`](.agents/skills/qpanda-qubo/mcp/server.mjs) · [QPanda QUBO](https://github.com/OriginQ/pyqpanda-algorithm) | QUBO 编译、枚举复核、经典求解与可选本地 QAOA | 默认开启 | `uv`；本地 CPU 模拟器，无需本源云凭据 |
| [`fieldqkit`](.agents/skills/fieldqkit-hardware/mcp/server.mjs) · [FieldQKit](https://github.com/FieldQuantum/fieldqkit) | 凭据状态检查、国内量子云后端发现和筛选 | 默认开启 | `uv`；发现对应云后端需要相应凭据；不提交或取消任务 |
| [`fatqat_local`](.agents/skills/fatqat-workbench/mcp/server.mjs) · [FatQat](https://github.com/spaceqat/fatqat) | 电路与硬件约束、超导和中性原子脉冲动力学 | 默认开启 | `uv`；首次准备锁定的 Python 环境，后续数值计算在本地运行，无云凭据或 QPU 操作 |
| [`tyxonq_local`](.agents/skills/tyxonq-workbench/mcp/server.mjs) · [TyxonQ](https://github.com/QureGenAI-Biotech/TyxonQ) | 量子电路与噪声仿真 | 默认关闭 | 手动开启；`uv` 首次准备较大的 Python 环境，无需云凭据 |
| [`mitiq_local`](.agents/skills/mitiq-error-mitigation/mcp/server.mjs) · [Mitiq](https://github.com/unitaryfoundation/mitiq) | ZNE、REM、PEC、CDR 噪声实验与有限采样统计 | 默认开启 | uv；隔离 Python 3.12 环境，能力目录 GPL-3.0-only；[接入说明](docs/integrations/MITIQ.md) |
| [`dynamiqs_local`](.agents/skills/dynamiqs-dynamics/mcp/server.mjs) · [Dynamiqs](https://github.com/dynamiqs/dynamiqs) | 驱动扫描、耗散动力学与自动微分 | 默认开启 | uv、隔离 Python 3.12、CPU；[安装与范围](docs/integrations/UNITARY_ECOSYSTEM.md) |
| [`clifft_local`](.agents/skills/clifft-sampling/mcp/server.mjs) · [Clifft](https://github.com/unitaryfoundation/clifft) | Clifford+T 噪声采样 | 默认开启 | uv；仅结构化门与最终测量；[安装与范围](docs/integrations/UNITARY_ECOSYSTEM.md) |
| [`oqupy_local`](.agents/skills/oqupy-dynamics/mcp/server.mjs) · [OQuPy](https://github.com/tempoCollaboration/OQuPy) | Ohmic spin-boson TEMPO | 默认开启 | uv；独立 NumPy 1.x 环境；[安装与范围](docs/integrations/UNITARY_ECOSYSTEM.md) |
| [`deltakit_local`](.agents/skills/deltakit-qec/mcp/server.mjs) · [Deltakit](https://github.com/Deltakit/deltakit) | 纠错存储电路构建与本地噪声实验 | 默认开启 | uv；ToyNoise、Stim、PyMatching；[安装与范围](docs/integrations/UNITARY_ECOSYSTEM.md) |
| [`sqd_local`](.agents/skills/sqd-chemistry/mcp/server.mjs) · [Qiskit SQD](https://github.com/Qiskit/qiskit-addon-sqd) | 分子与活性空间 SQD、可选 FCI 参照 | 默认开启 | uv；[安装与范围](docs/integrations/PAPER_BACKED_TOOLS.md)，不连接云硬件 |
| [`tjm_local`](.agents/skills/tjm-dynamics/mcp/server.mjs) · [MQT YAQS / TJM](https://github.com/munich-quantum-toolkit/yaqs) | 开放 Ising 链张量轨迹与 Lindblad 参照 | 默认开启 | uv；[安装与范围](docs/integrations/PAPER_BACKED_TOOLS.md)，不连接云硬件 |
| [`ldpc_local`](.agents/skills/ldpc-decoding/mcp/server.mjs) · [BP+LSD](https://github.com/quantumgizmos/ldpc) | 二元校验矩阵的纠错解码与 syndrome 检查 | 默认开启 | uv；[安装与范围](docs/integrations/PAPER_BACKED_TOOLS.md)，不连接云硬件 |
| [`random_meas_local`](.agents/skills/randomized-measurements/mcp/server.mjs) · [RandomMeas.jl](https://github.com/bvermersch/RandomMeas.jl) | 局域随机测量与子区纯度估计 | 默认开启 | Julia 1.12.7；先准备固定依赖；[安装与范围](docs/integrations/PAPER_BACKED_TOOLS.md)，不连接云硬件 |
| [`flow_vqe_local`](.agents/skills/flow-vqe/mcp/server.mjs) · [Flow-VQE](https://github.com/olsson-group/Flow-VQE) | Pauli Hamiltonian 的 flow 参数学习与随机搜索比较 | 默认开启 | uv；[安装与范围](docs/integrations/PAPER_BACKED_TOOLS.md)，不连接云硬件 |
| [`tenpy_local`](.agents/skills/tenpy-ground-state/mcp/server.mjs) · [TeNPy](https://github.com/tenpy/tenpy) | 有限 XYZ 链 DMRG 基态与精确参照 | 默认开启 | uv；[安装与范围](docs/integrations/PAPER_BACKED_TOOLS.md)，不连接云硬件 |
| [`qiskit`](https://github.com/Qiskit/mcp-servers) · Qiskit Circuits（上游服务） | 电路读取、分析、转译与 QASM/QPY 转换 | 默认开启¹ | `uvx`；电路操作无需云凭据，首次启动可能下载依赖 |
| [`qiskit_docs`](https://github.com/Qiskit/mcp-servers) · Qiskit Docs（上游服务） | Qiskit 文档搜索、页面读取和 IBM Quantum 错误码查询 | 默认开启¹ | `uvx`；文档访问需要网络，无需云凭据 |
| [`qiskit_ibm_runtime`](https://github.com/Qiskit/mcp-servers) · IBM Runtime（上游服务） | IBM 后端查询、任务提交、结果读取与取消 | 默认关闭 | 手动开启；`uvx`、IBM Token 与可用账户额度；任务操作可能产生费用 |
| [`qiskit_ibm_transpiler`](https://github.com/Qiskit/mcp-servers) · IBM Transpiler（上游服务） | AI 电路路由、综合与混合转译 | 默认关闭 | 手动开启；`uvx`、IBM Token 与服务权限；调用 IBM 服务 |
| [`qiskit_gym`](https://github.com/Qiskit/mcp-servers) · Qiskit Gym（上游服务） | 强化学习电路综合、训练环境与模型管理 | 默认关闭 | 手动开启；`uvx`；训练、进程和模型文件操作有副作用 |
| [`quantum_hardware`](https://github.com/Lokesh-2025/quantum-hardware-mcp) · 社区硬件服务（上游服务） | IBM / IonQ 设备查询、任务提交与取消、成本估算 | 默认关闭 | 先安装固定源码并配置 IBM Token；IonQ 操作另需相应 Key；真实任务需授权 |
| [`qpanda_runtime`](https://github.com/OriginQ/qpanda3-runtime-mcp-server) · 本源运行时（上游服务） | 悟空 QPU 设备查询，采样、期望值、批量任务与任务管理 | 默认关闭 | 先安装固定源码并配置本源凭据；真实任务需要权限、额度与授权 |

¹ 两项 Qiskit 服务在未设置 `OPENQUANTUM_DISABLE_QISKIT_MCP=1` 时默认开启。设置中心可以覆盖连接策略；修改 MCP 连接配置后需要重启 Harness。

本地桥接中的数值算法和 SDK 来自相应上游项目；OpenQuantum 负责桥接接口、输入范围、调用流程及适用的结果检查。首次调用或准备可能下载固定依赖并创建环境或编译缓存，完整调用的副作用见[能力合同](.agents/capability-packages.yml)。

启用与验证入口：设置中心 → MCP Server 连接 → 配置必要凭据 → 重启 Harness → 查看运行证据。`quantum_hardware` 和 `qpanda_runtime` 还需分别先运行 `npm run mcp:quantum-hardware:setup`、`npm run mcp:qpanda-runtime:setup`。完整 Tool 名称与副作用声明见[能力合同](.agents/capability-packages.yml)；连接与凭据引用见 [Agent Preset](runtime/openquantum/agent-presets/openquantum/agent.cordis.yml)。

### 原生量子 Tools

OpenQuantum 提供以下 5 个原生量子动作，用于基态求解、调校实验模拟和研究资料查询。它们由本仓库的[原生计算 Tool Provider](runtime/openquantum/agent-presets/openquantum/native-quantum-tools.mjs)、[算法参考 Tool Provider](runtime/openquantum/agent-presets/openquantum/quantum-practices-tools.mjs)和 [Metriq 数据 Tool Provider](runtime/openquantum/agent-presets/openquantum/metriq-data-tools.mjs)在进程内注册，默认 Preset 已包含它们。这里单独统计量子领域动作；Harness 自带的文件、终端等通用 Tools 不计入。

| 原生 Tool | 做什么 | 完整调用的边界 |
| --- | --- | --- |
| `solve_and_validate_ground_state` | 计算限定二量子位基态并执行独立检查；完整流程保存结果和会话证据后生成科学验收报告 | 本地科研证据写入，`workspace-write`；不是通用分子求解或真机任务 |
| `list_qmclaw_experiments` | 列出 [QMClaw](https://github.com/QMC-AI/QMClaw) 的 13 类实验及支持范围 | 只读目录查询，`read-only`；不连接仪器 |
| `simulate_qmclaw_experiment` | 运行带 seed 的 QMClaw 合成数据实验 | 只读计算，`read-only`；不连接 LabRAD/lqms，不写回真实校准参数 |
| `quantum_practices` | 搜索和读取 60 份固定版本的算法参考指南，支持中文算法名；用于方法比较、假设核对与实验设计 | 本地资料检索，`read-only`；不安装或执行 UnitaryLab 模拟器；[使用与验证](docs/integrations/QUANTUM_PRACTICES.md) |
| `metriq_benchmarks` | 按厂商、设备、基准类型或文字检索 410 条去重后的公开记录，读取原始参数与指标 | 固定本地快照，`read-only`；逐次返回来源与 CC-BY-4.0 署名；[范围与验证](docs/integrations/UNITARY_ECOSYSTEM.md) |

### 使用与开发文档

各能力的安装方式、输入参数和调用示例见[能力文档](docs/README.md)。TeNPy、TJM、Flow-VQE、Clifft 和 SQD 的执行配置见[计算工具使用说明](docs/integrations/SCALABLE_BRIDGES.md)，实际算例与检查结果单独保存在验证记录中。

## 可以用它做什么

把问题、输入和希望检查的结果写进对话。OpenQuantum 的 Skill 提供工作方法，Agent 调用相应 Tool 完成计算；各项输入范围见上方[核心能力目录](#openquantum-的核心能力)。

| 任务方向 | 可以发起的任务 | 可以查看的结果 |
| --- | --- | --- |
| 基态求解与验证 | 提供二量子位实 Pauli Hamiltonian，在固定粒子扇区运行 VQE，并检查精确参考 | 能量、收敛轨迹、独立检查，以及完整流程中的科学验收报告 |
| 量子电路 | 分析或转换 OpenQASM / QPY 电路，比较转译，检查等价性，运行电路仿真 | 电路结构、转译结果、等价性检查、态矢或采样分布 |
| 量子态与测量 | 审计密度矩阵与纠缠指标；模拟已知 product / GHZ 态的局域随机测量 | 状态指标与独立检查，子区纯度估计及有限样本误差 |
| 量子化学与多体基态 | 用 SQD 研究分子与活性空间，或用 TeNPy 计算 XYZ 自旋链基态 | SQD 能量与轨道占据，DMRG 能量、磁化、纠缠熵及收敛信息；可选精确参考 |
| 变分参数学习 | 对 Pauli Hamiltonian 训练 Flow-VQE，学习低能量电路参数 | Flow 参数学习与等评估预算随机搜索比较 |
| 组合优化 | 构建 QUBO，检查约束 penalty，运行经典求解或可选本地 QAOA | 优化解、约束检查与经典枚举复核 |
| 误差缓解 | 用 Mitiq 运行 ZNE、REM、PEC 或 CDR，比较相同采样预算下的原始与缓解结果 | 理想参考、经验偏差、方差和 RMSE，以及校准、训练与采样成本 |
| 量子纠错 | 用 Stim / PyMatching 运行 surface-code memory，用 Deltakit 构建矩形码片实验，或进行 BP+LSD 解码 | 实际含噪电路、固定 shots 的逻辑错误率与区间；LSD 的 syndrome 一致性检查 |
| 开放系统动力学 | 用 TJM 计算开放 Ising 链，用 Dynamiqs 扫描单量子位驱动与梯度，或用 OQuPy 研究环境记忆 | 观测量轨迹、独立参考、梯度以及时间步长与记忆截断信息 |
| Clifford+T 噪声采样 | 用 Clifft 研究 T 门干涉、近 Clifford 电路与门后去极化噪声 | 最终位串频数、有限采样误差；可附完整分布与密度矩阵参考 |
| 公开设备基准 | 从 Metriq 的 410 条固定历史记录中按厂商、设备或基准类型查询 | 原始参数、指标、时间、来源与许可；保留模拟器标签 |
| 超导与原子实验 | 模拟调校流程、原生门约束、三能级 transmon 泄漏或里德堡原子链动力学 | 合成实验数据、动力学轨迹与图表 |
| 量子硬件接入 | 发现后端、检查拓扑与凭据；按需启用云任务查询、提交与取消 | 设备候选、使用条件；已启用任务接口的结果与状态 |
| 算法参考与工具选型 | 检索 Quantum-Practices 的 60 份算法指南、比较量子 SDK、复用研究步骤 | 固定版本的参考材料、适用假设与选型建议 |
| 学习与教学 | 准备材料、制作课件、组织互动课堂与 PBL 项目式学习 | 已集成课程与课堂界面、本机学习记录；[课程建设与 AI 验收进度](#量子学习通) |

本地计算可从无需量子云凭据的任务开始；真实硬件与付费服务按需启用。你也可以把自己的算法和研究方法[接入工作台](#把你的量子能力接进来)。

## 从一个真实任务开始

先试试 OpenQuantum 的原生 `solve_and_validate_ground_state` Tool。以仓库内固定的[二量子位 Pauli Hamiltonian](.agents/skills/quantum-ground-state/evals/fixtures/requests/protocol-fixture.json)为输入，它在指定粒子扇区内运行无噪声 VQE，再用独立闭式计算检查结果。在仓库目录执行以下命令即可复算，无需模型密钥或量子云凭据：

```bash
npm run demo:quantum-ground-state
```

以下结果来自 **2026-09-12 的本地复验**；[原始输出与运行记录](docs/examples/quantum-ground-state-local-demo-2026-09-12.json)包含完整数值、检查状态、时间、源码提交、输入摘要和 Node.js 版本。

<table>
  <tr>
    <td align="center"><strong>-1.85727503 Ha</strong><br /><sub>VQE 能量</sub></td>
    <td align="center"><strong>-1.85727503 Ha</strong><br /><sub>独立精确参考</sub></td>
    <td align="center"><strong>4.44 × 10⁻¹⁶ Ha</strong><br /><sub>能量差</sub></td>
    <td align="center"><strong>15 项通过</strong><br /><sub>本地计算检查</sub></td>
  </tr>
</table>

这次运行完成了 15 项本地计算检查，1 项会话来源检查未执行，尚未生成完整科学验收结论。差值表示该数值案例与精确参考的一致程度；科学适用范围仍是给定 Hamiltonian 和粒子扇区。

完整科学验收还需要通过 Harness 执行任务、保存结果文件和会话来源，并生成可重读的验收报告。配置模型后的验证入口见下方[开发与验证命令](#把你的量子能力接进来)。

### 执行记录与科学验收

科研工作台保留请求、Skill 加载、工具调用、权限状态与返回结果，便于追踪一次任务的执行过程。设置中的“已启用”表示配置策略；当前工具是否可调用、服务是否可达，需要查看对应运行证据。

运行完成与科学验收分别显示。具备完整验收流程的能力会把输入、结果文件、独立检查和会话记录连接起来，生成验收报告，列出通过、失败或尚未检查的项目。其他工具按各自范围报告数值结果和检查状态。

![从计算结果、证据物化和独立检查，到结合规则与来源链的科学验收](docs/images/openquantum-evidence-flow.png)

图中展示已接入完整科学验收的能力如何形成证据；[查看可编辑图源](docs/architecture/openquantum-evidence-flow.html)。

限定量子基态求解与量子信息审计提供完整科学验收流程；QUBO、电路等价性检查和量子纠错存储实验等能力按各自规则报告计算结果与检查。验证依据见[能力声明](.agents/capability-packages.yml)、[架构审计](docs/architecture/ARCHITECTURE_AUDIT.md)和[固定量子能力 Benchmark](benchmarks/quantum-capabilities/README.md)。

## 开始前的几个问题

<details>
<summary><strong>需要量子计算机账户或模型密钥吗？</strong></summary>

本地量子计算无需量子云凭据。安装依赖后，仓库内的基态示例还可以直接运行，无需模型密钥。通过 Agent 发起任务需要配置模型服务；使用量子云则按所选服务配置凭据并启用连接。

</details>

<details>
<summary><strong>需要先学会每个量子 SDK 吗？</strong></summary>

可以先用自然语言提出任务，由 Agent 调用已接入的工具。你仍需要明确输入、物理假设与希望检查的结果。具体 Tool 名称、输入范围和后端选择在目录中保留，方便需要时深入使用。

</details>

<details>
<summary><strong>量子学习通已经有完整课程体系了吗？</strong></summary>

目前已集成教学应用，公开教学资源仍在整理。课程建设目标覆盖中学基础至前沿研究，按初、中、高组织；完整课程体系尚未发布，真实在线 AI 建课、问答和编辑仍待完整验收。

</details>

<details>
<summary><strong>本地启动需要准备什么？</strong></summary>

当前提供源码安装，需要 Git、Node.js 24，以及 Python 量子工具使用的 uv；RandomMeas 随机测量另需 Julia 1.12.7。可以先启动网页工作台，再按需准备所选工具、桌面端、量子学习通或消息入口；各平台要求见下面的启动步骤。

</details>

**[开始安装](#快速开始)**　·　[先查看本地示例的输入与结果](#从一个真实任务开始)

## 快速开始

当前以源码分发，适合本机单用户试用及二次开发。

准备 Git、Node.js 24，以及供 Python 量子工具使用的 [uv / uvx](https://docs.astral.sh/uv/getting-started/installation/)。

使用 RandomMeas 随机测量时，还需 Julia 1.12.7。SQD、TJM 等论文方法的依赖可按所选能力准备，见[安装说明](docs/integrations/PAPER_BACKED_TOOLS.md#安装与调用)。

### 网页工作台

```bash
git clone https://github.com/xi-zhao/openQuantum.git
cd openQuantum
npm ci
npm run dev
```

首次打开启动日志中带登录令牌的地址，认证后会跳转到 <http://127.0.0.1:3000>，再在设置中心配置模型。还没有模型密钥时，可先用 `npm run demo:quantum-ground-state` 运行本地参考示例；安装 `uv` 后可用 `npm run mcp:qiskit:probe` 检查 Qiskit 接入，首次运行可能下载依赖。

### 配置模型

密钥保存在本地环境或 Harness 凭据库中，项目配置只保存凭据引用。若希望使用 `.env`，macOS 终端执行 `cp .env.example .env`，Windows PowerShell 执行 `Copy-Item .env.example .env`，再填写所需配置。

### 发起任务并选择后端

在科研工作台新建对话，直接写出任务和希望使用的后端。下面是同一个 Bell 态任务的两种选择，可以分别复制到对话中：

| 选择 | 示例请求 | 准备条件 |
| --- | --- | --- |
| FatQat | 用 FatQat 从双量子位全零态出发，对 q0 施加 H，再以 q0 为控制位、q1 为目标位施加 CX。返回无噪声精确概率，并用 1024 次采样、seed=7 比较频数。 | 默认连接开启；已安装 `uv` |
| TyxonQ | 用 TyxonQ 从双量子位全零态出发，对 q0 施加 H，再以 q0 为控制位、q1 为目标位施加 CX。返回无噪声精确态矢和概率。 | 先启用 TyxonQ Local 连接 |

两种计算的理想概率都应为 `00`、`11` 各约 50%；有限采样频数会有波动。首次使用可能下载相应的 Python 依赖。

TyxonQ 等默认关闭的后端，在「设置 → 量子组件 → MCP Server 连接」中启用后，重新启动 OpenQuantum，再在对话中指定名称。修改模型配置选择的是对话模型；这里选择的是负责计算的后端。支持范围和默认开关见[服务目录](#mcp-服务目录)。

### 试用 SQD 与 TeNPy

完成上面的安装和模型配置后，可以先准备这两项论文方法的固定依赖：

```bash
npm run capability:paper-tools:setup -- sqd-chemistry tenpy-ground-state
```

这两项通过 `uv` 准备 Python 3.12 环境，无需量子云账户。默认连接已开启；已运行的工作台在升级后需重启，再新建对话并复制一条请求：

| 想探索什么 | 示例请求 | 重点查看 |
| --- | --- | --- |
| 分子基态 | 用 SQD 计算键长 0.735 Å 的 H₂/STO-3G，使用默认合成样本，报告总能量、同基组 FCI 参考和能量差，并标明样本来源。 | 样本覆盖与能量差；合成样本的结果不构成量子优势证据 |
| 多体基态 | 用 TeNPy 计算四站点、自旋 1/2 的开放 Heisenberg 链，Jx=Jy=Jz=1，hx=hz=0。报告 DMRG 能量、精确对角化参考、能量差与纠缠熵，并注明 S=Pauli/2。 | Hamiltonian 约定、参考结果与收敛情况 |

其余论文方法也可按需安装；RandomMeas 随机测量另需 Julia 1.12.7。[完整安装与输入范围](docs/integrations/PAPER_BACKED_TOOLS.md#安装与调用)列出了各项准备条件。

### 试用误差缓解、动力学与公开基准

Mitiq、Dynamiqs、Clifft、OQuPy 和 Deltakit 的默认连接已开启，可以按需准备固定依赖：

| 要使用的能力 | 准备命令 |
| --- | --- |
| Mitiq 误差缓解 | `npm run capability:mitiq:setup` |
| Dynamiqs、Clifft、OQuPy、Deltakit | `npm run capability:unitary:setup` |
| Metriq 公开基准查询 | 已随源码提供，完成 `npm ci` 即可，无需 Python 或额外下载 |

五项计算通过 uv 准备各自的 Python 3.12 环境，无需量子云账户；Dynamiqs 当前仅使用 CPU。升级后重启工作台，在科研对话中复制一条请求：

| 想探索什么 | 示例请求 | 重点查看 |
| --- | --- | --- |
| 噪声缓解效果 | 用 Mitiq 对单量子位 H–RZ(0.7)–H 电路的 Z 期望值做 ZNE。门去极化概率 0.02，每个比较臂每次 8192 shots，重复 8 次、seed=7；比较原始与缓解后的误差和成本。 | 经验偏差、方差和 RMSE；缓解结果也可能变差 |
| 驱动灵敏度 | 用 Dynamiqs 从计算基态出发，比较驱动幅度 0.5 和 1，失谐 0、衰减率 0.1、时长 1、20 步；采用一致的无量纲单位，返回激发态人口与末态人口对驱动的梯度。 | 自动微分与独立有限差分是否一致 |
| T 门干涉 | 用 Clifft 从两量子位全零态出发执行 H(0)、T(0)、H(0)、CX(0,1)，无噪声、4096 shots、seed=7；比较位串频数与密度矩阵参考。 | 位串从左到右为 q0、q1；有限采样误差 |
| 环境记忆 | 用 OQuPy 从 plus 态出发，tunneling=0、bias=0.4、alpha=0.1、cutoff=2、temperature=0、duration=0.5；分别用 steps=memorySteps=8 和 12，与零温纯退相干解析式比较。 | 两组网格保持相同物理记忆时长；此算例不代表整个参数域收敛 |
| 纠错码片 | 用 Deltakit 构建 5×3 码片的 Z 存储实验，3 轮、ToyNoise p=0.02、4096 shots、seed=718，返回含噪电路、逻辑失败数和 Wilson 区间。 | 数据量子位尺寸与实际总量子位数；固定采样分母 |
| 公开设备基准 | 查询 Metriq 中 provider 包含 origin 的记录，列出设备、测试时间、基准类型、原始参数和指标，并标明来源。 | 历史数据的基准定义与实验条件；不等同于当前设备性能 |

这些能力已运行本地数值或数据检查，并验证了真实 Harness 的调用和会话重读；端到端测试使用本地模型协议替身，未验证外部模型自主执行或真实 QPU。当前保持 L1，返回 `scientificValidation=not_evaluated`。参数说明与验证记录见 [Mitiq 接入说明](docs/integrations/MITIQ.md)和 [Unitary 生态接入说明](docs/integrations/UNITARY_ECOSYSTEM.md)。

### 量子学习通安装

量子学习通当前已在 macOS 验证安装和启动。完成仓库依赖安装后，macOS 用户可运行 `npm run learning:ui:setup`，再启动 Web 或 Desktop，从侧栏打开「量子学习通」。首次打开会自动启动本机数据库和课程服务，无需另装全局 PostgreSQL；模型请求使用 OpenQuantum 当前选择的模型。

学习应用的安装器依赖 `/bin/sh`，尚未适配普通 Windows 环境；Linux 安装与启动也未完成验证。各平台状态见[安装说明](docs/integrations/OPENMAIC.md#使用)。

### 桌面客户端

桌面端的界面与平台状态见[产品体验](#在桌面和消息中使用)。

完成仓库依赖安装，并准备 Corepack 和系统 C++ 构建工具后：

```bash
npm run desktop:setup
npm run desktop:verify-install
npm run desktop
```

`desktop:setup` 构建固定的上游源码、下载 Electron 并编译原生模块；首次启动可能显示设置向导。请使用仓库中的启动命令，以加载 OpenQuantum 的模型和量子能力配置。

Web 与 Desktop 共用 `.openquantum/dsh` 中的本机状态，切换前先退出正在运行的入口。量子学习通另有安装和平台要求，见[量子学习通](#量子学习通)。

### 微信、飞书与其他消息入口

消息渠道通过 CC Connect 连接科研工作台；配置好相应平台后即可发起任务。

```bash
npm run cc-connect:setup
npm run cc-connect:feishu
npm run cc-connect:start
```

第一项平台需先按上游方式配置。可在另一个终端运行 `npm run cc-connect:web` 打开本地渠道管理后台，配置其他平台及凭据。平台 Token 保存在被 Git 忽略的本地配置中。

其他部署方式、模型配置和故障定位见[部署与启动](docs/DEPLOYMENT.md)与[故障排查](docs/TROUBLESHOOTING.md)。源码升级的固定版本、兼容性和验证记录见[上游升级记录](docs/releases/2026-09-10-upstream-update.md)。

## 产品体验

### 科研工作台

在对话中写清任务、输入和希望使用的后端。Agent 按任务读取工作方法、调用工具，工作台保留请求与返回结果。使用尚未开启的后端时，先在设置中心启用连接并重启工作台，再在对话中指定它。

<p align="center">
  <img src="./docs/images/openquantum-connections-20260912.jpg" width="100%" alt="量子组件设置中的 MCP Server 连接目录和各后端的配置开关" /><br />
  <sub>在连接目录中选择后端；配置是否启用与当前运行状态分别展示。</sub>
</p>

<p align="center">
  <img src="./docs/images/openquantum-skills-20260912.jpg" width="100%" alt="量子组件设置中的 Skill 指令目录，展示各工作流的说明和来源" /><br />
  <sub>工作方法与执行后端分别管理，可按研究任务组合使用。</sub>
</p>

### 量子学习通

量子学习通是 OpenQuantum 的教学应用入口，把材料、课件和课堂放在一起，支持授课与自主学习。应用名称与主题适配 OpenQuantum，保留课程内容自身的样式；其教学应用基础与适配关系见后文[开源生态与致谢](#开源生态与致谢)。

| 学习与教学场景 | 可用功能 |
| --- | --- |
| 准备材料 | 首页、课程库、材料附件、课程导入与 PPTX 导入 |
| 课堂学习 | 幻灯片、测验、互动问答与 PBL 项目式学习 |
| 制作课程 | 建课预览、课件编辑器和 Pro 专业工作台 |
| 继续学习 | 本机课程、任务、材料与服务端学习记录持久化，兼容旧版课堂迁移 |

课程建设目标是覆盖中学基础到前沿研究，按初级、中级、高级组织内容，允许按知识基础跨阶段学习。当前公开资源仍在整理，完整课程体系尚未制作和发布。应用装配、启动和本机持久化已有验证，真实在线 AI 建课、问答和编辑仍待完整验收。

Pro 教学任务使用上游应用自己的工具与记录，尚未自动接入科研工作台的量子工具。媒体、语音和搜索等可选能力需要对应服务配置。安装、备份、迁移与逐项验证见[量子学习通集成说明](docs/integrations/OPENMAIC.md)。

启动步骤见[量子学习通安装](#量子学习通安装)。

### 在桌面和消息中使用

OpenQuantum 桌面端提供原生窗口、系统托盘、终端与通知，复用工作台的模型、量子 Skill、计算工具和执行记录。macOS 与 Windows 的源码构建和安装检查均已通过 [CI](https://github.com/xi-zhao/OpenQuantum/actions/runs/34847479127)，本机交互验证覆盖 macOS；当前未提供 OpenQuantum 品牌的 `.dmg` / `.exe` 安装包。桌面基础与适配关系见[开源生态与致谢](#开源生态与致谢)。

配置消息渠道后，可以从微信、飞书、钉钉、Slack、Telegram、Discord 等平台发起任务，复用 OpenQuantum 已有的 Skill、Tool 和科研执行记录。[消息接入说明](docs/integrations/CC_CONNECT.md)提供配置步骤。

<p align="center">
  <img src="./docs/images/openquantum-wechat-chat.jpg" width="380" alt="通过微信 ClawBot 与 OpenQuantum 对话的已有演示截图" /><br />
  <sub>微信渠道的对话入口示例；渠道配置完成后，消息由 CC Connect 转交 Harness。</sub>
</p>

对应启动方式见[桌面客户端](#桌面客户端)与[微信、飞书等消息入口](#微信飞书与其他消息入口)。

## 把你的量子能力接进来

**把你反复使用的量子方法，变成下一次任务可复用的能力。** 在 OpenQuantum 中，你可以编写 Skill、注册原生 Tool，或开发 MCP Server 接入自己的计算程序；需要独立科学检查时，再增加 Validator 和相应证据流程。

OpenQuantum 的领域能力运行在 DeepSeek Harness 上，通用 Agent 运行、工具调度、模型连接与执行记录由 Harness 负责。现有 Skill、桥接实现与原生 Tool 都可作为扩展参考。

![OpenQuantum 架构：科研入口进入 Harness，Agent 读取 Skill，通过原生 Tool Provider 或 Harness MCP Client 使用工具，并连接模型服务和执行日志](docs/images/openquantum-platform-overview.png)

这张图展示科研工作台的核心调用关系；[查看可编辑图源](docs/architecture/openquantum-platform-overview.html)。量子学习通的课程任务和数据沿用完整子应用的职责边界，详见[应用集成说明](docs/integrations/OPENMAIC.md)。

先确定用户需要解决的任务，再选择扩展方式：

| 需要增加什么 | 放在哪里 |
| --- | --- |
| 领域知识、步骤、工具选择与结果解释 | Skill，可复用已有通用或量子 Tool |
| 稳定的计算、查询或操作 | Tool，由原生 Tool Provider 或 Harness MCP Client 注册 |
| 独立的科学检查与验收 | Validator；需要最终验收时再组合 Acceptance Profile、证据物化与 central Acceptance Builder |
| 有独立交互流程的完整产品 | 按应用边界集成，保留其业务与数据职责；量子学习通是现有实例 |

在开发文档中，`L3` 表示具备可回放的完整科学验收流程。Validator 产生检查结果，Acceptance Profile 定义规则，只有 central Acceptance Builder 汇聚检查结果与来源链、推导最终验收状态。能力等级不代表每一次调用都已完成验收。

Skill 与 Tool 可独立存在。计算后端按任务需要选用，只有额外的选择、步骤或解释规则有价值时才增加 Skill。进程内、同语言且无需隔离的动作优先使用原生 Tool Provider；跨语言、独立进程或远程部署时使用 MCP Server，由 Harness MCP Client 注册其 Tool。

Harness 是通用 Agent Runtime，扩展通过 Cordis Plugin 装配。UI、模型连接、量子计算和科学判定各自保持职责边界。完整外部子应用的教学任务与数据归上游应用维护，其任务不自动获得 Harness Session、科研审批或科学验收语义。

开发前先读[文档与架构入口](docs/README.md)，按需要查阅[贡献指南](CONTRIBUTING.md)、[扩展对象模型](docs/architecture/EXTENSION_MODEL.md)和[模块地图](docs/architecture/MODULES.md)。

<details>
<summary><strong>开发与验证命令</strong></summary>

```bash
# 检查 Harness 组合配置
npm run harness:config

# 运行完整离线质量检查
npm run check

# macOS/Linux：用固定依赖运行本地数值回归与 Harness 接线验证
npm run capability:mitiq:live
npm run capability:unitary:live

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

界面截图与示意图的版本、来源和适用范围见[图片说明](docs/images/README.md)。

<a id="集成生态与自由选择"></a>

## 开源生态与致谢

OpenQuantum 的量子能力建立在开放科学与开源软件之上。我们维护领域 Skill、MCP 桥接、原生 Tool 和适用的科学检查；底层算法库、外部服务及应用基础保留各自的作者、项目名称与许可证。下面说明具体使用与适配关系。

### 计算与分析工具

下表列出计算能力所用的上游项目。除直接接入的 Qiskit MCP Servers 外，所列能力由 OpenQuantum 编写桥接或进行有界适配；具体工作流与调用入口已在前面的 [Skill、MCP 和 Tool 目录](#openquantum-的核心能力)展示。

| 科研任务 | 使用或适配的项目 | OpenQuantum 当前支持 |
| --- | --- | --- |
| 电路构建与转译 | [Qiskit MCP Servers](https://github.com/Qiskit/mcp-servers) | 创建、分析和转译电路，读写 QASM / QPY |
| 电路等价性验证 | [MQT QCEC](https://github.com/munich-quantum-toolkit/qcec) | 比较两份无测量的 OpenQASM 2 电路，区分严格等价、相位等价、不等价与不确定 |
| 门电路仿真 | [TyxonQ](https://github.com/QureGenAI-Biotech/TyxonQ) | 电路的无噪声精确结果与含噪采样 |
| Clifford+T 电路采样 | [Clifft](https://github.com/unitaryfoundation/clifft) | Clifford+T 电路的门后去极化噪声与最终位串采样，可选独立密度矩阵参考 |
| 量子态与纠缠审计 | [toqito](https://github.com/vprusso/toqito) | 检查输入密度矩阵，计算纯度、部分转置与指定二分割的 negativity |
| 随机测量与纯度估计 | [RandomMeas.jl](https://github.com/bvermersch/RandomMeas.jl) | 对已知 product / GHZ 态模拟局域 Haar 测量，估计子区纯度与有限样本误差 |
| 组合优化 | [QPanda QUBO](https://github.com/OriginQ/pyqpanda-algorithm) | 将二值目标与线性等式约束编译为 QUBO，进行经典求解、枚举复核或可选本地 QAOA |
| 变分参数学习 | [Flow-VQE](https://github.com/olsson-group/Flow-VQE) | 对 Pauli Hamiltonian 训练 flow 模型，以无矩阵计算学习低能量电路参数 |
| 量子化学基态 | [Qiskit SQD](https://github.com/Qiskit/qiskit-addon-sqd) | 对分子与活性空间做采样子空间对角化，可选同一活性空间 Hamiltonian 的 FCI 参照 |
| 自旋链基态 | [TeNPy](https://github.com/tenpy/tenpy) | 对 XYZ 自旋链运行 DMRG，计算能量、磁化、纠缠熵与收敛信息 |
| 马尔可夫动力学与灵敏度 | [Dynamiqs](https://github.com/dynamiqs/dynamiqs) | 求解受驱动耗散单量子位的 Lindblad 动力学，批量扫描驱动并计算末态人口梯度 |
| 非马尔可夫动力学 | [OQuPy](https://github.com/tempoCollaboration/OQuPy) | 用 TEMPO 求解 Ohmic spin-boson 模型，检查时间步长与环境记忆截断的影响 |
| 多体开放系统轨迹 | [MQT YAQS / TJM](https://github.com/munich-quantum-toolkit/yaqs) | 模拟开放 Ising 链的张量跳跃轨迹，与密度矩阵 Lindblad 演化比较 |
| 误差缓解 | [Mitiq](https://github.com/unitaryfoundation/mitiq) | 运行 ZNE、REM、PEC、CDR 本地噪声实验，比较相同采样预算下的误差与成本 |
| 表面码存储与解码 | [Stim](https://github.com/quantumlib/Stim) + [PyMatching](https://github.com/oscarhiggott/PyMatching) | Stim 生成并采样旋转表面码存储电路，PyMatching 做 MWPM 解码，统计逻辑错误率 |
| 矩形表面码实验建模 | [Deltakit](https://github.com/Deltakit/deltakit) | 构建矩形码片与 ToyNoise 含噪电路，运行 X / Z 存储实验并报告逻辑错误区间 |
| 二元校验矩阵解码 | [ldpc / BP+LSD](https://github.com/quantumgizmos/ldpc) | 对给定校验矩阵和 syndrome 做 BP+LSD 解码，独立复核 syndrome 一致性 |
| 超导测控流程模拟 | [QMClaw](https://github.com/QMC-AI/QMClaw) | 适配其调校流程，本地生成 S21、Rabi、Ramsey、T₁ 等实验的合成数据 |
| 硬件约束与脉冲仿真 | [FatQat](https://github.com/spaceqat/fatqat) | 本地电路、超导原生门与原子阵列约束检查，以及三能级 transmon 和里德堡链的参考模型动力学 |

### 设备发现与量子云

[FieldQKit](https://github.com/FieldQuantum/fieldqkit) 提供国内量子云的凭据检查、只读设备发现、量子位筛选与拓扑查询。

IBM Quantum、IonQ 和本源量子是可连接的云服务。任务提交分别由 IBM Runtime、社区 Quantum Hardware 服务和 QPanda3 Runtime 等[任务接口](#可以连接哪些量子后端)提供，配置凭据并启用后可使用；FieldQKit 的当前接入范围是设备发现。

### 算法资料与公开基准

| 查询目的 | 来源项目 | OpenQuantum 当前提供 |
| --- | --- | --- |
| 查找算法说明与参考实现 | [Quantum-Practices](https://github.com/unitarylab/quantum-practices) | 本地检索 60 份固定版本算法指南，保留来源链接 |
| 查看设备历史基准 | [Metriq data](https://github.com/unitaryfoundation/metriq-data) | 查询 410 条去重历史记录，返回测试条件、原始指标、日期和来源，并保留模拟器标签 |

### 平台与教学应用

| 使用或适配的项目 | 在 OpenQuantum 中承担的职责 |
| --- | --- |
| [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) | 科研工作台的 Agent 运行时与原生 Web UI，负责会话、模型调用、工具调度和执行记录 |
| [DSH Desktop](https://github.com/anywhere-labs/dsh-desktop) | 桌面客户端基础；OpenQuantum 适配品牌和启动配置，复用科研工作台 |
| [CC Connect](docs/integrations/CC_CONNECT.md) | 消息渠道桥接，将微信、飞书等渠道的请求送入科研工作台 |
| [OpenMAIC](https://github.com/THU-MAIC/OpenMAIC) | 量子学习通的教学应用基础；保留完整界面、服务端与教学流程，适配 OpenQuantum 名称、主题和模型连接；课程体系和在线 AI 流程验收仍在推进 |

可以在对话中指定适用的计算后端。准备命令和可复制请求见前面的 [Bell 态示例](#发起任务并选择后端)、[SQD 与 TeNPy](#试用-sqd-与-tenpy)，以及[误差缓解、动力学与公开基准](#试用误差缓解动力学与公开基准)。

### 模型由你选择

在设置中心接入自己的模型服务，按任务需要选择模型。对话模型负责理解与组织任务，计算后端负责执行相应的量子计算；两者分别配置。切换模型后，可以继续使用已有的研究方法和工具，具体协议兼容性以当前适配和实测为准。

连接名、依赖和默认开关见前面的 [MCP 服务目录](#mcp-服务目录)；云服务与凭据范围见下方[量子后端说明](#可以连接哪些量子后端)。

### 从论文方法开始一次计算

读到一种方法后，可以先在小系统上看它如何工作。OpenQuantum 已接入 **SQD、TJM、BP+LSD、RandomMeas、Flow-VQE 和 TeNPy**：从 H₂ 的采样子空间对角化，到开放系统张量轨迹、二元校验矩阵解码、随机测量、参数学习和自旋链 DMRG。

这些接入固定了上游实现与依赖版本，并随结果返回输入、版本和检查信息。主计算与独立精确参考按各自成本运行；参考可用时，可以比较 SQD 与同一活性空间 FCI 的能量、TJM 与 Lindblad 演化的观测量，或 DMRG 与精确对角化的结果。

这些能力提供本地计算、算法比较与数值检查。论文出处、上游仓库、物理假设与验证记录见[论文方法说明](docs/integrations/PAPER_BACKED_TOOLS.md)；准备依赖后，可直接使用前面的[论文方法试用示例](#试用-sqd-与-tenpy)。

### 可选上游 Skill 与开发证据

[OriginQ 官方 `pyqpanda3` Skill](https://github.com/OriginQ/pyqpanda3-skill) 提供电路编程、算法模板、迁移与 QCloud 使用指导。它**不计入上面的 23 个内置 Skill，也不会在首次启动时自动安装**；运行 `npm run skill:qpanda:setup` 后，固定审阅版本才会进入项目 Skill 目录。安装这个 Skill 不会自动启用 `qpanda_runtime`，也不会赋予云任务权限。

[固定量子能力 Benchmark](benchmarks/quantum-capabilities/README.md)使用 [MQT Bench](https://github.com/munich-quantum-toolkit/bench) 的 3 个固定电路案例与 manifest 做开发回归，属于开发与 CI 证据，不是 Skill 或 MCP 服务。

第三方组件保留原项目的版权与许可证。版本、来源和集成内容见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)；Skill、Tool Provider 与 MCP Server 的完整分工见[扩展对象模型](docs/architecture/EXTENSION_MODEL.md)。

### 可以连接哪些量子后端

OpenQuantum 为本地模拟、IBM Quantum、IonQ 和多家国内量子云保留明确的接入边界：先发现后端，再由使用者决定是否配置并启用任务接口。下表是集成范围，不是这些服务当前在线可用的证明。

<details>
<summary><strong>查看量子后端与凭据要求</strong></summary>

| 后端 | 当前能力 | 凭据或使用条件 |
| --- | --- | --- |
| 本地计算 | 电路与噪声仿真、基态参考计算、量子态审计、纠错采样、优化与实验模拟；各有输入范围 | 数值计算无需云凭据；部分依赖首次使用时下载 |
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

## 一起建设 OpenQuantum

欢迎贡献可复现案例、领域 Skill、计算工具、硬件适配和独立科学检查，也欢迎参与量子学习通的课程设计与资源整理，注明来源、适用基础和授权范围。新增内容应服务明确的科研或教学任务，并说明当前实现与验证范围。

从[贡献指南](CONTRIBUTING.md)开始，产品背景见[项目故事](docs/communications/openquantum-wechat-launch.md)，安全问题请按[安全政策](SECURITY.md)私密报告。

准备开始使用时，可以先[启动网页工作台](#快速开始)，或[复算一个本地示例](#从一个真实任务开始)。已有自己的量子方法或工具，则从[扩展入口](#把你的量子能力接进来)开始。

**量子计算，就在指尖。方法与证据，留在你的工作台。**

## License

除明确单独许可的目录外，OpenQuantum 自有代码采用 [MIT License](LICENSE)，版权所有 © 2026 Xi Zhao。

[Mitiq 误差缓解能力目录](.agents/skills/mitiq-error-mitigation/)采用 GPL-3.0-only；该目录的 [LICENSE](.agents/skills/mitiq-error-mitigation/LICENSE) 和 [NOTICE](.agents/skills/mitiq-error-mitigation/NOTICE) 优先适用，详见[发行边界](docs/integrations/MITIQ.md#许可证与发行边界)。

[Metriq 公开数据快照](src/metriq-data/upstream/)采用 CC-BY-4.0，保留原版 [LICENSE](src/metriq-data/upstream/LICENSE)、[署名与转换说明](src/metriq-data/upstream/NOTICE)，每次查询同时返回来源与署名。

DeepSeek Harness、DSH Desktop、OpenMAIC、FatQat、Qiskit MCP Servers、FieldQKit、Quantum Hardware MCP 和其他第三方组件沿用各自的许可证，详细来源见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
