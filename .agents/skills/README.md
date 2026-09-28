# OpenQuantum Skills

这个目录是 DeepSeek Harness 的项目 Skill 根。含有 `SKILL.md` 的一级子目录是可发现的 Skill，
该文件的 frontmatter 与正文是指令权威。面向使用者的[完整 Skill 与 MCP 服务目录](../../README.md#已集成的量子工具与能力)见项目首页。

## 运行规则

- Harness 只根据 `SKILL.md` frontmatter 和正文发现、加载 Skill；
- `references/`、`scripts/`、`inputs/`、`artifacts/`、`validators/` 和 `evals/` 是可选的共置科研资源；
- `mcp/` 即使位于 Skill 目录下，MCP Server 也必须由 OpenQuantum Agent Preset 中独立声明的 Harness MCP Client 连接；
- Validator 必须由 Tool、Materializer 或 CI 显式调用；若从 Harness hook 起步，hook 由可信 Host Plugin 拥有；
- 共置是为了让一条科研纵切保持 locality，不表示 Skill 拥有 MCP Server、Tool 或 Validator 生命周期。

## 当前 Skill

以下 154 个 Skill 随源码分发；它们与 MCP Server 不是一一对应关系，知识型 Skill 可以不绑定专用 Tool，
工作流也可以使用多个服务或进程内原生 Tool。连接默认配置与凭据条件见[项目首页](../../README.md#mcp-服务目录)。
当前 141 项可由模型自动选择，13 个分类索引仅保留用户显式调用；名称和来源映射不变。
分批建议与兼容影响见[扩展治理清单](../../docs/architecture/EXTENSION_GOVERNANCE.md)。

| Skill | 作用 | 依赖的执行模块 |
| --- | --- | --- |
| `platform-diagnostics` | UI、Harness、Skill 和 Model 四个职责面的平台诊断 | Harness Tool、诊断 Validator 与 eval evidence |
| `quantum-sdk-advisor` | 量子软件栈选型 | 无强制 Tool Provider |
| `qiskit-circuit-workbench` | QASM/QPY 电路分析和转译工作流 | Qiskit MCP Server + Harness MCP Client |
| `fieldqkit-hardware` | 国内量子云后端发现和凭据缺口解释 | FieldQKit 本地 MCP Server + Harness MCP Client；不改变云状态；显式准备 Python 环境，发现可能写 SDK 缓存 |
| `qdmi-device` | 已配置驱动的设备、门集与耦合只读查询 | QDMI 本地 MCP Server + Harness MCP Client；默认关闭，需显式准备驱动 |
| `qpanda-qubo` | QUBO 编译、可选经典参照与本地 QAOA | QPanda 本地 MCP Server + Harness MCP Client |
| `quantum-circuit-verification` | OpenQASM 2 电路等价性验证 | MQT QCEC 本地 MCP Server + Harness MCP Client |
| `qec-memory-experiment` | surface-code memory 采样与 MWPM 解码 | Stim/PyMatching 本地 MCP Server + Harness MCP Client |
| `tyxonq-workbench` | TyxonQ 电路与噪声仿真工作流 | TyxonQ 本地 MCP Server + Harness MCP Client；默认关闭 |
| `fatqat-workbench` | 电路与硬件约束、transmon 泄漏和里德堡动力学实验 | FatQat 本地 MCP Server + Harness MCP Client；返回数据、图表与物理单位 |
| `bloqade-analog` | 二维 Rydberg 阵列、时变全局脉冲与本地态演化 | `bloqade_local` MCP Server + Harness MCP Client |
| `mitiq-error-mitigation` | ZNE、REM、PEC、CDR 的本地噪声实验及相同采样预算统计 | Mitiq 本地 MCP Server + Harness MCP Client；能力目录 GPL-3.0-only |
| `dynamiqs-dynamics` | 单量子位动力学、批量扫描、梯度与独立参照 | Dynamiqs 本地 MCP Server + Harness MCP Client |
| `clifft-sampling` | Clifford+T 最终测量及 Stim 格式纠错记录采样 | Clifft 本地 MCP Server + Harness MCP Client |
| `qbraid-conversion` | Qiskit/Cirq 双向酉电路转换与可选完整矩阵对照 | qBraid 本地 MCP Server + Harness MCP Client |
| `pyzx-optimization` | ZX 重写、Clifford+T 门数比较与可选酉矩阵对照 | PyZX 本地 MCP Server + Harness MCP Client |
| `graphix-mbqc` | 电路到 MBQC 模式、资源图、自适应测量和纠正输出 | Graphix 本地 MCP Server + Harness MCP Client |
| `symmer-tapering` | 指定 Pauli 对称性扇区的降比特与同扇区保谱检查 | Symmer 本地 MCP Server + Harness MCP Client |
| `paulie-algebra` | Pauli 生成元的 Lie 代数分类、精确维数与可选闭包 | PauLie 本地 MCP Server + Harness MCP Client |
| `oqupy-dynamics` | Ohmic spin-boson TEMPO 与记忆截断解释 | OQuPy 本地 MCP Server + Harness MCP Client |
| `deltakit-qec` | 矩形纠错码片、实际含噪电路与逻辑错误统计 | Deltakit 本地 MCP Server + Harness MCP Client |
| `sqd-chemistry` | 分子活性空间 SQD 与可选 FCI 参照 | SQD 本地 MCP Server + Harness MCP Client |
| `tjm-dynamics` | 开放 Ising 链张量跳跃轨迹与 Lindblad 参照 | MQT YAQS 本地 MCP Server + Harness MCP Client |
| `ldpc-decoding` | 二元校验矩阵的 BP+LSD 解码与 syndrome 检查 | ldpc 本地 MCP Server + Harness MCP Client |
| `randomized-measurements` | 局域 Haar 测量与子区纯度估计 | RandomMeas.jl 本地 MCP Server + Harness MCP Client；需准备 Julia 1.12.7 环境 |
| `flow-vqe` | Pauli Hamiltonian 的 flow 参数学习与等预算随机搜索 | Flow-VQE 本地 MCP Server + Harness MCP Client |
| `tenpy-ground-state` | 有限 XYZ 链 DMRG 与精确对角化参照 | TeNPy 本地 MCP Server + Harness MCP Client |
| `qmclaw-workbench` | QMClaw 超导量子比特测控与单比特调校工作流 | 原生 Tool Provider；13 类实验的合成数据模拟，不启动 MCP Server |
| `quantum-information-audit` | 密度矩阵和 negativity 审计 | toqito MCP-exposed Tool + Validator + L3 物化/验收链 |
| `quantum-ground-state` | 二量子位固定权重一扇区的基态工作流 | 原生 Tool Provider + Validator + L3 物化/验收链；完整调用包含工作区证据写入 |
| `hamiltonian-simulation` | Trotter/qDrift 演化、电路资源与独立误差对照 | `hamiltonian_local` MCP Server + Harness MCP Client；显式 setup 后本地计算 |
| `qcut-knitting` | 门切割与期望值重建 | `qcut_local` MCP Server + Harness MCP Client；默认开启 |
| `compact-optimization` | 线路优化与独立等价对照 | `compact_local` MCP Server + Harness MCP Client；默认开启 |
| `openqarp-excited-states` | VQD 激发态、残差与正交性 | `openqarp_local` MCP Server + Harness MCP Client；默认开启 |
| `cqlib-kernel` | 角度编码核与 QSVM | `cqlib_kernel_local` MCP Server + Harness MCP Client；默认关闭 |
| `flagquantum-workbench` | 第二家量子 MCP 电路工作台 | `flagquantum` MCP Server + Harness MCP Client；默认关闭 |

<!-- BEGIN OPEN ALGORITHM SKILLS -->
### 开源算法与后端工作流

66 个适配 Skill 共用现有执行工具；49 个算法示例覆盖原库的 39 个模块和指南新增方法。13 个分类索引保留为手动导航，53 个方法与入口可由 Agent 自动选择。

| Skill | 作用 | 依赖的执行模块 |
| --- | --- | --- |
| [`quantum-guide-algorithms`](quantum-guide-algorithms/SKILL.md) | algorithms 分类、后端或迁移指引 | 手动分类导航；自动任务直接选择方法 Skill |
| [`quantum-guide-algorithms-cryptography`](quantum-guide-algorithms-cryptography/SKILL.md) | algorithms/cryptography 分类、后端或迁移指引 | 手动分类导航；自动任务直接选择方法 Skill |
| [`quantum-discrete-log`](quantum-discrete-log/SKILL.md) | 可逆 g^a y^b oracle、循环群 Fourier 采样与同余恢复 | 已有 Harness `bash` / `pwsh`；`discrete_log` 开源示例 |
| [`quantum-shor`](quantum-shor/SKILL.md) | 可逆模乘 oracle、QPE/连分数和因子验证 | 已有 Harness `bash` / `pwsh`；`shor` 开源示例 |
| [`quantum-simon`](quantum-simon/SKILL.md) | 二对一 XOR oracle、Hadamard 采样和 GF(2) 零空间恢复 | 已有 Harness `bash` / `pwsh`；`simon` 开源示例 |
| [`quantum-guide-algorithms-eigensolvers`](quantum-guide-algorithms-eigensolvers/SKILL.md) | algorithms/eigensolvers 分类、后端或迁移指引 | 手动分类导航；自动任务直接选择方法 Skill |
| [`quantum-numpy-minimum-eigensolver`](quantum-numpy-minimum-eigensolver/SKILL.md) | NumPy 最小本征对，明确标记经典算法并报告残差。 | 已有 Harness `bash` / `pwsh`；`numpy_minimum_eigensolver` 开源示例 |
| [`quantum-numpy-eigensolver`](quantum-numpy-eigensolver/SKILL.md) | NumPy Hermitian 稠密本征求解，明确标记经典算法并报告特征残差。 | 已有 Harness `bash` / `pwsh`；`numpy_eigensolver` 开源示例 |
| [`quantum-vqd`](quantum-vqd/SKILL.md) | 通过逐态重叠惩罚求激发态（VQD），报告能量与态间重叠 | 已有 Harness `bash` / `pwsh`；`vqd` 开源示例 |
| [`quantum-guide-algorithms-gradients`](quantum-guide-algorithms-gradients/SKILL.md) | algorithms/gradients 分类、后端或迁移指引 | 手动分类导航；自动任务直接选择方法 Skill |
| [`quantum-finite-difference`](quantum-finite-difference/SKILL.md) | Qiskit FiniteDiffEstimatorGradient，中心差分与显式 epsilon。 | 已有 Harness `bash` / `pwsh`；`finite_difference` 开源示例 |
| [`quantum-linear-combination`](quantum-linear-combination/SKILL.md) | Qiskit LinCombEstimatorGradient，实际生成线性组合导数电路。 | 已有 Harness `bash` / `pwsh`；`linear_combination` 开源示例 |
| [`quantum-parameter-shift`](quantum-parameter-shift/SKILL.md) | Qiskit ParamShiftEstimatorGradient，RY 参数移位规则。 | 已有 Harness `bash` / `pwsh`；`parameter_shift` 开源示例 |
| [`quantum-qfi`](quantum-qfi/SKILL.md) | Qiskit QFI/ReverseQGT，纯态量子 Fisher 信息 | 已有 Harness `bash` / `pwsh`；`qfi` 开源示例 |
| [`quantum-reverse`](quantum-reverse/SKILL.md) | Qiskit ReverseEstimatorGradient，反向态矢量导数。 | 已有 Harness `bash` / `pwsh`；`reverse` 开源示例 |
| [`quantum-spsa`](quantum-spsa/SKILL.md) | Qiskit SPSAEstimatorGradient，显式 epsilon、批量与随机种子 | 已有 Harness `bash` / `pwsh`；`spsa` 开源示例 |
| [`quantum-guide-algorithms-hamiltonian-simulation`](quantum-guide-algorithms-hamiltonian-simulation/SKILL.md) | algorithms/hamiltonian-simulation 分类、后端或迁移指引 | 手动分类导航；自动任务直接选择方法 Skill |
| [`quantum-cartan`](quantum-cartan/SKILL.md) | 实对称 Hamiltonian 的 SO(N) 谱 Cartan 分解 | 已有 Harness `bash` / `pwsh`；`cartan` 开源示例 |
| [`quantum-qdrift`](quantum-qdrift/SKILL.md) | 使用 Qiskit 的显式量子电路，保留输入、方法参数、实际概率或态矢量 | 已有 Harness `bash` / `pwsh`；`qdrift` 开源示例 |
| [`quantum-hamiltonian-qsp`](quantum-hamiltonian-qsp/SKILL.md) | 偶/奇 QSP 多项式通过 LCU 合成 exp(-iHt) | 已有 Harness `bash` / `pwsh`；`hamiltonian_qsp` 开源示例 |
| [`quantum-taylor`](quantum-taylor/SKILL.md) | 截断 Taylor 级数展开为 Pauli LCU，实际执行 PREPARE/SELECT/unprepare 并报告后选择概率 | 已有 Harness `bash` / `pwsh`；`taylor` 开源示例 |
| [`quantum-trotter`](quantum-trotter/SKILL.md) | 使用 Qiskit 的显式量子电路，保留输入、方法参数、实际概率或态矢量 | 已有 Harness `bash` / `pwsh`；`trotter` 开源示例 |
| [`quantum-guide-algorithms-linear-systems`](quantum-guide-algorithms-linear-systems/SKILL.md) | algorithms/linear-systems 分类、后端或迁移指引 | 手动分类导航；自动任务直接选择方法 Skill |
| [`quantum-aqc`](quantum-aqc/SKILL.md) | 正定 Hermitian 系统的绝热线性求解路径、条件数相关 schedule 与分片幺正演化 | 已有 Harness `bash` / `pwsh`；`aqc` 开源示例 |
| [`quantum-hhl`](quantum-hhl/SKILL.md) | Hermitian 非奇异 A、QPE、有符号倒数旋转、反 QPE 与后选择 | 已有 Harness `bash` / `pwsh`；`hhl` 开源示例 |
| [`quantum-lcu`](quantum-lcu/SKILL.md) | 使用 Qiskit 的显式量子电路，保留输入、方法参数、实际概率或态矢量 | 已有 Harness `bash` / `pwsh`；`lcu` 开源示例 |
| [`quantum-qsvt-qlsa`](quantum-qsvt-qlsa/SKILL.md) | Hermitian 非奇异矩阵，PennyLane QSVT 和受控 U/U† 后选择 | 已有 Harness `bash` / `pwsh`；`qsvt_qlsa` 开源示例 |
| [`quantum-qft`](quantum-qft/SKILL.md) | 使用 Qiskit 的显式量子电路，保留输入、方法参数、实际概率或态矢量 | 已有 Harness `bash` / `pwsh`；`qft` 开源示例 |
| [`quantum-qsp`](quantum-qsp/SKILL.md) | QSP/QSVT 相位综合计算 cos(t x) 的有界偶次多项式 | 已有 Harness `bash` / `pwsh`；`qsp` 开源示例 |
| [`quantum-vqls`](quantum-vqls/SKILL.md) | Qiskit 参数电路与全局归一化残差 cost 的变分线性求解 | 已有 Harness `bash` / `pwsh`；`vqls` 开源示例 |
| [`quantum-guide-algorithms-primitives`](quantum-guide-algorithms-primitives/SKILL.md) | algorithms/primitives 分类、后端或迁移指引 | 手动分类导航；自动任务直接选择方法 Skill |
| [`quantum-amplitude-amplification`](quantum-amplitude-amplification/SKILL.md) | 使用 Qiskit 的显式量子电路，保留输入、方法参数、实际概率或态矢量 | 已有 Harness `bash` / `pwsh`；`amplitude_amplification` 开源示例 |
| [`quantum-amplitude-estimation`](quantum-amplitude-estimation/SKILL.md) | 使用 Qiskit 的显式量子电路，保留输入、方法参数、实际概率或态矢量 | 已有 Harness `bash` / `pwsh`；`amplitude_estimation` 开源示例 |
| [`quantum-grover`](quantum-grover/SKILL.md) | 使用 Qiskit 的显式量子电路，保留输入、方法参数、实际概率或态矢量 | 已有 Harness `bash` / `pwsh`；`grover` 开源示例 |
| [`quantum-hadamard-test`](quantum-hadamard-test/SKILL.md) | 使用 Qiskit 的显式量子电路，保留输入、方法参数、实际概率或态矢量 | 已有 Harness `bash` / `pwsh`；`hadamard_test` 开源示例 |
| [`quantum-hadamard-transform`](quantum-hadamard-transform/SKILL.md) | 使用 Qiskit 的显式量子电路，保留输入、方法参数、实际概率或态矢量 | 已有 Harness `bash` / `pwsh`；`hadamard_transform` 开源示例 |
| [`quantum-qpe`](quantum-qpe/SKILL.md) | 使用 Qiskit 的显式量子电路，保留输入、方法参数、实际概率或态矢量 | 已有 Harness `bash` / `pwsh`；`qpe` 开源示例 |
| [`quantum-guide-algorithms-quantum-chemistry`](quantum-guide-algorithms-quantum-chemistry/SKILL.md) | algorithms/quantum-chemistry 分类、后端或迁移指引 | 手动分类导航；自动任务直接选择方法 Skill |
| [`quantum-molecular-dmrg`](quantum-molecular-dmrg/SKILL.md) | PySCF 活性空间积分、Jordan-Wigner MPO 与 quimb 双站点 DMRG。使用开源态制备替换闭源 CVD | 已有 Harness `bash` / `pwsh`；`molecular_dmrg` 开源示例 |
| [`quantum-qldpc`](quantum-qldpc/SKILL.md) | HGP CSS 校验矩阵、GF(2) 秩、交换关系和 syndrome | 已有 Harness `bash` / `pwsh`；`qldpc` 开源示例 |
| [`quantum-guide-algorithms-quantum-machine-learning`](quantum-guide-algorithms-quantum-machine-learning/SKILL.md) | algorithms/quantum-machine-learning 分类、后端或迁移指引 | 手动分类导航；自动任务直接选择方法 Skill |
| [`quantum-cvqnn`](quantum-cvqnn/SKILL.md) | 两模有限 Fock 空间的位移、压缩、旋转、Kerr 和分束器层 | 已有 Harness `bash` / `pwsh`；`cvqnn` 开源示例 |
| [`quantum-fermi-hubbard-vqe`](quantum-fermi-hubbard-vqe/SKILL.md) | 开放边界 Hubbard 链，Jordan-Wigner 与全 Fock 空间 VQE | 已有 Harness `bash` / `pwsh`；`fermi_hubbard_vqe` 开源示例 |
| [`quantum-ising`](quantum-ising/SKILL.md) | 开放边界二维矩形 Ising 网格，quimb MPS 与二阶 Strang 演化 | 已有 Harness `bash` / `pwsh`；`ising` 开源示例 |
| [`quantum-qaoa`](quantum-qaoa/SKILL.md) | 无权 MaxCut 的交替 cost/mixer 电路与参数优化 | 已有 Harness `bash` / `pwsh`；`qaoa` 开源示例 |
| [`quantum-qcbm`](quantum-qcbm/SKILL.md) | 参数电路 Born 分布拟合目标概率，KL 目标与 total variation 对照。 | 已有 Harness `bash` / `pwsh`；`qcbm` 开源示例 |
| [`quantum-vqc`](quantum-vqc/SKILL.md) | RY 特征编码与参数电路二分类 | 已有 Harness `bash` / `pwsh`；`vqc` 开源示例 |
| [`quantum-vqe`](quantum-vqe/SKILL.md) | 实 Pauli Hamiltonian、RY/RZ/CX ansatz 和 SciPy 优化 | 已有 Harness `bash` / `pwsh`；`vqe` 开源示例 |
| [`quantum-guide-algorithms-schrodingerization`](quantum-guide-algorithms-schrodingerization/SKILL.md) | algorithms/schrodingerization 分类、后端或迁移指引 | 手动分类导航；自动任务直接选择方法 Skill |
| [`quantum-advection`](quantum-advection/SKILL.md) | 周期边界、常速一维平流，中心差分和显式薛定谔化电路 | 已有 Harness `bash` / `pwsh`；`advection` 开源示例 |
| [`quantum-heat-1d`](quantum-heat-1d/SKILL.md) | 齐次一维热方程，周期或零 Dirichlet 边界 | 已有 Harness `bash` / `pwsh`；`heat_1d` 开源示例 |
| [`quantum-heat-2d`](quantum-heat-2d/SKILL.md) | 齐次二维方形网格热方程，周期或零 Dirichlet 边界 | 已有 Harness `bash` / `pwsh`；`heat_2d` 开源示例 |
| [`quantum-guide-algorithms-search`](quantum-guide-algorithms-search/SKILL.md) | algorithms/search 分类、后端或迁移指引 | 手动分类导航；自动任务直接选择方法 Skill |
| [`quantum-glued-trees`](quantum-glued-trees/SKILL.md) | 随机交替叶环连接的双树连续时间邻接矩阵量子行走 | 已有 Harness `bash` / `pwsh`；`glued_trees` 开源示例 |
| [`quantum-hidden-shift`](quantum-hidden-shift/SKILL.md) | 偶数位二次 bent 函数的 shifted/dual 相位 oracle | 已有 Harness `bash` / `pwsh`；`hidden_shift` 开源示例 |
| [`quantum-guide-algorithms-state-preparation`](quantum-guide-algorithms-state-preparation/SKILL.md) | algorithms/state-preparation 分类、后端或迁移指引 | 手动分类导航；自动任务直接选择方法 Skill |
| [`quantum-mottonen`](quantum-mottonen/SKILL.md) | PennyLane Möttönen 均匀受控旋转态制备 | 已有 Harness `bash` / `pwsh`；`mottonen` 开源示例 |
| [`quantum-mps`](quantum-mps/SKILL.md) | SVD 分解、可选键截断、显式右规范化与 PennyLane MPSPrep | 已有 Harness `bash` / `pwsh`；`mps` 开源示例 |
| [`quantum-multiplexer`](quantum-multiplexer/SKILL.md) | Qiskit StatePreparation/Isometry 的均匀受控门合成 | 已有 Harness `bash` / `pwsh`；`multiplexer` 开源示例 |
| [`quantum-pauli`](quantum-pauli/SKILL.md) | PennyLane ArbitraryStatePreparation 的 Pauli 旋转优化 | 已有 Harness `bash` / `pwsh`；`pauli` 开源示例 |
| [`quantum-superposition`](quantum-superposition/SKILL.md) | PennyLane Superposition 的计算基叠加与辅助位清零 | 已有 Harness `bash` / `pwsh`；`superposition` 开源示例 |
| [`quantum-algorithms`](quantum-algorithms/SKILL.md) | root 分类、后端或迁移指引 | 按任务组合已有 Skill 和通用 Tool |
| [`quantum-guide-simulators`](quantum-guide-simulators/SKILL.md) | simulators 分类、后端或迁移指引 | 手动分类导航；自动任务直接选择方法 Skill |
| [`quantum-guide-simulators-pennylane`](quantum-guide-simulators-pennylane/SKILL.md) | simulators/pennylane 分类、后端或迁移指引 | 按任务组合已有 Skill 和通用 Tool |
| [`quantum-guide-simulators-qiskit`](quantum-guide-simulators-qiskit/SKILL.md) | simulators/qiskit 分类、后端或迁移指引 | 按任务组合已有 Skill 和通用 Tool |
| [`quantum-guide-simulators-unitarylab`](quantum-guide-simulators-unitarylab/SKILL.md) | simulators/unitarylab 分类、后端或迁移指引 | 按任务组合已有 Skill 和通用 Tool |
<!-- END OPEN ALGORITHM SKILLS -->

可选的上游 `pyqpanda3` Skill 需要通过 `npm run skill:qpanda:setup` 单独安装，不计入上述内置清单；
安装 Skill 不会自动启用本源量子云任务服务。安装来源与边界见[可选上游 Skill](../../README.md#可选上游-skill-与开发证据)。

新增或修改 Skill 前先读[文档与架构入口](../../docs/README.md)和[贡献指南](../../CONTRIBUTING.md)。
发行版当前 Skill 清单与 L0–L3 证据等级以 [`.agents/capability-packages.yml`](../capability-packages.yml) 为机器权威。

### 厂商 SDK 专业能力

以下 17 项均有独立 Skill 与 Python MCP Server，由 Harness MCP Client 注册 Tool；QoolQit 与 Superstaq 默认关闭。具体范围见[厂商 SDK 接入](../../docs/integrations/VENDOR_SDKS.md)。

| Skill | 作用 | 依赖的执行模块 |
| --- | --- | --- |
| [`pennylane-differentiable`](pennylane-differentiable/SKILL.md) | 用户电路的概率、Pauli 期望值和参数梯度。 | `pennylane_local` |
| [`deepquantum-differentiable`](deepquantum-differentiable/SKILL.md) | 基于 PyTorch 的电路概率、期望值和参数梯度。 | `deepquantum_local` |
| [`tensorcircuit-differentiable`](tensorcircuit-differentiable/SKILL.md) | 张量网络电路的概率、期望值和参数梯度。 | `tensorcircuit_local` |
| [`mindquantum-differentiable`](mindquantum-differentiable/SKILL.md) | 本地电路模拟、Pauli 期望值和参数梯度。 | `mindquantum_local` |
| [`pytket-compilation`](pytket-compilation/SKILL.md) | 本地电路优化、门数比较与 OpenQASM 导出。 | `pytket_local` |
| [`ocean-optimization`](ocean-optimization/SKILL.md) | 二值二次模型的本地穷举或模拟退火；不是量子退火硬件执行。 | `ocean_local` |
| [`kaiwu-qubo`](kaiwu-qubo/SKILL.md) | 社区版符号 QUBO、约束罚项和 Ising 转换；不使用企业版或真机。 | `kaiwu_local` |
| [`pyquil-simulation`](pyquil-simulation/SKILL.md) | 本地 Quil 电路模拟，不提交 Rigetti 云作业。 | `pyquil_local` |
| [`spinqit-simulation`](spinqit-simulation/SKILL.md) | 量旋 SDK 的本地电路模拟，不连接设备。 | `spinqit_local` |
| [`qutrunk-simulation`](qutrunk-simulation/SKILL.md) | 启科 SDK 的本地电路模拟，不连接设备。 | `qutrunk_local` |
| [`perceval-photonics`](perceval-photonics/SKILL.md) | 用户 Fock 输入、分束器和移相网络的本地光子分布。 | `perceval_local` |
| [`iqm-circuit-workbench`](iqm-circuit-workbench/SKILL.md) | IQM 原生门转译与本地模拟，不连接真实设备。 | `iqm_local` |
| [`alicebob-cat-circuits`](alicebob-cat-circuits/SKILL.md) | 官方本地猫态量子比特模型与电路仿真。 | `alicebob_local` |
| [`pulser-dynamics`](pulser-dynamics/SKILL.md) | Pasqal 全局脉冲、Rydberg 阵列与本地动力学。 | `pulser_local` |
| [`qoolqit-workbench`](qoolqit-workbench/SKILL.md) | 无量纲 Rydberg 程序编译与本地计算；需审阅上游定制许可证。 | `qoolqit_local` |
| [`ionq-programs`](ionq-programs/SKILL.md) | 使用官方 SDK 将结构化电路转换为 IonQ QIS 程序；不提交云任务。 | `ionq_local` |
| [`superstaq-compilation`](superstaq-compilation/SKILL.md) | 本地程序序列化和可选远程编译；远程操作外发电路，需要账户，不执行 QPU 任务。 | `superstaq_cloud` |

### 公司与机构 SDK 补充（2026-09-28）

| Skill | 作用 | 依赖的执行模块 |
| --- | --- | --- |
| [`qsteed-compilation`](qsteed-compilation/SKILL.md) | PyQuafu 电路编译到指定门集，保留全局相位与线路，不连接资源数据库。 | `qsteed_local` |
| [`quairkit-information`](quairkit-information/SKILL.md) | CPU 密度矩阵电路与去极化、振幅阻尼、相位阻尼通道。 | `quairkit_local` |
| [`qcompute-simulation`](qcompute-simulation/SKILL.md) | 使用百度 QCompute 本地模拟器计算电路概率。 | `qcompute_local` |
| [`qibo-simulation`](qibo-simulation/SKILL.md) | 使用明确选定的 NumPy CPU 后端计算态矢量。 | `qibo_local` |
| [`qrisp-arithmetic`](qrisp-arithmetic/SKILL.md) | 本地 QuantumFloat 无符号模加法；需考虑 EPL-2.0 许可。 | `qrisp_local` |
| [`lightworks-photonics`](lightworks-photonics/SKILL.md) | 本地线性光学网络与 Fock 输入的输出概率。 | `lightworks_local` |
| [`braket-simulation`](braket-simulation/SKILL.md) | 显式 LocalSimulator 电路振幅与概率，不创建 AWS 云任务。 | `braket_local` |
| [`quri-parts-estimation`](quri-parts-estimation/SKILL.md) | QURI Parts 电路与 Qulacs 本地 Pauli 期望值。 | `quri_parts_local` |
| [`qdk-resource-estimation`](qdk-resource-estimation/SKILL.md) | 由电路和硬件假设估算物理量子位与运行时间。 | `qdk_local` |
| [`qualtran-resources`](qualtran-resources/SKILL.md) | 算术 Bloq 的容错门资源；实验性 API，保留计数假设。 | `qualtran_local` |
| [`openfermion-mapping`](openfermion-mapping/SKILL.md) | 结构化费米算符到 Jordan-Wigner 或 Bravyi-Kitaev Pauli 项。 | `openfermion_local` |
| [`mqt-ddsim`](mqt-ddsim/SKILL.md) | 使用决策图模拟电路，返回指定计算基态概率。 | `mqt_ddsim_local` |
| [`mqt-qmap`](mqt-qmap/SKILL.md) | 将电路映射到耦合图，返回物理线路及逻辑输入、输出映射。 | `mqt_qmap_local` |
| [`classiq-synthesis`](classiq-synthesis/SKILL.md) | 本地模型准备及可选云端综合；用户自行配置 Token 和服务权限。 | `classiq_cloud` |
| [`qctrl-workbench`](qctrl-workbench/SKILL.md) | 本地 Boulder Opal 控制图与已有 Boulder/Fire Opal 作业状态查询。 | `qctrl_cloud` |
| [`qua-programs`](qua-programs/SKILL.md) | 本地生成 OPX 脉冲程序与配置，不连接 QOP 服务。 | `qua_local` |
| [`laboneq-control`](laboneq-control/SKILL.md) | 离线脉冲编译与 HDAWG 输出波形仿真，不执行设备程序。 | `laboneq_local` |
| [`qcarchive-query`](qcarchive-query/SKILL.md) | 只读查询既有单点记录，返回分子、原子单位能量和计算来源。 | `qcarchive_data` |
| [`cudaq-simulation`](cudaq-simulation/SKILL.md) | 固定 qpp-cpu 后端的精确概率与采样；Linux 或 Apple Silicon macOS。 | `cudaq_local` |
| [`netqasm-network`](netqasm-network/SKILL.md) | 本地双节点 EPR 程序编译；仿真需用户自行准备有许可的 NetSquid 环境。 | `netqasm_local` |

### 网络、控制、光学与云 SDK 补充（2026-09-28）

| Skill | 作用 | 依赖的执行模块 |
| --- | --- | --- |
| [`simqn-network`](simqn-network/SKILL.md) | SimQN 单链路的离散事件、随机损失与 Werner 衰减。 | `simqn_local` MCP Server + Harness MCP Client |
| [`qcover-optimization`](qcover-optimization/SKILL.md) | Qcover 按图分解评估给定 QAOA 参数的能量与相关量。 | `qcover_local` MCP Server + Harness MCP Client |
| [`vqnet-learning`](vqnet-learning/SKILL.md) | VQNet CPU 电路期望、概率与每个旋转参数的自动微分。 | `vqnet_local` MCP Server + Harness MCP Client |
| [`pychemiq-chemistry`](pychemiq-chemistry/SKILL.md) | pyChemiQ 费米算符到 Jordan–Wigner Pauli 项，保留微小系数。 | `pychemiq_local` MCP Server + Harness MCP Client |
| [`qblox-scheduling`](qblox-scheduling/SKILL.md) | Qblox 方波排程和波形采样，不连接 HardwareAgent。 | `qblox_local` MCP Server + Harness MCP Client |
| [`qililab-control`](qililab-control/SKILL.md) | Qililab 将 I/Q 方波离线编译到 Qblox Q1ASM。 | `qililab_local` MCP Server + Harness MCP Client |
| [`guppy-programs`](guppy-programs/SKILL.md) | Guppy/Selene 的中途测量、复位和经典条件反馈仿真。 | `guppy_local` MCP Server + Harness MCP Client |
| [`oqc-qat`](oqc-qat/SKILL.md) | QAT 脉冲时序与复基带波形，不执行后端测量。 | `qat_local` MCP Server + Harness MCP Client |
| [`mrmustard-optics`](mrmustard-optics/SKILL.md) | MrMustard 高斯光学矩和截断 Fock 概率；上游已归档。 | `mrmustard_local` MCP Server + Harness MCP Client |
| [`merlin-learning`](merlin-learning/SKILL.md) | MerLin 完整 Fock 概率、批量推断与相移梯度。 | `merlin_local` MCP Server + Harness MCP Client |
| [`mimiq-simulation`](mimiq-simulation/SKILL.md) | MIMIQ Exaqt 本地态矢量和种子采样。 | `mimiq_local` MCP Server + Harness MCP Client |
| [`myqlm-simulation`](myqlm-simulation/SKILL.md) | myQLM PyLinalg 本地理想电路仿真。 | `myqlm_local` MCP Server + Harness MCP Client |
| [`aqt-workbench`](aqt-workbench/SKILL.md) | AQT 原生门编译、离线采样与可选设备查询。 | `aqt_local` MCP Server + Harness MCP Client |
| [`oqc-cloud`](oqc-cloud/SKILL.md) | OQC 本地任务准备、查询及显式单次云提交。 | `oqc_cloud` MCP Server + Harness MCP Client |
| [`quantuminspire-cloud`](quantuminspire-cloud/SKILL.md) | Quantum Inspire 分页设备类型与既有任务状态查询。 | `quantuminspire_cloud` MCP Server + Harness MCP Client |
