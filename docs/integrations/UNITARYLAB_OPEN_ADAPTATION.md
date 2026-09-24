# UnitaryLab 内容与算法的开源适配

固定版本的 **66 份 quantum-skills 指南已全部对应为原生 Skill**；其中 **49 项算法工作流带可运行
开源示例**，逐项覆盖 unitarylab_algorithms 的 **39 个算法模块**。其余 17 项是分类、后端和开源迁移指南。
参考原文仍可通过 `quantum_practices` 检索，每项返回对应的本地使用路径。

66 项中，53 个方法与入口可由模型自动选择；13 个分类索引仅保留用户显式调用，
例如 `/quantum-guide-algorithms`。所有原名称、来源映射与 49 个计算入口保留。
这一导航调整及其兼容验证见[扩展治理清单](../architecture/EXTENSION_GOVERNANCE.md)。

Agent 根据任务加载 Skill，经 Harness 已有 `bash` / `pwsh` Tool 使用开源 SDK 执行代码并返回结果。
新增工作流不增加服务或运行时；执行依赖和 L1 检查集中于 `quantum-algorithms` 能力，其他适配 Skill
是复用这些工具的 L0 指令，不重复登记执行合同。

## 使用全部开源工作流

```bash
npm run capability:algorithms:setup
```

重启使用本仓库 Preset 的 Harness 后可直接提出任务，例如“用 HHL 解这个矩阵并检查残差”、
“算 H₂/STO-3G 的 DMRG 能量并与 FCI 比较”或“运行二维热方程薛定谔化的网格收敛检查”。
实际参数、JSON 输入、Windows 命令与复跑方式见[运行说明](../../examples/quantum-algorithms/README.md)；
[覆盖表](UNITARYLAB_OPEN_COVERAGE.md)逐项列出全部 Skill、示例和上游模块。

完整覆盖指指南和算法模块都有本地使用路径，**不表示原库全部 Python API、参数组合和闭源优化器兼容**。
Cartan 用谱分解替换未开放的 Cartan-Lax；分子 DMRG 使用 PySCF + quimb，输出态可用开源 MPS/Isometry
制备，未复制闭源 CVD。QSP/QSVT 使用实际相位综合和后选择电路；PDE 使用显式辅助寄存器的幺正
薛定谔化，没有隐式经典回退。所有范围与替换差异见
[`coverage.json`](../../examples/quantum-algorithms/coverage.json)和各 Skill。

```bash
npm run capability:algorithms:catalog
npm run capability:algorithms:test
npm run capability:algorithms:live
```

live 核验实际运行 49 个入口，包括复数态制备、有符号 HHL 与 RHS 范数、QSVT 多项式收敛、
解析梯度、MPS/dense Strang、DMRG/独立 FCI 和 PDE 辅助网格收敛。真实 Harness 核对全部 66 个 Skill
的发现，并读取 HHL Skill、经现有 shell Tool 执行 HHL/QSVT、接收预期错误和重读 Session event log。
模型使用本地协议替身，未调用外部模型或硬件；结果保持 `scientificValidation=not_evaluated`。
见[完整适配核验摘要](evidence/unitarylab-complete-open-2026-09-24.json)。

依赖采用 Qiskit 2.5.2、Qiskit Algorithms 0.4.0、PennyLane 0.45.1、quimb 1.15.0、PySCF 2.14.0、
NumPy 2.5.3 和 SciPy 1.18.1；完整 uv.lock、MIT 来源与变更说明随
[示例目录](../../examples/quantum-algorithms/NOTICE)保存，不包含 UnitaryLab 模拟器依赖。
桌面分发清单包含这些 Skill、示例和锁；源码接入不表示已发布新安装包。

## 保留的固定 Hamiltonian 计算 Tool

提供时间无关的实 Pauli 哈密顿量、演化时间与步数，调用 `simulate_hamiltonian`：

- Trotter：一阶或正偶数阶 Suzuki 公式，保持输入项首次出现顺序；步数是实际时间片数。
- qDrift：按非恒等项系数绝对值抽样，保留系数符号；步数是抽样次数，默认随机种子为 0。
- 返回 OpenQASM 3、门数/深度、可选态矢量、来源和依赖锁摘要。
- 可选独立 NumPy Kronecker Hamiltonian + SciPy `expm` 对照，报告完整酉矩阵差的
  Frobenius 范数与谱范数；不消除全局相位后再比较。

`hamiltonian-simulation` Skill 指导参数选择、误差收敛比较及解释。
独立 Python 环境通过本地 stdio MCP Server 隔离，Agent Preset 中的 Harness MCP Client
将唯一的计算 Tool 注册为 `mcp__hamiltonian_local__simulate_hamiltonian`。
计算成功、Skill 被发现、数值对照与最终科学验收是不同事实。

## 安装与输入

在项目目录显式准备固定依赖，然后启动或重启使用该 Preset 的 Harness：

```bash
npm run capability:hamiltonian:setup
```

Python 3.12 环境位于忽略的 `.openquantum/python-envs/hamiltonian-simulation/`。
setup 校验依赖锁未改变后写入锁摘要标记；计算时只直接运行此环境的 Python，不调用包管理器、
不联网、不自动创建或修补环境，也不写计算结果文件。标记缺失或与当前锁不符时显式报错。
因此计算调用的副作用为 `read-only`，setup 的依赖下载与环境写入由显式安装命令承担。
该标记记录 setup 使用的依赖锁，不是对本地环境被人为修改的安全认证。

