# SDK 接入清单（生成文件）

由 `node scripts/audit-sdk-integration.mjs` 从 capability policy、SDK 导航、项目 manifest 和依赖锁生成；用 `--check` 检查是否过期。

本表覆盖 114 个 SDK/源码环境入口：104 个 Python（包含算法共享环境）、7 个 Julia、2 个原生源码或 ABI 入口、1 个 Lean 项目。原生 QDMI 另有 Python 桥接依赖项目。一个入口可包含多个库，同一个库也可能有多个隔离版本，不能把入口数量当成独立 SDK 数量。所有锁摘要与间接依赖版本可通过 `node scripts/sdk-access.mjs inventory` 读出。

**接入状态：原生路径与指南已提供；逐 API、可选依赖、平台与外部服务验证不由这张静态清单推断。** 环境是否准备需 `inspect`，实际执行证据见[完整接入记录](FULL_SDK_ACCESS.md)。

| 环境 ID | 库 / 源码 | 语言 | 直接依赖（锁定版本另见 inventory） | 原生任务对象（非白名单） | 已知条件与缺口 |
| --- | --- | --- | --- | --- | --- |
| `alicebob-cat-circuits` | Alice & Bob Qiskit Provider | python | qiskit-alice-bob-provider==1.3.0 | 自定义电路、cat 噪声参数、本地 provider 与远程 provider | 按固定版本、已安装可选组件及目标平台核实 |
| `aqt-workbench` | AQT Provider | python | qiskit-aqt-provider==1.15.0 | 本地与远程 provider、电路、设备模型与 job | 本地程序构建与外部调用分开；账户、凭据、费用、设备操作和数据外发沿用宿主及用户授权。原生 SDK 访问不自动启用服务。 |
| `arc-rydberg` | ARC Rydberg | python | ARC-Alkali-Rydberg-Calculator==3.10.2 | 原子、能级、跃迁矩阵元、寿命、Stark 图与相互作用 | 记录原子物种、量子数、数据表、温度、截断与单位。能量 eV、矩阵元原子单位和 SI 的换算要按实际 API 核对。 |
| `bloqade-analog` | Bloqade Analog | python | bloqade-analog==0.16.9, numpy==2.4.2 | 任意原子布局、波形、局部/全局驱动、程序构建与模拟 | 按固定版本、已安装可选组件及目标平台核实 |
| `braket-simulation` | Amazon Braket | python | amazon-braket-sdk==1.127.2 | 电路、模拟器、AHS、噪声、设备、task/batch 与参数化程序 | 本地程序构建与外部调用分开；账户、凭据、费用、设备操作和数据外发沿用宿主及用户授权。原生 SDK 访问不自动启用服务。 |
| `catalyst-compilation` | PennyLane Catalyst | python | pennylane-catalyst==0.15.0 | qjit、混合程序、QNode、控制流、编译配置与梯度 | 固定兼容的 PennyLane/JAX/编译栈。区分首次编译与后续执行耗时，缓存与静态参数进入记录；experimental API 不承诺跨版本兼容。 |
| `chromobius-decoding` | Chromobius | python | chromobius==1.1.1, stim==1.16.0, numpy==2.5.3 | 带颜色和基标注的 Stim DEM、bit-packed detector 样本与逻辑 observable 解码 | 固定 Chromobius 1.1.1；DEM 必须满足颜色/基坐标及上游可解码条件。Möbius 解码为近似方法；小例回归不代表阈值、实时延迟或科学验收。 |
| `classiq-synthesis` | Classiq | python | httpx[socks]==0.28.1, classiq==1.29.1 | Qmod、自定义模型、综合约束、执行与结果接口 | 本地程序构建与外部调用分开；账户、凭据、费用、设备操作和数据外发沿用宿主及用户授权。原生 SDK 访问不自动启用服务。 |
| `clifft-sampling` | Clifft / Stim | python | clifft==0.10.1, stim==1.16.0 | 自定义电路、噪声模型、测量与采样程序 | 按固定版本、已安装可选组件及目标平台核实 |
| `compact-optimization` | CompactQ | python | compactq==0.2.3, qiskit==2.5.2, numpy==2.4.6 | 自定义电路、编译优化策略与结果检查 | 按固定版本、已安装可选组件及目标平台核实 |
| `cqlib-kernel` | CQLib | python | cqlib @ git+https://github.com/cq-lib/cqlib.git@759a7bbef4d47af70fe7e0455876b633080257a4#subdirectory=crates/binding-python, numpy==2.4.6, scikit-learn==1.9.1, cqlib-qml @ git+https://github.com/cq-lib/cqlib-qml.git@4576a575727b93fd300dbee6dc4cb7ab2a93dac1, torch==2.11.0, torchvision==0.26.0 | 上游计算内核、编码器、量子核、学习算法与用户数据 | 固定兼容的 CQLib 2.0.0b4 与完整 cqlib-qml Git 包；两者仍属上游预发布接口。原生 API 使用已安装 QML 包，不能把 Skill/upstream 的旧裁剪适配目录加到 sys.path。便捷 Tool 保留旧 angle-kernel 适配及独立回归。 |
| `cudaq-simulation` | CUDA-Q | python | cuda-quantum-cu13==0.16.0 | 任意 kernel、控制流、observe/sample、噪声、target 与并行 | 已固定版本要求 Linux 或 Apple Silicon macOS；GPU target 取决于驱动、硬件和上游支持。 |
| `deepquantum-differentiable` | DeepQuantum | python | deepquantum==4.5.0, torch==2.11.0 | 自定义 qubit/光学电路、噪声、测量、编码与训练 | 按固定版本、已安装可选组件及目标平台核实 |
| `deltakit-qec` | Deltakit | python | deltakit==0.10.0, stim==1.16.0, pymatching==2.4.0 | 自定义码、电路、噪声、QPU 模型、采样与译码 | 按固定版本、已安装可选组件及目标平台核实 |
| `dynamiqs-dynamics` | Dynamiqs | python | dynamiqs, jax==0.6.2, diffrax==0.7.0 | 任意维数与复合系统、时变算符、sesolve、mesolve、批处理与自动微分 | 显式选择 JAX 数值精度和 target；需要 float64 时在建立数组前启用 jax_enable_x64。CPU、GPU 选择按任务与已安装后端决定。 |
| `emlint-dem-audit` | emlint | python | emlint==0.2.4, stim==1.16.0 | Stim DEM 结构诊断、反例、profile 上下文和不完整检查披露 | 固定 emlint 0.2.4；beta 结构诊断不证明电路或解码正确。保留 warning、skipped、inconclusive、vacuous 与输入失败，不自动修模型。 |
| `fatqat-workbench` | FatQat / QuTiP | python | fatqat @ git+https://github.com/spaceqat/fatqat.git@39b75e30ae50ddb4a8c7b840847edce678aa814c | 量子系统、原生门、任意 Qobj、Hamiltonian、时变驱动、耗散与观测量 | 按固定版本、已安装可选组件及目标平台核实 |
| `fieldqkit-hardware` | FieldQKit | python | fieldqkit @ git+https://github.com/FieldQuantum/fieldqkit.git@3ef2493d3f840b6a924af66a0c3f1b79cfce3fa0 | QuantumHardwareClient、provider runtime 与供应商后端协议 | 本地程序构建与外部调用分开；账户、凭据、费用、设备操作和数据外发沿用宿主及用户授权。原生 SDK 访问不自动启用服务。 |
| `flagquantum-workbench` | FlagQuantum | python | flagquantum-mcp-server==0.3.0, flagquantum==0.2.0 | Circuit、序列化、门、拓扑、路由、训练与后端 | 按固定版本、已安装可选组件及目标平台核实 |
| `flow-vqe` | Flow-VQE source / Torch / Zuko | python | torch==2.6.0, torchaudio==2.6.0, torchvision==0.21.0, zuko==1.4.0, numpy==1.26.4, pennylane==0.40.0, pennylane-lightning==0.40.0, autoray==0.7.2, scipy==1.17.1, matplotlib==3.10.1, h5py==3.13.0, pandas==2.2.3, pyscf==2.8.0, openfermion==1.7.0, openfermionpyscf==0.5, tqdm==4.67.1, seaborn==0.13.2, basis-set-exchange | 自定义 objective、分布、flow、训练数据与优化循环 | 完整 SDK setup 另取固定版本上游源码，论文程序的预置 CLI 不限制用户用公开函数自定义任务。旧 upstream/ 仅供原有便捷 Tool 的稳定实现。 SciPy 固定为 1.17.1，以避开原 1.15.2 PROPACK 扩展在当前 macOS 的加载失败；这是记录在依赖锁中的兼容性调整。 |
| `graphix-mbqc` | Graphix | python | graphix==0.4.1, numpy==2.4.6 | 自定义 pattern、测量平面、依赖、标准化、优化与模拟 | 按固定版本、已安装可选组件及目标平台核实 |
| `guppy-programs` | Guppy / Selene | python | guppylang==1.1.1, selene-sim==0.3.2 | 任意 Guppy 程序、控制流、编译、模拟与结果处理 | 按固定版本、已安装可选组件及目标平台核实 |
| `hamiltonian-simulation` | Qiskit | python | qiskit==2.5.2, numpy==2.5.3, scipy==1.18.1 | QuantumCircuit、自定义指令、Hamiltonian、演化合成与量子信息对象 | 按固定版本、已安装可选组件及目标平台核实 |
| `ionq-programs` | Qiskit IonQ | python | qiskit-ionq==1.1.1, qiskit==2.5.2 | 原生门、电路转换、provider、backend 与 job API | 本地程序构建与外部调用分开；账户、凭据、费用、设备操作和数据外发沿用宿主及用户授权。原生 SDK 访问不自动启用服务。 |
| `iqm-circuit-workbench` | IQM Client / Qiskit IQM | python | iqm-client[qiskit]==35.0.3 | 电路验证、动态架构、fake backends、转译与远程客户端 | 本地程序构建与外部调用分开；账户、凭据、费用、设备操作和数据外发沿用宿主及用户授权。原生 SDK 访问不自动启用服务。 |
| `jaxquantum-modeling` | jaxquantum | python | jaxquantum==0.3.0 | JAX 算符、器件与 bosonic 模型、动力学、扫描与梯度 | 在建立数组前选择精度和 target，保留时间/频率/算符单位。具体器件类按固定版本核实；CPU、GPU/TPU 与硬件结果分开。 |
| `josephson-circuits` | JosephsonCircuits.jl | julia | JSON3, JosephsonCircuits | Josephson 元件、电路、频域谐波平衡、散射与噪声 | 明确节点/端口、元件 SI 单位、Hz 与 rad/s、泵浦和谐波截断。检查线性极限及收敛，不将模型噪声效率当作测量。 |
| `kaiwu-qubo` | Kaiwu Community | python | kaiwu-community==1.0.7 | 上游社区版表达式、约束、QUBO/Ising 转换与优化接口 | 固定的是 Kaiwu Community；商业服务和企业版不是该发行版的一部分。 |
| `laboneq-control` | LabOne Q | python | laboneq==26.7.0 | DeviceSetup、Experiment、校准、pulse、sweep、编译与 session | 本地程序构建与外部调用分开；账户、凭据、费用、设备操作和数据外发沿用宿主及用户授权。原生 SDK 访问不自动启用服务。 |
| `ldpc-decoding` | LDPC | python | ldpc==2.4.1 | 自定义校验矩阵、错误模型、BP/OSD/LSD 译码器与批处理 | 按固定版本、已安装可选组件及目标平台核实 |
| `lean-physics` | Lean 4 / mathlib / physlib | lean | Physlib@6fd50cbcfafb503e4b96435e49bedb0e220f09e2, mathlib@56a005855ea17e0b0958f73ec801ae140b0a1679, plausible@dfa4f38190d07c37e315953e08b90fe2d95b3c24, LeanSearchClient@d6b4c7be5be75ec4917c873ac50c756dc1436372, importGraph@a41f0e9a4dea23188ea9cc1c41ac9f8bbafe0b93, proofwidgets@df72b022e558978a1c50264cfc4d7fec86fa8e04, aesop@4a174c490d8707121c4a9290800489f105d85e07, Qq@dce0ad79c486cb1fb504af04f953c3466b0c6db8, batteries@66e469188fe07963e5cf666c7d4433f45b8131c5, Cli@c24fe6078c630e89b489bffe59b3e20ac30d12c8 | 数学与物理命题、Pauli 矩阵关系、量子信息定理与依赖公理审计 | 固定兼容的 Lean 4.35.0 与 Lake 依赖锁；显式准备导入闭包。形式证明仅覆盖给定定义和假设，不代表真实物理或科学验收。 |
| `lightworks-photonics` | Lightworks | python | lightworks==2.3.5 | PhotonicCircuit、自定义输入、计算任务、后端与误差模型 | 按固定版本、已安装可选组件及目标平台核实 |
| `merlin-learning` | MerLin | python | merlinquantum==0.4.1, perceval-quandela==1.2.1 | 自定义光学电路、QuantumLayer、测量策略与 Torch 训练 | 按固定版本、已安装可选组件及目标平台核实 |
| `mimiq-simulation` | MIMIQ | python | mimiq-exaqt==0.3.0, mimiqcircuits==0.28.0 | 任意电路、指令、噪声、模拟器与远程接口 | 原生 Exaqt 目标有限；MIMIQ 远程服务、许可证和二进制平台分别核实。 |
| `mindquantum-differentiable` | MindQuantum | python | mindquantum==0.12.0, numpy==1.26.4 | Circuit、算符、ansatz、模拟器、测量与梯度接口 | 按固定版本、已安装可选组件及目标平台核实 |
| `mitiq-error-mitigation` | Mitiq / Cirq | python | mitiq==1.1.0 | 用户 executor、缩放与拟合策略、ZNE、PEC、CDR、读出缓解 | 按固定版本、已安装可选组件及目标平台核实 |
| `monoprop-propagation` | monoprop | python | monoprop[qiskit]==0.9.2 | Pauli/Majorana 算符、门生成元、传播、梯度与截断 | 明确生成元、指数符号、角度、算符次序与截断阈值。小系统核对精确矩阵并检查收敛；PyPI wheel 不含 MPI，多节点另备。 |
| `mqt-ddsim` | MQT DDSIM | python | mqt-ddsim==2.6.0 | 自定义电路、模拟后端、模拟选项与结果 | 按固定版本、已安装可选组件及目标平台核实 |
| `mqt-debugger` | MQT Debugger | python | mqt-debugger[check]==1.3.0 | OpenQASM 程序、单步仿真、断言、影响范围与错误诊断 | 状态/纠缠/等式断言与候选错误原因分别解释，诊断提示不是唯一根因证明。DAP 或真实 QPU 检查需要相应入口和授权。 |
| `mqt-qecc` | MQT QECC | python | mqt-qecc==2.0.0 | CSS 码、容错态制备、色码与模拟信息解码 | 明确 Hx/Hz 的 GF(2) 约定、逻辑算符、故障模型与后选择。2.x 不包含旧 union-find 实现；qsample 是另备的可选组件。 |
| `mqt-qmap` | MQT QMAP | python | mqt-qmap==3.10.0 | 自定义架构、configuration、映射与布局算法 | 按固定版本、已安装可选组件及目标平台核实 |
| `mrmustard-optics` | MrMustard | python | mrmustard==0.7.3, tensorflow==2.15.0 | 任意连续变量态、门、信道、参数与优化 | 固定 Python 3.11 / TensorFlow 2.15 环境；原生 wheel 与目标平台兼容性需核验。 |
| `myqlm-simulation` | myQLM | python | myqlm==1.13.7 | AQASM、自定义程序、job、QPU、插件与计算栈 | myQLM 按上游 EULA 使用；不能视为 OQC 的同名 qat 包，两者环境必须隔离。 |
| `netqasm-network` | NetQASM | python | netqasm==2.0.0, numpy==1.26.4, scipy==1.14.1 | 任意程序、EPR/经典通信、编译、连接与运行时 | 本锁不含受许可限制的 NetSquid/SquidASM，端到端网络运行须准备相应运行时。 |
| `ocean-optimization` | D-Wave Ocean SDK | python | dimod==0.12.22, dwave-ocean-sdk==9.5.0, dwave-samplers==1.8.0 | BQM、CQM、离散模型、变量、约束、sampler 与 SampleSet | 完整 Ocean 元包已进入依赖锁；本地模型、采样器与云客户端共享原生 API。连接 Leap、提交收费或 QPU 作业仍需用户授权与凭据。 |
| `openfermion-mapping` | OpenFermion | python | openfermion==1.8.1 | 费米子/玻色子算符、映射、张量、模型与化学接口 | 按固定版本、已安装可选组件及目标平台核实 |
| `openjij-optimization` | OpenJij | python | openjij==0.12.2 | Ising/QUBO、SA/SQA sampler、退火 schedule 与 SampleSet | 明确 Ising spin 与 QUBO bit 编码、能量 offset、schedule、Trotter 和采样预算。SA/SQA 是经典计算；旧 GPGPU 路径已不受支持。 |
| `openqarp-excited-states` | OpenQARP | python | openqarp==0.1.0, numpy==2.4.6 | 自定义算符、ansatz、引擎、优化器与算法对象 | 按固定版本、已安装可选组件及目标平台核实 |
| `oqc-cloud` | OQC QCAAS | python | oqc-qcaas-client==3.23.0 | QPUTask、编译选项、服务查询、任务与结果 | 本地程序构建与外部调用分开；账户、凭据、费用、设备操作和数据外发沿用宿主及用户授权。原生 SDK 访问不自动启用服务。 |
| `oqc-qat` | OQC QAT | python | qat-compiler==3.5.0 | 程序、IR、编译流程、设备模型、脉冲与后端 | 与 myQLM 共享 qat 导入名，但项目和环境不同，不能混装。 |
| `oqupy-dynamics` | OQuPy | python | oqupy==0.5.0 | 自定义 System、Bath、相关函数、TEMPO、process tensor 与控制 | 按固定版本、已安装可选组件及目标平台核实 |
| `pairinteraction-rydberg` | PairInteraction | python | pairinteraction==2.7.0 | 原子态、单原子与双原子基、相互作用矩阵、场扫描与截断选择 | 默认数据锁仅含 Rb 和通用 Wigner 表。其他原子及模型的表可通过上游数据准备接口在独立任务目录显式下载或生成，记录版本与文件摘要后，以 bootstrap 的 data_directory 参数接入；不是把原生 API 限定为 Rb。 |
| `paulie-algebra` | Paulie | python | paulie==0.2.3 | Pauli 表达式、代数运算与库公开分析接口 | 按固定版本、已安装可选组件及目标平台核实 |
| `paulistrings-dynamics` | PauliStrings.jl | julia | JSON3, PauliStrings | Pauli 字符串、Hamiltonian、算符传播与多体算法 | 明确算符系数/次序、归一化、时间步、截断和边界。小系统对照精确矩阵；压缩后的规模不代表准确性。 |
| `pecos-qec` | PECOS | python | quantum-pecos[stim,visualization]==0.11.0.dev0 | 混合程序、量子后端、噪声、syndrome 与纠错协议 | 固定明确的开发版及 Guppy/HUGR/Rust 依赖。记录控制流、测量、噪声与逻辑输出；独立核对协议语义，GPU extras 另备。 |
| `pennylane-differentiable` | PennyLane | python | pennylane==0.45.1 | QNode、自定义电路、算符、测量、设备、梯度、变换与混合优化 | 按固定版本、已安装可选组件及目标平台核实 |
| `perceval-photonics` | Perceval | python | perceval-quandela==1.3.0 | 任意光学网络、Fock 输入、processor、sampler、噪声与损耗 | 按固定版本、已安装可选组件及目标平台核实 |
| `piquasso-photonics` | Piquasso | python | piquasso==8.0.1 | Gaussian/Fock 态、光子程序、信道与测量 | 明确 hbar、quadrature 次序、Fock cutoff 和损耗约定。检查概率、密度矩阵和截断收敛；模拟值不作为硬件测量。 |
| `pulser-dynamics` | Pulser / Pasqal Cloud | python | pulser-core==1.9.1, pulser-simulation==1.9.1, pasqal-cloud==0.24.0 | Register、Device、Sequence、waveform、变量、噪声与模拟；Pasqal Cloud connections、backends、jobs、batches、workloads 与完整实验工作流 | pasqal-experiments 复用此环境；云操作需项目、凭据和相应授权，本地运行不联网 |
| `pychemiq-chemistry` | PyChemiQ | python | pychemiq==1.1.4, numpy==1.26.4 | 分子、映射、ansatz、VQE 与化学计算接口 | 按固定版本、已安装可选组件及目标平台核实 |
| `pygsti-characterization` | pyGSTi | python | pygsti[reports]==0.10.2 | Circuit、Model、DataSet、GST/RB/RPE 与拟合报告 | 保留原始计数、SPAM、gauge、样本数、拟合诊断与不确定度。合成数据明确标记；拟合质量与实际硬件性能分开。 |
| `pyquil-simulation` | pyQuil | python | pyquil==4.21.0 | Program、自定义 gates、Quil 控制流、编译器与模拟/设备接口 | 按固定版本、已安装可选组件及目标平台核实 |
| `pytket-compilation` | pytket | python | pytket==2.18.4 | 自定义 Circuit、Architecture、pass、predicate、路由与后端 | 按固定版本、已安装可选组件及目标平台核实 |
| `pyzx-optimization` | PyZX | python | pyzx==0.10.6 | Circuit、Graph、重写策略、提取、优化与等价性流程 | 按固定版本、已安装可选组件及目标平台核实 |
| `qblox-scheduling` | Qblox Scheduler | python | qblox-scheduler==1.0.0b8 | 自定义 Schedule、operation、pulse、资源、硬件配置与编译 | 本地程序构建与外部调用分开；账户、凭据、费用、设备操作和数据外发沿用宿主及用户授权。原生 SDK 访问不自动启用服务。 |
| `qbraid-conversion` | qBraid / Cirq | python | qbraid==0.12.2, qiskit==2.5.2, cirq-core==1.6.1, ply==3.11 | 程序类型、转换图、转译路径、序列化与供应商接口 | 按固定版本、已安装可选组件及目标平台核实 |
| `qcarchive-query` | QCArchive Portal | python | qcportal==0.70 | PortalClient、分子、记录、dataset、查询与任务提交接口 | 本地程序构建与外部调用分开；账户、凭据、费用、设备操作和数据外发沿用宿主及用户授权。原生 SDK 访问不自动启用服务。 |
| `qcompute-simulation` | QCompute | python | QCompute==3.3.5, numpy==1.26.4 | QEnv、自定义电路、procedure、编译模块与后端 | 按固定版本、已安装可选组件及目标平台核实 |
| `qcover-optimization` | Qcover | python | Qcover==2.6.0, qiskit==0.45.3, qiskit-aer==0.13.3, cirq==1.3.0, quimb==1.8.4, projectq==0.8.0, networkx==2.8.8, numpy==1.26.4, scipy==1.12.0 | 用户图、优化器、后端、ansatz 与优化流程 | 旧 Qiskit、ProjectQ 与 native build 依赖必须保持隔离；顶层导入失败应记录并修复，不替换成预设 QAOA 结果。 |
| `qctrl-workbench` | Boulder Opal / Fire Opal | python | httpx[socks]==0.28.1, boulder-opal==6.1.0, fire-opal==12.3.0 | 控制图、噪声、优化、任务与执行接口 | 本地程序构建与外部调用分开；账户、凭据、费用、设备操作和数据外发沿用宿主及用户授权。原生 SDK 访问不自动启用服务。 |
| `qcut-knitting` | QCut / Qiskit Addon Cutting | python | QCut==2.2.0, qiskit==2.5.2, qiskit-addon-cutting==0.10.0 | 自定义电路、切割位置、子实验生成、执行器与重构 | 按固定版本、已安装可选组件及目标平台核实 |
| `qdk-chemistry` | QDK Chemistry | python | qdk-chemistry[openfermion-extras,qiskit-extras,plugins]==2.2.1 | 分子结构、电子结构、活性空间、量子算法、后端与结果 | 保留几何单位、基组、电荷、自旋、轨道与积分约定。插件及外部程序按实际安装核实；官方可选 MCP 不因 SDK 准备而启动。 |
| `qdk-resource-estimation` | QDK | python | qdk[qre]==1.32.3 | Q# 程序、资源模型、误差预算与资源估算接口 | 按固定版本、已安装可选组件及目标平台核实 |
| `qdmi-device` | QDMI C API | native | QDMI C source (setup-qdmi.mjs) | 完整已固定版本的 QDMI client/device 头文件与驱动源码 | 原生 C ABI；setup 下载已固定源码并构建官方示例，真实驱动需单独配置，示例驱动不代表硬件支持。 本地程序构建与外部调用分开；账户、凭据、费用、设备操作和数据外发沿用宿主及用户授权。原生 SDK 访问不自动启用服务。 |
| `qec-memory-experiment` | Stim / PyMatching | python | pymatching==2.4.0, stim==1.16.0 | 自定义 Stim 电路、detector error model、Matching 图与批量译码 | 按固定版本、已安装可选组件及目标平台核实 |
| `qibo-simulation` | Qibo | python | qibo==0.3.5 | 自定义 Circuit、Hamiltonian、噪声、模型与后端 | 按固定版本、已安装可选组件及目标平台核实 |
| `qililab-control` | Qililab | python | qililab==0.33.3 | QProgram、波形、校准、runcard、平台与执行 | 本地程序构建与外部调用分开；账户、凭据、费用、设备操作和数据外发沿用宿主及用户授权。原生 SDK 访问不自动启用服务。 |
| `qiskit-machine-learning` | Qiskit Machine Learning | python | qiskit-machine-learning[torch,sparse]==0.9.1 | 量子核、QSVC/QSVR、QNN、梯度、训练与推断 | 使用该版本的 primitives API。固定数据划分和 seed，保留训练与测试指标、shots 与优化器；训练成功不等于泛化有效。 |
| `qlasskit-oracles` | Qlasskit | python | qlasskit==0.1.39, qiskit==2.5.2 | 受支持 Python 子集、布尔表达式、量子 oracle 与多框架导出 | 记录 Qint/Qfixed 等类型的位宽、溢出和输出编码，检查辅助位及反计算。它不编译任意 Python；小输入可枚举真值表核对。 |
| `qoolqit-workbench` | QoolQit | python | qoolqit==1.4.0, pulser==1.9.1 | 程序、编译/执行流程与后端模型 | 上游自定义许可证，安装前按当前使用范围核对。 |
| `qpanda-qubo` | QPanda Algorithm | python | pyqpanda_alg==2.0.0, pandas==2.3.3, scikit-learn==1.9.1 | QUBO 建模、约束、算法与上游优化模块 | macOS 的完整 SDK setup 需要 Git、CMake 和 C++ 编译器，以固定 fmt 11.2.0 源码构建隔离动态库；其余上游 wheel 的系统依赖仍按平台核验，不修改 Homebrew 或裁剪算法模块。 |
| `qrisp-arithmetic` | Qrisp | python | qrisp==0.9.9 | 量子类型、算术、控制结构、会话与编译 | 上游 EPL 许可与可选后端单独核对，不改变现有 MCP 默认关闭状态。 显式选择 JAX 数值精度和 target；需要 float64 时在建立数组前启用 jax_enable_x64。CPU、GPU 选择按任务与已安装后端决定。 |
| `qsim-simulation` | qsim | python | qsimcirq==0.22.1 | Cirq 电路、QSimOptions、态矢量、采样与目标后端 | 显式保留 qubit_order 与位串次序，原始振幅不裁剪或重新归一化。CPU、GPU 和性能收益分别核验，完整态输出有指数成本。 |
| `qsteed-compilation` | QSteed / Quafu | python | qsteed==0.2.3, pyquafu==0.4.4 | 量子芯片模型、编译任务、pass 与用户电路 | 按固定版本、已安装可选组件及目标平台核实 |
| `qsyn-compilation` | Qsyn | native | qsyn@b77187c87f0bddd69bc6c213700642ee6c423159, xtl@ef84e9f27020ad54961c99acd293d80d4b775dd3, xtensor@f31d415a507b84d0097436a38293df3f56906ad1, xtensor-blas@894ff33d05aeb5297d5d3fde8e7591613b824de0, libfort@b1c32b67511f4612996b287a1ef4a9df012521d2, fmt@e69e5f977d458f2650bb346dadf2ad30c5320281, spdlog@27cb4c76708608465c413f6d0e6b8d99a4d84302, GSL@a3534567187d2edc428efd3f13466ff75fe5805c, dynamic_bitset@6d19b2da9b69b8c77d7b86b453c757cd5fa8711f, json@9cca280a4d0ccf0c08f47a99aa71d1b0e52f8d03, cadical@e080cabf410067d551705bfcad28454859d8a062, libabc@c1674b5d7cae744e4e9ab706f6e23c203ba86869, Catch2@fa43b77429ba76c462b1898d6cd2f2d7a9416b14 | C++ 库、线路综合、ZX/张量变换、优化、验证与 CLI | 使用完整固定源码与 C++20 构建。输入语言、门集、布局、全局相位和导出语义分别核对；编译成功不构成等价性证明。 Apple Silicon macOS 本轮验证使用 GCC 16.2.0；显式 setup 时用 CC/CXX 指定已安装编译器。Clang 22 与上游 fmt 10.2.1 组合已知构建失败，其他工具链须独立核验。 |
| `qua-programs` | QUA | python | qm-qua==1.4.1 | 任意 program、控制流、stream processing、配置与量子机器接口 | 本地程序构建与外部调用分开；账户、凭据、费用、设备操作和数据外发沿用宿主及用户授权。原生 SDK 访问不自动启用服务。 qm 导入会读取用户配置并初始化日志；离线程序构建先使用本 Skill bridge.py 的 offline_user_config 上下文，真实设备任务则使用用户授权的实际配置。不要在离线步骤构造 QuantumMachinesManager。 |
| `quairkit-information` | QuAIRKit | python | quairkit==0.5.1, torch==2.11.0 | 任意维数态、信道、算符、电路与可微优化 | 按固定版本、已安装可选组件及目标平台核实 |
| `qualtran-resources` | Qualtran | python | qualtran==0.7.0 | 自定义 Bloq、组合、分解、call graph 与符号资源计数 | 按固定版本、已安装可选组件及目标平台核实 |
| `quantum-algorithms` | Qiskit / PennyLane / quimb / PySCF | python | numpy==2.5.3, scipy==1.18.1, qiskit==2.5.2 | 原生 SDK 电路、任意张量网络、MPS/MPO、分子、积分与量子化学计算 | 依赖组有 gradients、pennylane、tensor、chemistry；默认 setup 仅安装基础依赖；按任务选择依赖组，--all 才安装全部组，算法示例不是允许调用的 API 白名单。 |
| `quantum-circuit-verification` | MQT QCEC | python | mqt.qcec[qiskit]==3.10.0 | 任意受支持电路、编译流程配置与等价性验证接口 | 按固定版本、已安装可选组件及目标平台核实 |
| `quantum-information-audit` | toqito | python | toqito==1.3.1 | 态、信道、矩阵、熵、纠缠、态区分与优化接口 | 按固定版本、已安装可选组件及目标平台核实 |
| `quantumclifford-julia` | QuantumClifford.jl | julia | JSON3, QuantumClifford | Pauli/稳定子、图态、Clifford 操作、测量与 Pauli frame | 明确 Pauli 相位、位序、稳定子独立性与测量语义。非 Clifford 方法按该版本实际 API 选择，不静默投影为 Clifford。 |
| `quantumcontrol-julia` | QuantumControl.jl | julia | GRAPE, JSON3, Krotov, QuantumControl, QuantumPropagators | 动力学、控制目标、脉冲、GRAPE/Krotov 与优化 | 保留时间网格、目标泛函、脉冲边界、传播器和梯度方法。独立复核传播、梯度与收敛，优化目标值不是硬件保真度。 |
| `quantuminspire-cloud` | Quantum Inspire | python | quantuminspire==4.1.0 | 上游 SDK 认证、平台、程序、job 与结果接口 | 本地程序构建与外部调用分开；账户、凭据、费用、设备操作和数据外发沿用宿主及用户授权。原生 SDK 访问不自动启用服务。 |
| `quantumsavory-network` | QuantumSavory.jl | julia | JSON3, QuantumSavory | 量子寄存器、器件状态、链路、网络协议与离散事件模拟 | 保留时间单位、存储/链路噪声、协议、初态和 seed。库内事件是数值模型，不替代宿主 Session/Job 管理。 |
| `quri-parts-estimation` | QURI Parts / Qulacs | python | quri-parts[qulacs]==0.27.0, qulacs==0.6.14 | 电路、态、算符、estimator、sampler、梯度与后端 | 按固定版本、已安装可选组件及目标平台核实 |
| `qutrunk-simulation` | QuTrunk | python | qutrunk==0.2.2 | QCircuit、参数、门与上游后端 | 按固定版本、已安装可选组件及目标平台核实 |
| `randomized-measurements` | RandomMeas.jl | julia | JSON3, RandomMeas | 用户量子态、测量数据、随机测量协议与估计函数 | 按固定版本、已安装可选组件及目标平台核实 |
| `simqn-network` | SimQN | python | qns==0.2.3 | 拓扑、节点、信道、存储、事件与自定义协议 | 上游 GPL 许可；保持独立进程，不改变现有 MCP 默认关闭状态。 |
| `spinqit-simulation` | SpinQit | python | spinqit==0.2.4, scipy==1.14.1 | 电路、门、参数、编译与后端接口 | 按固定版本、已安装可选组件及目标平台核实 |
| `sqd-chemistry` | Qiskit Addon SQD | python | qiskit-addon-sqd==0.13.1 | 用户 bitstrings、configuration recovery、投影子空间与费米子求解 | 按固定版本、已安装可选组件及目标平台核实 |
| `squlearn-learning` | sQUlearn | python | squlearn==0.11.2 | 编码线路、observable、executor、量子核与 sklearn estimator | 明确本地 executor、编码参数、kernel regularization 和数据划分。账户、真实设备与外部服务保持独立授权；不自动选择云后端。 |
| `staq-compilation` | STAQ / pystaq | python | pystaq @ git+https://github.com/softwareQinc/staq.git@a2acd39e60ed0e5f1978fa530df7e1e0c7cedf7a | OpenQASM AST、综合、线路变换、优化与映射 | 固定完整上游源码。语言版本、门集、物理/逻辑布局和全局相位分别保留；GMP 等可选原生组件以实际构建为准。 |
| `superstaq-compilation` | Qiskit Superstaq | python | qiskit-superstaq==0.5.69, qiskit==2.5.2 | 自定义电路、编译选项、targets、provider 与执行结果 | 本地程序构建与外部调用分开；账户、凭据、费用、设备操作和数据外发沿用宿主及用户授权。原生 SDK 访问不自动启用服务。 |
| `symmer-tapering` | Symmer | python | symmer | PauliwordOp、投影、对称性、tapering 与子空间方法 | 按固定版本、已安装可选组件及目标平台核实 |
| `tenpy-ground-state` | TeNPy | python | physics-tenpy==1.1.1 | 自定义 site、lattice、CouplingMPOModel、MPS、DMRG、TEBD 与保存恢复 | 按固定版本、已安装可选组件及目标平台核实 |
| `tensorcircuit-differentiable` | TensorCircuit-NG | python | tensorcircuit-ng==1.10.0, jax==0.7.1, jaxlib==0.7.1, numpy==2.3.5, optax==0.2.4, qiskit==2.5.2, cirq-core==1.6.1 | 自定义电路、张量网络、后端、vmap、梯度与优化 | 显式选择 JAX 数值精度和 target；需要 float64 时在建立数组前启用 jax_enable_x64。CPU、GPU 选择按任务与已安装后端决定。 TensorCircuit-NG 1.10.0、Qiskit 2.5.2、JAX 0.7.1 与 NumPy 2.3.5 在独立环境内固定；JAX、Optax 和 Cirq 转换依赖已提供。TensorFlow、PyTorch、CuPy 和 GPU 是上游可选后端，需按目标另备兼容依赖；本机工程检查不覆盖这些后端。 |
| `tesseract-decoding` | Tesseract Decoder | python | tesseract-decoder==0.1.1.dev20261013012529 | Stim DEM、syndrome、搜索式解码器与统计 | 本环境是明确固定的开发版。记录 beam、剪枝、搜索预算及 DEM 的概率/observable 语义；启发式结果不能默认视为最优解。 |
| `tjm-dynamics` | MQT YAQS | python | mqt.yaqs==0.6.0 | 自定义 MPS/MPO、电路、噪声模型、时间演化与张量跳跃 | 按固定版本、已安装可选组件及目标平台核实 |
| `tqec-compilation` | TQEC | python | tqec @ https://github.com/tqec/tqec/archive/2c4b8cf9d3f8f520571093c60d752af0ad46a745.tar.gz | BlockGraph、逻辑计算块、相关面与 Stim 线路生成 | 上游不承诺向后兼容，因此固定源码 SHA。保留码距/尺度 k、噪声、detector 和 observable 映射；生成线路不等于完整逻辑协议已验收。 |
| `tsim-sampling` | Tsim | python | bloqade-tsim==0.1.5 | Clifford/非 Clifford 线路、噪声、detector 与 observable 采样 | 统一实际 detector/observable 值与参考样本 flips 的语义。发布包和上游 main 的功能分别核实；CPU/JAX 与 CUDA target 单独选择。 |
| `tyxonq-workbench` | TyxonQ | python | tyxonq==1.3.0 | 电路、门、测量与上游后端接口 | 按固定版本、已安装可选组件及目标平台核实 |
| `vqnet-learning` | VQNet | python | pyvqnet==2.18.1, numpy==1.26.4 | tensor、量子/经典层、模型、数据与优化器 | 按固定版本、已安装可选组件及目标平台核实 |
| `yao-circuits` | Yao.jl | julia | JSON3, Yao | 量子寄存器、block、电路、算符、参数与梯度 | 保留 block 作用线、位序、参数和精度。测量、态矢量与梯度的语义分别核对；跨框架导出须保留映射。 |

