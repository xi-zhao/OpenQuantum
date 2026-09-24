# 相近能力的选择

本页集中维护交叉入口的选择规则。原 Skill、Tool 名称与参数保持有效；按输入、方法和输出选择一个主入口，
不要求为了使用某项能力逐个调用同类工具。工具缺失时先检查连接和所选范围，不绕过禁用状态。

## Hamiltonian 产品公式

- 已有实系数 Pauli 项，需要结构化参数、资源控制、可选参考或只生成电路：使用
  [`hamiltonian-simulation`](../../.agents/skills/hamiltonian-simulation/SKILL.md) 的 `simulate_hamiltonian`。
- 需要解释、修改任务代码或组合其他 Qiskit 算法：使用 `quantum-trotter` / `quantum-qdrift` 示例。
  两个示例已经复用同一 Hamiltonian 实现，不维护第二份产品公式。
- Trotter/Suzuki 是确定性分步，比较相同 Hamiltonian/time 的阶数、时间片与电路成本；
  qDrift 按系数绝对值随机抽样，需要保留 seed，并比较多条独立轨迹。单条轨迹不代表平均通道误差界。
- 固定 Tool 的 Pauli 左字符和态矢量最高位是 q0；示例采用 Qiskit 的 q[n-1] 左置约定。
  示例适配层显式反转 Pauli 字符和态矢量位序，电路物理 wire 仍是 q[i]。不要直接互换未转换的输入/输出。

## Qiskit 电路、示例和硬件

- QASM 3/QPY 读取、审查、转换及转译：选择 `qiskit-circuit-workbench`，使用 `mcp__qiskit__*`。
  Qiskit Docs 用于 API 查证，需要网络；电路 Tool 与 Docs 是两个独立连接。
- 生成或修改本地算法：选择 `quantum-guide-simulators-qiskit` 和实际方法 Skill，按
  [示例依赖说明](../../examples/quantum-algorithms/README.md)准备本地 SDK。Python 环境与 Qiskit MCP 连接独立。
- QPY/QASM 转换优先使用 Qiskit；Gym 的两个同名限定入口保留给已有 Gym 工作流及兼容用途。
  两个服务的结果合同各自有效，不声明可任意替换。Gym 用于训练或使用强化学习电路综合模型。
- 国内 Provider 后端发现、凭据缺口说明：`fieldqkit-hardware`，只查询已有接口返回的元数据。
  C 驱动设备 ABI 查询使用 `qdmi-device`；示例驱动数据不是在线 QPU 状态。
- 已选择远程设备/任务服务时才考虑 opt-in 的 `quantum_hardware` 或厂商 Runtime。
  服务启用、具备凭据、选择工具范围均不构成提交、取消、付费任务或数据外发授权。

## VQD 与本征求解

| 用户需要 | 主入口 | 保留的差异 |
| --- | --- | --- |
| 可修改的 Qiskit VQD 示例 | `quantum-vqd` | 实际 ansatz、SciPy 优化、可指定 penalty；Pauli 使用 Qiskit 位序 |
| 固定 OpenQARP VQD 与独立残差/正交性检查 | `openqarp-excited-states` | 复数 HEA、BFGS、按保守谱宽选择 penalty、保持 deflation 顺序；Pauli 左字符 q0，但 q0 是态矢量最低有效位 |
| 稠密 Hermitian 矩阵前 k 个或全部本征对 | `quantum-numpy-eigensolver` | 经典 NumPy `eigh`，返回残差，不是量子算法 |
| 同一矩阵最低本征对 | `quantum-numpy-minimum-eigensolver` | 已直接复用 `numpy_eigensolver(hamiltonian, 1)`，保留简便旧入口 |

VQD 两个实现的输入、优化过程与结果合同不同，只合并选择说明。对照时先统一物理 Hamiltonian 和位序，
再比较能量、态间重叠、残差及收敛；优化器成功不等于正确激发态或最终科学验收。

## 大型可选服务的工具范围

三个连接仍默认关闭。启用后未选择范围时使用 `full`，保留全部原名，兼容原会话。
部署者可在启动 Harness 前设置下表环境变量，重启后让该 Preset 的新 Agent 使用相应范围。
这只筛选模型可见及可调用的工具；Harness 继续拥有注册、审批和执行，不新建 Tool、代理服务或会话。

| 环境变量 | 取值与用途 |
| --- | --- |
| `OPENQUANTUM_GYM_TOOL_PROFILE` | `full`；`training` 训练及管理模型；`synthesis` 加载模型并综合电路；`conversion` 保留旧格式转换流程 |
| `OPENQUANTUM_HARDWARE_TOOL_PROFILE` | `full`；`devices` 设备查询；`jobs` 已选任务管理；`chemistry` 化学工作流；`search` 搜索与碰撞实验；`verification` 线路/硬件结果检查 |
| `OPENQUANTUM_FLAGQUANTUM_TOOL_PROFILE` | `full`；`compile` 分析、优化、路由、输出；`simulate` 本地仿真；`train` 参数训练及仿真 |

专业范围保留完成该流程所需的查询和前后步骤；可调用名称由当前注册内容与范围交集决定。
服务重连时更新筛选，多个任务的限制互不覆盖。原会话若需要被筛出的旧工具，将范围恢复为 `full` 并重启 Host。
无效范围使配置明确失败，不静默开放全部工具。精确名单见
[Host Plugin](../../runtime/openquantum/agent-presets/openquantum/optional-tool-profiles.mjs)，
它使用 Harness 原生 scoped restriction；原副作用及凭据规则不变。