例子：

```json
{
  "numQubits": 2,
  "terms": [
    { "pauli": "XI", "coefficient": 0.7 },
    { "pauli": "ZY", "coefficient": -0.4 },
    { "pauli": "IZ", "coefficient": 0.2 },
    { "pauli": "II", "coefficient": 0.1 }
  ],
  "time": 0.8,
  "method": "trotter",
  "order": 2,
  "steps": 8,
  "referenceMode": "required"
}
```

改用 qDrift 时设置 `method=qdrift`、移除 `order`，并明确 `steps` 和 `seed`。
`order` 只用于 Trotter，`seed` 只用于 qDrift，不接受含糊或被静默忽略的参数。
默认 `initialState=zero`；也支持 `plus` 或按 q0 最高位排序的归一化复数对数组。
Pauli 最左字符对应 q0；Qiskit wire q[0] 仍是同一物理量子位，适配层处理态矢量位序转换。
使用 hbar=1，系数与时间单位必须相容；允许负时间、零哈密顿量与恒等项。
重复项求和，恒等项作为精确全局相位；OpenQASM 显式保留 `gphase`。

输入规模由调用者决定。`outputMode=circuit` 不计算态矢量；
`referenceMode=auto` 只在不超过 6 qubits 时进行稠密对照，`required` 尝试指定规模，
`skip` 不进行对照。自动参考阈值不限制主计算或显式参考请求。
态矢量空间随 `2^n` 增长，完整酉矩阵随 `4^n` 增长；仅构建电路可避免这些分配。
资源通过 `execution.timeoutMs`、`maxOutputBytes`、`threads` 单独配置，省略时沿用部署设置。

## 来源与改动

| 组件 | 固定来源 | 本地使用 |
| --- | --- | --- |
| 参考检索器 | quantum-practices `572a24c9b5c9787caec98810351f5cb17c82250e`，MIT | 保留原始检索代码与版权 |
| 参考指南 | quantum-skills `c5436bb120812ad903ac776f58df89b803ced48c`，MIT | 原文作为只读数据，逐文件摘要；另外生成 66 个开源适配 Skill |
| 算法序列 | unitarylab_algorithms `a8362e374da2ec2c68f582db645a7782e45bfc4b`，MIT | 39 个模块逐项映射开源工作流；Trotter/qDrift 的固定 Tool 保留独立合同 |
| 电路与数值后端 | Qiskit 2.5.2 / NumPy 2.5.3 / SciPy 1.18.1 | Apache-2.0 / BSD-3-Clause / BSD-3-Clause；完整依赖锁随源码 |

原算法文件的路径与 SHA-256 见
[`source.json`](../../.agents/skills/hamiltonian-simulation/source.json)，完整原始 MIT 许可和改动声明见
[`LICENSE`](../../.agents/skills/hamiltonian-simulation/LICENSE)、
[`NOTICE`](../../.agents/skills/hamiltonian-simulation/NOTICE)。
本地桥接改用 Qiskit 门构建；不依赖上游 BaseAlgorithm、绘图、隐式目录写入或模拟器库。
接受显式 Pauli 项，避免先展开稠密矩阵。去除上游步数启发式及未形成误差保证的 `error` 参数。
qDrift 使用局部 PCG64 随机数生成器；抽样前合并重复项并剥离恒等相位，
其有限步随机序列不承诺与上游全局随机数实现逐项相同。

参考库从 60 增至 66 项：新增 quantum-chemistry 索引、molecular-dmrg、ising、
search 索引、glued-trees 和 hidden-shift；4 份既有索引/模拟器指南发生变化，无删除。
上游对其模拟器的偏好及安装命令仍是参考数据；本地明确采用开源后端，
Trotter/qDrift 检索结果指向本地 Skill 与 Tool 合同。详见[参考检索说明](QUANTUM_PRACTICES.md)。

## 核验与边界

```bash
npm run capability:quantum-practices:catalog
npm run capability:quantum-practices:test
npm run capability:hamiltonian:test
npm run capability:hamiltonian:live
npm run capability:conformance
npm run capability:contracts:test
npm run harness:config
```

数值测试涵盖单 Pauli 解析解、非对易项的一/二/四阶收敛、独立稠密乘积、
位序、复初态、恒等相位、负系数、负时间、重复项抵消、零时间、随机种子、
跳过参考、30-qubit 仅构建电路及超过自动阈值的显式参考。
合同测试涵盖缺失/过期环境、无效输入、进程失败、来源摘要不符、取消与资源继承。
真实 Harness 测试使用本地模型协议替身，检查 Skill 发现、两种公式调用、失败返回、
模型协议接收结果以及 Session event log 重读；未调用外部模型或真实硬件。
机器可读摘要见[本次证据](evidence/unitarylab-open-2026-09-24.json)。

这是 L1 计算能力，结果固定为 `scientificValidation=not_evaluated`。
参考误差不是中央 Acceptance。qDrift 单次随机电路误差不是平均通道误差界，
不承诺随单次步数单调下降；Trotter 步数与阶数也不自动保证用户目标误差。
门数使用发出的 h/s/sdg/rz/cx 基础门集合，不含初态制备成本，不是具体硬件资源估计。
HHL、QSVT、其他算法和 PDE 通过上述完整工作流使用；已有独立热方程原型保留为历史实验。