## 外部 MCP（6 项）

这些接入的协议是远程或外置 MCP，不等于已捆绑对应 SDK。Qiskit 本地 API 已由原生环境提供；供应商服务的全部 API 仍须其自己的 SDK、账户和运行条件，不能把以下连接称为完整库接入。

- `qiskit-ibm-runtime`：`qiskit_ibm_runtime` (opt-in)
- `qiskit-ibm-transpiler`：`qiskit_ibm_transpiler` (opt-in)
- `qiskit-gym`：`qiskit_gym` (opt-in)
- `qpanda-runtime`：`qpanda_runtime` (opt-in)
- `quantum-hardware`：`quantum_hardware` (opt-in)
- `qiskit-circuit-workbench`：`qiskit` (conditional)、`qiskit_docs` (conditional)

## 原生实现（8 项）

- `quantum-practices`
- `quantum-learning`
- `quantum-sdk-workbench`
- `qmclaw-workbench`
- `platform-diagnostics`
- `quantum-ground-state`
- `metriq-data`
- `pasqal-experiments`

这些是 OpenQuantum 原生实现或宿主能力，不冒充对应项目的全部上游 SDK。特别是 QMClaw 当前是测控模拟实现，不能称作完整 QMClaw 实验室运行时。

## 方法、知识与数据参考（66 项）

