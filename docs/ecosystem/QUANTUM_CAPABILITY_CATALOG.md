# OpenQuantum 量子能力候选清单

- 更新日期：2026-08-16
- 目标：为 OpenQuantum 选择可维护的 Harness 原生 Skill、MCP 与 Validator
- 原则：不建设独立 Runtime 或插件市场；仓库内精选、审阅、测试，再通过 Git 发布

## 1. 准入模型

一个候选能力不是“找到一个仓库就安装”，而是先判断需要下面哪些独立模块：

1. **Skill**：限定问题、工作流、工具选择和解释边界；
2. **MCP / Tool**：需要确定性执行或外部系统时，产生可观察事实；
3. **Validator / eval**：存在科学主张时，对该主张做独立检查。

DeepSeek Harness 不会把这三者绑定成一个对象。Skill 进入 `ctx.skills`，MCP Tool 进入 `ctx.tools`，
Validator 是 OpenQuantum 的确定性实现；Agent preset / Cordis 才是它们的组合 seam。为维护 locality，
源码可以共置在一个目录，但每个运行模块仍需独立注册或调用。

每个候选进入四种状态之一：

| 状态 | 含义 |
| --- | --- |
| 已集成 | 已进入 Harness preset 或 `.agents/skills`，并有最小验证 |
| 可适配 | 上游清楚、许可证可处理、产品作用域明确，值得做下一条纵切 |
| 观察 | 有价值但依赖重、云副作用强或科学边界尚未收口 |
| 暂不纳入 | 来源、许可证、维护或可验证性不足 |

## 2. 第一批已集成

| 能力 | 形式 | 默认状态 | 说明 |
| --- | --- | --- | --- |
| `quantum-ground-state` | 独立 Skill / 本地 MCP / Validator | 开启 | 由 preset 组合的窄作用域二量子位 VQE 参考能力 |
| Qiskit Circuits | 官方 MCP | 开启 | QASM/QPY、转译、分析和优化比较 |
| Qiskit Docs | 官方 MCP | 开启 | 文档搜索、页面读取和错误码查询 |
| `qiskit-circuit-workbench` | Skill | 开启 | 把两项 Qiskit MCP 组织成可审查电路工作流 |
| `tyxonq-workbench` | Skill / 本地 MCP | 关闭 | 固定 TyxonQ 1.2.0，只开放有界电路与噪声仿真，不开放云端任务 |
| `quantum-sdk-advisor` | Skill | 开启 | 按问题、执行目标、许可证和验证要求选择软件栈 |
| IBM Runtime / Transpiler | 官方 MCP | 关闭 | 需要 Token，可能产生云端任务和费用 |
| Quantum Hardware MCP | 社区 MCP | 关闭 | 多云硬件查询与任务控制，需人工审阅后启用 |

