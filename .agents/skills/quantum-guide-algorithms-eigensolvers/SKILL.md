---
name: quantum-guide-algorithms-eigensolvers
description: "为 algorithms/eigensolvers 选择完整的开源算法工作流，路由到本地可发现的专用 Skills。"
---

# algorithms/eigensolvers

本地开源适配。上游指南 ID：`algorithms/eigensolvers`。

## 选择工作流

按用户的数学问题、输入表示、计算规模和需要的输出选择一个叶子 Skill。知识解释可直接使用原理；计算任务加载叶子 Skill，使用其中的开源实现和现有代码执行 Tool。无需为阅读指南启动额外服务。

- [quantum-numpy-minimum-eigensolver](../quantum-numpy-minimum-eigensolver/SKILL.md)：NumPy 最小本征对，明确标记经典算法并报告残差。
- [quantum-numpy-eigensolver](../quantum-numpy-eigensolver/SKILL.md)：NumPy Hermitian 稠密本征求解，明确标记经典算法并报告特征残差。
- [quantum-vqd](../quantum-vqd/SKILL.md)：通过逐态重叠惩罚求激发态（VQD），报告能量与态间重叠；惩罚和 ansatz 会影响收敛。

全量条目见[覆盖表](../../../docs/integrations/UNITARYLAB_OPEN_COVERAGE.md)。如果用户描述跨领域，按实际依赖组合相关叶子 Skill；不要要求用户先阅读整条目录链。

## 来源与边界

上游 MIT 指南：[algorithms/eigensolvers](https://github.com/unitarylab/quantum-skills/blob/c5436bb120812ad903ac776f58df89b803ced48c/algorithms/eigensolvers/SKILL.md)。原文作为参考保存在固定检索库，本文件将执行路线改为开源 SDK。来源摘要和算法模块对应关系见[coverage.json](../../../examples/quantum-algorithms/coverage.json)，许可证与改动说明见[NOTICE](../../../examples/quantum-algorithms/NOTICE)。
