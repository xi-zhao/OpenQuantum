# OpenQuantum 量子能力候选清单

- 更新日期：2026-08-30
- 目标：为 OpenQuantum 选择可维护的 Harness 原生 Skill、Tool Provider 与 Validator
- 原则：不建设独立 Runtime 或插件市场；仓库内精选、审阅、测试，再通过 Git 发布

## 1. 准入模型

一个候选能力不是“找到一个仓库就安装”，而是先判断需要下面哪些独立模块：

1. **Skill**：限定问题、工作流、工具选择和解释边界；
2. **Tool**：Agent 可调用的原子动作；需要独立进程或远程服务时由 MCP Server 暴露；
3. **Scientific Validator**：存在科学主张时，独立重算并产生 observations；
4. **Acceptance Profile**：以版本化规则数据定义必选检查、阈值和来源链要求；
5. **central Acceptance Builder**：汇聚 Profile、observations 和 provenance，唯一地推导最终 Acceptance；
6. **Eval / Benchmark**：开发和发布期的固定回归证据，不进入用户运行链。

DeepSeek Harness 不会把这些对象绑定成一个对象。Skill 进入 `ctx.skills`，原生或 MCP-exposed Tool 进入
`ctx.tools`；Agent Preset/Cordis 组合 Skill Provider、Tool Provider，以及确有 hook 需要的 agent-scoped Host Plugin。Validator 是 OpenQuantum 的
确定性实现，必须由 Tool、Materializer 或 CI 显式调用。可信 Host Plugin 只拥有生命周期 hook，内部
Scientific Result Adapter 只做 capability 映射。为维护 locality，源码可以共置在
一个目录，但共置不会产生运行时绑定。

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
| `quantum-ground-state` | Skill + 本地 MCP Server + Harness MCP Client + MCP-exposed Tool + Validator | 开启 | Agent Preset 组合 Skill Provider 与 Harness MCP Client；Host Plugin 经内部 Adapter 和 Materializer 交给 Validator，central Acceptance Builder 消费 Acceptance Profile、observations 与 provenance |
| Qiskit Circuits | 官方 MCP Server + Harness MCP Client + MCP-exposed Tool | 条件开启 | QASM/QPY、转译、分析和优化比较；可由环境变量关闭 |
| Qiskit Docs | 官方 MCP Server + Harness MCP Client + MCP-exposed Tool | 条件开启 | 文档搜索、页面读取和错误码查询；可由环境变量关闭 |
| `qiskit-circuit-workbench` | Skill | 开启 | 把两组 Qiskit MCP-exposed Tool 组织成可审查电路工作流 |
| `tyxonq-workbench` | Skill + 本地 MCP Server + Harness MCP Client + MCP-exposed Tool | opt-in | 固定 TyxonQ 1.2.0，只开放有界电路与噪声仿真，不开放云端任务 |
| `qmclaw-workbench` | Skill + 本地 MCP Server + Harness MCP Client + MCP-exposed Tool | 开启 | 固定审阅 QMClaw commit `18d7fa1`；覆盖 13 类有界、带 seed 的超导测控模拟，明确标记 synthetic，不开放 LabRAD、参数写回或真实仪器 |
| `quantum-information-audit` | Skill + toqito 本地 MCP Server + Harness MCP Client + MCP-exposed Tool + Validator | 开启 | 固定 toqito 1.3.1；Tool 返回 facts/observations，Materializer 物化并重读真实字节后，Acceptance Profile 定义规则，central Acceptance Builder 派生 Acceptance |
| `quantum-circuit-verification` | Skill + MQT QCEC 本地 MCP Server + Harness MCP Client + MCP-exposed Tool | 开启 | 固定 MQT QCEC 3.7.0，只比较有界、无测量 OpenQASM 2 unitary 电路，区分确定与概率性结论 |
| `qec-memory-experiment` | Skill + Stim/PyMatching 本地 MCP Server + Harness MCP Client + MCP-exposed Tool | 开启 | 固定 Stim 1.16.0 与 PyMatching 2.4.0，运行有界、带 seed 的 rotated surface-code memory 采样和 MWPM 解码；单点结果不作 threshold 主张 |
| 固定量子能力 benchmark | MQT Bench fixture + manifest + 离线校验 | CI 开启 | 固定 `ghz-3`、`qft-3`、`bv-4` 三案例分母，不注册为 Agent Tool，不把未交付记为语义失败 |
| `quantum-sdk-advisor` | Skill | 开启 | 按问题、执行目标、许可证和验证要求选择软件栈 |
| IBM Runtime / Transpiler | 官方 MCP Server + Harness MCP Client + MCP-exposed Tool | 关闭 | 需要 Token，可能产生云端任务和费用 |
| Quantum Hardware | 社区 MCP Server + Harness MCP Client + MCP-exposed Tool | 关闭 | 多云硬件查询与任务控制，需人工审阅后启用 |
| QPanda3 Runtime | 本源官方 MCP Server + Harness MCP Client + MCP-exposed Tool（固定提交 + 凭据网关） | 关闭 | 本源量子官方运行时，接入悟空 QPU 真机执行；`sample`/`estimate`/`batch` 为真机写操作，需 `npm run mcp:qpanda-runtime:setup` 检出固定提交、配置 `QPANDA3_API_KEY` 后手动开启 |
| QPanda3 编程 Skill | 本源官方 Skill（固定提交检出） | 需 setup | 原版接入 pyqpanda3 官方 Skill，提供电路构建、QAOA/Grover/VQE/QSVM 算法模板、pyqpanda→pyqpanda3 迁移与 QCloud 指导；`npm run skill:qpanda:setup` 检出到被忽略的 `.agents/skills/pyqpanda3` 原样挂载，云执行仍受默认关闭的 QPanda3 Runtime MCP 约束 |
| QPanda QUBO 本地桥 | Skill + pyqpanda_alg 薄桥 MCP Server + Harness MCP Client + MCP-exposed Tool（固定 `2.0.0`） | 开启 | 把命名二值目标和线性等式约束编译成 QUBO，以全量枚举复核可行最优、编译能量和 penalty，再调用上游经典求解或可选 QAOA；仅本地、无凭据 |

