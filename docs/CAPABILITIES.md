# OpenQuantum 能力与接口参考

[返回首页](../README.md) · [按任务选择相近能力](integrations/CAPABILITY_SELECTION.md) · [SDK 原生 API 与环境](integrations/FULL_SDK_ACCESS.md)

本文集中保存科研任务说明、完整 Skill、MCP 服务与原生 Tool 清单及上游来源。清单对应源码主线；已安装版本、连接是否就绪与科学验收状态分别核对。

[任务方向](#按任务查找) · [量子后端](#本地计算与量子云) · [接口总览](#接口总览) · [内置 Skills](#内置-skills) · [MCP 服务目录](#mcp-服务目录) · [原生量子 Tools](#原生量子-tools) · [可选上游 Skill](#可选上游-skill) · [开源生态与致谢](#开源生态与致谢)

## 按任务查找

### 算法学习与方法比较

你可以从可运行的算法示例入手，通过修改输入、检查数值结果，逐步将方法迁移到自己的研究问题中。平台已将 UnitaryLab 的 **66 份 quantum-skills 指南**适配为原生 Skill：其中 **49 项提供可执行示例**，逐项覆盖原算法库的 **39 个模块**及指南独有方法；其余指南用于算法分类、后端选择和迁移。

| 任务方向 | 可运行的方法与示例 |
| --- | --- |
| 算法基础与搜索 | QFT、QPE、Hadamard test、振幅放大与估计、Grover、Shor、Simon、离散对数和图行走 |
| 线性系统与矩阵方法 | HHL、VQLS、QSVT 线性求解、绝热求解、LCU 与 QSP；附经典本征求解参考 |
| 哈密顿量模拟 | Trotter–Suzuki、qDrift、QSP、Taylor LCU，以及披露替换方式的 Cartan 示例 |
| 变分计算与机器学习 | VQE、VQD、QAOA、VQC、QCBM、CVQNN，以及梯度与量子 Fisher 信息计算 |
| 态制备与多体计算 | Möttönen、MPS、Isometry、变分态制备，分子 DMRG、Fermi–Hubbard VQE 与 Ising 演化 |
| 纠错构码与微分方程 | qLDPC 构码与 syndrome；一维、二维热方程和周期平流的薛定谔化示例 |

这些示例使用 Qiskit、PennyLane、quimb、PySCF、NumPy/SciPy 等开源后端，可直接运行，也可由 Agent 经已有代码执行工具调用。默认参数是教学算例；实际输入、参考误差和收敛状态需要按任务检查。

适配保留上游来源与许可证，不依赖闭源 UnitaryLab 运行时。工作流覆盖不表示上游 Python API、优化器或后端完全兼容；Cartan、CVQNN、DMRG 等差异在[逐项覆盖表](integrations/UNITARYLAB_OPEN_COVERAGE.md)和[运行说明](../examples/quantum-algorithms/README.md)中公开。

[直接运行算法示例](EXAMPLES.md#直接运行开源算法示例) · [选择相近方法](integrations/CAPABILITY_SELECTION.md)

### 电路与量子信息

| 任务方向 | 可以发起的任务 | 可以查看的结果 |
| --- | --- | --- |
| 量子电路 | 分析或转换 OpenQASM / QPY 电路，比较转译，检查等价性，运行电路仿真 | 电路结构、转译结果、等价性检查、态矢或采样分布 |
| 本地编译与仿真 | 用 TKET、QSteed、MQT QMAP 编译或映射电路，用 Braket LocalSimulator、QCompute、Qibo 等运行本地模拟 | 门集与线路映射、态矢或概率；保留各 SDK 的位序约定 |
| 可微分电路与混合程序 | 用 PennyLane、DeepQuantum、TensorCircuit、MindQuantum 或 VQNet 求期望和梯度；用 Guppy / Selene 模拟测量、复位与经典反馈 | 参数梯度、概率和程序执行结果 |
| 容错资源估算 | 用 Microsoft QDK 估算物理资源，用 Qualtran 统计指定 Bloq 的门资源 | 量子位、时间或门计数，以及对应硬件与分解假设 |
| Qiskit / Cirq 互操作 | 用 qBraid 按固定 OpenQASM 2 路径转换受支持的酉电路 | 转换后的电路、保留的量子位编号与空闲位；可选完整酉矩阵对照 |
| 电路优化与测量式计算 | 用 PyZX 做 ZX 重写与电路提取，用 Graphix 转换和模拟 MBQC 模式 | 优化前后电路与门数、资源图和测量模式；可选独立对照 |
| 电路优化与切割 | 用 Compact 优化门序列，用 QCut 切分电路并重建期望值 | 优化前后电路与独立等价对照；切割开销、实际采样量与可选未切割参考 |
| Clifford+T 噪声采样 | 用 Clifft 研究 T 门干涉与噪声，或采样受支持的 Stim 格式电路 | 最终位串频数与可选密度矩阵参考；另可返回中间测量及 detector / observable 原始奇偶记录 |
| 量子态与测量 | 审计密度矩阵与纠缠指标；模拟已知 product / GHZ 态的局域随机测量 | 状态指标与独立检查，子区纯度估计及有限样本误差 |

### 数学与物理形式化

使用 [Lean 4、mathlib 与 physlib](../.agents/skills/lean-physics/SKILL.md)，把数学或物理命题保存为 Lean 文件，复用已有定理并检查证明与依赖公理。例如：“证明 Pauli 矩阵平方为单位矩阵，检查 XY 对易关系，并列出这些定理的公理依赖。”

入口为 `lean-physics`，沿用 SDK 工作台显式准备固定 Lean 4.35.0 兼容环境。准备需要已安装的对应 Lean 工具链；默认只构建小型 Pauli 示例所需模块，其他模块按任务准备。用户证明通过宿主代码工具执行，不会在检查证明时自动安装依赖。

形式证明只覆盖文件中的定义、假设与依赖公理；通过 Lean 不代表物理模型真实，也不等于数值程序或科学验收通过。使用方式、固定来源和资源要求见 [Skill](../.agents/skills/lean-physics/SKILL.md)。

### 基态、化学与优化

| 任务方向 | 可以发起的任务 | 可以查看的结果 |
| --- | --- | --- |
| 基态求解与验证 | 提供二量子位实 Pauli Hamiltonian，在固定粒子扇区运行 VQE，并检查精确参考 | 能量、收敛轨迹、独立检查，以及完整流程中的科学验收报告 |
| 量子化学与多体基态 | 用 SQD 研究分子与活性空间，或用 TeNPy 计算 XYZ 自旋链基态 | SQD 能量与轨道占据，DMRG 能量、磁化、纠缠熵及收敛信息；可选精确参考 |
| 变分参数学习 | 对 Pauli Hamiltonian 训练 Flow-VQE，学习低能量电路参数 | Flow 参数学习与等评估预算随机搜索比较 |
| 激发态与核分类 | 用 OpenQARP VQD 搜索多个低能态，或用 cqlib 角度核训练 QSVM | 能量、残差、正交性与可选精确谱；独立测试集分类、解析核及经典基线 |
| 对称性与控制代数 | 用 Symmer 在指定对称性扇区降比特，用 PauLie 分析 Pauli 生成元 | 降维 Hamiltonian、Lie 代数分类与维数；可选能谱对照或闭包 |
| 组合优化 | 用 QPanda、Ocean 或 Kaiwu 构建和求解本地优化问题，用 Qcover 评估给定 QAOA 参数 | 优化解、约束检查、能量与相关量；按接口提供经典对照 |
| 化学算符与既有数据 | 用 OpenFermion / pyChemiQ 映射费米算符，按需用 QCPortal 查询 QCArchive 既有单点记录 | Pauli 项，分子、能量、计算方法与来源；查询保留单位与缺失字段 |

### 误差缓解与量子纠错

| 任务方向 | 可以发起的任务 | 可以查看的结果 |
| --- | --- | --- |
| 误差缓解 | 用 Mitiq 运行 ZNE、REM、PEC 或 CDR，比较相同采样预算下的原始与缓解结果 | 理想参考、经验偏差、方差和 RMSE，以及校准、训练与采样成本 |
| 量子纠错 | 用 Stim / PyMatching 运行 surface-code memory，用 Deltakit 构建矩形码片实验，或进行 BP+LSD 解码 | 实际含噪电路、固定 shots 的逻辑错误率与区间；LSD 的 syndrome 一致性检查 |

### 纠错模型静态诊断

使用 [emlint](../.agents/skills/emlint-dem-audit/SKILL.md) 排查 Stim detector error model（DEM）中的无 syndrome 逻辑翻转、重复机制和连接问题。例如：“检查这份 DEM，保留反例，并解释哪些结论依赖缺失的解码器上下文。”

入口为 `emlint-dem-audit`，通过 SDK 工作台显式准备 emlint 0.2.4 / Stim 1.16.0，再由宿主代码工具调用公开 API 或 CLI。输出保留告警、跳过项、无法得出结论及空模型状态；不自动修改模型。已验证小型正反例、repeat/分解语义和 Stim 表面码模型的诊断接口，详见[工程记录](integrations/evidence/emlint-2026-10-29.json)。静态诊断不证明码距、解码正确性、阈值或科学验收；其他平台及大模型性能未验证。

<a id="开放系统动力学"></a>

### 哈密顿量模拟与开放系统

| 任务方向 | 可以发起的任务 | 可以查看的结果 |
| --- | --- | --- |
| 哈密顿量模拟 | 提供实系数 Pauli Hamiltonian，用 Trotter–Suzuki 或 qDrift 构建演化电路或计算末态 | 电路、资源指标、态矢及可选独立矩阵参考；步数、阶数、时间与随机种子可配置 |
| 开放系统动力学 | 用 TJM 计算开放 Ising 链，用 Dynamiqs 扫描单量子位驱动与梯度，或用 OQuPy 研究环境记忆 | 观测量轨迹、独立参考、梯度以及时间步长与记忆截断信息 |

### 实验模拟与硬件

| 任务方向 | 可以发起的任务 | 可以查看的结果 |
| --- | --- | --- |
| 超导与原子实验 | 模拟调校流程、原生门约束、transmon 泄漏；用 Bloqade Analog / Pulser 研究受支持的原子阵列与脉冲 | 合成数据、动力学轨迹、逐原子占据与末态概率 |
| 脉冲程序与控制 | 用 QUA、LabOne Q、Qblox Scheduler、Qililab 或 OQC QAT 构建程序、排程和离线编译 | 程序、时序、目标指令或波形；当前适配不执行实验室设备程序 |
| 量子硬件接入 | 发现后端、检查拓扑与凭据；按需启用云任务查询、提交与取消 | 设备候选、使用条件；已启用任务接口的结果与状态 |
| 本地设备接口 | 用 QDMI 查询已配置的 C 驱动 | 驱动报告的设备、量子位、门与耦合信息；官方示例驱动用于接口验证，不代表在线 QPU |

### 光子计算与量子网络

| 任务方向 | 可以发起的任务 | 可以查看的结果 |
| --- | --- | --- |
| 光子电路与学习 | 用 Perceval、Lightworks 计算线性光学输出，用 MerLin 运行批量推断与相移梯度；可选 MrMustard 高斯模型 | Fock 概率、梯度或光学矩；明确模式顺序与截断条件 |
| 网络建模与程序 | 用 SimQN 模拟单链路损失与退相干，用 NetQASM 生成双节点程序 | 链路统计和编译产物；SquidASM 数值仿真另需用户准备有许可的 NetSquid 环境 |

### 参考资料与选型

| 任务方向 | 可以发起的任务 | 可以查看的结果 |
| --- | --- | --- |
| 算法参考与工具选型 | 检索 Quantum-Practices 的 66 份算法指南、比较量子 SDK、复用研究步骤 | 固定版本的参考材料、适用假设与选型建议 |
| 公开设备基准 | 从 Metriq 的 410 条固定历史记录中按厂商、设备或基准类型查询 | 原始参数、指标、时间、来源与许可；保留模拟器标签 |

## 本地计算与量子云

本地数值计算无需量子云账户。启用其他工具时，在宿主的 OpenQuantum 设置页配置相应 MCP 连接，按提示重启对应宿主，再在任务中指定所需后端；默认开关见[服务目录](#mcp-服务目录)。

需要使用真实硬件时，按目标服务准备凭据、权限与额度。**设备发现、真实任务提交和本地模拟各有接入范围，分别说明。** 配置存在不代表服务在线；任务是否执行成功，需要查看实际运行记录。

<details>
<summary><strong>可以连接哪些量子后端</strong></summary>

### 可以连接哪些量子后端

OpenQuantum 为本地模拟、IBM Quantum、IonQ 和多家国内量子云保留明确的接入边界：先发现后端，再由使用者决定是否配置并启用任务接口。下表是集成范围，不是这些服务当前在线可用的证明。

| 后端 | 当前能力 | 凭据或使用条件 |
| --- | --- | --- |
| 本地计算 | 电路与噪声仿真、基态参考计算、量子态审计、纠错采样、优化与实验模拟；各有输入范围 | 数值计算无需云凭据；计算前显式准备锁定依赖 |
| IBM Quantum | Runtime、AI Transpiler、硬件查询，可选真实任务提交与取消 | `QISKIT_IBM_TOKEN`，任务类 MCP Server 连接按需开启 |
| IonQ | 硬件查询，可选真实任务提交、取消与成本估算 | `IONQ_API_KEY`，任务类 MCP Server 连接按需开启 |
| 本源量子云 | 只读后端发现（FieldQKit）；另经 QPanda3 Runtime MCP Server 查询悟空 QPU，并可选提交采样、期望值与批量任务 | `ORIGIN_API_TOKEN` 只读发现；`QPANDA3_API_KEY` 可选开启真机任务 |
| 夸父量子云 | 凭据检查、后端发现、量子位筛选、拓扑与校准摘要 | `QUAFU_API_TOKEN`，只读 |
| 天衍量子云 | 凭据检查、后端发现、量子位筛选、拓扑与校准摘要 | `TIANYAN_API_TOKEN`，只读 |
| 国盾量子云 | 凭据检查、后端发现、量子位筛选、拓扑与校准摘要 | `GUODUN_API_TOKEN`，只读 |
| 腾讯量子云 | 凭据检查、后端发现、量子位筛选、拓扑与校准摘要 | `TENCENT_API_TOKEN`，只读 |
| FieldQuantum | 云端模拟后端发现 | `FIELDQUANTUM_API_TOKEN`，只读 |
| 逻辑比特量子云 | 凭据检查、后端发现、量子位筛选、拓扑与校准摘要 | `LOGICALQUBIT_API_TOKEN`，只读 |

硬件任务和付费服务按需开启。后端发现类能力保持只读，适合先了解设备、拓扑和校准信息，再决定是否进入真实任务流程。

此处的“只读”仅指不改变远端云服务或 QPU 状态。本地 Python 计算桥接需在调用前[显式准备锁定环境](integrations/LOCAL_ENVIRONMENTS.md)，计算 Tool 运行时不再自动安装依赖；但由于 SDK 缓存和结果物化仍可能写入本地工作区，工具侧依然保留相应的 `workspace-write` 合同。

</details>

## 分子线性响应与光谱

[SlowQuant](../.agents/skills/slowquant-response/SKILL.md) 支持自定义分子/活性空间、酉波函数、轨道优化和 qLR 形式，计算激发能、跃迁偶极与振子强度。使用 `slowquant-response` 显式准备固定源码环境，再通过宿主代码工具使用公开 API；例子不限制 API 或问题规模。[使用与验证](integrations/SLOWQUANT.md)区分离线数值对照、Qiskit 路径和科学验收。

## 接口总览

<p>
  <a href="#内置-skills">Skill 目录</a> ·
  <a href="#mcp-服务目录">MCP 服务目录</a> ·
  <a href="#原生量子-tools">原生量子 Tools</a>
</p>

当前源码分发 **187 个内置 Skill、91 个 MCP 服务连接、5 个原生量子 Tool**。其中 66 个 Skill 来自 quantum-skills 的开源工作流适配，共用现有代码执行工具；其中 49 项提供可运行示例，覆盖 unitarylab_algorithms 的全部 39 个模块。Skill、Tool 和 MCP 连接分别统计。

当前配置共包含 **282 个可配置 Tool 名称**：258 个由 MCP 服务提供，18 个为 Harness 通用工具，6 个为平台原生工具（上面的 5 个量子动作及 1 个教学生成动作）。这是配置全集；`bash` / `pwsh` 按平台互斥，连接开关、环境和工具范围也会影响实际可调用集合。既有能力的逐项决定见[治理记录](architecture/EXTENSION_GOVERNANCE.md)，新增中性原子动力学见 [Bloqade Analog](integrations/BLOQADE_ANALOG.md)。

<details>
<summary><strong>内置 Skills：按研究方法查找工作流</strong></summary>

## 内置 Skills

既有条目与治理情况见[治理清单](architecture/EXTENSION_GOVERNANCE.md)；相近入口及大型可选服务的专业工具范围见[能力选择](integrations/CAPABILITY_SELECTION.md)。

这 187 个 Skill 覆盖方法选择、计算实验、结果解释和平台诊断。其中 174 项可由 Agent 自动选择，13 个分类索引保留为用户手动导航；原名称和手动调用均可继续使用。点击名称即可查看完整的 `SKILL.md`；所需工具与连接分别配置。新增算法工作流的参数、安装与开源替换差异见[运行说明](../examples/quantum-algorithms/README.md)。

下表按**研究方法与用途**介绍能力。各 Tool 提供的模型、参数和输入格式见[计算参数与运行方式](EXAMPLES.md#计算参数与运行方式)。

### 0.8.4 原生 SDK 扩展

| Skill | 研究方法与用途 | 执行入口 |
| --- | --- | --- |
| [`arc-rydberg`](../.agents/skills/arc-rydberg/SKILL.md) | 原子、能级、跃迁矩阵元、寿命、Stark 图与相互作用 | 宿主代码 Tool；显式准备原生 SDK |
| [`catalyst-compilation`](../.agents/skills/catalyst-compilation/SKILL.md) | qjit、混合程序、QNode、控制流、编译配置与梯度 | 宿主代码 Tool；显式准备原生 SDK |
| [`jaxquantum-modeling`](../.agents/skills/jaxquantum-modeling/SKILL.md) | JAX 算符、器件与 bosonic 模型、动力学、扫描与梯度 | 宿主代码 Tool；显式准备原生 SDK |
| [`josephson-circuits`](../.agents/skills/josephson-circuits/SKILL.md) | Josephson 元件、电路、频域谐波平衡、散射与噪声 | 宿主代码 Tool；显式准备原生 SDK |
| [`monoprop-propagation`](../.agents/skills/monoprop-propagation/SKILL.md) | Pauli/Majorana 算符、门生成元、传播、梯度与截断 | 宿主代码 Tool；显式准备原生 SDK |
| [`mqt-debugger`](../.agents/skills/mqt-debugger/SKILL.md) | OpenQASM 程序、单步仿真、断言、影响范围与错误诊断 | 宿主代码 Tool；显式准备原生 SDK |
| [`mqt-qecc`](../.agents/skills/mqt-qecc/SKILL.md) | CSS 码、容错态制备、色码与模拟信息解码 | 宿主代码 Tool；显式准备原生 SDK |
| [`openjij-optimization`](../.agents/skills/openjij-optimization/SKILL.md) | Ising/QUBO、SA/SQA sampler、退火 schedule 与 SampleSet | 宿主代码 Tool；显式准备原生 SDK |
| [`paulistrings-dynamics`](../.agents/skills/paulistrings-dynamics/SKILL.md) | Pauli 字符串、Hamiltonian、算符传播与多体算法 | 宿主代码 Tool；显式准备原生 SDK |
| [`pecos-qec`](../.agents/skills/pecos-qec/SKILL.md) | 混合程序、量子后端、噪声、syndrome 与纠错协议 | 宿主代码 Tool；显式准备原生 SDK |
| [`piquasso-photonics`](../.agents/skills/piquasso-photonics/SKILL.md) | Gaussian/Fock 态、光子程序、信道与测量 | 宿主代码 Tool；显式准备原生 SDK |
| [`pygsti-characterization`](../.agents/skills/pygsti-characterization/SKILL.md) | Circuit、Model、DataSet、GST/RB/RPE 与拟合报告 | 宿主代码 Tool；显式准备原生 SDK |
| [`qdk-chemistry`](../.agents/skills/qdk-chemistry/SKILL.md) | 分子结构、电子结构、活性空间、量子算法、后端与结果 | 宿主代码 Tool；显式准备原生 SDK |
| [`qiskit-machine-learning`](../.agents/skills/qiskit-machine-learning/SKILL.md) | 量子核、QSVC/QSVR、QNN、梯度、训练与推断 | 宿主代码 Tool；显式准备原生 SDK |
| [`qlasskit-oracles`](../.agents/skills/qlasskit-oracles/SKILL.md) | 受支持 Python 子集、布尔表达式、量子 oracle 与多框架导出 | 宿主代码 Tool；显式准备原生 SDK |
| [`qsim-simulation`](../.agents/skills/qsim-simulation/SKILL.md) | Cirq 电路、QSimOptions、态矢量、采样与目标后端 | 宿主代码 Tool；显式准备原生 SDK |
| [`qsyn-compilation`](../.agents/skills/qsyn-compilation/SKILL.md) | C++ 库、线路综合、ZX/张量变换、优化、验证与 CLI | 宿主代码 Tool；显式准备原生 SDK |
| [`quantumclifford-julia`](../.agents/skills/quantumclifford-julia/SKILL.md) | Pauli/稳定子、图态、Clifford 操作、测量与 Pauli frame | 宿主代码 Tool；显式准备原生 SDK |
| [`quantumcontrol-julia`](../.agents/skills/quantumcontrol-julia/SKILL.md) | 动力学、控制目标、脉冲、GRAPE/Krotov 与优化 | 宿主代码 Tool；显式准备原生 SDK |
| [`quantumsavory-network`](../.agents/skills/quantumsavory-network/SKILL.md) | 量子寄存器、器件状态、链路、网络协议与离散事件模拟 | 宿主代码 Tool；显式准备原生 SDK |
| [`squlearn-learning`](../.agents/skills/squlearn-learning/SKILL.md) | 编码线路、observable、executor、量子核与 sklearn estimator | 宿主代码 Tool；显式准备原生 SDK |
| [`staq-compilation`](../.agents/skills/staq-compilation/SKILL.md) | OpenQASM AST、综合、线路变换、优化与映射 | 宿主代码 Tool；显式准备原生 SDK |
| [`lean-physics`](../.agents/skills/lean-physics/SKILL.md) | Lean 4 / mathlib / physlib 证明与公理审计 | 宿主代码 Tool；显式准备固定 Lean 环境 |
| [`chromobius-decoding`](../.agents/skills/chromobius-decoding/SKILL.md) | 带颜色/基标注的 Stim DEM 与逻辑 observable 解码 | 宿主代码 Tool；显式准备原生 SDK |
| [`slowquant-response`](../.agents/skills/slowquant-response/SKILL.md) | 分子激发能、跃迁性质与量子线性响应 | 宿主代码 Tool；显式准备固定源码 SDK；保留响应近似与诊断 |
| [`emlint-dem-audit`](../.agents/skills/emlint-dem-audit/SKILL.md) | DEM 结构诊断、反例与不完整检查状态 | 宿主代码 Tool；显式准备原生 SDK；不证明解码正确性 |
| [`tesseract-decoding`](../.agents/skills/tesseract-decoding/SKILL.md) | Stim DEM、syndrome、搜索式解码器与统计 | 宿主代码 Tool；显式准备原生 SDK |
| [`tqec-compilation`](../.agents/skills/tqec-compilation/SKILL.md) | BlockGraph、逻辑计算块、相关面与 Stim 线路生成 | 宿主代码 Tool；显式准备原生 SDK |
| [`tsim-sampling`](../.agents/skills/tsim-sampling/SKILL.md) | Clifford/非 Clifford 线路、噪声、detector 与 observable 采样 | 宿主代码 Tool；显式准备原生 SDK |
| [`yao-circuits`](../.agents/skills/yao-circuits/SKILL.md) | 量子寄存器、block、电路、算符、参数与梯度 | 宿主代码 Tool；显式准备原生 SDK |

### 电路构建、变换与仿真

| Skill | 研究方法与用途 | 执行入口 |
| --- | --- | --- |
| [`qiskit-circuit-workbench`](../.agents/skills/qiskit-circuit-workbench/SKILL.md) | 量子电路分析、格式转换、转译比较与 Qiskit 文档查证 | `qiskit`、`qiskit_docs` |
| [`flagquantum-workbench`](../.agents/skills/flagquantum-workbench/SKILL.md) | 第二家量子 MCP 电路工作台 | `flagquantum`；[使用说明](integrations/CANDIDATE_LIBRARIES.md) |
| [`tyxonq-workbench`](../.agents/skills/tyxonq-workbench/SKILL.md) | 门电路仿真、态矢演化、量子噪声与采样分布分析 | `tyxonq_local` |
| [`pyzx-optimization`](../.agents/skills/pyzx-optimization/SKILL.md) | ZX 重写、Clifford+T 优化与电路提取 | `pyzx_local` |
| [`compact-optimization`](../.agents/skills/compact-optimization/SKILL.md) | 线路优化与独立等价对照 | `compact_local`；[使用说明](integrations/CANDIDATE_LIBRARIES.md) |
| [`hamiltonian-simulation`](../.agents/skills/hamiltonian-simulation/SKILL.md) | Trotter/qDrift 演化电路、态矢量与独立误差对照 | `hamiltonian_local`；[使用说明](integrations/UNITARYLAB_OPEN_ADAPTATION.md) |
| [`qcut-knitting`](../.agents/skills/qcut-knitting/SKILL.md) | 门切割与期望值重建 | `qcut_local`；[使用说明](integrations/CANDIDATE_LIBRARIES.md) |
| [`graphix-mbqc`](../.agents/skills/graphix-mbqc/SKILL.md) | 电路到 MBQC 模式、资源图、自适应测量和纠正输出 | `graphix_local` |
| [`quantum-circuit-verification`](../.agents/skills/quantum-circuit-verification/SKILL.md) | 量子电路等价性验证、优化前后对照与全局相位差异判定 | `qcec_local` |
| [`clifft-sampling`](../.agents/skills/clifft-sampling/SKILL.md) | Clifford+T 噪声采样、Stim 格式记录与 detector/observable 原始奇偶值 | `clifft_local` |
| [`qbraid-conversion`](../.agents/skills/qbraid-conversion/SKILL.md) | Qiskit/Cirq 酉电路转换、OpenQASM 2 导出与位序等价对照 | `qbraid_local` |

### 量子态与测量

| Skill | 研究方法与用途 | 执行入口 |
| --- | --- | --- |
| [`quantum-information-audit`](../.agents/skills/quantum-information-audit/SKILL.md) | 量子态合法性检查、密度矩阵性质分析与纠缠诊断 | `toqito_audit`；支持完整科学验收流程 |
| [`randomized-measurements`](../.agents/skills/randomized-measurements/SKILL.md) | 局域随机测量、子区纯度估计与有限样本误差分析 | `random_meas_local` |

### 基态、化学与优化方法

| Skill | 研究方法与用途 | 执行入口 |
| --- | --- | --- |
| [`quantum-ground-state`](../.agents/skills/quantum-ground-state/SKILL.md) | 变分量子本征求解（VQE）、基态能量估计与独立精确参考比较 | 原生 `solve_and_validate_ground_state`；支持完整科学验收流程 |
| [`sqd-chemistry`](../.agents/skills/sqd-chemistry/SKILL.md) | 量子化学的采样子空间对角化、测量频数后处理与电子基态能量分析 | `sqd_local` |
| [`tenpy-ground-state`](../.agents/skills/tenpy-ground-state/SKILL.md) | 张量网络 DMRG 基态求解、磁性观测量与纠缠结构分析 | `tenpy_local` |
| [`flow-vqe`](../.agents/skills/flow-vqe/SKILL.md) | 流模型辅助的 VQE 参数学习、低能量态搜索与基线比较 | `flow_vqe_local` |
| [`openqarp-excited-states`](../.agents/skills/openqarp-excited-states/SKILL.md) | VQD 激发态、残差与正交性 | `openqarp_local`；[使用说明](integrations/CANDIDATE_LIBRARIES.md) |
| [`cqlib-kernel`](../.agents/skills/cqlib-kernel/SKILL.md) | 角度编码核与 QSVM | `cqlib_kernel_local`；[使用说明](integrations/CANDIDATE_LIBRARIES.md) |
| [`symmer-tapering`](../.agents/skills/symmer-tapering/SKILL.md) | 指定 Pauli 对称性扇区的降比特与同扇区保谱检查 | `symmer_local` |
| [`paulie-algebra`](../.agents/skills/paulie-algebra/SKILL.md) | Pauli 生成元的 Lie 代数分类、精确维数与可选闭包 | `paulie_local` |
| [`qpanda-qubo`](../.agents/skills/qpanda-qubo/SKILL.md) | 组合优化问题的 QUBO 建模、约束转换、经典求解与本地 QAOA 对照 | `qpanda_qubo` |

### 误差缓解与量子纠错

| Skill | 研究方法与用途 | 执行入口 |
| --- | --- | --- |
| [`mitiq-error-mitigation`](../.agents/skills/mitiq-error-mitigation/SKILL.md) | 量子误差缓解方法比较、采样预算规划与误差成本分析，涵盖 ZNE、REM、PEC、CDR | `mitiq_local`；[使用说明](integrations/MITIQ.md) |
| [`qec-memory-experiment`](../.agents/skills/qec-memory-experiment/SKILL.md) | 表面码存储实验、噪声采样、MWPM 译码与逻辑错误率分析 | `qec_local` |
| [`deltakit-qec`](../.agents/skills/deltakit-qec/SKILL.md) | 表面码码片建模、噪声实验、采样与译码性能分析 | `deltakit_local` |
| [`ldpc-decoding`](../.agents/skills/ldpc-decoding/SKILL.md) | 二元校验矩阵的 BP+LSD 解码与 syndrome 一致性检查 | `ldpc_local` |

### 开放系统动力学

| Skill | 研究方法与用途 | 执行入口 |
| --- | --- | --- |
| [`dynamiqs-dynamics`](../.agents/skills/dynamiqs-dynamics/SKILL.md) | 开放系统 Lindblad 动力学、驱动参数扫描与自动微分灵敏度分析 | `dynamiqs_local` |
| [`oqupy-dynamics`](../.agents/skills/oqupy-dynamics/SKILL.md) | 非马尔可夫开放系统动力学、环境记忆效应与 TEMPO 数值收敛分析 | `oqupy_local` |
| [`tjm-dynamics`](../.agents/skills/tjm-dynamics/SKILL.md) | 开放多体系统的张量跳跃轨迹模拟、耗散演化与参考结果比较 | `tjm_local` |

### 实验模拟与硬件

| Skill | 研究方法与用途 | 执行入口 |
| --- | --- | --- |
| [`qmclaw-workbench`](../.agents/skills/qmclaw-workbench/SKILL.md) | 超导量子比特调校实验设计、测量流程模拟与合成数据分析，覆盖 S21、Rabi、Ramsey、T₁ 等 | 原生 `list_qmclaw_experiments`、`simulate_qmclaw_experiment` |
| [`fatqat-workbench`](../.agents/skills/fatqat-workbench/SKILL.md) | 量子电路与硬件原生门约束分析、transmon 泄漏及里德堡原子动力学 | `fatqat_local`；[使用说明](integrations/FATQAT.md) |
| [`pairinteraction-rydberg`](../.agents/skills/pairinteraction-rydberg/SKILL.md) | Rb 原子对势能、S–P 交换和二阶有效哈密顿量，含微扰适用性检查 | `pairinteraction_local`；[使用与版本治理](integrations/PAIRINTERACTION.md) |
| [`bloqade-analog`](../.agents/skills/bloqade-analog/SKILL.md) | 二维 Rydberg 阵列、分段线性脉冲、逐原子占据与末态概率 | `bloqade_local` |
| [`fieldqkit-hardware`](../.agents/skills/fieldqkit-hardware/SKILL.md) | 量子云设备发现、量子位与拓扑筛选、接入条件检查 | `fieldqkit`；只读设备发现 |
| [`qdmi-device`](../.agents/skills/qdmi-device/SKILL.md) | 已配置 QDMI 驱动的设备、门集与耦合关系查询 | `qdmi_local`；默认关闭，需显式准备驱动 |

### 厂商 SDK 专业入口

新增能力均使用固定依赖；Superstaq 和 QoolQit 按需开启。版本、位序、许可与验证范围见[厂商 SDK 接入](integrations/VENDOR_SDKS.md)。

| Skill | 研究方法与用途 | 执行入口 |
| --- | --- | --- |
| [`pennylane-differentiable`](../.agents/skills/pennylane-differentiable/SKILL.md) | 用户电路的概率、Pauli 期望值和参数梯度。 | `pennylane_local` |
| [`deepquantum-differentiable`](../.agents/skills/deepquantum-differentiable/SKILL.md) | 基于 PyTorch 的电路概率、期望值和参数梯度。 | `deepquantum_local` |
| [`tensorcircuit-differentiable`](../.agents/skills/tensorcircuit-differentiable/SKILL.md) | 张量网络电路的概率、期望值和参数梯度。 | `tensorcircuit_local` |
| [`mindquantum-differentiable`](../.agents/skills/mindquantum-differentiable/SKILL.md) | 本地电路模拟、Pauli 期望值和参数梯度。 | `mindquantum_local` |
| [`pytket-compilation`](../.agents/skills/pytket-compilation/SKILL.md) | 本地电路优化、门数比较与 OpenQASM 导出。 | `pytket_local` |
| [`ocean-optimization`](../.agents/skills/ocean-optimization/SKILL.md) | 二值二次模型的本地穷举或模拟退火；不是量子退火硬件执行。 | `ocean_local` |
| [`kaiwu-qubo`](../.agents/skills/kaiwu-qubo/SKILL.md) | 社区版符号 QUBO、约束罚项和 Ising 转换；不使用企业版或真机。 | `kaiwu_local` |
| [`pyquil-simulation`](../.agents/skills/pyquil-simulation/SKILL.md) | 本地 Quil 电路模拟，不提交 Rigetti 云作业。 | `pyquil_local` |
| [`spinqit-simulation`](../.agents/skills/spinqit-simulation/SKILL.md) | 量旋 SDK 的本地电路模拟，不连接设备。 | `spinqit_local` |
| [`qutrunk-simulation`](../.agents/skills/qutrunk-simulation/SKILL.md) | 启科 SDK 的本地电路模拟，不连接设备。 | `qutrunk_local` |
| [`perceval-photonics`](../.agents/skills/perceval-photonics/SKILL.md) | 用户 Fock 输入、分束器和移相网络的本地光子分布。 | `perceval_local` |
| [`iqm-circuit-workbench`](../.agents/skills/iqm-circuit-workbench/SKILL.md) | IQM 原生门转译与本地模拟，不连接真实设备。 | `iqm_local` |
| [`alicebob-cat-circuits`](../.agents/skills/alicebob-cat-circuits/SKILL.md) | 官方本地猫态量子比特模型与电路仿真。 | `alicebob_local` |
| [`pulser-dynamics`](../.agents/skills/pulser-dynamics/SKILL.md) | Pasqal 全局脉冲、Rydberg 阵列与本地动力学。 | `pulser_local` |
| [`pasqal-experiments`](../.agents/skills/pasqal-experiments/SKILL.md) | Pasqal 实验规范、理想/含噪仿真、云批次恢复与采样分析。 | 宿主代码 Tool；共享 `pulser-dynamics` SDK 环境 |
| [`qoolqit-workbench`](../.agents/skills/qoolqit-workbench/SKILL.md) | 无量纲 Rydberg 程序编译与本地计算；需审阅上游定制许可证。 | `qoolqit_local` |
| [`ionq-programs`](../.agents/skills/ionq-programs/SKILL.md) | 使用官方 SDK 将结构化电路转换为 IonQ QIS 程序；不提交云任务。 | `ionq_local` |
| [`superstaq-compilation`](../.agents/skills/superstaq-compilation/SKILL.md) | 本地程序序列化和可选远程编译；远程操作外发电路，需要账户，不执行 QPU 任务。 | `superstaq_cloud` |

### 公司与机构 SDK 补充入口

接入范围、用户凭据配置与验证分层见[补充接入说明](integrations/SDK_EXPANSION.md)。

| Skill | 研究方法与用途 | 执行入口 |
| --- | --- | --- |
| [`qsteed-compilation`](../.agents/skills/qsteed-compilation/SKILL.md) | PyQuafu 电路编译到指定门集，保留全局相位与线路，不连接资源数据库。 | `qsteed_local` |
| [`quairkit-information`](../.agents/skills/quairkit-information/SKILL.md) | CPU 密度矩阵电路与去极化、振幅阻尼、相位阻尼通道。 | `quairkit_local` |
| [`qcompute-simulation`](../.agents/skills/qcompute-simulation/SKILL.md) | 使用百度 QCompute 本地模拟器计算电路概率。 | `qcompute_local` |
| [`qibo-simulation`](../.agents/skills/qibo-simulation/SKILL.md) | 使用明确选定的 NumPy CPU 后端计算态矢量。 | `qibo_local` |
| [`qrisp-arithmetic`](../.agents/skills/qrisp-arithmetic/SKILL.md) | 本地 QuantumFloat 无符号模加法；需考虑 EPL-2.0 许可。 | `qrisp_local` |
| [`lightworks-photonics`](../.agents/skills/lightworks-photonics/SKILL.md) | 本地线性光学网络与 Fock 输入的输出概率。 | `lightworks_local` |
| [`braket-simulation`](../.agents/skills/braket-simulation/SKILL.md) | 显式 LocalSimulator 电路振幅与概率，不创建 AWS 云任务。 | `braket_local` |
| [`quri-parts-estimation`](../.agents/skills/quri-parts-estimation/SKILL.md) | QURI Parts 电路与 Qulacs 本地 Pauli 期望值。 | `quri_parts_local` |
| [`qdk-resource-estimation`](../.agents/skills/qdk-resource-estimation/SKILL.md) | 由电路和硬件假设估算物理量子位与运行时间。 | `qdk_local` |
| [`qualtran-resources`](../.agents/skills/qualtran-resources/SKILL.md) | 算术 Bloq 的容错门资源；实验性 API，保留计数假设。 | `qualtran_local` |
| [`openfermion-mapping`](../.agents/skills/openfermion-mapping/SKILL.md) | 结构化费米算符到 Jordan-Wigner 或 Bravyi-Kitaev Pauli 项。 | `openfermion_local` |
| [`mqt-ddsim`](../.agents/skills/mqt-ddsim/SKILL.md) | 使用决策图模拟电路，返回指定计算基态概率。 | `mqt_ddsim_local` |
| [`mqt-qmap`](../.agents/skills/mqt-qmap/SKILL.md) | 将电路映射到耦合图，返回物理线路及逻辑输入、输出映射。 | `mqt_qmap_local` |
| [`classiq-synthesis`](../.agents/skills/classiq-synthesis/SKILL.md) | 本地模型准备及可选云端综合；用户自行配置 Token 和服务权限。 | `classiq_cloud` |
| [`qctrl-workbench`](../.agents/skills/qctrl-workbench/SKILL.md) | 本地 Boulder Opal 控制图与已有 Boulder/Fire Opal 作业状态查询。 | `qctrl_cloud` |
| [`qua-programs`](../.agents/skills/qua-programs/SKILL.md) | 本地生成 OPX 脉冲程序与配置，不连接 QOP 服务。 | `qua_local` |
| [`laboneq-control`](../.agents/skills/laboneq-control/SKILL.md) | 离线脉冲编译与 HDAWG 输出波形仿真，不执行设备程序。 | `laboneq_local` |
| [`qcarchive-query`](../.agents/skills/qcarchive-query/SKILL.md) | 只读查询既有单点记录，返回分子、原子单位能量和计算来源。 | `qcarchive_data` |
| [`cudaq-simulation`](../.agents/skills/cudaq-simulation/SKILL.md) | 固定 qpp-cpu 后端的精确概率与采样；Linux 或 Apple Silicon macOS。 | `cudaq_local` |
| [`netqasm-network`](../.agents/skills/netqasm-network/SKILL.md) | 本地双节点 EPR 程序编译；仿真需用户自行准备有许可的 NetSquid 环境。 | `netqasm_local` |

### 网络、控制、光学与云接口补充

实际动作、固定版本和鉴权设置见[本批说明](integrations/SDK_GAPS.md)。

| Skill | 研究方法与用途 | 执行入口 |
| --- | --- | --- |
| [`simqn-network`](../.agents/skills/simqn-network/SKILL.md) | SimQN 单链路的离散事件、随机损失与 Werner 衰减。 | `simqn_local` |
| [`qcover-optimization`](../.agents/skills/qcover-optimization/SKILL.md) | Qcover 按图分解评估给定 QAOA 参数的能量与相关量。 | `qcover_local` |
| [`vqnet-learning`](../.agents/skills/vqnet-learning/SKILL.md) | VQNet CPU 电路期望、概率与每个旋转参数的自动微分。 | `vqnet_local` |
| [`pychemiq-chemistry`](../.agents/skills/pychemiq-chemistry/SKILL.md) | pyChemiQ 费米算符到 Jordan–Wigner Pauli 项，保留微小系数。 | `pychemiq_local` |
| [`qblox-scheduling`](../.agents/skills/qblox-scheduling/SKILL.md) | Qblox 方波排程和波形采样，不连接 HardwareAgent。 | `qblox_local` |
| [`qililab-control`](../.agents/skills/qililab-control/SKILL.md) | Qililab 将 I/Q 方波离线编译到 Qblox Q1ASM。 | `qililab_local` |
| [`guppy-programs`](../.agents/skills/guppy-programs/SKILL.md) | Guppy/Selene 的中途测量、复位和经典条件反馈仿真。 | `guppy_local` |
| [`oqc-qat`](../.agents/skills/oqc-qat/SKILL.md) | QAT 脉冲时序与复基带波形，不执行后端测量。 | `qat_local` |
| [`mrmustard-optics`](../.agents/skills/mrmustard-optics/SKILL.md) | MrMustard 高斯光学矩和截断 Fock 概率；上游已归档。 | `mrmustard_local` |
| [`merlin-learning`](../.agents/skills/merlin-learning/SKILL.md) | MerLin 完整 Fock 概率、批量推断与相移梯度。 | `merlin_local` |
| [`mimiq-simulation`](../.agents/skills/mimiq-simulation/SKILL.md) | MIMIQ Exaqt 本地态矢量和种子采样。 | `mimiq_local` |
| [`myqlm-simulation`](../.agents/skills/myqlm-simulation/SKILL.md) | myQLM PyLinalg 本地理想电路仿真。 | `myqlm_local` |
| [`aqt-workbench`](../.agents/skills/aqt-workbench/SKILL.md) | AQT 原生门编译、离线采样与可选设备查询。 | `aqt_local` |
| [`oqc-cloud`](../.agents/skills/oqc-cloud/SKILL.md) | OQC 本地任务准备、查询及显式单次云提交。 | `oqc_cloud` |
| [`quantuminspire-cloud`](../.agents/skills/quantuminspire-cloud/SKILL.md) | Quantum Inspire 分页设备类型与既有任务状态查询。 | `quantuminspire_cloud` |

### 方法选型与平台支持

| Skill | 研究方法与用途 | 执行入口 |
| --- | --- | --- |
| [`quantum-sdk-advisor`](../.agents/skills/quantum-sdk-advisor/SKILL.md) | 量子 SDK 选型、迁移比较与 PoC 技术路线规划 | 知识型 Skill，按任务使用已有通用 Tool |
| [`quantum-sdk-workbench`](../.agents/skills/quantum-sdk-workbench/SKILL.md) | 在固定 SDK 环境中完成自定义研究程序，不限于预设案例 | 宿主已有 `bash` / `pwsh` 或代码执行 Tool；[接入清单](integrations/FULL_SDK_ACCESS.md) |
| [`platform-diagnostics`](../.agents/skills/platform-diagnostics/SKILL.md) | 工作台、工具与模型联调排障，形成可追溯的诊断报告 | Harness 通用 Tool 与本地诊断脚本 |

<!-- BEGIN OPEN ALGORITHM SKILLS -->
### 开源算法与后端工作流

66 个适配 Skill 共用现有执行工具；49 个算法示例覆盖原库的 39 个模块和指南新增方法。13 个分类索引保留为手动导航，53 个方法与入口可由 Agent 自动选择。

| Skill | 研究方法与用途 | 执行入口 |
| --- | --- | --- |
| [`quantum-guide-algorithms`](../.agents/skills/quantum-guide-algorithms/SKILL.md) | algorithms 分类、后端或迁移指引 | 手动分类导航；自动任务直接选择方法 Skill |
| [`quantum-guide-algorithms-cryptography`](../.agents/skills/quantum-guide-algorithms-cryptography/SKILL.md) | algorithms/cryptography 分类、后端或迁移指引 | 手动分类导航；自动任务直接选择方法 Skill |
| [`quantum-discrete-log`](../.agents/skills/quantum-discrete-log/SKILL.md) | 可逆 g^a y^b oracle、循环群 Fourier 采样与同余恢复 | 已有 Harness `bash` / `pwsh`；`discrete_log` 开源示例 |
| [`quantum-shor`](../.agents/skills/quantum-shor/SKILL.md) | 可逆模乘 oracle、QPE/连分数和因子验证 | 已有 Harness `bash` / `pwsh`；`shor` 开源示例 |
| [`quantum-simon`](../.agents/skills/quantum-simon/SKILL.md) | 二对一 XOR oracle、Hadamard 采样和 GF(2) 零空间恢复 | 已有 Harness `bash` / `pwsh`；`simon` 开源示例 |
| [`quantum-guide-algorithms-eigensolvers`](../.agents/skills/quantum-guide-algorithms-eigensolvers/SKILL.md) | algorithms/eigensolvers 分类、后端或迁移指引 | 手动分类导航；自动任务直接选择方法 Skill |
| [`quantum-numpy-minimum-eigensolver`](../.agents/skills/quantum-numpy-minimum-eigensolver/SKILL.md) | NumPy 最小本征对，明确标记经典算法并报告残差。 | 已有 Harness `bash` / `pwsh`；`numpy_minimum_eigensolver` 开源示例 |
| [`quantum-numpy-eigensolver`](../.agents/skills/quantum-numpy-eigensolver/SKILL.md) | NumPy Hermitian 稠密本征求解，明确标记经典算法并报告特征残差。 | 已有 Harness `bash` / `pwsh`；`numpy_eigensolver` 开源示例 |
| [`quantum-vqd`](../.agents/skills/quantum-vqd/SKILL.md) | 通过逐态重叠惩罚求激发态（VQD），报告能量与态间重叠 | 已有 Harness `bash` / `pwsh`；`vqd` 开源示例 |
| [`quantum-guide-algorithms-gradients`](../.agents/skills/quantum-guide-algorithms-gradients/SKILL.md) | algorithms/gradients 分类、后端或迁移指引 | 手动分类导航；自动任务直接选择方法 Skill |
| [`quantum-finite-difference`](../.agents/skills/quantum-finite-difference/SKILL.md) | Qiskit FiniteDiffEstimatorGradient，中心差分与显式 epsilon。 | 已有 Harness `bash` / `pwsh`；`finite_difference` 开源示例 |
| [`quantum-linear-combination`](../.agents/skills/quantum-linear-combination/SKILL.md) | Qiskit LinCombEstimatorGradient，实际生成线性组合导数电路。 | 已有 Harness `bash` / `pwsh`；`linear_combination` 开源示例 |
| [`quantum-parameter-shift`](../.agents/skills/quantum-parameter-shift/SKILL.md) | Qiskit ParamShiftEstimatorGradient，RY 参数移位规则。 | 已有 Harness `bash` / `pwsh`；`parameter_shift` 开源示例 |
| [`quantum-qfi`](../.agents/skills/quantum-qfi/SKILL.md) | Qiskit QFI/ReverseQGT，纯态量子 Fisher 信息 | 已有 Harness `bash` / `pwsh`；`qfi` 开源示例 |
| [`quantum-reverse`](../.agents/skills/quantum-reverse/SKILL.md) | Qiskit ReverseEstimatorGradient，反向态矢量导数。 | 已有 Harness `bash` / `pwsh`；`reverse` 开源示例 |
| [`quantum-spsa`](../.agents/skills/quantum-spsa/SKILL.md) | Qiskit SPSAEstimatorGradient，显式 epsilon、批量与随机种子 | 已有 Harness `bash` / `pwsh`；`spsa` 开源示例 |
| [`quantum-guide-algorithms-hamiltonian-simulation`](../.agents/skills/quantum-guide-algorithms-hamiltonian-simulation/SKILL.md) | algorithms/hamiltonian-simulation 分类、后端或迁移指引 | 手动分类导航；自动任务直接选择方法 Skill |
| [`quantum-cartan`](../.agents/skills/quantum-cartan/SKILL.md) | 实对称 Hamiltonian 的 SO(N) 谱 Cartan 分解 | 已有 Harness `bash` / `pwsh`；`cartan` 开源示例 |
| [`quantum-qdrift`](../.agents/skills/quantum-qdrift/SKILL.md) | 使用 Qiskit 的显式量子电路，保留输入、方法参数、实际概率或态矢量 | 已有 Harness `bash` / `pwsh`；`qdrift` 开源示例 |
| [`quantum-hamiltonian-qsp`](../.agents/skills/quantum-hamiltonian-qsp/SKILL.md) | 偶/奇 QSP 多项式通过 LCU 合成 exp(-iHt) | 已有 Harness `bash` / `pwsh`；`hamiltonian_qsp` 开源示例 |
| [`quantum-taylor`](../.agents/skills/quantum-taylor/SKILL.md) | 截断 Taylor 级数展开为 Pauli LCU，实际执行 PREPARE/SELECT/unprepare 并报告后选择概率 | 已有 Harness `bash` / `pwsh`；`taylor` 开源示例 |
| [`quantum-trotter`](../.agents/skills/quantum-trotter/SKILL.md) | 使用 Qiskit 的显式量子电路，保留输入、方法参数、实际概率或态矢量 | 已有 Harness `bash` / `pwsh`；`trotter` 开源示例 |
| [`quantum-guide-algorithms-linear-systems`](../.agents/skills/quantum-guide-algorithms-linear-systems/SKILL.md) | algorithms/linear-systems 分类、后端或迁移指引 | 手动分类导航；自动任务直接选择方法 Skill |
| [`quantum-aqc`](../.agents/skills/quantum-aqc/SKILL.md) | 正定 Hermitian 系统的绝热线性求解路径、条件数相关 schedule 与分片幺正演化 | 已有 Harness `bash` / `pwsh`；`aqc` 开源示例 |
| [`quantum-hhl`](../.agents/skills/quantum-hhl/SKILL.md) | Hermitian 非奇异 A、QPE、有符号倒数旋转、反 QPE 与后选择 | 已有 Harness `bash` / `pwsh`；`hhl` 开源示例 |
| [`quantum-lcu`](../.agents/skills/quantum-lcu/SKILL.md) | 使用 Qiskit 的显式量子电路，保留输入、方法参数、实际概率或态矢量 | 已有 Harness `bash` / `pwsh`；`lcu` 开源示例 |
| [`quantum-qsvt-qlsa`](../.agents/skills/quantum-qsvt-qlsa/SKILL.md) | Hermitian 非奇异矩阵，PennyLane QSVT 和受控 U/U† 后选择 | 已有 Harness `bash` / `pwsh`；`qsvt_qlsa` 开源示例 |
| [`quantum-qft`](../.agents/skills/quantum-qft/SKILL.md) | 使用 Qiskit 的显式量子电路，保留输入、方法参数、实际概率或态矢量 | 已有 Harness `bash` / `pwsh`；`qft` 开源示例 |
| [`quantum-qsp`](../.agents/skills/quantum-qsp/SKILL.md) | QSP/QSVT 相位综合计算 cos(t x) 的有界偶次多项式 | 已有 Harness `bash` / `pwsh`；`qsp` 开源示例 |
| [`quantum-vqls`](../.agents/skills/quantum-vqls/SKILL.md) | Qiskit 参数电路与全局归一化残差 cost 的变分线性求解 | 已有 Harness `bash` / `pwsh`；`vqls` 开源示例 |
| [`quantum-guide-algorithms-primitives`](../.agents/skills/quantum-guide-algorithms-primitives/SKILL.md) | algorithms/primitives 分类、后端或迁移指引 | 手动分类导航；自动任务直接选择方法 Skill |
| [`quantum-amplitude-amplification`](../.agents/skills/quantum-amplitude-amplification/SKILL.md) | 使用 Qiskit 的显式量子电路，保留输入、方法参数、实际概率或态矢量 | 已有 Harness `bash` / `pwsh`；`amplitude_amplification` 开源示例 |
| [`quantum-amplitude-estimation`](../.agents/skills/quantum-amplitude-estimation/SKILL.md) | 使用 Qiskit 的显式量子电路，保留输入、方法参数、实际概率或态矢量 | 已有 Harness `bash` / `pwsh`；`amplitude_estimation` 开源示例 |
| [`quantum-grover`](../.agents/skills/quantum-grover/SKILL.md) | 使用 Qiskit 的显式量子电路，保留输入、方法参数、实际概率或态矢量 | 已有 Harness `bash` / `pwsh`；`grover` 开源示例 |
| [`quantum-hadamard-test`](../.agents/skills/quantum-hadamard-test/SKILL.md) | 使用 Qiskit 的显式量子电路，保留输入、方法参数、实际概率或态矢量 | 已有 Harness `bash` / `pwsh`；`hadamard_test` 开源示例 |
| [`quantum-hadamard-transform`](../.agents/skills/quantum-hadamard-transform/SKILL.md) | 使用 Qiskit 的显式量子电路，保留输入、方法参数、实际概率或态矢量 | 已有 Harness `bash` / `pwsh`；`hadamard_transform` 开源示例 |
| [`quantum-qpe`](../.agents/skills/quantum-qpe/SKILL.md) | 使用 Qiskit 的显式量子电路，保留输入、方法参数、实际概率或态矢量 | 已有 Harness `bash` / `pwsh`；`qpe` 开源示例 |
| [`quantum-guide-algorithms-quantum-chemistry`](../.agents/skills/quantum-guide-algorithms-quantum-chemistry/SKILL.md) | algorithms/quantum-chemistry 分类、后端或迁移指引 | 手动分类导航；自动任务直接选择方法 Skill |
| [`quantum-molecular-dmrg`](../.agents/skills/quantum-molecular-dmrg/SKILL.md) | PySCF 活性空间积分、Jordan-Wigner MPO 与 quimb 双站点 DMRG。使用开源态制备替换闭源 CVD | 已有 Harness `bash` / `pwsh`；`molecular_dmrg` 开源示例 |
| [`quantum-qldpc`](../.agents/skills/quantum-qldpc/SKILL.md) | HGP CSS 校验矩阵、GF(2) 秩、交换关系和 syndrome | 已有 Harness `bash` / `pwsh`；`qldpc` 开源示例 |
| [`quantum-guide-algorithms-quantum-machine-learning`](../.agents/skills/quantum-guide-algorithms-quantum-machine-learning/SKILL.md) | algorithms/quantum-machine-learning 分类、后端或迁移指引 | 手动分类导航；自动任务直接选择方法 Skill |
| [`quantum-cvqnn`](../.agents/skills/quantum-cvqnn/SKILL.md) | 两模有限 Fock 空间的位移、压缩、旋转、Kerr 和分束器层 | 已有 Harness `bash` / `pwsh`；`cvqnn` 开源示例 |
| [`quantum-fermi-hubbard-vqe`](../.agents/skills/quantum-fermi-hubbard-vqe/SKILL.md) | 开放边界 Hubbard 链，Jordan-Wigner 与全 Fock 空间 VQE | 已有 Harness `bash` / `pwsh`；`fermi_hubbard_vqe` 开源示例 |
| [`quantum-ising`](../.agents/skills/quantum-ising/SKILL.md) | 开放边界二维矩形 Ising 网格，quimb MPS 与二阶 Strang 演化 | 已有 Harness `bash` / `pwsh`；`ising` 开源示例 |
| [`quantum-qaoa`](../.agents/skills/quantum-qaoa/SKILL.md) | 无权 MaxCut 的交替 cost/mixer 电路与参数优化 | 已有 Harness `bash` / `pwsh`；`qaoa` 开源示例 |
| [`quantum-qcbm`](../.agents/skills/quantum-qcbm/SKILL.md) | 参数电路 Born 分布拟合目标概率，KL 目标与 total variation 对照。 | 已有 Harness `bash` / `pwsh`；`qcbm` 开源示例 |
| [`quantum-vqc`](../.agents/skills/quantum-vqc/SKILL.md) | RY 特征编码与参数电路二分类 | 已有 Harness `bash` / `pwsh`；`vqc` 开源示例 |
| [`quantum-vqe`](../.agents/skills/quantum-vqe/SKILL.md) | 实 Pauli Hamiltonian、RY/RZ/CX ansatz 和 SciPy 优化 | 已有 Harness `bash` / `pwsh`；`vqe` 开源示例 |
| [`quantum-guide-algorithms-schrodingerization`](../.agents/skills/quantum-guide-algorithms-schrodingerization/SKILL.md) | algorithms/schrodingerization 分类、后端或迁移指引 | 手动分类导航；自动任务直接选择方法 Skill |
| [`quantum-advection`](../.agents/skills/quantum-advection/SKILL.md) | 周期边界、常速一维平流，中心差分和显式薛定谔化电路 | 已有 Harness `bash` / `pwsh`；`advection` 开源示例 |
| [`quantum-heat-1d`](../.agents/skills/quantum-heat-1d/SKILL.md) | 齐次一维热方程，周期或零 Dirichlet 边界 | 已有 Harness `bash` / `pwsh`；`heat_1d` 开源示例 |
| [`quantum-heat-2d`](../.agents/skills/quantum-heat-2d/SKILL.md) | 齐次二维方形网格热方程，周期或零 Dirichlet 边界 | 已有 Harness `bash` / `pwsh`；`heat_2d` 开源示例 |
| [`quantum-guide-algorithms-search`](../.agents/skills/quantum-guide-algorithms-search/SKILL.md) | algorithms/search 分类、后端或迁移指引 | 手动分类导航；自动任务直接选择方法 Skill |
| [`quantum-glued-trees`](../.agents/skills/quantum-glued-trees/SKILL.md) | 随机交替叶环连接的双树连续时间邻接矩阵量子行走 | 已有 Harness `bash` / `pwsh`；`glued_trees` 开源示例 |
| [`quantum-hidden-shift`](../.agents/skills/quantum-hidden-shift/SKILL.md) | 偶数位二次 bent 函数的 shifted/dual 相位 oracle | 已有 Harness `bash` / `pwsh`；`hidden_shift` 开源示例 |
| [`quantum-guide-algorithms-state-preparation`](../.agents/skills/quantum-guide-algorithms-state-preparation/SKILL.md) | algorithms/state-preparation 分类、后端或迁移指引 | 手动分类导航；自动任务直接选择方法 Skill |
| [`quantum-mottonen`](../.agents/skills/quantum-mottonen/SKILL.md) | PennyLane Möttönen 均匀受控旋转态制备 | 已有 Harness `bash` / `pwsh`；`mottonen` 开源示例 |
| [`quantum-mps`](../.agents/skills/quantum-mps/SKILL.md) | SVD 分解、可选键截断、显式右规范化与 PennyLane MPSPrep | 已有 Harness `bash` / `pwsh`；`mps` 开源示例 |
| [`quantum-multiplexer`](../.agents/skills/quantum-multiplexer/SKILL.md) | Qiskit StatePreparation/Isometry 的均匀受控门合成 | 已有 Harness `bash` / `pwsh`；`multiplexer` 开源示例 |
| [`quantum-pauli`](../.agents/skills/quantum-pauli/SKILL.md) | PennyLane ArbitraryStatePreparation 的 Pauli 旋转优化 | 已有 Harness `bash` / `pwsh`；`pauli` 开源示例 |
| [`quantum-superposition`](../.agents/skills/quantum-superposition/SKILL.md) | PennyLane Superposition 的计算基叠加与辅助位清零 | 已有 Harness `bash` / `pwsh`；`superposition` 开源示例 |
| [`quantum-algorithms`](../.agents/skills/quantum-algorithms/SKILL.md) | root 分类、后端或迁移指引 | 按任务组合已有 Skill 和通用 Tool |
| [`quantum-guide-simulators`](../.agents/skills/quantum-guide-simulators/SKILL.md) | simulators 分类、后端或迁移指引 | 手动分类导航；自动任务直接选择方法 Skill |
| [`quantum-guide-simulators-pennylane`](../.agents/skills/quantum-guide-simulators-pennylane/SKILL.md) | simulators/pennylane 分类、后端或迁移指引 | 按任务组合已有 Skill 和通用 Tool |
| [`quantum-guide-simulators-qiskit`](../.agents/skills/quantum-guide-simulators-qiskit/SKILL.md) | simulators/qiskit 分类、后端或迁移指引 | 按任务组合已有 Skill 和通用 Tool |
| [`quantum-guide-simulators-unitarylab`](../.agents/skills/quantum-guide-simulators-unitarylab/SKILL.md) | simulators/unitarylab 分类、后端或迁移指引 | 按任务组合已有 Skill 和通用 Tool |
<!-- END OPEN ALGORITHM SKILLS -->

</details>

<details>
<summary><strong>MCP 服务目录：用途、默认开关与准备条件</strong></summary>

## MCP 服务目录

OpenQuantum 组合本地 MCP 桥接与直接接入的上游 MCP 服务。下表按用途分组：本地桥接链接到仓库源码并保留上游来源，直接接入的服务明确标记为“上游服务”。

默认 Preset 共声明 91 个 MCP 服务连接：**66 个默认开启（其中 Qiskit 两项可通过离线开关关闭），25 个按需启用**。连接名对应配置中的 `serverName`；“默认开启”表示配置策略，使用前仍需准备依赖和必要凭据。

这些 MCP Server 都由本机以 `stdio` 方式启动，不是 OpenQuantum 提供的公共托管端点。其中一部分 Tool 在本地计算，另一部分再访问厂商文档或量子云；“本地启动 MCP Server”不代表所有数据处理都留在本地。

### 本地电路工作流

| MCP 服务 / 连接名 | 能提供什么工具能力 | 默认配置 | 使用条件与边界 |
| --- | --- | --- | --- |
| [`qiskit`](https://github.com/Qiskit/mcp-servers) · Qiskit Circuits（上游服务） | 电路读取、分析、转译与 QASM/QPY 转换 | 默认开启¹ | `uvx`；电路操作无需云凭据，首次启动可能下载依赖 |
| [`flagquantum`](../.agents/skills/flagquantum-workbench/mcp/server.mjs) · [FlagQuantum](https://github.com/FlagQuantum/mcp-servers)（上游服务） | 第二家量子 MCP 电路工作台 | 默认关闭 | Python 3.12 + uv；本地计算、无需云凭据；[范围](integrations/CANDIDATE_LIBRARIES.md) |
| [`tyxonq_local`](../.agents/skills/tyxonq-workbench/mcp/server.mjs) · [TyxonQ](https://github.com/QureGenAI-Biotech/TyxonQ) | 电路与噪声仿真 | 默认关闭 | 手动开启；显式准备较大的 Python 环境，无需云凭据 |
| [`pyzx_local`](../.agents/skills/pyzx-optimization/mcp/server.mjs) · [PyZX](https://github.com/zxcalc/pyzx) | ZX 重写、Clifford+T 优化与电路提取 | 默认开启 | uv；隔离 Python 3.12 环境；[安装与范围](integrations/UNITARY_NEXT_TOOLS.md) |
| [`compact_local`](../.agents/skills/compact-optimization/mcp/server.mjs) · [Compact](https://github.com/Q-PROOF/Compact) | 线路优化与独立等价对照 | 默认开启 | Python 3.12 + uv；本地计算、无需云凭据；[范围](integrations/CANDIDATE_LIBRARIES.md) |
| [`hamiltonian_local`](../.agents/skills/hamiltonian-simulation/mcp/server.mjs) · [UnitaryLab MIT 算法适配](https://github.com/unitarylab/unitarylab_algorithms) | Trotter/qDrift 哈密顿量演化 | 默认开启 | 显式运行 `npm run capability:hamiltonian:setup`；Qiskit/NumPy/SciPy 开放依赖；[范围](integrations/UNITARYLAB_OPEN_ADAPTATION.md) |
| [`qcut_local`](../.agents/skills/qcut-knitting/mcp/server.mjs) · [QCut](https://github.com/FiQCI/QCut) | 门切割与期望值重建 | 默认开启 | Python 3.12 + uv；本地计算、无需云凭据；[范围](integrations/CANDIDATE_LIBRARIES.md) |
| [`graphix_local`](../.agents/skills/graphix-mbqc/mcp/server.mjs) · [Graphix](https://github.com/TeamGraphix/graphix) | 电路到 MBQC 模式、资源图、自适应测量和纠正输出 | 默认开启 | uv；隔离 Python 3.12 环境；[安装与范围](integrations/UNITARY_NEXT_TOOLS.md) |
| [`qcec_local`](../.agents/skills/quantum-circuit-verification/mcp/server.mjs) · [MQT QCEC](https://github.com/munich-quantum-toolkit/qcec) | unitary 电路等价性检查 | 默认开启 | `uv`；本地运行，无需云凭据；不接受动态电路或任意文件路径 |
| [`clifft_local`](../.agents/skills/clifft-sampling/mcp/server.mjs) · [Clifft](https://github.com/unitaryfoundation/clifft) | Clifford+T 最终测量与 Stim 格式纠错记录采样 | 默认开启 | uv；CPU 固定 shots，原始奇偶值需另行解码；[安装与范围](integrations/QUANTUM_INTEROP.md) |
| [`qbraid_local`](../.agents/skills/qbraid-conversion/mcp/server.mjs) · [qBraid](https://github.com/qBraid/qBraid) | Qiskit/Cirq 双向本地转换与可选完整酉矩阵对照 | 默认开启 | uv；结构化酉电路，无云任务；[安装与范围](integrations/QUANTUM_INTEROP.md) |

### 量子态与测量

| MCP 服务 / 连接名 | 能提供什么工具能力 | 默认配置 | 使用条件与边界 |
| --- | --- | --- | --- |
| [`toqito_audit`](../.agents/skills/quantum-information-audit/mcp/server.mjs) · [toqito](https://github.com/vprusso/toqito) | 密度矩阵与纠缠指标计算、独立检查；可接物化验收链 | 默认开启 | `uv`；本地运行，无需云凭据；完整调用会保存科研证据 |
| [`random_meas_local`](../.agents/skills/randomized-measurements/mcp/server.mjs) · [RandomMeas.jl](https://github.com/bvermersch/RandomMeas.jl) | 局域随机测量与子区纯度估计 | 默认开启 | Julia 1.12.7；先准备固定依赖；[安装与范围](integrations/PAPER_BACKED_TOOLS.md)，不连接云硬件 |

### 基态、化学与优化方法

| MCP 服务 / 连接名 | 能提供什么工具能力 | 默认配置 | 使用条件与边界 |
| --- | --- | --- | --- |
| [`sqd_local`](../.agents/skills/sqd-chemistry/mcp/server.mjs) · [Qiskit SQD](https://github.com/Qiskit/qiskit-addon-sqd) | 分子与活性空间 SQD、可选 FCI 参照 | 默认开启 | uv；[安装与范围](integrations/PAPER_BACKED_TOOLS.md)，不连接云硬件 |
| [`tenpy_local`](../.agents/skills/tenpy-ground-state/mcp/server.mjs) · [TeNPy](https://github.com/tenpy/tenpy) | 有限 XYZ 链 DMRG 基态与精确参照 | 默认开启 | uv；[安装与范围](integrations/PAPER_BACKED_TOOLS.md)，不连接云硬件 |
| [`flow_vqe_local`](../.agents/skills/flow-vqe/mcp/server.mjs) · [Flow-VQE](https://github.com/olsson-group/Flow-VQE) | Pauli Hamiltonian 的 flow 参数学习与随机搜索比较 | 默认开启 | uv；[安装与范围](integrations/PAPER_BACKED_TOOLS.md)，不连接云硬件 |
| [`openqarp_local`](../.agents/skills/openqarp-excited-states/mcp/server.mjs) · [OpenQARP](https://github.com/OpenQARP/openqarp) | VQD 激发态、残差与正交性 | 默认开启 | Python 3.12 + uv；本地计算、无需云凭据；[范围](integrations/CANDIDATE_LIBRARIES.md) |
| [`cqlib_kernel_local`](../.agents/skills/cqlib-kernel/mcp/server.mjs) · [cqlib-qml](https://github.com/cq-lib/cqlib-qml) | 角度编码核与 QSVM | 默认关闭 | Python 3.12 + uv；本地计算、无需云凭据；首次构建需 Rust ≥1.89，固定 beta SDK；[范围](integrations/CANDIDATE_LIBRARIES.md) |
| [`symmer_local`](../.agents/skills/symmer-tapering/mcp/server.mjs) · [Symmer](https://github.com/qmatter-labs/symmer) | 指定 Pauli 对称性扇区的降比特与同扇区保谱检查 | 默认开启 | uv；隔离 Python 3.12 环境；[安装与范围](integrations/UNITARY_NEXT_TOOLS.md) |
| [`paulie_local`](../.agents/skills/paulie-algebra/mcp/server.mjs) · [PauLie](https://github.com/QPauLie/PauLie) | Pauli 生成元的 Lie 代数分类、精确维数与可选闭包 | 默认开启 | uv；隔离 Python 3.12 环境；[安装与范围](integrations/UNITARY_NEXT_TOOLS.md) |
| [`qpanda_qubo`](../.agents/skills/qpanda-qubo/mcp/server.mjs) · [QPanda QUBO](https://github.com/OriginQ/pyqpanda-algorithm) | QUBO 编译、枚举复核、经典求解与可选本地 QAOA | 默认开启 | `uv`；本地 CPU 模拟器，无需本源云凭据 |

### 误差缓解与纠错

| MCP 服务 / 连接名 | 能提供什么工具能力 | 默认配置 | 使用条件与边界 |
| --- | --- | --- | --- |
| [`mitiq_local`](../.agents/skills/mitiq-error-mitigation/mcp/server.mjs) · [Mitiq](https://github.com/unitaryfoundation/mitiq) | ZNE、REM、PEC、CDR 噪声实验与有限采样统计 | 默认开启 | uv；隔离 Python 3.12 环境，能力目录 GPL-3.0-only；[接入说明](integrations/MITIQ.md) |
| [`qec_local`](../.agents/skills/qec-memory-experiment/mcp/server.mjs) · [Stim](https://github.com/quantumlib/Stim) + [PyMatching](https://github.com/oscarhiggott/PyMatching) | surface-code memory 实验、MWPM 解码与逻辑错误率统计 | 默认开启 | `uv`；本地运行，无需云凭据；用户选择 shots、seed 与噪声参数 |
| [`deltakit_local`](../.agents/skills/deltakit-qec/mcp/server.mjs) · [Deltakit](https://github.com/Deltakit/deltakit) | 纠错存储电路构建与本地噪声实验 | 默认开启 | uv；ToyNoise、Stim、PyMatching；[安装与范围](integrations/UNITARY_ECOSYSTEM.md) |
| [`ldpc_local`](../.agents/skills/ldpc-decoding/mcp/server.mjs) · [BP+LSD](https://github.com/quantumgizmos/ldpc) | 二元校验矩阵的纠错解码与 syndrome 检查 | 默认开启 | uv；[安装与范围](integrations/PAPER_BACKED_TOOLS.md)，不连接云硬件 |

### 开放系统动力学

| MCP 服务 / 连接名 | 能提供什么工具能力 | 默认配置 | 使用条件与边界 |
| --- | --- | --- | --- |
| [`dynamiqs_local`](../.agents/skills/dynamiqs-dynamics/mcp/server.mjs) · [Dynamiqs](https://github.com/dynamiqs/dynamiqs) | 驱动扫描、耗散动力学与自动微分 | 默认开启 | uv、隔离 Python 3.12；[安装与范围](integrations/UNITARY_ECOSYSTEM.md) |
| [`oqupy_local`](../.agents/skills/oqupy-dynamics/mcp/server.mjs) · [OQuPy](https://github.com/tempoCollaboration/OQuPy) | Ohmic spin-boson TEMPO | 默认开启 | uv；独立 NumPy 1.x 环境；[安装与范围](integrations/UNITARY_ECOSYSTEM.md) |
| [`tjm_local`](../.agents/skills/tjm-dynamics/mcp/server.mjs) · [MQT YAQS / TJM](https://github.com/munich-quantum-toolkit/yaqs) | 开放 Ising 链张量轨迹与 Lindblad 参照 | 默认开启 | uv；[安装与范围](integrations/PAPER_BACKED_TOOLS.md)，不连接云硬件 |

### 实验模拟

| MCP 服务 / 连接名 | 能提供什么工具能力 | 默认配置 | 使用条件与边界 |
| --- | --- | --- | --- |
| [`fatqat_local`](../.agents/skills/fatqat-workbench/mcp/server.mjs) · [FatQat](https://github.com/spaceqat/fatqat) | 电路与硬件约束、超导和中性原子脉冲动力学 | 默认开启 | 显式准备锁定 Python 环境；数值计算本地运行，无云凭据或 QPU 操作 |
| [`pairinteraction_local`](../.agents/skills/pairinteraction-rydberg/mcp/server.mjs) · [PairInteraction](https://github.com/pairinteraction/pairinteraction) | 两颗 Rb 原子的静态势能与有效哈密顿量 | 默认开启 | 独立 Python 3.12 与固定数据库；先显式运行 `npm run capability:pairinteraction:setup`，计算不下载 |
| [`bloqade_local`](../.agents/skills/bloqade-analog/mcp/server.mjs) · [Bloqade Analog](https://github.com/QuEraComputing/bloqade-analog) | 自定义二维阵列与全局时变脉冲的本地 Rydberg 仿真 | 默认开启 | Python 3.12 + uv；显式准备环境，无需云凭据；[使用说明](integrations/BLOQADE_ANALOG.md) |

### 国内外厂商 SDK

| MCP 服务 / 连接名 | 能提供什么工具能力 | 默认配置 | 使用条件与边界 |
| --- | --- | --- | --- |
| [`pennylane_local`](../.agents/skills/pennylane-differentiable/mcp/server.mjs) · [pennylane](https://github.com/PennyLaneAI/pennylane) | 用户电路的概率、Pauli 期望值和参数梯度。 | 默认开启 | 显式准备独立环境；[版本与边界](integrations/VENDOR_SDKS.md) |
| [`deepquantum_local`](../.agents/skills/deepquantum-differentiable/mcp/server.mjs) · [deepquantum](https://github.com/TuringQ/deepquantum) | 基于 PyTorch 的电路概率、期望值和参数梯度。 | 默认开启 | 显式准备独立环境；[版本与边界](integrations/VENDOR_SDKS.md) |
| [`tensorcircuit_local`](../.agents/skills/tensorcircuit-differentiable/mcp/server.mjs) · [tensorcircuit](https://github.com/tencent-quantum-lab/tensorcircuit) | 张量网络电路的概率、期望值和参数梯度。 | 默认开启 | 显式准备独立环境；[版本与边界](integrations/VENDOR_SDKS.md) |
| [`mindquantum_local`](../.agents/skills/mindquantum-differentiable/mcp/server.mjs) · [mindquantum](https://gitee.com/mindspore/mindquantum) | 本地电路模拟、Pauli 期望值和参数梯度。 | 默认开启 | 显式准备独立环境；[版本与边界](integrations/VENDOR_SDKS.md) |
| [`pytket_local`](../.agents/skills/pytket-compilation/mcp/server.mjs) · [pytket](https://github.com/Quantinuum/tket) | 本地电路优化、门数比较与 OpenQASM 导出。 | 默认开启 | 显式准备独立环境；[版本与边界](integrations/VENDOR_SDKS.md) |
| [`ocean_local`](../.agents/skills/ocean-optimization/mcp/server.mjs) · [dimod + dwave-samplers](https://github.com/dwavesystems/dwave-ocean-sdk) | 二值二次模型的本地穷举或模拟退火；不是量子退火硬件执行。 | 默认开启 | 显式准备独立环境；[版本与边界](integrations/VENDOR_SDKS.md) |
| [`kaiwu_local`](../.agents/skills/kaiwu-qubo/mcp/server.mjs) · [kaiwu-community](https://github.com/qboson/kaiwu_community) | 社区版符号 QUBO、约束罚项和 Ising 转换；不使用企业版或真机。 | 默认开启 | 显式准备独立环境；[版本与边界](integrations/VENDOR_SDKS.md) |
| [`pyquil_local`](../.agents/skills/pyquil-simulation/mcp/server.mjs) · [pyquil](https://github.com/rigetti/pyquil) | 本地 Quil 电路模拟，不提交 Rigetti 云作业。 | 默认开启 | 显式准备独立环境；[版本与边界](integrations/VENDOR_SDKS.md) |
| [`spinqit_local`](../.agents/skills/spinqit-simulation/mcp/server.mjs) · [spinqit](https://github.com/SpinQTech/SpinQit) | 量旋 SDK 的本地电路模拟，不连接设备。 | 默认开启 | 显式准备独立环境；[版本与边界](integrations/VENDOR_SDKS.md) |
| [`qutrunk_local`](../.agents/skills/qutrunk-simulation/mcp/server.mjs) · [qutrunk](https://github.com/qudoor/qutrunk) | 启科 SDK 的本地电路模拟，不连接设备。 | 默认开启 | 显式准备独立环境；[版本与边界](integrations/VENDOR_SDKS.md) |
| [`perceval_local`](../.agents/skills/perceval-photonics/mcp/server.mjs) · [perceval-quandela](https://github.com/Quandela/Perceval) | 用户 Fock 输入、分束器和移相网络的本地光子分布。 | 默认开启 | 显式准备独立环境；[版本与边界](integrations/VENDOR_SDKS.md) |
| [`iqm_local`](../.agents/skills/iqm-circuit-workbench/mcp/server.mjs) · [iqm-client](https://github.com/iqm-finland/iqm-client) | IQM 原生门转译与本地模拟，不连接真实设备。 | 默认开启 | 显式准备独立环境；[版本与边界](integrations/VENDOR_SDKS.md) |
| [`alicebob_local`](../.agents/skills/alicebob-cat-circuits/mcp/server.mjs) · [qiskit-alice-bob-provider](https://github.com/Alice-Bob-SW/qiskit-alice-bob-provider) | 官方本地猫态量子比特模型与电路仿真。 | 默认开启 | 显式准备独立环境；[版本与边界](integrations/VENDOR_SDKS.md) |
| [`pulser_local`](../.agents/skills/pulser-dynamics/mcp/server.mjs) · [pulser-core + pulser-simulation](https://github.com/pasqal-io/Pulser) | Pasqal 全局脉冲、Rydberg 阵列与本地动力学。 | 默认开启 | 显式准备独立环境；[版本与边界](integrations/VENDOR_SDKS.md) |
| [`qoolqit_local`](../.agents/skills/qoolqit-workbench/mcp/server.mjs) · [qoolqit](https://github.com/pasqal-io/qoolqit) | 无量纲 Rydberg 程序编译与本地计算；需审阅上游定制许可证。 | 默认关闭 | 显式准备独立环境；[版本与边界](integrations/VENDOR_SDKS.md) |
| [`ionq_local`](../.agents/skills/ionq-programs/mcp/server.mjs) · [qiskit-ionq](https://github.com/qiskit-community/qiskit-ionq) | 使用官方 SDK 将结构化电路转换为 IonQ QIS 程序；不提交云任务。 | 默认开启 | 显式准备独立环境；[版本与边界](integrations/VENDOR_SDKS.md) |
| [`superstaq_cloud`](../.agents/skills/superstaq-compilation/mcp/server.mjs) · [qiskit-superstaq](https://github.com/Infleqtion/client-superstaq) | 本地程序序列化和可选远程编译；远程操作外发电路，需要账户，不执行 QPU 任务。 | 默认关闭 | 显式准备独立环境；[版本与边界](integrations/VENDOR_SDKS.md) |

### 公司与机构 SDK 补充连接

| MCP 服务 / 连接名 | 能提供什么工具能力 | 默认配置 | 使用条件与边界 |
| --- | --- | --- | --- |
| [`qsteed_local`](../.agents/skills/qsteed-compilation/mcp/server.mjs) · [BAQIS](https://github.com/BAQIS-Quantum/qsteed) | PyQuafu 电路编译到指定门集，保留全局相位与线路，不连接资源数据库。 | 默认开启 | 显式准备独立环境；[版本、配置与范围](integrations/SDK_EXPANSION.md) |
| [`quairkit_local`](../.agents/skills/quairkit-information/mcp/server.mjs) · [QuAIR](https://github.com/QuAIR/QuAIRKit) | CPU 密度矩阵电路与去极化、振幅阻尼、相位阻尼通道。 | 默认开启 | 显式准备独立环境；[版本、配置与范围](integrations/SDK_EXPANSION.md) |
| [`qcompute_local`](../.agents/skills/qcompute-simulation/mcp/server.mjs) · [Baidu](https://github.com/baidu/QCompute) | 使用百度 QCompute 本地模拟器计算电路概率。 | 默认开启 | 显式准备独立环境；[版本、配置与范围](integrations/SDK_EXPANSION.md) |
| [`qibo_local`](../.agents/skills/qibo-simulation/mcp/server.mjs) · [Qibo / TII / INFN](https://github.com/qiboteam/qibo) | 使用明确选定的 NumPy CPU 后端计算态矢量。 | 默认开启 | 显式准备独立环境；[版本、配置与范围](integrations/SDK_EXPANSION.md) |
| [`qrisp_local`](../.agents/skills/qrisp-arithmetic/mcp/server.mjs) · [Eclipse / Fraunhofer](https://github.com/eclipse-qrisp/Qrisp) | 本地 QuantumFloat 无符号模加法；需考虑 EPL-2.0 许可。 | 默认关闭 | 显式准备独立环境；[版本、配置与范围](integrations/SDK_EXPANSION.md) |
| [`lightworks_local`](../.agents/skills/lightworks-photonics/mcp/server.mjs) · [Aegiq](https://github.com/Aegiq/lightworks) | 本地线性光学网络与 Fock 输入的输出概率。 | 默认开启 | 显式准备独立环境；[版本、配置与范围](integrations/SDK_EXPANSION.md) |
| [`braket_local`](../.agents/skills/braket-simulation/mcp/server.mjs) · [Amazon](https://github.com/amazon-braket/amazon-braket-sdk-python) | 显式 LocalSimulator 电路振幅与概率，不创建 AWS 云任务。 | 默认开启 | 显式准备独立环境；[版本、配置与范围](integrations/SDK_EXPANSION.md) |
| [`quri_parts_local`](../.agents/skills/quri-parts-estimation/mcp/server.mjs) · [QunaSys](https://github.com/QunaSys/quri-sdk) | QURI Parts 电路与 Qulacs 本地 Pauli 期望值。 | 默认开启 | 显式准备独立环境；[版本、配置与范围](integrations/SDK_EXPANSION.md) |
| [`qdk_local`](../.agents/skills/qdk-resource-estimation/mcp/server.mjs) · [Microsoft](https://github.com/microsoft/qdk) | 由电路和硬件假设估算物理量子位与运行时间。 | 默认开启 | 显式准备独立环境；[版本、配置与范围](integrations/SDK_EXPANSION.md) |
| [`qualtran_local`](../.agents/skills/qualtran-resources/mcp/server.mjs) · [Google Quantum AI](https://github.com/quantumlib/Qualtran) | 算术 Bloq 的容错门资源；实验性 API，保留计数假设。 | 默认开启 | 显式准备独立环境；[版本、配置与范围](integrations/SDK_EXPANSION.md) |
| [`openfermion_local`](../.agents/skills/openfermion-mapping/mcp/server.mjs) · [Google Quantum AI](https://github.com/quantumlib/OpenFermion) | 结构化费米算符到 Jordan-Wigner 或 Bravyi-Kitaev Pauli 项。 | 默认开启 | 显式准备独立环境；[版本、配置与范围](integrations/SDK_EXPANSION.md) |
| [`mqt_ddsim_local`](../.agents/skills/mqt-ddsim/mcp/server.mjs) · [TUM / MQT](https://github.com/munich-quantum-toolkit/ddsim) | 使用决策图模拟电路，返回指定计算基态概率。 | 默认开启 | 显式准备独立环境；[版本、配置与范围](integrations/SDK_EXPANSION.md) |
| [`mqt_qmap_local`](../.agents/skills/mqt-qmap/mcp/server.mjs) · [TUM / MQT](https://github.com/munich-quantum-toolkit/qmap) | 将电路映射到耦合图，返回物理线路及逻辑输入、输出映射。 | 默认开启 | 显式准备独立环境；[版本、配置与范围](integrations/SDK_EXPANSION.md) |
| [`classiq_cloud`](../.agents/skills/classiq-synthesis/mcp/server.mjs) · [Classiq](https://docs.classiq.io/) | 本地模型准备及可选云端综合；用户自行配置 Token 和服务权限。 | 默认关闭 | 显式准备独立环境；[版本、配置与范围](integrations/SDK_EXPANSION.md) |
| [`qctrl_cloud`](../.agents/skills/qctrl-workbench/mcp/server.mjs) · [Q-CTRL](https://docs.q-ctrl.com/) | 本地 Boulder Opal 控制图与已有 Boulder/Fire Opal 作业状态查询。 | 默认关闭 | 显式准备独立环境；[版本、配置与范围](integrations/SDK_EXPANSION.md) |
| [`qua_local`](../.agents/skills/qua-programs/mcp/server.mjs) · [Quantum Machines](https://github.com/qm-labs/qm-qua-sdk-public) | 本地生成 OPX 脉冲程序与配置，不连接 QOP 服务。 | 默认开启 | 显式准备独立环境；[版本、配置与范围](integrations/SDK_EXPANSION.md) |
| [`laboneq_local`](../.agents/skills/laboneq-control/mcp/server.mjs) · [Zurich Instruments](https://github.com/zhinst/laboneq) | 离线脉冲编译与 HDAWG 输出波形仿真，不执行设备程序。 | 默认开启 | 显式准备独立环境；[版本、配置与范围](integrations/SDK_EXPANSION.md) |
| [`qcarchive_data`](../.agents/skills/qcarchive-query/mcp/server.mjs) · [MolSSI](https://github.com/MolSSI/QCFractal) | 只读查询既有单点记录，返回分子、原子单位能量和计算来源。 | 默认关闭 | 显式准备独立环境；[版本、配置与范围](integrations/SDK_EXPANSION.md) |
| [`cudaq_local`](../.agents/skills/cudaq-simulation/mcp/server.mjs) · [NVIDIA](https://github.com/NVIDIA/cuda-quantum) | 固定 qpp-cpu 后端的精确概率与采样；Linux 或 Apple Silicon macOS。 | 默认关闭 | 显式准备独立环境；[版本、配置与范围](integrations/SDK_EXPANSION.md) |
| [`netqasm_local`](../.agents/skills/netqasm-network/mcp/server.mjs) · [QuTech](https://github.com/QuTech-Delft/squidasm) | 本地双节点 EPR 程序编译；仿真需用户自行准备有许可的 NetSquid 环境。 | 默认关闭 | 显式准备独立环境；[版本、配置与范围](integrations/SDK_EXPANSION.md) |

固定版本、显式准备和凭据配置见[SDK 补充接入说明](integrations/SDK_EXPANSION.md)。

### 网络、控制、光学与云接口补充

| MCP 服务 / 连接名 | 能提供什么工具能力 | 默认配置 | 使用条件与边界 |
| --- | --- | --- | --- |
| [`simqn_local`](../.agents/skills/simqn-network/mcp/server.mjs) · [qns](https://github.com/QNLab-USTC/SimQN) | SimQN 单链路的离散事件、随机损失与 Werner 衰减。 | 默认关闭 | 显式准备；[版本、配置与边界](integrations/SDK_GAPS.md) |
| [`qcover_local`](../.agents/skills/qcover-optimization/mcp/server.mjs) · [Qcover](https://github.com/BAQIS-Quantum/Qcover) | Qcover 按图分解评估给定 QAOA 参数的能量与相关量。 | 默认开启 | 显式准备；[版本、配置与边界](integrations/SDK_GAPS.md) |
| [`vqnet_local`](../.agents/skills/vqnet-learning/mcp/server.mjs) · [pyvqnet](https://vqnet20-tutorial.readthedocs.io/en/main/index.html) | VQNet CPU 电路期望、概率与每个旋转参数的自动微分。 | 默认关闭 | 显式准备；[版本、配置与边界](integrations/SDK_GAPS.md) |
| [`pychemiq_local`](../.agents/skills/pychemiq-chemistry/mcp/server.mjs) · [pychemiq](https://github.com/OriginQ/pyChemiQ) | pyChemiQ 费米算符到 Jordan–Wigner Pauli 项，保留微小系数。 | 默认开启 | 显式准备；[版本、配置与边界](integrations/SDK_GAPS.md) |
| [`qblox_local`](../.agents/skills/qblox-scheduling/mcp/server.mjs) · [qblox-scheduler](https://docs.qblox.com/en/main/products/qblox_scheduler/index.html) | Qblox 方波排程和波形采样，不连接 HardwareAgent。 | 默认开启 | 显式准备；[版本、配置与边界](integrations/SDK_GAPS.md) |
| [`qililab_local`](../.agents/skills/qililab-control/mcp/server.mjs) · [qililab](https://github.com/qilimanjaro-tech/qililab) | Qililab 将 I/Q 方波离线编译到 Qblox Q1ASM。 | 默认开启 | 显式准备；[版本、配置与边界](integrations/SDK_GAPS.md) |
| [`guppy_local`](../.agents/skills/guppy-programs/mcp/server.mjs) · [guppylang](https://github.com/Quantinuum/guppylang) | Guppy/Selene 的中途测量、复位和经典条件反馈仿真。 | 默认开启 | 显式准备；[版本、配置与边界](integrations/SDK_GAPS.md) |
| [`qat_local`](../.agents/skills/oqc-qat/mcp/server.mjs) · [qat-compiler](https://github.com/oqc-community/qat) | QAT 脉冲时序与复基带波形，不执行后端测量。 | 默认开启 | 显式准备；[版本、配置与边界](integrations/SDK_GAPS.md) |
| [`mrmustard_local`](../.agents/skills/mrmustard-optics/mcp/server.mjs) · [mrmustard](https://github.com/XanaduAI/MrMustard) | MrMustard 高斯光学矩和截断 Fock 概率；上游已归档。 | 默认关闭 | 显式准备；[版本、配置与边界](integrations/SDK_GAPS.md) |
| [`merlin_local`](../.agents/skills/merlin-learning/mcp/server.mjs) · [merlinquantum](https://github.com/merlinquantum/merlin) | MerLin 完整 Fock 概率、批量推断与相移梯度。 | 默认开启 | 显式准备；[版本、配置与边界](integrations/SDK_GAPS.md) |
| [`mimiq_local`](../.agents/skills/mimiq-simulation/mcp/server.mjs) · [mimiq-exaqt](https://docs.qperfect.io/exaqt-python/) | MIMIQ Exaqt 本地态矢量和种子采样。 | 默认关闭 | 显式准备；[版本、配置与边界](integrations/SDK_GAPS.md) |
| [`myqlm_local`](../.agents/skills/myqlm-simulation/mcp/server.mjs) · [myqlm](https://myqlm.github.io/) | myQLM PyLinalg 本地理想电路仿真。 | 默认关闭 | 显式准备；[版本、配置与边界](integrations/SDK_GAPS.md) |
| [`aqt_local`](../.agents/skills/aqt-workbench/mcp/server.mjs) · [qiskit-aqt-provider](https://github.com/qiskit-community/qiskit-aqt-provider) | AQT 原生门编译、离线采样与可选设备查询。 | 默认关闭 | 显式准备；[版本、配置与边界](integrations/SDK_GAPS.md) |
| [`oqc_cloud`](../.agents/skills/oqc-cloud/mcp/server.mjs) · [oqc-qcaas-client](https://docs.oqc.app/) | OQC 本地任务准备、查询及显式单次云提交。 | 默认关闭 | 显式准备；[版本、配置与边界](integrations/SDK_GAPS.md) |
| [`quantuminspire_cloud`](../.agents/skills/quantuminspire-cloud/mcp/server.mjs) · [quantuminspire](https://github.com/QuTech-Delft/quantuminspire) | Quantum Inspire 分页设备类型与既有任务状态查询。 | 默认关闭 | 显式准备；[版本、配置与边界](integrations/SDK_GAPS.md) |

### 资料与设备发现

| MCP 服务 / 连接名 | 能提供什么工具能力 | 默认配置 | 使用条件与边界 |
| --- | --- | --- | --- |
| [`qiskit_docs`](https://github.com/Qiskit/mcp-servers) · Qiskit Docs（上游服务） | Qiskit 文档搜索、页面读取和 IBM Quantum 错误码查询 | 默认开启¹ | `uvx`；文档访问需要网络，无需云凭据 |
| [`fieldqkit`](../.agents/skills/fieldqkit-hardware/mcp/server.mjs) · [FieldQKit](https://github.com/FieldQuantum/fieldqkit) | 凭据状态检查、国内量子云后端发现和筛选 | 默认开启 | `uv`；发现对应云后端需要相应凭据；不提交或取消任务 |
| [`qdmi_local`](../.agents/skills/qdmi-device/mcp/server.mjs) · [QDMI](https://github.com/Munich-Quantum-Software-Stack/QDMI) | 设备、门集与耦合的只读发现 | 默认关闭 | 显式准备固定驱动；官方示例不代表真实硬件；[安装与范围](integrations/QUANTUM_INTEROP.md) |

### 量子云任务

| MCP 服务 / 连接名 | 能提供什么工具能力 | 默认配置 | 使用条件与边界 |
| --- | --- | --- | --- |
| [`qiskit_ibm_runtime`](https://github.com/Qiskit/mcp-servers) · IBM Runtime（上游服务） | IBM 后端查询、任务提交、结果读取与取消 | 默认关闭 | 手动开启；`uvx`、IBM Token 与可用账户额度；任务操作可能产生费用 |
| [`quantum_hardware`](https://github.com/Lokesh-2025/quantum-hardware-mcp) · 社区硬件服务（上游服务） | IBM / IonQ 设备查询、任务提交与取消、成本估算 | 默认关闭 | 先安装固定源码并配置 IBM Token；IonQ 操作另需相应 Key；真实任务需授权 |
| [`qpanda_runtime`](https://github.com/OriginQ/qpanda3-runtime-mcp-server) · 本源运行时（上游服务） | 悟空 QPU 设备查询，采样、期望值、批量任务与任务管理 | 默认关闭 | 先安装固定源码并配置本源凭据；真实任务需要权限、额度与授权 |

### 专用转译与训练服务

| MCP 服务 / 连接名 | 能提供什么工具能力 | 默认配置 | 使用条件与边界 |
| --- | --- | --- | --- |
| [`qiskit_ibm_transpiler`](https://github.com/Qiskit/mcp-servers) · IBM Transpiler（上游服务） | AI 电路路由、综合与混合转译 | 默认关闭 | 手动开启；`uvx`、IBM Token 与服务权限；调用 IBM 服务 |
| [`qiskit_gym`](https://github.com/Qiskit/mcp-servers) · Qiskit Gym（上游服务） | 强化学习电路综合、训练环境与模型管理 | 默认关闭 | 手动开启；`uvx`；训练、进程和模型文件操作有副作用 |

¹ 两项 Qiskit 服务在未设置 `OPENQUANTUM_DISABLE_QISKIT_MCP=1` 时默认开启。设置中心可以覆盖连接策略；修改 MCP 连接配置后需要重启 Harness。

本地桥接中的数值算法和 SDK 来自相应上游项目；OpenQuantum 负责桥接接口、输入范围、调用流程及适用的结果检查。本地计算环境在显式准备时安装；上游服务启动仍可能物化自身依赖，SDK 计算也可能创建缓存。完整调用副作用见[能力合同](../.agents/capability-packages.yml)。

启用与验证入口：设置中心 → MCP Server 连接 → 配置必要凭据 → 重启 Harness → 查看运行证据。`quantum_hardware` 和 `qpanda_runtime` 还需分别先运行 `npm run mcp:quantum-hardware:setup`、`npm run mcp:qpanda-runtime:setup`。完整 Tool 名称与副作用声明见[能力合同](../.agents/capability-packages.yml)；连接与凭据引用见 [Agent Preset](../runtime/openquantum/agent-presets/openquantum/agent.cordis.yml)。

</details>

<details>
<summary><strong>原生量子 Tools：动作与副作用</strong></summary>

## 原生量子 Tools

OpenQuantum 提供以下 5 个原生量子动作，用于基态求解、调校实验模拟和研究资料查询。它们由本仓库的[原生计算 Tool Provider](../runtime/openquantum/agent-presets/openquantum/native-quantum-tools.mjs)、[算法参考 Tool Provider](../runtime/openquantum/agent-presets/openquantum/quantum-practices-tools.mjs)和 [Metriq 数据 Tool Provider](../runtime/openquantum/agent-presets/openquantum/metriq-data-tools.mjs)在进程内注册，默认 Preset 已包含它们。这里单独统计量子领域动作；Harness 自带的文件、终端等通用 Tools 不计入。

| 原生 Tool | 做什么 | 完整调用的边界 |
| --- | --- | --- |
| `solve_and_validate_ground_state` | 计算限定二量子位基态并执行独立检查；完整流程保存结果和会话证据后生成科学验收报告 | 本地科研证据写入，`workspace-write`；不是通用分子求解或真机任务 |
| `list_qmclaw_experiments` | 列出 [QMClaw](https://github.com/QMC-AI/QMClaw) 的 13 类实验及支持范围 | 只读目录查询，`read-only`；不连接仪器 |
| `simulate_qmclaw_experiment` | 运行带 seed 的 QMClaw 合成数据实验 | 只读计算，`read-only`；不连接 LabRAD/lqms，不写回真实校准参数 |
| `quantum_practices` | 搜索和读取 66 份固定版本的算法参考指南，支持中文算法名；用于方法比较、假设核对与实验设计 | 本地资料检索，`read-only`；不安装或执行 UnitaryLab 模拟器；[使用与验证](integrations/QUANTUM_PRACTICES.md) |
| `metriq_benchmarks` | 按厂商、设备、基准类型或文字检索 410 条去重后的公开记录，读取原始参数与指标 | 固定本地快照，`read-only`；逐次返回来源与 CC-BY-4.0 署名；[范围与验证](integrations/UNITARY_ECOSYSTEM.md) |

</details>

## 可选上游 Skill

[OriginQ 官方 `pyqpanda3` Skill](https://github.com/OriginQ/pyqpanda3-skill) 提供电路编程、算法模板、迁移与 QCloud 使用指导。它**不计入上面的 187 个内置 Skill，也不会在首次启动时自动安装**；运行 `npm run skill:qpanda:setup` 后，固定审阅版本才会进入项目 Skill 目录。安装这个 Skill 不会自动启用 `qpanda_runtime`，也不会赋予云任务权限。

## 开源生态与致谢

OpenQuantum 的量子能力建立在开放科学与开源软件之上。我们维护领域 Skill、MCP 桥接、原生 Tool 和适用的科学检查；底层算法库、外部服务及应用基础保留各自的作者、项目名称与许可证。下面说明具体使用与适配关系。

### 平台与教学应用

| 使用或适配的项目 | 在 OpenQuantum 中承担的职责 |
| --- | --- |
| [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) | 科研工作台的 Agent 运行时与原生 Web UI，负责会话、模型调用、工具调度和执行记录 |
| [DSH Desktop](https://github.com/anywhere-labs/dsh-desktop) | 桌面客户端基础；OpenQuantum 适配品牌和启动配置，复用科研工作台 |
| [CC Connect](integrations/CC_CONNECT.md) | 消息渠道桥接，将微信、飞书等渠道的请求送入科研工作台 |
| [OpenMAIC](https://github.com/THU-MAIC/OpenMAIC) | 量子学习通的教学应用基础；保留完整界面、服务端与教学流程，适配 OpenQuantum 名称、主题和模型连接；[教学范围与进度](../README.md#量子学习通) |

<details>
<summary><strong>计算工具、设备与资料：上游项目及适配关系</strong></summary>

### 计算与分析工具

下表列出计算能力所用的上游项目。除直接接入的 Qiskit MCP Servers 与 FlagQuantum MCP 外，所列能力由 OpenQuantum 编写桥接或进行计算适配；具体工作流与调用入口见[能力接口目录](../README.md#能力接口目录)。

#### 电路构建、变换与仿真

| 科研任务 | 使用或适配的项目 | OpenQuantum 当前支持 |
| --- | --- | --- |
| 电路构建与转译 | [Qiskit MCP Servers](https://github.com/Qiskit/mcp-servers) | 创建、分析和转译电路，读写 QASM / QPY |
| 门电路仿真 | [TyxonQ](https://github.com/QureGenAI-Biotech/TyxonQ) | 电路的无噪声精确结果与含噪采样 |
| ZX 电路优化 | [PyZX](https://github.com/zxcalc/pyzx) | Clifford+T 电路的 ZX 重写与提取，返回前后 QASM、门数及可选等价性对照 |
| 线路优化 | [Compact](https://github.com/Q-PROOF/Compact) | 固定优化搜索、独立完整酉矩阵与导出电路对照；分列原生门和公共门集成本 |
| 电路切割 | [QCut](https://github.com/FiQCI/QCut) | 门切割、有限采样期望值重建与实际执行成本；自动切割使用对称 CZ 规范化 |
| 第二家电路工作台 | [FlagQuantum MCP](https://github.com/FlagQuantum/mcp-servers) | 按需启用固定上游服务，提供电路分析、转换、仿真及参数操作 |
| 测量式量子计算 | [Graphix](https://github.com/TeamGraphix/graphix) | 电路转 MBQC 资源图及测量模式，模拟自适应测量和输出纠正，可选独立态矢比较 |
| 电路等价性验证 | [MQT QCEC](https://github.com/munich-quantum-toolkit/qcec) | 比较两份无测量的 OpenQASM 2 电路，区分严格等价、相位等价、不等价与不确定 |
| Clifford+T 电路采样 | [Clifft](https://github.com/unitaryfoundation/clifft) | Clifford+T 最终位串采样与可选密度矩阵参考；另支持 Stim 格式的中间测量、detector/observable 原始记录 |
| Qiskit/Cirq 电路互转 | [qBraid](https://github.com/qBraid/qBraid) | 固定 QASM2 转换路径，保持空闲量子位与编号，可选完整酉矩阵对照 |

#### 开源算法与工作流

| 使用或适配的项目 | 在 OpenQuantum 中承担的职责 |
| --- | --- |
| [quantum-skills](https://github.com/unitarylab/quantum-skills) | 66 份指南的原生 Skill 适配，保留来源；方法可自动选择，纯分类索引供手动导航 |
| [unitarylab_algorithms](https://github.com/unitarylab/unitarylab_algorithms) | 39 个算法模块的开源工作流覆盖与 Trotter / qDrift 计算适配；保留 MIT 来源，逐项披露实现差异 |
| [Qiskit](https://github.com/Qiskit/qiskit)、[PennyLane](https://github.com/PennyLaneAI/pennylane)、[quimb](https://github.com/jcmgray/quimb)、[PySCF](https://github.com/pyscf/pyscf)、NumPy / SciPy | 49 个可执行示例使用的开放计算后端，按方法准备锁定依赖 |

适配说明与署名见[覆盖表](integrations/UNITARYLAB_OPEN_COVERAGE.md)和[算法示例 NOTICE](../examples/quantum-algorithms/NOTICE)。

#### 量子态与测量

| 科研任务 | 使用或适配的项目 | OpenQuantum 当前支持 |
| --- | --- | --- |
| 量子态与纠缠审计 | [toqito](https://github.com/vprusso/toqito) | 检查输入密度矩阵，计算纯度、部分转置与指定二分割的 negativity |
| 随机测量与纯度估计 | [RandomMeas.jl](https://github.com/bvermersch/RandomMeas.jl) | 对已知 product / GHZ 态模拟局域 Haar 测量，估计子区纯度与有限样本误差 |

#### 基态、化学与优化方法

| 科研任务 | 使用或适配的项目 | OpenQuantum 当前支持 |
| --- | --- | --- |
| 量子化学基态 | [Qiskit SQD](https://github.com/Qiskit/qiskit-addon-sqd) | 对分子与活性空间做采样子空间对角化，可选同一活性空间 Hamiltonian 的 FCI 参照 |
| 自旋链基态 | [TeNPy](https://github.com/tenpy/tenpy) | 对 XYZ 自旋链运行 DMRG，计算能量、磁化、纠缠熵与收敛信息 |
| 变分参数学习 | [Flow-VQE](https://github.com/olsson-group/Flow-VQE) | 对 Pauli Hamiltonian 训练 flow 模型，以无矩阵计算学习低能量电路参数 |
| 变分激发态 | [OpenQARP](https://github.com/OpenQARP/openqarp) | 复数态 VQD、独立能量残差与正交性检查、可选精确能谱 |
| 量子核分类 | [cqlib-qml](https://github.com/cq-lib/cqlib-qml) | 五文件角度编码与 QSVM 适配，固定 Rust SDK，保留训练核 jitter、测试集与经典基线 |
| 对称性降比特 | [Symmer](https://github.com/qmatter-labs/symmer) | 在指定 Pauli 对称性扇区投影 Hamiltonian，返回降维 Pauli Hamiltonian，可选同扇区能谱对照 |
| 电路生成元代数 | [PauLie](https://github.com/QPauLie/PauLie) | Pauli 生成元的 Lie 分类、精确维数与可选闭包和矩阵检查，区分理想控制条件和硬件结论 |
| 组合优化 | [QPanda QUBO](https://github.com/OriginQ/pyqpanda-algorithm) | 将二值目标与线性等式约束编译为 QUBO，进行经典求解、枚举复核或可选本地 QAOA |

#### 误差缓解与量子纠错

| 科研任务 | 使用或适配的项目 | OpenQuantum 当前支持 |
| --- | --- | --- |
| 误差缓解 | [Mitiq](https://github.com/unitaryfoundation/mitiq) | 运行 ZNE、REM、PEC、CDR 本地噪声实验，比较相同采样预算下的误差与成本 |
| 表面码存储与解码 | [Stim](https://github.com/quantumlib/Stim) + [PyMatching](https://github.com/oscarhiggott/PyMatching) | Stim 生成并采样旋转表面码存储电路，PyMatching 做 MWPM 解码，统计逻辑错误率 |
| 矩形表面码实验建模 | [Deltakit](https://github.com/Deltakit/deltakit) | 构建矩形码片与 ToyNoise 含噪电路，运行 X / Z 存储实验并报告逻辑错误区间 |
| 二元校验矩阵解码 | [ldpc / BP+LSD](https://github.com/quantumgizmos/ldpc) | 对给定校验矩阵和 syndrome 做 BP+LSD 解码，独立复核 syndrome 一致性 |

#### 开放系统动力学

| 科研任务 | 使用或适配的项目 | OpenQuantum 当前支持 |
| --- | --- | --- |
| 马尔可夫动力学与灵敏度 | [Dynamiqs](https://github.com/dynamiqs/dynamiqs) | 求解受驱动耗散单量子位的 Lindblad 动力学，批量扫描驱动并计算末态人口梯度 |
| 非马尔可夫动力学 | [OQuPy](https://github.com/tempoCollaboration/OQuPy) | 用 TEMPO 求解 Ohmic spin-boson 模型，检查时间步长与环境记忆截断的影响 |
| 多体开放系统轨迹 | [MQT YAQS / TJM](https://github.com/munich-quantum-toolkit/yaqs) | 模拟开放 Ising 链的张量跳跃轨迹，可选与密度矩阵 Lindblad 演化比较 |

#### 实验模拟

| 科研任务 | 使用或适配的项目 | OpenQuantum 当前支持 |
| --- | --- | --- |
| 超导测控流程模拟 | [QMClaw](https://github.com/QMC-AI/QMClaw) | 适配其调校流程，本地生成 S21、Rabi、Ramsey、T₁ 等实验的合成数据 |
| 硬件约束与脉冲仿真 | [FatQat](https://github.com/spaceqat/fatqat) | 本地电路、超导原生门与原子阵列约束检查，以及三能级 transmon 和里德堡链的参考模型动力学 |

### 设备发现与量子云

[FieldQKit](https://github.com/FieldQuantum/fieldqkit) 提供国内量子云的凭据检查、只读设备发现、量子位筛选与拓扑查询。

[QDMI](https://github.com/Munich-Quantum-Software-Stack/QDMI) 提供本地 C 驱动设备查询接口；OpenQuantum 适配只读元数据查询，官方示例驱动用于本地接口验证。

IBM Quantum、IonQ 和本源量子是可连接的云服务。任务提交分别由 IBM Runtime、社区 Quantum Hardware 服务和 QPanda3 Runtime 等[任务接口](#可以连接哪些量子后端)提供，配置凭据并启用后可使用；FieldQKit 的当前接入范围是设备发现。

### 算法资料与公开基准

| 查询目的 | 来源项目 | OpenQuantum 当前提供 |
| --- | --- | --- |
| 查找算法说明与参考实现 | [Quantum-Practices](https://github.com/unitarylab/quantum-practices) | 本地检索 66 份固定版本算法指南，保留来源链接 |
| 查看设备历史基准 | [Metriq data](https://github.com/unitaryfoundation/metriq-data) | 查询 410 条去重历史记录，返回测试条件、原始指标、日期和来源，并保留模拟器标签 |

</details>

组件许可与再分发约束以 [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md) 和各目录 LICENSE / NOTICE 为准。
