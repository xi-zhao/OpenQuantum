# 国内外厂商 SDK 接入

本轮新增 17 个 Skill、17 个 MCP Server 连接和 19 个 Tool。每个 Python SDK 使用独立的固定依赖环境，
Tool 返回结构化输入、来源版本、输入摘要和依赖锁摘要；Skill 负责选择方法、组织参数和解释结果。
Harness MCP Client 将 Tool 注册进现有 Harness Runtime，不引入另一个执行框架。

已有 Qiskit、Stim/PyMatching、QPanda、TyxonQ、Bloqade 与 FieldQKit 能力继续复用。
这里的“接入”指表内的具体动作，不表示实现了每个 SDK 的全部 API、训练框架或真机服务。

## 能力与版本

| 公司 / SDK | 固定版本 | Skill | 本次动作 | 连接策略 |
| --- | --- | --- | --- | --- |
| [Xanadu / pennylane](https://github.com/PennyLaneAI/pennylane) | 0.45.1 | [`pennylane-differentiable`](../../.agents/skills/pennylane-differentiable/SKILL.md) | 用户电路的概率、Pauli 期望值和参数梯度。 | 默认开启 |
| [图灵量子 / deepquantum](https://github.com/TuringQ/deepquantum) | 4.5.0 | [`deepquantum-differentiable`](../../.agents/skills/deepquantum-differentiable/SKILL.md) | 基于 PyTorch 的电路概率、期望值和参数梯度。 | 默认开启 |
| [腾讯量子实验室 / tensorcircuit](https://github.com/tencent-quantum-lab/tensorcircuit) | 0.12.0 | [`tensorcircuit-differentiable`](../../.agents/skills/tensorcircuit-differentiable/SKILL.md) | 张量网络电路的概率、期望值和参数梯度。 | 默认开启 |
| [华为 HiQ / MindSpore / mindquantum](https://gitee.com/mindspore/mindquantum) | 0.12.0 | [`mindquantum-differentiable`](../../.agents/skills/mindquantum-differentiable/SKILL.md) | 本地电路模拟、Pauli 期望值和参数梯度。 | 默认开启 |
| [Quantinuum / pytket](https://github.com/Quantinuum/tket) | 2.18.4 | [`pytket-compilation`](../../.agents/skills/pytket-compilation/SKILL.md) | 本地电路优化、门数比较与 OpenQASM 导出。 | 默认开启 |
| [D-Wave / dimod + dwave-samplers](https://github.com/dwavesystems/dwave-ocean-sdk) | 0.12.22 / 1.8.0 | [`ocean-optimization`](../../.agents/skills/ocean-optimization/SKILL.md) | 二值二次模型的本地穷举或模拟退火；不是量子退火硬件执行。 | 默认开启 |
| [玻色量子 / kaiwu-community](https://github.com/qboson/kaiwu_community) | 1.0.7 | [`kaiwu-qubo`](../../.agents/skills/kaiwu-qubo/SKILL.md) | 社区版符号 QUBO、约束罚项和 Ising 转换；不使用企业版或真机。 | 默认开启 |
| [Rigetti / pyquil](https://github.com/rigetti/pyquil) | 4.21.0 | [`pyquil-simulation`](../../.agents/skills/pyquil-simulation/SKILL.md) | 本地 Quil 电路模拟，不提交 Rigetti 云作业。 | 默认开启 |
| [量旋科技 / spinqit](https://github.com/SpinQTech/SpinQit) | 0.2.4 | [`spinqit-simulation`](../../.agents/skills/spinqit-simulation/SKILL.md) | 量旋 SDK 的本地电路模拟，不连接设备。 | 默认开启 |
| [启科量子 / qutrunk](https://github.com/qudoor/qutrunk) | 0.2.2 | [`qutrunk-simulation`](../../.agents/skills/qutrunk-simulation/SKILL.md) | 启科 SDK 的本地电路模拟，不连接设备。 | 默认开启 |
| [Quandela / perceval-quandela](https://github.com/Quandela/Perceval) | 1.3.0 | [`perceval-photonics`](../../.agents/skills/perceval-photonics/SKILL.md) | 用户 Fock 输入、分束器和移相网络的本地光子分布。 | 默认开启 |
| [IQM / iqm-client](https://github.com/iqm-finland/iqm-client) | 35.0.3 | [`iqm-circuit-workbench`](../../.agents/skills/iqm-circuit-workbench/SKILL.md) | IQM 原生门转译与本地模拟，不连接真实设备。 | 默认开启 |
| [Alice & Bob / qiskit-alice-bob-provider](https://github.com/Alice-Bob-SW/qiskit-alice-bob-provider) | 1.3.0 | [`alicebob-cat-circuits`](../../.agents/skills/alicebob-cat-circuits/SKILL.md) | 官方本地猫态量子比特模型与电路仿真。 | 默认开启 |
| [Pasqal / pulser-core + pulser-simulation](https://github.com/pasqal-io/Pulser) | 1.9.1 | [`pulser-dynamics`](../../.agents/skills/pulser-dynamics/SKILL.md) | Pasqal 全局脉冲、Rydberg 阵列与本地动力学。 | 默认开启 |
| [Pasqal / qoolqit](https://github.com/pasqal-io/qoolqit) | 1.4.0 | [`qoolqit-workbench`](../../.agents/skills/qoolqit-workbench/SKILL.md) | 无量纲 Rydberg 程序编译与本地计算；需审阅上游定制许可证。 | 按需开启 |
| [IonQ / qiskit-ionq](https://github.com/qiskit-community/qiskit-ionq) | 1.1.1 | [`ionq-programs`](../../.agents/skills/ionq-programs/SKILL.md) | 使用官方 SDK 将结构化电路转换为 IonQ QIS 程序；不提交云任务。 | 默认开启 |
| [Infleqtion / qiskit-superstaq](https://github.com/Infleqtion/client-superstaq) | 0.5.69 | [`superstaq-compilation`](../../.agents/skills/superstaq-compilation/SKILL.md) | 本地程序序列化和可选远程编译；远程操作外发电路，需要账户，不执行 QPU 任务。 | 按需开启 |

Superstaq 包含三个 Tool：本地 `prepare_superstaq_circuit`，以及需要凭据的
`list_superstaq_targets`、`compile_superstaq_circuit`。其余 16 项各提供一个领域 Tool。
QoolQit 因定制许可证默认关闭，Superstaq 因包含远程服务默认关闭；这两个 Skill 仍可发现。
“默认开启”是连接配置，环境准备完成后才可计算，并不代表启动时自动下载依赖。

## 准备与调用

在仓库根目录运行：

```bash
npm run capability:vendor-sdks:setup
npm run capability:vendor-sdks:test
npm run capability:vendor-sdks:live
```

第一条显式准备全部 17 个环境，可能下载 Python 与锁定的依赖。只需部分 SDK 时使用
`node scripts/setup-paper-tools.mjs <能力ID>`。计算 Tool 不自行安装依赖。
PennyLane/TensorCircuit 的既有算法示例环境继续保留；本轮增加的是结构化可微分 Tool。

大多数环境使用 Python 3.12；MindQuantum 使用 3.11，SpinQit 和 QuTrunk 使用 3.10。
Alice & Bob 独立保留上游要求的 Qiskit 1.x；TensorCircuit 固定 JAX 0.4.38 / NumPy 1.26.4。
SpinQit 固定 SciPy 1.14.1，macOS 加载桥只预加载官方 wheel 内的动态库，不改写其二进制。
全部环境均有 `uv.lock`；复用与错误恢复见[环境说明](LOCAL_ENVIRONMENTS.md)。

重启使用这份源码的 Harness 后，Agent 可按 Skill 调用相应 Tool。例如：

- “用 PennyLane 计算 RY(0.4) 后接 CX 的两比特线路，返回 ZI、IZ、XX 期望及对旋转角的导数。”
- “用 Kaiwu Community 把这个二元目标和等式约束转换成 QUBO，并核对指定赋值的能量。”
- “用 Perceval 计算两光子经过分束器网络的输出 Fock 分布。”
- “用 IonQ SDK 把这份线路转换成 QIS 程序，并返回测量位映射。”

输入采用受约束的结构化合同，不执行用户提供的任意 Python。计算规模不设人为固定上限；
资源由输入及 `execution` 决定，依赖的设备模型限制和实际资源不足会明确返回错误。
不同 SDK 的位序、相位和能量单位以各 Skill 和返回结果为准，不能直接互换数组。

## 解释边界

- 四个可微分 Tool 返回用户选定的 Pauli 期望和旋转角 Jacobian，不替用户训练完整机器学习模型。
  DeepQuantum 上游固定 H 常量带约 `1e-8` 级数值误差，返回原始态和范数，不归一化掩盖偏差。
- Ocean 的 exact / simulated annealing 都是经典计算；Kaiwu Community 提供符号 QUBO、约束罚项和
  增广 Ising 映射，约定 `E=-sᵀJs+offset`、`s=2x-1`、末位辅助 spin 固定 `+1`。
  这些结果不是量子退火硬件数据。
- IQM 使用官方设备 target 转译与校验，再由 Aer 使用对应噪声模型及明确 seed 计算；
  Alice & Bob 使用官方本地 physical / logical / logical-noiseless 模型。均不读取在线设备校准。
- Pulser 的时间网格与量化、QoolQit 的无量纲缩放均在输出中保留。它们与 Bloqade 的参数不能未经换算混用。
- IonQ Tool 只运行官方 QIS 程序序列化，保留输入编号与最终测量映射；不宣称已完成真机原生门编译。
- Superstaq 远程调用只允许固定官方 HTTPS 服务，超时显式配置，不自动重试、跟随重定向或接受账户条款。
  远程编译会外发电路，可能消耗账户额度；不请求 shots、不提交 QPU 作业。连接启用与已有凭据不替代具体任务授权。

## 凭据与许可

Superstaq 在量子组件设置中手动启用，凭据使用 Harness 的 `SUPERSTAQ_API_KEY` 引用。
本地序列化无需密钥；目标查询和编译缺少密钥时在网络请求前失败。密钥不进入输入、配置文本或结果，
worker 错误由统一边界脱敏。其他新增连接无需云凭据。

QoolQit 1.4.0 为 MIT 衍生的定制许可证，其专利授权限于 internal research / academic use；
不能把它标成标准 MIT 或据此声称商业使用已获完整专利许可。Perceval 使用 MIT，并有 Exqalibur
Python binding 的组合例外。其余本轮 SDK 的锁定发行版许可证及来源见[第三方声明](../../THIRD_PARTY_NOTICES.md)。
安装保留上游许可文件，本仓库不复制或重发上游 SDK 源码、wheel 或二进制。

## 验证与交付范围

本地真实 SDK、严格 MCP 合同、错误返回、独立数值对照和真实 Harness 会话验证在本次开发环境执行。
Harness 使用本地模型协议夹具，能证明工具发现、调度和 Session event log 持久化，
不代表外部模型已自主完成任务。Superstaq 远程路径只用真实 SDK 加 HTTP 传输夹具验证；
本次没有访问账户、远程编译服务或量子硬件。

本轮为 L1，统一返回 `scientificValidation=not_evaluated`；工程/数值检查不代替 central Acceptance Builder
产生的科学验收。当前实际验证平台为 macOS arm64，其他系统的锁可解析性不等于已运行验证。
完整结果、独立审阅、输入输出与摘要见[本轮证据](evidence/vendor-sdks-2026-09-27.json)。
