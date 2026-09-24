---
name: quantum-guide-algorithms-schrodingerization
description: "为 algorithms/schrodingerization 选择完整的开源算法工作流，路由到本地可发现的专用 Skills。"
---

# algorithms/schrodingerization

本地开源适配。上游指南 ID：`algorithms/schrodingerization`。

## 选择工作流

按用户的数学问题、输入表示、计算规模和需要的输出选择一个叶子 Skill。知识解释可直接使用原理；计算任务加载叶子 Skill，使用其中的开源实现和现有代码执行 Tool。无需为阅读指南启动额外服务。

- [quantum-advection](../quantum-advection/SKILL.md)：周期边界、常速一维平流，中心差分和显式薛定谔化电路；不接受并静默回退所谓 block 模式。
- [quantum-heat-1d](../quantum-heat-1d/SKILL.md)：齐次一维热方程，周期或零 Dirichlet 边界；显式辅助 Fourier 寄存器的幺正薛定谔化电路、截面恢复和离散热方程参照。
- [quantum-heat-2d](../quantum-heat-2d/SKILL.md)：齐次二维方形网格热方程，周期或零 Dirichlet 边界；显式薛定谔化电路。空间与辅助网格误差需要分别收敛。

全量条目见[覆盖表](../../../docs/integrations/UNITARYLAB_OPEN_COVERAGE.md)。如果用户描述跨领域，按实际依赖组合相关叶子 Skill；不要要求用户先阅读整条目录链。

## 来源与边界

上游 MIT 指南：[algorithms/schrodingerization](https://github.com/unitarylab/quantum-skills/blob/c5436bb120812ad903ac776f58df89b803ced48c/algorithms/schrodingerization/SKILL.md)。原文作为参考保存在固定检索库，本文件将执行路线改为开源 SDK。来源摘要和算法模块对应关系见[coverage.json](../../../examples/quantum-algorithms/coverage.json)，许可证与改动说明见[NOTICE](../../../examples/quantum-algorithms/NOTICE)。
