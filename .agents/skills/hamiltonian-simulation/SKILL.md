---
name: hamiltonian-simulation
description: 使用开源 Qiskit 对实 Pauli 哈密顿量构建 Trotter-Suzuki 或 qDrift 演化电路，计算态矢量、资源与可选独立误差对照；解释确定性与随机公式的适用边界。
---

# 哈密顿量演化

相近入口、后端准备与位序差异按[共同选择说明](../../../docs/integrations/CAPABILITY_SELECTION.md)判断。

用于时间无关 Hermitian 哈密顿量的门模型演化、产品公式选择和精度/深度比较。
先确认实系数 Pauli 项、时间与单位（hbar=1）、初态、方法和步数。
Pauli 最左字符与返回态矢量的最高位均是 q0，电路 wire q[0] 对应同一物理量子位。
接受负时间、恒等项和重复项；重复项求和，恒等项作为精确全局相位。

调用 `simulate_hamiltonian`：

- `method=trotter`：`order=1` 或正偶数，默认 2；`steps` 是确切时间片数。保持项首次出现顺序。
- `method=qdrift`：`steps` 是确切抽样次数，`seed` 默认 0。按非恒等项系数绝对值抽样，保留系数符号。
- 默认返回 OpenQASM 3、电路资源和态矢量；`outputMode=circuit` 只构建电路。任意复初态使用归一化的 [实部, 虚部] 数组；电路本身仅包含演化，不含初态制备。
- `referenceMode=auto|required|skip` 控制独立 NumPy/SciPy 完整酉矩阵对照。auto 仅在不超过 6 qubits 时运行；required 尝试用户指定规模，skip 明确不计算。参考规模不限制主计算。

Trotter 比较同一 Hamiltonian/time 下不同步数和阶数的 Frobenius、谱范数误差及深度。
qDrift 是单次随机电路：比较多种 seed 的分布，不能将单条轨迹的误差当作平均通道误差界，
不能承诺单次误差随步数单调下降。步数或阶数不构成目标误差保证；不宣称量子加速。

Python 计算进程隔离由本地 MCP Server 提供，Harness MCP Client 注册 Tool。
运行前通过已有终端 Tool 执行 `npm run capability:hamiltonian:setup`，显式准备固定的开放依赖；
计算 Tool 不安装、不联网、不写结果文件。缺失或过期环境显式报错。
通过 `execution` 独立配置运行资源。用户决定规模，稠密内存成本须结合实际资源解释。
输出 `scientificValidation=not_evaluated`；执行成功和数值对照不构成中央科学验收。

这是 MIT 算法的开源适配；没有调用 UnitaryLab 模拟器或宣称集成整个算法库。
来源、复跑示例和差异见[集成说明](../../../docs/integrations/UNITARYLAB_OPEN_ADAPTATION.md)。
