---
name: quantum-guide-algorithms
description: "为 algorithms 选择完整的开源算法工作流，路由到本地可发现的专用 Skills。"
disable-model-invocation: true
user-invocable: true
---

# algorithms

本地开源适配。上游指南 ID：`algorithms`。

分类导航：保留用户显式调用；自动任务直接选择叶子方法 Skill，或使用 `quantum-algorithms` 查找。

## 选择工作流

按用户的数学问题、输入表示、计算规模和需要的输出选择一个叶子 Skill。知识解释可直接使用原理；计算任务加载叶子 Skill，使用其中的开源实现和现有代码执行 Tool。无需为阅读指南启动额外服务。

- [quantum-discrete-log](../quantum-discrete-log/SKILL.md)：可逆 g^a y^b oracle、循环群 Fourier 采样与同余恢复；不把已知对数写进 oracle。
- [quantum-shor](../quantum-shor/SKILL.md)：可逆模乘 oracle、QPE/连分数和因子验证；密集 oracle 的教学规模模拟，失败明确返回需换基数或精度。
- [quantum-simon](../quantum-simon/SKILL.md)：二对一 XOR oracle、Hadamard 采样和 GF(2) 零空间恢复；样本不足时不编造 secret。
- [quantum-numpy-minimum-eigensolver](../quantum-numpy-minimum-eigensolver/SKILL.md)：NumPy 最小本征对，明确标记经典算法并报告残差。
- [quantum-numpy-eigensolver](../quantum-numpy-eigensolver/SKILL.md)：NumPy Hermitian 稠密本征求解，明确标记经典算法并报告特征残差。
- [quantum-vqd](../quantum-vqd/SKILL.md)：通过逐态重叠惩罚求激发态（VQD），报告能量与态间重叠；惩罚和 ansatz 会影响收敛。
- [quantum-finite-difference](../quantum-finite-difference/SKILL.md)：Qiskit FiniteDiffEstimatorGradient，中心差分与显式 epsilon。
- [quantum-linear-combination](../quantum-linear-combination/SKILL.md)：Qiskit LinCombEstimatorGradient，实际生成线性组合导数电路。
- [quantum-parameter-shift](../quantum-parameter-shift/SKILL.md)：Qiskit ParamShiftEstimatorGradient，RY 参数移位规则。
- [quantum-qfi](../quantum-qfi/SKILL.md)：Qiskit QFI/ReverseQGT，纯态量子 Fisher 信息；不将其等同于任意测量的经典 Fisher 信息。
- [quantum-reverse](../quantum-reverse/SKILL.md)：Qiskit ReverseEstimatorGradient，反向态矢量导数。
- [quantum-spsa](../quantum-spsa/SKILL.md)：Qiskit SPSAEstimatorGradient，显式 epsilon、批量与随机种子；单次估计有统计误差。
- [quantum-cartan](../quantum-cartan/SKILL.md)：实对称 Hamiltonian 的 SO(N) 谱 Cartan 分解；采用 SciPy Schur 替换未开放的 Cartan-Lax 优化器，不宣称复刻其优化轨迹。
- [quantum-qdrift](../quantum-qdrift/SKILL.md)：使用 Qiskit 的显式量子电路，保留输入、方法参数、实际概率或态矢量；模拟器全态读取不代表硬件可高效读取。
- [quantum-hamiltonian-qsp](../quantum-hamiltonian-qsp/SKILL.md)：偶/奇 QSP 多项式通过 LCU 合成 exp(-iHt)；稠密 block encoding 与后选择，次数控制截断误差。
- [quantum-taylor](../quantum-taylor/SKILL.md)：截断 Taylor 级数展开为 Pauli LCU，实际执行 PREPARE/SELECT/unprepare 并报告后选择概率；无量子加速主张。
- [quantum-trotter](../quantum-trotter/SKILL.md)：使用 Qiskit 的显式量子电路，保留输入、方法参数、实际概率或态矢量；模拟器全态读取不代表硬件可高效读取。
- [quantum-aqc](../quantum-aqc/SKILL.md)：正定 Hermitian 系统的绝热线性求解路径、条件数相关 schedule 与分片幺正演化；增加 total_time 和 steps 检查绝热与离散误差。
- [quantum-hhl](../quantum-hhl/SKILL.md)：Hermitian 非奇异 A、QPE、有符号倒数旋转、反 QPE 与后选择；完整解向量来自模拟器，受相位位数和条件数影响。
- [quantum-lcu](../quantum-lcu/SKILL.md)：使用 Qiskit 的显式量子电路，保留输入、方法参数、实际概率或态矢量；模拟器全态读取不代表硬件可高效读取。
- [quantum-qsvt-qlsa](../quantum-qsvt-qlsa/SKILL.md)：Hermitian 非奇异矩阵，PennyLane QSVT 和受控 U/U† 后选择；有界奇次几何倒数多项式，输出实际残差，不承诺输入 epsilon 自动满足。
- [quantum-qft](../quantum-qft/SKILL.md)：使用 Qiskit 的显式量子电路，保留输入、方法参数、实际概率或态矢量；模拟器全态读取不代表硬件可高效读取。
- [quantum-qsp](../quantum-qsp/SKILL.md)：QSP/QSVT 相位综合计算 cos(t x) 的有界偶次多项式；报告截断误差和 block 缩放。
- [quantum-vqls](../quantum-vqls/SKILL.md)：Qiskit 参数电路与全局归一化残差 cost 的变分线性求解；报告数值残差与优化终止原因。
- [quantum-amplitude-amplification](../quantum-amplitude-amplification/SKILL.md)：使用 Qiskit 的显式量子电路，保留输入、方法参数、实际概率或态矢量；模拟器全态读取不代表硬件可高效读取。
- [quantum-amplitude-estimation](../quantum-amplitude-estimation/SKILL.md)：使用 Qiskit 的显式量子电路，保留输入、方法参数、实际概率或态矢量；模拟器全态读取不代表硬件可高效读取。
- [quantum-grover](../quantum-grover/SKILL.md)：使用 Qiskit 的显式量子电路，保留输入、方法参数、实际概率或态矢量；模拟器全态读取不代表硬件可高效读取。
- [quantum-hadamard-test](../quantum-hadamard-test/SKILL.md)：使用 Qiskit 的显式量子电路，保留输入、方法参数、实际概率或态矢量；模拟器全态读取不代表硬件可高效读取。
- [quantum-hadamard-transform](../quantum-hadamard-transform/SKILL.md)：使用 Qiskit 的显式量子电路，保留输入、方法参数、实际概率或态矢量；模拟器全态读取不代表硬件可高效读取。
- [quantum-qpe](../quantum-qpe/SKILL.md)：使用 Qiskit 的显式量子电路，保留输入、方法参数、实际概率或态矢量；模拟器全态读取不代表硬件可高效读取。
- [quantum-molecular-dmrg](../quantum-molecular-dmrg/SKILL.md)：PySCF 活性空间积分、Jordan-Wigner MPO 与 quimb 双站点 DMRG。使用开源态制备替换闭源 CVD；当前示例的稠密 Hamiltonian 预处理需要 O(4^n) 存储。
- [quantum-qldpc](../quantum-qldpc/SKILL.md)：HGP CSS 校验矩阵、GF(2) 秩、交换关系和 syndrome；码距未计算。解码任务继续使用 ldpc-decoding Skill。
- [quantum-cvqnn](../quantum-cvqnn/SKILL.md)：两模有限 Fock 空间的位移、压缩、旋转、Kerr 和分束器层；SciPy 有限差分优化替换 Torch autograd，需增加 cutoff 检查截断。
- [quantum-fermi-hubbard-vqe](../quantum-fermi-hubbard-vqe/SKILL.md)：开放边界 Hubbard 链，Jordan-Wigner 与全 Fock 空间 VQE；粒子数是测量值，未强制固定粒子数扇区。
- [quantum-ising](../quantum-ising/SKILL.md)：开放边界二维矩形 Ising 网格，quimb MPS 与二阶 Strang 演化；报告键维数及截断参数，不分配完整态矢量。
- [quantum-qaoa](../quantum-qaoa/SKILL.md)：无权 MaxCut 的交替 cost/mixer 电路与参数优化；输出平均 cut 和最高概率位串。
- [quantum-qcbm](../quantum-qcbm/SKILL.md)：参数电路 Born 分布拟合目标概率，KL 目标与 total variation 对照。
- [quantum-vqc](../quantum-vqc/SKILL.md)：RY 特征编码与参数电路二分类；输出训练集指标，不能当作泛化效果。
- [quantum-vqe](../quantum-vqe/SKILL.md)：实 Pauli Hamiltonian、RY/RZ/CX ansatz 和 SciPy 优化；能量、优化记录及保留的参数可复查。
- [quantum-advection](../quantum-advection/SKILL.md)：周期边界、常速一维平流，中心差分和显式薛定谔化电路；不接受并静默回退所谓 block 模式。
- [quantum-heat-1d](../quantum-heat-1d/SKILL.md)：齐次一维热方程，周期或零 Dirichlet 边界；显式辅助 Fourier 寄存器的幺正薛定谔化电路、截面恢复和离散热方程参照。
- [quantum-heat-2d](../quantum-heat-2d/SKILL.md)：齐次二维方形网格热方程，周期或零 Dirichlet 边界；显式薛定谔化电路。空间与辅助网格误差需要分别收敛。
- [quantum-glued-trees](../quantum-glued-trees/SKILL.md)：随机交替叶环连接的双树连续时间邻接矩阵量子行走；稠密编译和出口概率，不宣称搜索加速。
- [quantum-hidden-shift](../quantum-hidden-shift/SKILL.md)：偶数位二次 bent 函数的 shifted/dual 相位 oracle；其他函数族需要另写任务代码。
- [quantum-mottonen](../quantum-mottonen/SKILL.md)：PennyLane Möttönen 均匀受控旋转态制备；输入正规化后保留复相位。
- [quantum-mps](../quantum-mps/SKILL.md)：SVD 分解、可选键截断、显式右规范化与 PennyLane MPSPrep；报告实际制备保真度及辅助位清零概率。
- [quantum-multiplexer](../quantum-multiplexer/SKILL.md)：Qiskit StatePreparation/Isometry 的均匀受控门合成；保留复振幅、输出位序与保真度。
- [quantum-pauli](../quantum-pauli/SKILL.md)：PennyLane ArbitraryStatePreparation 的 Pauli 旋转优化；报告保真度及优化状态，迭代结束不自动代表达到目标误差。
- [quantum-superposition](../quantum-superposition/SKILL.md)：PennyLane Superposition 的计算基叠加与辅助位清零；系数可为复数。

全量条目见[覆盖表](../../../docs/integrations/UNITARYLAB_OPEN_COVERAGE.md)。如果用户描述跨领域，按实际依赖组合相关叶子 Skill；不要要求用户先阅读整条目录链。

## 来源与边界

上游 MIT 指南：[algorithms](https://github.com/unitarylab/quantum-skills/blob/c5436bb120812ad903ac776f58df89b803ced48c/algorithms/SKILL.md)。原文作为参考保存在固定检索库，本文件将执行路线改为开源 SDK。来源摘要和算法模块对应关系见[coverage.json](../../../examples/quantum-algorithms/coverage.json)，许可证与改动说明见[NOTICE](../../../examples/quantum-algorithms/NOTICE)。
