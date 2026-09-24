---
name: quantum-guide-algorithms-linear-systems
description: "为 algorithms/linear-systems 选择完整的开源算法工作流，路由到本地可发现的专用 Skills。"
disable-model-invocation: true
user-invocable: true
---

# algorithms/linear-systems

本地开源适配。上游指南 ID：`algorithms/linear-systems`。

分类导航：保留用户显式调用；自动任务直接选择叶子方法 Skill，或使用 `quantum-algorithms` 查找。

## 选择工作流

按用户的数学问题、输入表示、计算规模和需要的输出选择一个叶子 Skill。知识解释可直接使用原理；计算任务加载叶子 Skill，使用其中的开源实现和现有代码执行 Tool。无需为阅读指南启动额外服务。

- [quantum-aqc](../quantum-aqc/SKILL.md)：正定 Hermitian 系统的绝热线性求解路径、条件数相关 schedule 与分片幺正演化；增加 total_time 和 steps 检查绝热与离散误差。
- [quantum-hhl](../quantum-hhl/SKILL.md)：Hermitian 非奇异 A、QPE、有符号倒数旋转、反 QPE 与后选择；完整解向量来自模拟器，受相位位数和条件数影响。
- [quantum-lcu](../quantum-lcu/SKILL.md)：使用 Qiskit 的显式量子电路，保留输入、方法参数、实际概率或态矢量；模拟器全态读取不代表硬件可高效读取。
- [quantum-qsvt-qlsa](../quantum-qsvt-qlsa/SKILL.md)：Hermitian 非奇异矩阵，PennyLane QSVT 和受控 U/U† 后选择；有界奇次几何倒数多项式，输出实际残差，不承诺输入 epsilon 自动满足。
- [quantum-qft](../quantum-qft/SKILL.md)：使用 Qiskit 的显式量子电路，保留输入、方法参数、实际概率或态矢量；模拟器全态读取不代表硬件可高效读取。
- [quantum-qsp](../quantum-qsp/SKILL.md)：QSP/QSVT 相位综合计算 cos(t x) 的有界偶次多项式；报告截断误差和 block 缩放。
- [quantum-vqls](../quantum-vqls/SKILL.md)：Qiskit 参数电路与全局归一化残差 cost 的变分线性求解；报告数值残差与优化终止原因。

全量条目见[覆盖表](../../../docs/integrations/UNITARYLAB_OPEN_COVERAGE.md)。如果用户描述跨领域，按实际依赖组合相关叶子 Skill；不要要求用户先阅读整条目录链。

## 来源与边界

上游 MIT 指南：[algorithms/linear-systems](https://github.com/unitarylab/quantum-skills/blob/c5436bb120812ad903ac776f58df89b803ced48c/algorithms/linear-systems/SKILL.md)。原文作为参考保存在固定检索库，本文件将执行路线改为开源 SDK。来源摘要和算法模块对应关系见[coverage.json](../../../examples/quantum-algorithms/coverage.json)，许可证与改动说明见[NOTICE](../../../examples/quantum-algorithms/NOTICE)。
