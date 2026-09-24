---
name: quantum-guide-algorithms-search
description: "为 algorithms/search 选择完整的开源算法工作流，路由到本地可发现的专用 Skills。"
---

# algorithms/search

本地开源适配。上游指南 ID：`algorithms/search`。

## 选择工作流

按用户的数学问题、输入表示、计算规模和需要的输出选择一个叶子 Skill。知识解释可直接使用原理；计算任务加载叶子 Skill，使用其中的开源实现和现有代码执行 Tool。无需为阅读指南启动额外服务。

- [quantum-glued-trees](../quantum-glued-trees/SKILL.md)：随机交替叶环连接的双树连续时间邻接矩阵量子行走；稠密编译和出口概率，不宣称搜索加速。
- [quantum-hidden-shift](../quantum-hidden-shift/SKILL.md)：偶数位二次 bent 函数的 shifted/dual 相位 oracle；其他函数族需要另写任务代码。

全量条目见[覆盖表](../../../docs/integrations/UNITARYLAB_OPEN_COVERAGE.md)。如果用户描述跨领域，按实际依赖组合相关叶子 Skill；不要要求用户先阅读整条目录链。

## 来源与边界

上游 MIT 指南：[algorithms/search](https://github.com/unitarylab/quantum-skills/blob/c5436bb120812ad903ac776f58df89b803ced48c/algorithms/search/SKILL.md)。原文作为参考保存在固定检索库，本文件将执行路线改为开源 SDK。来源摘要和算法模块对应关系见[coverage.json](../../../examples/quantum-algorithms/coverage.json)，许可证与改动说明见[NOTICE](../../../examples/quantum-algorithms/NOTICE)。
