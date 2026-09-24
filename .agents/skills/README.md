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

以下 101 个 Skill 随源码分发；它们与 MCP Server 不是一一对应关系，知识型 Skill 可以不绑定专用 Tool，
工作流也可以使用多个服务或进程内原生 Tool。连接默认配置与凭据条件见[项目首页](../../README.md#mcp-服务目录)。
当前 88 项可由模型自动选择，13 个分类索引仅保留用户显式调用；名称和来源映射不变。
分批建议与兼容影响见[扩展治理清单](../../docs/architecture/EXTENSION_GOVERNANCE.md)。

| Skill | 作用 | 依赖的执行模块 |
| --- | --- | --- |
| `platform-diagnostics` | UI、Harness、Skill 和 Model 四个职责面的平台诊断 | Harness Tool、诊断 Validator 与 eval evidence |
| `quantum-sdk-advisor` | 量子软件栈选型 | 无强制 Tool Provider |
| `qiskit-circuit-workbench` | QASM/QPY 电路分析和转译工作流 | Qiskit MCP Server + Harness MCP Client |
| `fieldqkit-hardware` | 国内量子云后端发现和凭据缺口解释 | FieldQKit 本地 MCP Server + Harness MCP Client；云端只读，首次发现可写本地 Python 环境 |
| `qdmi-device` | 已配置驱动的设备、门集与耦合只读查询 | QDMI 本地 MCP Server + Harness MCP Client；默认关闭，需显式准备驱动 |
| `qpanda-qubo` | QUBO 编译、可选经典参照与本地 QAOA | QPanda 本地 MCP Server + Harness MCP Client |
| `quantum-circuit-verification` | OpenQASM 2 电路等价性验证 | MQT QCEC 本地 MCP Server + Harness MCP Client |
| `qec-memory-experiment` | surface-code memory 采样与 MWPM 解码 | Stim/PyMatching 本地 MCP Server + Harness MCP Client |
| `tyxonq-workbench` | TyxonQ 电路与噪声仿真工作流 | TyxonQ 本地 MCP Server + Harness MCP Client；默认关闭 |
| `fatqat-workbench` | 电路与硬件约束、transmon 泄漏和里德堡动力学实验 | FatQat 本地 MCP Server + Harness MCP Client；返回数据、图表与物理单位 |
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
