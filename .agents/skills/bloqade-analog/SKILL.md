---
name: bloqade-analog
description: 用 QuEra Bloqade Analog 在本地模拟二维 Rydberg 原子阵列的全局时变脉冲，返回逐原子占据、末态振幅、位串概率和明确单位。
---

# Bloqade Analog 中性原子动力学

适用于用户自定义原子坐标、Rabi 振幅、失谐和相位波形的模拟量子程序。Agent 经 Harness 调用 `bloqade_local` 提供的 `simulate_bloqade_analog`；本 Skill 负责模型选择、输入和解释，Tool 执行计算。

- 输入 `atomPositionsUm` 是依输入顺序排列的二维坐标，单位 µm。所有位置必须不同；原子静止且全部占位。
- `durationsUs` 是各段持续时间，单位 µs，必须为正。`rabiRadPerUs`、`detuningRadPerUs`、`phaseRad` 各有“段数 + 1”个端点值，段内线性插值，所有原子共用。振幅非负，失谐可正可负；频率均为 rad/µs，相位为 rad，不能把 MHz 直接填入。
- 从全 ground 态开始，在完整两能级 Hilbert 空间内演化。固定使用上游 Rb C6，保留有限距离的相互作用，不把 blockade 半径内的双激发态删除。
- `timeSteps` 指均匀输出网格的间隔数；结果还包含所有脉冲分段边界，以返回的 `timesUs` 为准。`atol`、`rtol` 控制数值积分精度，比较物理结论前检查收敛和 `maxNormError`。
- `rydbergPopulations[t][i]` 按输入原子顺序排列。末态位串左端是原子 0，`0=ground`、`1=Rydberg`；`amplitude` 为 `[real, imag]`。返回未经裁剪或归一化的纯态概率，不是有限 shots 的测量频数。
- 规模由调用方选择；完整态向量按 2^N 增长，后端的可寻址数组表示限制仍适用。资源限制用 `execution` 配置，与物理参数分开。
- 这是静止原子、旋波近似下的闭合 Rydberg 两能级模型；没有原子运动、寿命/退相干、局域寻址或硬件校准。数字 Bloqade、Julia 后端和云/QPU 提交不在此接口范围。
- 当前为 L1，`scientificValidation=not_evaluated`。数值对照和成功执行不代表最终科学 Acceptance。

先用 `npm run capability:bloqade:setup` 显式准备固定依赖。计算不会自动安装依赖，可能写入本地数值库缓存。安装、完整参数示例和验证入口见[使用说明](../../../docs/integrations/BLOQADE_ANALOG.md)。
