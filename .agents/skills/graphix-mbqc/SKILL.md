---
name: graphix-mbqc
description: 用固定 Graphix 将量子电路转为测量式量子计算模式，模拟自适应测量及输出纠正，并与独立态矢计算比较。
---

# Graphix 测量式量子计算

当用户研究电路模型到 MBQC 的转换、资源图和测量反馈时，调用 Harness 注册的 `graphix_local.simulate_graphix_pattern`。

- 输入逻辑量子位数和门列表。支持 H、S、T、X、Y、Z、CX、CZ、RX、RY、RZ；仅旋转门必须提供 `angle`，本 Tool 的输入单位为弧度。
- `initialState` 显式选择全零乘积态 `zero` 或全 plus 乘积态 `plus`。上游 Graphix 0.3.5 使用 π 的倍数表示角度，适配器负责转换，不让用户自行换算。
- 返回资源图 nodes/edges、inputNodes/outputNodes 和制备、纠缠、测量、纠正命令。区分逻辑宽度、总资源节点数和最大同时存活量子位数。
- `branches` 指定按 seed+i 采样的测量过程，可能抽到相同分支。输出包含测量记录、纠正后的复振幅、归一化误差以及可选独立电路态矢的 fidelity。
- `simulate=false` 只生成与调度模式，不分配模拟态矢；此时不能同时要求 referenceMode=required。
- 输出态按照 outputNodes 对应的逻辑 q0、q1……排序。输出已含测量副产物纠正；不要把单次原始测量位解释成最终计算结果。
- 多 seed 对照只检查指定输入态下抽到的分支，不等于穷举所有分支或证明任意输入通道等价。当前不接硬件、不加噪声，也不声明资源最优。
- 当前 L1，`scientificValidation=not_evaluated`；首次调用可准备锁定环境、写本地缓存。版本与证据见[接入说明](../../../docs/integrations/UNITARY_NEXT_TOOLS.md)。

独立参考使用 `referenceMode=auto|required|skip`：auto 按默认阈值选择参考，required 使用调用方资源尝试所请求规模，skip 跳过。未执行时 `reference.status=not_run`，参考值和差异为 null；尝试后失败会返回错误。

计算规模和资源由调用方选择，适配器不设置量子位、门数、项数、采样数或迭代数的人工上限。默认值用于方便调用；模型、格式和数值表示要求仍由输入合同检查。详见[计算参数与资源配置](../../../docs/integrations/SCALABLE_BRIDGES.md)。
