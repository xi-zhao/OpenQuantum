---
name: quantum-guide-simulators-unitarylab
description: "把 UnitaryLab 电路、算法和模拟器调用迁移到 Qiskit、PennyLane、quimb、PySCF 开源后端。"
---

# simulators/unitarylab

本地开源适配。上游指南 ID：`simulators/unitarylab`。

## 开源迁移

按用户所需的物理问题选择下列已有入口：

- Circuit / QFT / QPE / oracle：Qiskit，读取 `quantum-guide-simulators-qiskit` 和对应算法 Skill。
- 可微电路 / 态制备 / QSP、QSVT：PennyLane，读取 `quantum-guide-simulators-pennylane`。
- TensorNet / Ising：quimb CircuitMPS，读取 `quantum-ising`。
- 分子积分和 DMRG：PySCF + quimb，读取 `quantum-molecular-dmrg`。
- 算法入口：读取 `quantum-algorithms`，按名称查找完整覆盖表。

不安装或导入 `unitarylab` / `unitarylab_algorithms`；它们的原始 API 不能仅通过修改 backend 字符串变成开源执行。显式转换位序、初始化、控制门、期望值和输出合同；先运行本地小例子，再改写任务代码。

## 来源与边界

上游 MIT 指南：[simulators/unitarylab](https://github.com/unitarylab/quantum-skills/blob/c5436bb120812ad903ac776f58df89b803ced48c/simulators/unitarylab/SKILL.md)。原文作为参考保存在固定检索库，本文件将执行路线改为开源 SDK。来源摘要和算法模块对应关系见[coverage.json](../../../examples/quantum-algorithms/coverage.json)，许可证与改动说明见[NOTICE](../../../examples/quantum-algorithms/NOTICE)。
