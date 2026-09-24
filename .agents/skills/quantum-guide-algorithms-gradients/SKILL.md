---
name: quantum-guide-algorithms-gradients
description: "为 algorithms/gradients 选择完整的开源算法工作流，路由到本地可发现的专用 Skills。"
disable-model-invocation: true
user-invocable: true
---

# algorithms/gradients

本地开源适配。上游指南 ID：`algorithms/gradients`。

分类导航：保留用户显式调用；自动任务直接选择叶子方法 Skill，或使用 `quantum-algorithms` 查找。

## 选择工作流

按用户的数学问题、输入表示、计算规模和需要的输出选择一个叶子 Skill。知识解释可直接使用原理；计算任务加载叶子 Skill，使用其中的开源实现和现有代码执行 Tool。无需为阅读指南启动额外服务。

- [quantum-finite-difference](../quantum-finite-difference/SKILL.md)：Qiskit FiniteDiffEstimatorGradient，中心差分与显式 epsilon。
- [quantum-linear-combination](../quantum-linear-combination/SKILL.md)：Qiskit LinCombEstimatorGradient，实际生成线性组合导数电路。
- [quantum-parameter-shift](../quantum-parameter-shift/SKILL.md)：Qiskit ParamShiftEstimatorGradient，RY 参数移位规则。
- [quantum-qfi](../quantum-qfi/SKILL.md)：Qiskit QFI/ReverseQGT，纯态量子 Fisher 信息；不将其等同于任意测量的经典 Fisher 信息。
- [quantum-reverse](../quantum-reverse/SKILL.md)：Qiskit ReverseEstimatorGradient，反向态矢量导数。
- [quantum-spsa](../quantum-spsa/SKILL.md)：Qiskit SPSAEstimatorGradient，显式 epsilon、批量与随机种子；单次估计有统计误差。

全量条目见[覆盖表](../../../docs/integrations/UNITARYLAB_OPEN_COVERAGE.md)。如果用户描述跨领域，按实际依赖组合相关叶子 Skill；不要要求用户先阅读整条目录链。

## 来源与边界

上游 MIT 指南：[algorithms/gradients](https://github.com/unitarylab/quantum-skills/blob/c5436bb120812ad903ac776f58df89b803ced48c/algorithms/gradients/SKILL.md)。原文作为参考保存在固定检索库，本文件将执行路线改为开源 SDK。来源摘要和算法模块对应关系见[coverage.json](../../../examples/quantum-algorithms/coverage.json)，许可证与改动说明见[NOTICE](../../../examples/quantum-algorithms/NOTICE)。
