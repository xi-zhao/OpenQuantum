---
name: quantum-algorithms
description: "为 量子计算任务 选择完整的开源算法工作流，路由到本地可发现的专用 Skills。"
---

# root

本地开源适配。上游指南 ID：`root`。

## 选择工作流

按用户的数学问题、输入、计算规模和输出要求选择实际方法。先用已有 `quantum_practices` Tool 的 search/get 查询方法，返回结果包含本地叶子 Skill；直接加载该方法 Skill。所有入口见[覆盖表](../../../docs/integrations/UNITARYLAB_OPEN_COVERAGE.md)，参数与准备步骤见[共同运行说明](../../../examples/quantum-algorithms/README.md)。

13 个分类索引保留为用户手动导航，不进入模型自动选择目录。无需按目录层级逐级加载。Qiskit/PennyLane 后端指南和开源迁移指南仍可自动选择。知识解释不自动开始计算；计算任务使用已有 Harness Tool，按实际依赖组合方法。

## 来源与边界

上游 MIT 指南：[root](https://github.com/unitarylab/quantum-skills/blob/c5436bb120812ad903ac776f58df89b803ced48c/SKILL.md)。原文作为参考保存在固定检索库，本文件将执行路线改为开源 SDK。来源摘要和算法模块对应关系见[coverage.json](../../../examples/quantum-algorithms/coverage.json)，许可证与改动说明见[NOTICE](../../../examples/quantum-algorithms/NOTICE)。
