---
name: dynamiqs-dynamics
description: 用固定 Dynamiqs 在 CPU 上计算受驱动耗散单量子位的动力学、驱动批量扫描和末态人口梯度，并与独立 Lindblad 解及有限差分比较。
---

# Dynamiqs 动力学与梯度

通过 Harness 注册的 `dynamiqs_local.simulate_dynamiqs_dynamics` 执行。适用于研究驱动、失谐和振幅衰减怎样影响单量子位人口；需要多体、任意波形或 GPU 性能评估时说明当前模型边界。

- 模型为 `H=(drive X+detuning Z)/2`、`L=sqrt(gamma)|0><1|`，`hbar=1`。用户选择一致的时间单位，驱动和失谐使用相应角频率；不要混用 Hz 与 rad/s。
- `drives` 可含 1–8 个幅度；初态 `ground/excited/plus` 指计算基态、激发态或 X 正本征态。衰减率非负，最大时长 5，最多 100 步。
- Tool 返回每条人口轨迹、末态人口对驱动的梯度、独立 SciPy 参考和有限差分偏差。说明梯度是固定失谐、衰减率和时长下的局部灵敏度；不能据此宣称找到最优控制。
- 解释结果时同时查看状态迹、最小本征值和两类偏差。明显不一致时报告数值问题，不把成功返回当成正确。
- 当前仅 L1，`scientificValidation=not_evaluated`。首次使用可能由固定锁安装依赖并写本地缓存；无 QPU、凭据或数据外发接口。

版本、安装与证据见 [接入说明](../../../docs/integrations/UNITARY_ECOSYSTEM.md)。
