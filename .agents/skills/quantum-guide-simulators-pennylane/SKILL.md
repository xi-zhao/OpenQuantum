---
name: quantum-guide-simulators-pennylane
description: "为 simulators/pennylane 选择完整的开源算法工作流，路由到本地可发现的专用 Skills。"
---

# simulators/pennylane

本地开源适配。上游指南 ID：`simulators/pennylane`。

## 后端工作流

阅读[共同运行说明](../../../examples/quantum-algorithms/README.md)，使用锁定的 PennyLane 环境。最小可运行例子见 quantum-mottonen、quantum-qsvt-qlsa、quantum-pauli。

根据问题加载一个对应算法 Skill，再通过已有 bash/pwsh Tool 执行开源任务代码。明确量子位顺序、shots 与解析态矢量的区别、后端和版本。先运行 CPU 小例子；只有用户要求且授权时才选择额外的设备或网络后端。

## 来源与边界

上游 MIT 指南：[simulators/pennylane](https://github.com/unitarylab/quantum-skills/blob/c5436bb120812ad903ac776f58df89b803ced48c/simulators/pennylane/SKILL.md)。原文作为参考保存在固定检索库，本文件将执行路线改为开源 SDK。来源摘要和算法模块对应关系见[coverage.json](../../../examples/quantum-algorithms/coverage.json)，许可证与改动说明见[NOTICE](../../../examples/quantum-algorithms/NOTICE)。

## 自定义 SDK 程序

示例用于解释和接口核验，不是可执行任务的边界。用户需要其他模型、数据、算法步骤、梯度或后端时，按[原生 SDK 工作台](../quantum-sdk-workbench/SKILL.md)在固定环境中编写并执行自定义代码；由 Agent 完成程序与工件交付。使用 `quantum-algorithms` 环境定位相关 SDK，保留本算法的数学假设与数值误差说明。