`quantum-sdk-advisor`、`quantum-guide-algorithms`、`quantum-guide-algorithms-cryptography`、`quantum-discrete-log`、`quantum-shor`、`quantum-simon`、`quantum-guide-algorithms-eigensolvers`、`quantum-numpy-minimum-eigensolver`、`quantum-numpy-eigensolver`、`quantum-vqd`、`quantum-guide-algorithms-gradients`、`quantum-finite-difference`、`quantum-linear-combination`、`quantum-parameter-shift`、`quantum-qfi`、`quantum-reverse`、`quantum-spsa`、`quantum-guide-algorithms-hamiltonian-simulation`、`quantum-cartan`、`quantum-qdrift`、`quantum-hamiltonian-qsp`、`quantum-taylor`、`quantum-trotter`、`quantum-guide-algorithms-linear-systems`、`quantum-aqc`、`quantum-hhl`、`quantum-lcu`、`quantum-qsvt-qlsa`、`quantum-qft`、`quantum-qsp`、`quantum-vqls`、`quantum-guide-algorithms-primitives`、`quantum-amplitude-amplification`、`quantum-amplitude-estimation`、`quantum-grover`、`quantum-hadamard-test`、`quantum-hadamard-transform`、`quantum-qpe`、`quantum-guide-algorithms-quantum-chemistry`、`quantum-molecular-dmrg`、`quantum-qldpc`、`quantum-guide-algorithms-quantum-machine-learning`、`quantum-cvqnn`、`quantum-fermi-hubbard-vqe`、`quantum-ising`、`quantum-qaoa`、`quantum-qcbm`、`quantum-vqc`、`quantum-vqe`、`quantum-guide-algorithms-schrodingerization`、`quantum-advection`、`quantum-heat-1d`、`quantum-heat-2d`、`quantum-guide-algorithms-search`、`quantum-glued-trees`、`quantum-hidden-shift`、`quantum-guide-algorithms-state-preparation`、`quantum-mottonen`、`quantum-mps`、`quantum-multiplexer`、`quantum-pauli`、`quantum-superposition`、`quantum-guide-simulators`、`quantum-guide-simulators-pennylane`、`quantum-guide-simulators-qiskit`、`quantum-guide-simulators-unitarylab`。算法指南通过共享 SDK 环境执行自定义代码；知识条目本身不是安装库。
