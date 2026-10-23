# 公司与机构 SDK 补充接入（2026-09-28）

本批在[前一批 17 个厂商 SDK](VENDOR_SDKS.md)之外，新增 20 个 L1 能力包、20 个 Skill、20 个独立 MCP 连接和 23 个 Tool。
Skill 负责选择方法和解释边界，Tool 执行 SDK 动作，Harness MCP Client 负责注册；不增加第二个运行时。
服务账户、密钥和权限由用户设置。需要鉴权不影响适配，但未配置的远程操作必须清晰失败，不能伪装成服务已联通。

## 已实现的执行范围

| 公司 / 机构与 SDK | 固定版本 | 能力与实际边界 | 连接策略 |
| --- | --- | --- | --- |
| [BAQIS · QSteed 电路编译](https://github.com/BAQIS-Quantum/qsteed) | qsteed==0.2.3 | [qsteed-compilation](../../.agents/skills/qsteed-compilation/SKILL.md)：PyQuafu 电路编译到指定门集，保留全局相位与线路，不连接资源数据库。 | 默认开启 |
| [QuAIR · QuAIRKit 量子通道](https://github.com/QuAIR/QuAIRKit) | quairkit==0.5.1 | [quairkit-information](../../.agents/skills/quairkit-information/SKILL.md)：CPU 密度矩阵电路与去极化、振幅阻尼、相位阻尼通道。 | 默认开启 |
| [Baidu · QCompute 本地仿真](https://github.com/baidu/QCompute) | QCompute==3.3.5 | [qcompute-simulation](../../.agents/skills/qcompute-simulation/SKILL.md)：使用百度 QCompute 本地模拟器计算电路概率。 | 默认开启 |
| [Qibo / TII / INFN · Qibo 电路仿真](https://github.com/qiboteam/qibo) | qibo==0.3.5 | [qibo-simulation](../../.agents/skills/qibo-simulation/SKILL.md)：使用明确选定的 NumPy CPU 后端计算态矢量。 | 默认开启 |
| [Eclipse / Fraunhofer · Qrisp 量子算术](https://github.com/eclipse-qrisp/Qrisp) | qrisp==0.9.9 | [qrisp-arithmetic](../../.agents/skills/qrisp-arithmetic/SKILL.md)：本地 QuantumFloat 无符号模加法；需考虑 EPL-2.0 许可。 | 按需启用 |
| [Aegiq · Lightworks 光子仿真](https://github.com/Aegiq/lightworks) | lightworks==2.3.5 | [lightworks-photonics](../../.agents/skills/lightworks-photonics/SKILL.md)：本地线性光学网络与 Fock 输入的输出概率。 | 默认开启 |
| [Amazon · Braket 本地仿真](https://github.com/amazon-braket/amazon-braket-sdk-python) | amazon-braket-sdk==1.127.2 | [braket-simulation](../../.agents/skills/braket-simulation/SKILL.md)：显式 LocalSimulator 电路振幅与概率，不创建 AWS 云任务。 | 默认开启 |
| [QunaSys · QURI 可观测量估计](https://github.com/QunaSys/quri-sdk) | quri-parts[qulacs]==0.27.0 | [quri-parts-estimation](../../.agents/skills/quri-parts-estimation/SKILL.md)：QURI Parts 电路与 Qulacs 本地 Pauli 期望值。 | 默认开启 |
| [Microsoft · QDK 容错资源估算](https://github.com/microsoft/qdk) | qdk[qre]==1.32.3 | [qdk-resource-estimation](../../.agents/skills/qdk-resource-estimation/SKILL.md)：由电路和硬件假设估算物理量子位与运行时间。 | 默认开启 |
| [Google Quantum AI · Qualtran 资源计数](https://github.com/quantumlib/Qualtran) | qualtran==0.7.0 | [qualtran-resources](../../.agents/skills/qualtran-resources/SKILL.md)：算术 Bloq 的容错门资源；实验性 API，保留计数假设。 | 默认开启 |
| [Google Quantum AI · OpenFermion 算符映射](https://github.com/quantumlib/OpenFermion) | openfermion==1.8.1 | [openfermion-mapping](../../.agents/skills/openfermion-mapping/SKILL.md)：结构化费米算符到 Jordan-Wigner 或 Bravyi-Kitaev Pauli 项。 | 默认开启 |
| [TUM / MQT · MQT 决策图仿真](https://github.com/munich-quantum-toolkit/ddsim) | mqt-ddsim==2.6.0 | [mqt-ddsim](../../.agents/skills/mqt-ddsim/SKILL.md)：使用决策图模拟电路，返回指定计算基态概率。 | 默认开启 |
| [TUM / MQT · MQT 硬件拓扑映射](https://github.com/munich-quantum-toolkit/qmap) | mqt-qmap==3.10.0 | [mqt-qmap](../../.agents/skills/mqt-qmap/SKILL.md)：将电路映射到耦合图，返回物理线路及逻辑输入、输出映射。 | 默认开启 |
| [Classiq · Classiq 电路综合](https://docs.classiq.io/) | classiq==1.29.1 | [classiq-synthesis](../../.agents/skills/classiq-synthesis/SKILL.md)：本地模型准备及可选云端综合；用户自行配置 Token 和服务权限。 | 按需启用 |
| [Q-CTRL · Q-CTRL 控制模型与作业查询](https://docs.q-ctrl.com/) | boulder-opal==6.1.0 / fire-opal==12.3.0 | [qctrl-workbench](../../.agents/skills/qctrl-workbench/SKILL.md)：本地 Boulder Opal 控制图与已有 Boulder/Fire Opal 作业状态查询。 | 按需启用 |
| [Quantum Machines · QUA 脉冲程序](https://github.com/qm-labs/qm-qua-sdk-public) | qm-qua==1.4.1 | [qua-programs](../../.agents/skills/qua-programs/SKILL.md)：本地生成 OPX 脉冲程序与配置，不连接 QOP 服务。 | 默认开启 |
| [Zurich Instruments · LabOne Q 离线控制](https://github.com/zhinst/laboneq) | laboneq==26.7.0 | [laboneq-control](../../.agents/skills/laboneq-control/SKILL.md)：离线脉冲编译与 HDAWG 输出波形仿真，不执行设备程序。 | 默认开启 |
| [MolSSI · QCArchive 计算记录查询](https://github.com/MolSSI/QCFractal) | qcportal==0.70 | [qcarchive-query](../../.agents/skills/qcarchive-query/SKILL.md)：只读查询既有单点记录，返回分子、原子单位能量和计算来源。 | 按需启用 |
| [NVIDIA · CUDA-Q CPU 仿真](https://github.com/NVIDIA/cuda-quantum) | cuda-quantum-cu13==0.16.0 | [cudaq-simulation](../../.agents/skills/cudaq-simulation/SKILL.md)：固定 qpp-cpu 后端的精确概率与采样；Linux 或 Apple Silicon macOS。 | 按需启用 |
| [QuTech · NetQASM / SquidASM 网络](https://github.com/QuTech-Delft/squidasm) | netqasm==2.0.0 | [netqasm-network](../../.agents/skills/netqasm-network/SKILL.md)：本地双节点 EPR 程序编译；仿真需用户自行准备有许可的 NetSquid 环境。 | 按需启用 |

这里的“集成”以表内动作范围为准，不表示第三方 SDK 的全部功能已开放。Braket 是本地模拟，QUA 是程序生成，
LabOne Q 是控制器输出波形仿真，QDK 是模型资源估算；这些都不是实际 QPU 执行或设备校准。
NetQASM 编译可单独使用，SquidASM 仿真需要用户另外准备有许可的 NetSquid 依赖。

## 显式准备与用户配置

- `npm run capability:sdk-expansion:setup` 准备 14 个默认开启的独立环境；也可使用
  `node scripts/setup-paper-tools.mjs <capability-id>` 只准备需要的一项。
- QCompute 与 NetQASM 使用 Python 3.10，其余使用 3.12。公开依赖固定在各能力目录的 `uv.lock`，计算调用不安装依赖。
- Qrisp、CUDA-Q、NetQASM、QCArchive、Classiq、Q-CTRL 为按需启用。CUDA-Q 的固定 0.16.0 二进制支持 Linux 和 Apple Silicon macOS，
  原生 Windows/Intel Mac 不在该依赖分发范围；Tool 固定使用 `qpp-cpu`，不隐式选择 GPU 或远程 target。
- Classiq/Q-CTRL 使用专有 SDK，默认批量准备不包含它们；使用者按自己的许可显式安装，仓库不附带它们的 wheel 或 SDK 源码。
- NetQASM 的公开锁只覆盖编译环境。SquidASM 0.13.6 及私有 NetSquid 栈由用户按上游要求安装到同一环境；
  仿真结果单独报告其版本，并明确 `simulationDependenciesLocked=false`。无授权依赖时返回具体准备说明。

在工作台量子组件设置中启用相应连接，凭据保存于 Harness credential store。密钥、密码和令牌值不进入 Skill、Tool 参数、YAML、结果或 Git；QCArchive 结果保留服务器地址以标明数据来源。

| 连接 | 用户配置 | 不配置时 |
| --- | --- | --- |
| `classiq_cloud` | `CLASSIQ_XCH_TOKEN`（SDK exchange token），账号需有综合权限 | 本地模型准备可用，远程综合失败 |
| `qctrl_cloud` | `QCTRL_API_KEY` | 本地控制图可用，已有作业查询失败 |
| `qcarchive_data` | `QCPORTAL_ADDRESS`；私有服务再同时填 `QCPORTAL_USERNAME`、`QCPORTAL_PASSWORD` | 缺地址或用户名/密码只填一半时在请求前失败；公开服务可匿名 |

远程 Tool 只读取自身声明的凭据引用，不接受任意请求 URL 或凭据参数。Classiq 综合可能消耗服务额度，登记为 `external-write`；
查询与本地 SDK 动作保守登记为 `workspace-write`，考虑 SDK 缓存。默认关闭或已填凭据都不替代具体任务的使用授权。

## 科学与接口边界

- QCompute 的 RZ 全局相位、SDK 位序、光子模式顺序、QMAP 的输入/输出线路映射均显式处理。选择和细节见
  [电路组](SDK_EXPANSION_CIRCUITS.md)及各 Skill；不能只凭电路门数相同认定等价。
- QDK 前沿只在指定物理错误率、门时长、纠错/工厂模型和搜索域内成立；Qualtran 计数依赖 Bloq 分解模型。
- QCArchive 返回既有记录，geometryBohr 用 bohr，energyHartree 用 hartree；缺失能量保持 null。比较前核对几何、方法、基组、电荷、多重度和来源。
- NetQASM 程序生成不代表模拟成功；双节点测量一致率不构成纠缠见证或 QKD 安全证明。
- 所有新增能力保持 L1 / `scientificValidation=not_evaluated`，本批没有新增科学 Acceptance Profile。

## 验证入口与范围

`npm run capability:sdk-expansion:test` 检查真实 MCP 握手、工具清单、严格输入、结果与输入摘要一致性、失败和取消。
显式准备相应环境后，`npm run capability:sdk-expansion:live` 执行各组真实 SDK 检查和 Harness 集成。
其中 QCArchive 使用真实 QCPortal 加回环 HTTP 服务夹具；Classiq/Q-CTRL 的远程路径使用真实 SDK 加传输夹具。
Harness 的模型由本地协议夹具驱动，成功调用和预期失败均从 Session event log 重读。

NetSquid 数值检查单独要求 `OPENQUANTUM_REAL_SQUIDASM=1` 与用户已经配置好的私有依赖，默认不运行。
没有运行真实账户、在线云综合、付费作业、QPU、外部模型或最后科学验收。适配验证、服务连通与科学验收分别记录。

最终验证摘要与来源哈希见 [SDK 补充接入证据](evidence/sdk-expansion-2026-09-28.json)。运行中的工作台需要重启才能加载新的 Preset；
源码变更不代表已发布安装包。
