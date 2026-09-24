# UnitaryLab 内容与算法的开源适配

OpenQuantum 将 MIT 参考内容与可执行算法分别接入。参考检索覆盖固定版本的 66 份指南；
首批计算适配是 Trotter-Suzuki 与 qDrift 哈密顿量模拟，使用 Qiskit、NumPy 和 SciPy。
这不表示接入整个 `unitarylab_algorithms` 库，也没有安装或执行 `unitarylab` 模拟器。

## 用户可以做什么

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
| 参考指南 | quantum-skills `c5436bb120812ad903ac776f58df89b803ced48c`，MIT | 66 份指南作为只读数据，逐文件摘要；不批量激活为 Skills |
| 算法序列 | unitarylab_algorithms `a8362e374da2ec2c68f582db645a7782e45bfc4b`，MIT | 适配 Trotter 的 Suzuki 递推、qDrift 的抽样公式 |
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
HHL、QSVT、其他算法和 PDE 不在首批执行范围内；独立热方程原型的状态保持不变。
