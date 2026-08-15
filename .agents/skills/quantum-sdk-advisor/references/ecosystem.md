# 量子软件栈选择参考

## 快速矩阵

| 任务 | 首选 | 适用理由 | OpenQuantum 当前状态 |
| --- | --- | --- | --- |
| QASM 3 电路解析、转译、指标比较 | Qiskit | 已有官方 MCP，默认无凭据可用 | 已集成 |
| Qiskit API、迁移和错误码查证 | Qiskit Docs | 官方文档 MCP，可返回直接页面 | 已集成 |
| 二量子位固定扇区 VQE 基态 | `quantum-ground-state` | 有确定性 solver、独立 reference、Validator 和 eval | 已集成并科学验收 |
| 可微分混合量子机器学习 | PennyLane | 自动微分、设备抽象、PyTorch/JAX 生态 | 可适配，尚未集成 MCP |
| Google 风格 NISQ、电路噪声和底层编译 | Cirq | 原生噪声模型、设备与门级控制 | 可适配，尚未集成 MCP |
| 容错量子资源估算和 Q# | Microsoft QDK / Q# | Q# 编译器、资源估算器和 Katas | 可适配，尚未集成 MCP |
| 稳定子电路与 QEC 解码 | Stim + PyMatching | 高性能稳定子模拟与 MWPM 解码 | 优先候选，需共同 Validator |
| 分子积分与电子结构 Hamiltonian | PySCF + Qiskit Nature | 经典量化学与量子映射边界清楚 | 优先候选，需固定依赖与 provenance |
| 误差缓解 | Mitiq | 多框架误差缓解工具集 | 候选；GPL-3.0 需单独审查 |
| AWS 设备和算法样例 | Amazon Braket | 官方 SDK、算法库和多硬件入口 | 云端候选，默认关闭 |
| GPU/HPC 混合量子工作流 | CUDA-Q | C++/Python 与 NVIDIA 加速生态 | 重型候选，不进入默认安装 |

## 选型细节

### Qiskit

适合 IBM 生态、OpenQASM 3、电路转译、V2 primitives 与 Runtime。OpenQuantum 已使用
[Qiskit MCP Servers](https://github.com/Qiskit/mcp-servers)，普通电路和文档工作不需要 IBM Token；
真实 Runtime 和云转译保持可选。

### PennyLane

适合自动微分、混合优化、量子机器学习和跨设备原型。把梯度、优化器状态、数据划分和后端配置纳入
Artifact；不要只保留最终 loss。官方来源：
[PennyLane](https://github.com/PennyLaneAI/pennylane)。

### Cirq

适合 Google Quantum AI 风格的 NISQ 电路、噪声模型、门集和设备级转换。若任务最终部署在 IBM
硬件，优先留在 Qiskit，避免无意义的跨框架转换。官方来源：
[Cirq](https://github.com/quantumlib/Cirq)。

### Microsoft QDK / Q#

适合 Q# 程序、容错资源估算与教学案例。资源估算结论必须记录逻辑模型、错误预算和目标架构，不能只给
一个物理量子位数字。官方来源：
[Microsoft Quantum Development Kit](https://github.com/microsoft/qdk)。

### Stim 与 PyMatching

适合 Clifford/稳定子线路的大规模采样、探测事件模型与最小权完美匹配解码。二者适合组成一个窄作用域
QEC Skill：Stim 产生 syndrome/detector 事实，PyMatching 解码，独立 Validator 重放逻辑错误率统计。
官方来源：[Stim](https://github.com/quantumlib/Stim)、
[PyMatching](https://github.com/oscarhiggott/PyMatching)。

### PySCF 与 Qiskit Nature

适合从分子几何、基组和电子结构方法生成可追溯 Hamiltonian，再把结果交给后续量子算法。
几何、单位、basis、active space、charge、multiplicity 与积分摘要都必须进入 provenance。
官方来源：[PySCF](https://github.com/pyscf/pyscf)、
[Qiskit Nature](https://github.com/qiskit-community/qiskit-nature)。

### Mitiq

适合零噪声外推、概率误差抵消等误差缓解研究。误差缓解不是纠错，也不保证改善每个任务；必须保留原始
与缓解后的估计、shot 开销和不确定度。官方来源：
[Mitiq](https://github.com/unitaryfoundation/mitiq)。

### Amazon Braket 与 CUDA-Q

两者都属于有价值但不应默认安装的执行后端。Braket 涉及云账户、区域、设备费用和任务提交；CUDA-Q
涉及较重的本地/HPC 依赖。只有出现真实项目需求时再增加 MCP，且默认关闭。
官方来源：[Amazon Braket Algorithm Library](https://github.com/amazon-braket/amazon-braket-algorithm-library)、
[CUDA-Q](https://github.com/NVIDIA/cuda-quantum)。
