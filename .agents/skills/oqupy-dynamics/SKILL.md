---
name: oqupy-dynamics
description: 使用 OQuPy TEMPO 求解Ohmic spin-boson 非马尔可夫动力学，解释时间步长、环境记忆和张量截断对结果的影响。
---

# OQuPy 环境记忆动力学

调用 Harness 注册的 `oqupy_local.simulate_oqupy_spin_boson`。用于需要环境记忆的两能级模型；纯 Markovian Lindblad 参数扫描可使用 Dynamiqs。

模型为 `H=(tunneling X+bias Z)/2`，系统与环境的耦合算符为 `Z/2`，`J(w)=2 alpha w exp(-w/cutoff)`，`hbar=kB=1`。初态是用户所选计算基态/激发态/plus 与热 Gaussian bath 的因子化状态；这些标签不是相互作用系统的平衡态。

- 先明确频率、温度和时间的同一单位体系。步数、环境记忆步数、耦合强度和时长由输入决定；记忆步数不能超过演化步数。
- `memoryTime = memorySteps * duration / steps`。减小时间步长时要相应增大 memorySteps 才能保持同一物理记忆；若资源边界不允许，明确说明无法进行该收敛比较。
- 用独立的记忆长度扫描判断记忆截断影响，再看时间网格与 SVD 截断。固定 `epsrel=1e-7` 不是观测量误差上界。
- 读取 Bloch 轨迹、迹误差和最小本征值；有限记忆 TEMPO 不能自动宣称数值收敛、精确解或科学验收。
- 本能力为 L1，`scientificValidation=not_evaluated`。首次调用可安装固定依赖、写缓存；独立环境保留 OQuPy 所需 NumPy 1.x。

安装、范围和解析对照见 [接入说明](../../../docs/integrations/UNITARY_ECOSYSTEM.md)。

计算规模和资源由调用方选择，适配器不设置量子位、门数、项数、采样数或迭代数的人工上限。默认值用于方便调用；模型、格式和数值表示要求仍由输入合同检查。详见[计算参数与资源配置](../../../docs/integrations/SCALABLE_BRIDGES.md)。
