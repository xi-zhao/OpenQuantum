---
name: quantum-guide-algorithms
description: "为 algorithms 选择完整的开源算法工作流，路由到本地可发现的专用 Skills。"
---

# algorithms

本地开源适配。上游指南 ID：`algorithms`。

## 选择工作流

按用户的数学问题、输入表示、计算规模和需要的输出选择一个叶子 Skill。知识解释可直接使用原理；计算任务加载叶子 Skill，使用其中的开源实现和现有代码执行 Tool。无需为阅读指南启动额外服务。

- [quantum-guide-algorithms-cryptography](../quantum-guide-algorithms-cryptography/SKILL.md)：algorithms/cryptography
- [quantum-guide-algorithms-eigensolvers](../quantum-guide-algorithms-eigensolvers/SKILL.md)：algorithms/eigensolvers
- [quantum-guide-algorithms-gradients](../quantum-guide-algorithms-gradients/SKILL.md)：algorithms/gradients
- [quantum-guide-algorithms-hamiltonian-simulation](../quantum-guide-algorithms-hamiltonian-simulation/SKILL.md)：algorithms/hamiltonian-simulation
- [quantum-guide-algorithms-linear-systems](../quantum-guide-algorithms-linear-systems/SKILL.md)：algorithms/linear-systems
- [quantum-guide-algorithms-primitives](../quantum-guide-algorithms-primitives/SKILL.md)：algorithms/primitives
- [quantum-guide-algorithms-quantum-chemistry](../quantum-guide-algorithms-quantum-chemistry/SKILL.md)：algorithms/quantum-chemistry
- [quantum-qldpc](../quantum-qldpc/SKILL.md)：HGP CSS 校验矩阵、GF(2) 秩、交换关系和 syndrome；码距未计算。解码任务继续使用 ldpc-decoding Skill。
- [quantum-guide-algorithms-quantum-machine-learning](../quantum-guide-algorithms-quantum-machine-learning/SKILL.md)：algorithms/quantum-machine-learning
- [quantum-guide-algorithms-schrodingerization](../quantum-guide-algorithms-schrodingerization/SKILL.md)：algorithms/schrodingerization
- [quantum-guide-algorithms-search](../quantum-guide-algorithms-search/SKILL.md)：algorithms/search
- [quantum-guide-algorithms-state-preparation](../quantum-guide-algorithms-state-preparation/SKILL.md)：algorithms/state-preparation

全量条目见[覆盖表](../../../docs/integrations/UNITARYLAB_OPEN_COVERAGE.md)。如果用户描述跨领域，按实际依赖组合相关叶子 Skill；不要要求用户先阅读整条目录链。

## 来源与边界

上游 MIT 指南：[algorithms](https://github.com/unitarylab/quantum-skills/blob/c5436bb120812ad903ac776f58df89b803ced48c/algorithms/SKILL.md)。原文作为参考保存在固定检索库，本文件将执行路线改为开源 SDK。来源摘要和算法模块对应关系见[coverage.json](../../../examples/quantum-algorithms/coverage.json)，许可证与改动说明见[NOTICE](../../../examples/quantum-algorithms/NOTICE)。
