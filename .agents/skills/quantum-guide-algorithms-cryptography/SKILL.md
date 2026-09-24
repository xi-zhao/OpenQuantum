---
name: quantum-guide-algorithms-cryptography
description: "为 algorithms/cryptography 选择完整的开源算法工作流，路由到本地可发现的专用 Skills。"
disable-model-invocation: true
user-invocable: true
---

# algorithms/cryptography

本地开源适配。上游指南 ID：`algorithms/cryptography`。

分类导航：保留用户显式调用；自动任务直接选择叶子方法 Skill，或使用 `quantum-algorithms` 查找。

## 选择工作流

按用户的数学问题、输入表示、计算规模和需要的输出选择一个叶子 Skill。知识解释可直接使用原理；计算任务加载叶子 Skill，使用其中的开源实现和现有代码执行 Tool。无需为阅读指南启动额外服务。

- [quantum-discrete-log](../quantum-discrete-log/SKILL.md)：可逆 g^a y^b oracle、循环群 Fourier 采样与同余恢复；不把已知对数写进 oracle。
- [quantum-shor](../quantum-shor/SKILL.md)：可逆模乘 oracle、QPE/连分数和因子验证；密集 oracle 的教学规模模拟，失败明确返回需换基数或精度。
- [quantum-simon](../quantum-simon/SKILL.md)：二对一 XOR oracle、Hadamard 采样和 GF(2) 零空间恢复；样本不足时不编造 secret。

全量条目见[覆盖表](../../../docs/integrations/UNITARYLAB_OPEN_COVERAGE.md)。如果用户描述跨领域，按实际依赖组合相关叶子 Skill；不要要求用户先阅读整条目录链。

## 来源与边界

上游 MIT 指南：[algorithms/cryptography](https://github.com/unitarylab/quantum-skills/blob/c5436bb120812ad903ac776f58df89b803ced48c/algorithms/cryptography/SKILL.md)。原文作为参考保存在固定检索库，本文件将执行路线改为开源 SDK。来源摘要和算法模块对应关系见[coverage.json](../../../examples/quantum-algorithms/coverage.json)，许可证与改动说明见[NOTICE](../../../examples/quantum-algorithms/NOTICE)。
