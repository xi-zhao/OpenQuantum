---
name: quantum-guide-algorithms-quantum-machine-learning
description: "为 algorithms/quantum-machine-learning 选择完整的开源算法工作流，路由到本地可发现的专用 Skills。"
disable-model-invocation: true
user-invocable: true
---

# algorithms/quantum-machine-learning

本地开源适配。上游指南 ID：`algorithms/quantum-machine-learning`。

分类导航：保留用户显式调用；自动任务直接选择叶子方法 Skill，或使用 `quantum-algorithms` 查找。

## 选择工作流

按用户的数学问题、输入表示、计算规模和需要的输出选择一个叶子 Skill。知识解释可直接使用原理；计算任务加载叶子 Skill，使用其中的开源实现和现有代码执行 Tool。无需为阅读指南启动额外服务。

- [quantum-cvqnn](../quantum-cvqnn/SKILL.md)：两模有限 Fock 空间的位移、压缩、旋转、Kerr 和分束器层；SciPy 有限差分优化替换 Torch autograd，需增加 cutoff 检查截断。
- [quantum-fermi-hubbard-vqe](../quantum-fermi-hubbard-vqe/SKILL.md)：开放边界 Hubbard 链，Jordan-Wigner 与全 Fock 空间 VQE；粒子数是测量值，未强制固定粒子数扇区。
- [quantum-ising](../quantum-ising/SKILL.md)：开放边界二维矩形 Ising 网格，quimb MPS 与二阶 Strang 演化；报告键维数及截断参数，不分配完整态矢量。
- [quantum-qaoa](../quantum-qaoa/SKILL.md)：无权 MaxCut 的交替 cost/mixer 电路与参数优化；输出平均 cut 和最高概率位串。
- [quantum-qcbm](../quantum-qcbm/SKILL.md)：参数电路 Born 分布拟合目标概率，KL 目标与 total variation 对照。
- [quantum-vqc](../quantum-vqc/SKILL.md)：RY 特征编码与参数电路二分类；输出训练集指标，不能当作泛化效果。
- [quantum-vqe](../quantum-vqe/SKILL.md)：实 Pauli Hamiltonian、RY/RZ/CX ansatz 和 SciPy 优化；能量、优化记录及保留的参数可复查。

全量条目见[覆盖表](../../../docs/integrations/UNITARYLAB_OPEN_COVERAGE.md)。如果用户描述跨领域，按实际依赖组合相关叶子 Skill；不要要求用户先阅读整条目录链。

## 来源与边界

上游 MIT 指南：[algorithms/quantum-machine-learning](https://github.com/unitarylab/quantum-skills/blob/c5436bb120812ad903ac776f58df89b803ced48c/algorithms/quantum-machine-learning/SKILL.md)。原文作为参考保存在固定检索库，本文件将执行路线改为开源 SDK。来源摘要和算法模块对应关系见[coverage.json](../../../examples/quantum-algorithms/coverage.json)，许可证与改动说明见[NOTICE](../../../examples/quantum-algorithms/NOTICE)。