Qiskit MCP 来自官方 Apache-2.0 项目
[Qiskit/mcp-servers](https://github.com/Qiskit/mcp-servers)。第一批新增 Skill 只编排现有 Harness Tool，
不复制 Qiskit Runtime。

## 3. 下一批优先候选

| 优先级 | 候选纵切 | 上游 | 计划的 Skill / MCP / Validator |
| ---: | --- | --- | --- |
| 1 | 分子几何到 qubit Hamiltonian | [PySCF](https://github.com/pyscf/pyscf) + [Qiskit Nature](https://github.com/qiskit-community/qiskit-nature) | `quantum-chemistry-hamiltonian` + 本地 MCP + 积分/映射重放 Validator |
| 2 | QEC 稳定子模拟与解码 | [Stim](https://github.com/quantumlib/Stim) + [PyMatching](https://github.com/oscarhiggott/PyMatching) | `quantum-error-correction` + 本地 MCP + 逻辑错误率统计 Validator |
| 3 | 可微分量子机器学习 | [PennyLane](https://github.com/PennyLaneAI/pennylane) | `pennylane-hybrid-workflow` + 固定数据/梯度 Artifact + eval |
| 4 | NISQ 噪声与 Google 风格电路 | [Cirq](https://github.com/quantumlib/Cirq) | `cirq-noise-workbench` + 本地模拟 MCP + channel/trace 检查 |
| 5 | 容错资源估算 | [Microsoft QDK](https://github.com/microsoft/qdk) | `qsharp-resource-estimation` + Q# Tool + 假设完整性 Validator |

这五项都优先做本地、确定性纵切。任何云 QPU 接入都晚于本地事实与失败路径验证。

### 本源量子（OriginQ）生态

[OriginQ / 本源量子](https://github.com/OriginQ) 是国产 QPanda / pyQPanda / ChemiQ / VQNet 生态的上游。它补齐当前一个空缺：FieldQKit 只做国内云的**只读发现**，而本源官方已有仓库能走到**悟空真机执行**。下面三项已是 MCP / Skill 形态，接入改造量小，均为 Apache-2.0。

| 候选 | 上游 | 计划形式 | 默认状态 |
| --- | --- | --- | --- |
| QPanda3 Runtime MCP | [OriginQ/qpanda3-runtime-mcp-server](https://github.com/OriginQ/qpanda3-runtime-mcp-server) | 原版接入 + 凭据设置，约 15 个工具（设备 / 采样 / 期望值 / 批量 / 任务管理） | 接入，关闭 |
| QPanda 电路 Skill | [OriginQ/pyqpanda3-skill](https://github.com/OriginQ/pyqpanda3-skill) | 作为内容来源，按边界重写为窄作用域 `qpanda-circuit-workbench`，本地电路构造与云提交分离 | 可适配 |
| QPanda 算法库 | [OriginQ/pyqpanda-algorithm](https://github.com/OriginQ/pyqpanda-algorithm) | Skill + 本地 MCP，仅开 CPU 模拟器（QUBO / QAOA / Grover / QSVM / QPCA 等） | 可适配，本地 |

三项共同的边界与取舍：

- **凭据与云费用**：`qpanda3-runtime-mcp-server` 默认连 `qpanda3-runtime.qpanda.cn` 真机，需要 `QPANDA3_API_KEY`，会提交真实任务并产生费用。它属于“写 / 执行”风险类，和只读的 FieldQKit 不同，必须默认关闭、凭据由使用者自配，并遵守“API Key 不进 Skill / preset / 日志”的硬规则。
- **原生编译依赖**：pyqpanda3 是原生 C++ 扩展（Python 3.11–3.13，Windows 需 VC++ Redistributable、Linux 需 GCC 7.5+），安装面比现有纯 Python MCP 重。参照 TyxonQ 的做法固定 PyPI 版本、走独立进程或沙箱。
- **定位而非重复**：QPanda 的 VQE / QAOA / Grover 与现有 Qiskit 能力和自研 `quantum-ground-state` 功能重叠。接入理由应明确定位为“**国产悟空真机接入 + 算法库广度（金融 / ML / 优化）**”，而不是再引入一套电路 SDK。
- **不纳入**：本源组织下的语言工具链（QRunes、qurator-vscode）与教学内容（Quantum_book、各类 textbook / doc）不作为 Agent 能力纳入；教学内容的许可证可能与代码不同，不整包导入。

## 4. 有价值但先观察

| 候选 | 原因 | 当前决定 |
| --- | --- | --- |
| [Amazon Braket Algorithm Library](https://github.com/amazon-braket/amazon-braket-algorithm-library) | 多硬件入口和官方样例有价值，但容易触发云费用 | 只作为算法参考；后续 MCP 默认关闭 |
| [CUDA-Q](https://github.com/NVIDIA/cuda-quantum) | GPU/HPC 能力强，但依赖和部署面较重 | 等真实 HPC 用户需求 |
| [Mitiq](https://github.com/unitaryfoundation/mitiq) | 误差缓解能力清楚，但 GPL-3.0 需要兼容性判断 | 先设计独立进程边界和验收案例 |
| [OpenQuantumComputing/QAOA](https://github.com/OpenQuantumComputing/QAOA) | 对 QAOA 研究有参考价值，但 GPL-3.0 且不是 MCP/Skill | 只参考测试方法，不直接复制 |
| [K-Dense Scientific Agent Skills](https://github.com/K-Dense-AI/scientific-agent-skills) | 有 Qiskit/Cirq/PennyLane Skill，MIT 且维护活跃 | 作为内容来源；按 OpenQuantum 边界重新编写，不整包导入 |
| [OriginQ/pyChemiQ](https://github.com/OriginQ/pyChemiQ) | 国产量子化学包，可对应候选 #1 的分子几何→qubit Hamiltonian 纵切 | 作为 PySCF + Qiskit Nature 之外的国产对照；先核实许可证与依赖重量 |
| VQNet 2.0（[教程](https://github.com/OriginQ/VQNET2.0-tutorial)） | 国产量子机器学习框架，可对应候选 #3 的可微分 QML 纵切 | 作为 PennyLane 的国产替代先观察；核心多为 pip 分发，先核实许可证 |
| QPanda-2 / QPanda3 C++ 核心、[intel-qs](https://github.com/OriginQ/intel-qs) | pyqpanda3 的底层引擎与高性能模拟器 | 构建面重、intel-qs 来源需核实；作为底层依赖间接使用，不作直接集成对象 |

## 5. 拒绝条件

出现任一条件就不进入默认发行版：

- 没有明确许可证或维护来源；
- Skill 只靠 Prompt 宣称数值正确，却没有可复核事实；
- MCP 默认拥有真实硬件提交、取消、付费或数据外发能力；
- 要求把 API Key 写入 Skill、preset、日志或 Artifact；
- 名称叫“quantum”但实际属于密码学、区块链或普通 SaaS，和量子计算工作流无关；
- 为接入一个能力要求复制 DeepSeek Harness 的 Session、Tool、权限或 Runtime。

## 6. 贡献方式

外部团队可以直接提交普通 Git PR：

1. 在 `.agents/skills/<name>/` 增加标准 `SKILL.md`；
2. 必要时把确定性计算封装成 stdio / Streamable HTTP MCP；
3. 有科学主张时提供 schema、Validator 和固定正负 eval；这些文件可以与 Skill 共置，但不会被 Harness
   Skill Registry 自动执行；
4. 在 `runtime/openquantum/` 的 preset / Cordis 配置中独立注册并组合 MCP client；
5. 说明许可证、凭据、网络、成本和失败边界；
6. 通过 Skill 校验、单元测试和真实 Harness `skill.list` / Tool 注册检查。

这个清单是项目内的人工精选队列，不是自动安装市场，也不引入 OpenQuantum 私有包协议。