Qiskit MCP Server 来自官方 Apache-2.0 项目
[Qiskit/mcp-servers](https://github.com/Qiskit/mcp-servers)。新增能力先定义独立 Skill 与 Tool；只有需要
进程、语言或远程边界时才增加 MCP Server 和 Harness MCP Client，有科学主张时再组合 Validator 与 eval，
不复制 Qiskit Runtime 或 DeepSeek Harness Runtime。

## 3. 下一批优先候选

| 优先级 | 候选纵切 | 上游 | 计划的独立模块 |
| ---: | --- | --- | --- |
| 1 | 分子几何到 qubit Hamiltonian | [PySCF](https://github.com/pyscf/pyscf) + [Qiskit Nature](https://github.com/qiskit-community/qiskit-nature) | `quantum-chemistry-hamiltonian` Skill + 本地 Tool（必要时由 MCP Server 暴露）+ 积分/映射重放 Validator |
| 2 | 可微分量子机器学习 | [PennyLane](https://github.com/PennyLaneAI/pennylane) | `pennylane-hybrid-workflow` + 固定数据/梯度 Artifact + eval |
| 3 | NISQ 噪声与 Google 风格电路 | [Cirq](https://github.com/quantumlib/Cirq) | `cirq-noise-workbench` Skill + 本地模拟 Tool（必要时由 MCP Server 暴露）+ channel/trace 检查 |
| 4 | 容错资源估算 | [Microsoft QDK](https://github.com/microsoft/qdk) | `qsharp-resource-estimation` + Q# Tool + 假设完整性 Validator |

这四项都优先做本地、确定性纵切。任何云 QPU 接入都晚于本地事实与失败路径验证。QEC 稳定子模拟与解码已经以 `qec-memory-experiment` 这一窄纵切进入已集成能力。

### 本源量子（OriginQ）生态

[OriginQ / 本源量子](https://github.com/OriginQ) 是国产 QPanda / pyQPanda / ChemiQ / VQNet 生态的上游。它补齐当前一个空缺：FieldQKit 只做国内云的**只读发现**，而本源官方已有仓库能走到**悟空真机执行**。下面三项分别提供 MCP Server 或 Skill，均为 Apache-2.0。原则是**只做集成**：固定上游提交或版本，不 fork、不改写上游代码；云端 Tool 保持凭据门控和默认关闭，无凭据的本地 QUBO Tool 在通过边界验证后开启。三项均已完成接入（QPanda3 Runtime MCP Server、pyqpanda3 Skill、QUBO 本地桥）。

| 候选 | 上游 | 接入形式 | 默认状态 |
| --- | --- | --- | --- |
| QPanda3 Runtime MCP | [OriginQ/qpanda3-runtime-mcp-server](https://github.com/OriginQ/qpanda3-runtime-mcp-server) | 原版接入 + 凭据设置，约 22 个工具（设备 / 采样 / 期望值 / 批量 / 任务管理 / 程序集绑定） | **已集成，关闭**（见 §2） |
| QPanda 电路 Skill | [OriginQ/pyqpanda3-skill](https://github.com/OriginQ/pyqpanda3-skill) | 原版接入官方 Skill（pin 固定提交）直接挂载，不改写上游内容；实际云执行仍受默认关闭的 QPanda3 Runtime MCP 约束 | **已集成，需 setup**（见 §2） |
| QPanda 算法库 | [OriginQ/pyqpanda-algorithm](https://github.com/OriginQ/pyqpanda-algorithm) | 自建有界薄桥调用上游算法，不改写上游代码；首个切口 QUBO 已落地，其余算法（Grover / QSVM / QPCA 等）后续按需扩展 | **已集成（QUBO），开启**（见 §2） |

三项共同的边界与取舍：

- **凭据与云费用**：`qpanda3-runtime-mcp-server` 默认连 `qpanda3-runtime.qpanda.cn` 真机，需要 `QPANDA3_API_KEY`，会提交真实任务并产生费用。它属于“写 / 执行”风险类，和只读的 FieldQKit 不同，必须默认关闭、凭据由使用者自配，并遵守“API Key 不进 Skill / preset / 日志”的硬规则。
- **原生编译依赖**：pyqpanda3 是原生 C++ 扩展（Python 3.11–3.13，Windows 需 VC++ Redistributable、Linux 需 GCC 7.5+），安装面比现有纯 Python MCP 重。参照 TyxonQ 的做法固定 PyPI 版本、走独立进程或沙箱。
- **定位而非重复**：QPanda 的 VQE / QAOA / Grover 与现有 Qiskit 能力和自研 `quantum-ground-state` 功能重叠。接入理由应明确定位为“**国产悟空真机接入 + 算法库广度（金融 / ML / 优化）**”，而不是再引入一套电路 SDK。
- **QPanda 算法库的桥怎么做对的**：上游没有可直接挂载的 MCP Server 或 Skill，因此 OpenQuantum 只为 QUBO 建立有界 Tool 和薄桥。命名变量、目标和等式约束先由仓库内编译器转换成数值 QUBO，再用全量枚举复核每个赋值的目标、约束 residual、编译能量和 penalty；最后才调用固定 `pyqpanda_alg==2.0.0` 的 `QuadraticBinary` / `QUBO_QAOA`。由于上游包顶层会连带导入与 QUBO 无关的 VQE 原生依赖，bridge 只加载官方 QUBO 子模块；经典 traversal 的真实运行已与独立枚举匹配。首个切口只做 QUBO，其余算法后续按需扩展。
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
2. 先定义 Agent-facing Tool；只有需要进程、语言或远程边界时，才由 stdio / Streamable HTTP MCP Server 暴露；
3. 有科学主张时提供 schema、Validator 和固定正负 eval；这些文件可以与 Skill 共置，但不会被 Harness
   Skill Registry 自动执行；
4. 在 `runtime/openquantum/` 的 Agent Preset/Cordis 配置中独立声明并组合 Harness MCP Client；
5. 说明许可证、凭据、网络、成本和失败边界；
6. 通过 Skill 校验、单元测试和真实 Harness `skill.list` / Tool 注册检查。

这个清单是项目内的人工精选队列，不是自动安装市场，也不引入 OpenQuantum 私有包协议。
