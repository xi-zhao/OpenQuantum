---
name: quantum-algorithms
description: "为 量子计算任务 选择完整的开源算法工作流，路由到本地可发现的专用 Skills。"
---

# root

<!-- BEGIN NATIVE SDK ACCESS -->
## 原生 SDK 路径

本能力同时支持 **Qiskit / PennyLane / quimb / PySCF 的原生公开 API**。用户需要 原生 SDK 电路、任意张量网络、MPS/MPO、分子、积分与量子化学计算 时，由 Agent 在固定依赖环境中编写和运行任务代码，不限于下文便捷 Tool 的预设模型。

使用 `node scripts/sdk-access.mjs inspect quantum-algorithms` 定位环境，按[完整 SDK 工作流](../quantum-sdk-workbench/references/workflow.md)执行。模块导航：`qiskit`、`qiskit_algorithms`、`pennylane`、`quimb`、`pyscf`；导航不是 API 白名单。

依赖组有 gradients、pennylane、tensor、chemistry；完整 setup 安装所有默认组，算法示例不是允许调用的 API 白名单。

下文关于模型、门集、输入与预算的限制描述便捷 Tool 的合同；原生 SDK 另受上游版本、可选依赖、宿主资源与用户授权约束。已禁用或被拒绝的动作不能借代码路径绕过。执行状态和科研验收分别报告。
<!-- END NATIVE SDK ACCESS -->


本地开源适配。上游指南 ID：`root`。

## 选择工作流

按用户的数学问题、输入、计算规模和输出要求选择实际方法。先用已有 `quantum_practices` Tool 的 search/get 查询方法，返回结果包含本地叶子 Skill；直接加载该方法 Skill。所有入口见[覆盖表](../../../docs/integrations/UNITARYLAB_OPEN_COVERAGE.md)，参数与准备步骤见[共同运行说明](../../../examples/quantum-algorithms/README.md)。

13 个分类索引保留为用户手动导航，不进入模型自动选择目录。无需按目录层级逐级加载。Qiskit/PennyLane 后端指南和开源迁移指南仍可自动选择。知识解释不自动开始计算；计算任务使用已有 Harness Tool，按实际依赖组合方法。

## 来源与边界

上游 MIT 指南：[root](https://github.com/unitarylab/quantum-skills/blob/c5436bb120812ad903ac776f58df89b803ced48c/SKILL.md)。原文作为参考保存在固定检索库，本文件将执行路线改为开源 SDK。来源摘要和算法模块对应关系见[coverage.json](../../../examples/quantum-algorithms/coverage.json)，许可证与改动说明见[NOTICE](../../../examples/quantum-algorithms/NOTICE)。

## 自定义 SDK 程序

示例用于解释和接口核验，不是可执行任务的边界。用户需要其他模型、数据、算法步骤、梯度或后端时，按[原生 SDK 工作台](../quantum-sdk-workbench/SKILL.md)在固定环境中编写并执行自定义代码；由 Agent 完成程序与工件交付。使用 `quantum-algorithms` 环境定位相关 SDK，保留本算法的数学假设与数值误差说明。
