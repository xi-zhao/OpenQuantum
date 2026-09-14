---
name: mitiq-error-mitigation
description: 使用固定 Mitiq 对有界电路运行 ZNE、REM、PEC、CDR 本地噪声实验，比较相同采样预算下的误差、方差和成本。
---

# Mitiq 误差缓解实验

当用户要评估零噪声外推、读出误差校正、概率误差抵消或 Clifford 数据回归时使用本 Skill。
它负责选择实验和解释结果，计算由 `mitiq_local` 连接注册的 `run_mitiq_experiment` Tool 执行。
不要把 Mitiq 的其他算法、任意 SDK 电路、真实硬件或误差纠正解释为本 Tool 已提供的能力。

## 选择与输入

- `zne`：在局域门噪声下比较全局折叠 `[1,3,5]` 与二阶 Richardson 外推；零噪声时也可能增加方差。
- `rem`：独立、对称读出翻转；设置 `readoutProbability`，两个校准设置计入缓解预算。门噪声可保留，REM 不消除它。
- `pec`：已知局域去极化噪声、理想补偿 Pauli；`pecSamples` 控制准概率电路抽样数。真实噪声表征成本尚未建模。
- `cdr`：所有非 Clifford 门必须为 `RZ`，且 observable 只含 `I/Z`。训练成本计入预算；全 Clifford 目标及退化训练会报错。

支持 1–4 qubits、1–24 个 `H/X/Y/Z/S/RZ/CX/CZ` 门；RZ angle 单位为弧度，targets 从 0 开始。
Pauli 字符串最左字符是 q0。终端测量基变换按理想操作处理；不接受路径、代码、凭据或云任务。
`depolarizingProbability` 是 Cirq 的 Pauli 错误概率 p，通道为
`(1-p)rho + p/3*(XrhoX+YrhoY+ZrhoZ)`，不能与 `rho -> (1-p)rho+pI/2` 的 p 混用。

`shotsBudget` 是**每次重复、每个比较臂**的总预算，包含校准和训练；整次调用严格消耗
`2 * replicates * shotsBudget` 个模拟 shots，最大 524288。默认 8 次完整重复、每臂每次 8192 shots。
`seed` 固定整个实验，重复之间重新生成采样、训练和校准数据。比较不同方法时保持电路、噪声、预算和重复数一致。

最小示例：

```json
{"method":"zne","numQubits":1,"gates":[{"name":"H","targets":[0]},{"name":"RZ","targets":[0],"angle":0.7},{"name":"H","targets":[0]}],"observable":"Z","shotsBudget":8192,"replicates":8,"seed":7}
```

## 执行与解释

1. 明确需要评估哪种噪声、观测量和方法；使用 Tool schema 检查支持范围。
2. 若连接未开启，告知设置位置；不要绕过用户禁用状态。首次调用会准备锁定环境并写缓存，按 `workspace-write` 处理。
3. 读取 `idealExpectation`、`exactNoisyExpectation`、每次重复的原始/缓解估计及两臂成本。
4. 用 `statistics` 报告经验 bias、variance、RMSE 和跨重复均值标准误。`rmseDifference<0` 仅表示本次有限样本比较改善。
5. 保留越界估计与变差结果，不挑选成功 seed；shots 相同不代表门数、深度、运行时间相同。
6. 遇到 CDR 训练退化，明确该实验不可辨识；调整电路/观测量或训练数后作为新实验运行，不静默更换 seed。

本能力为 L1，固定返回 `scientificValidation=not_evaluated`。没有 Acceptance Profile 和中央验收链，
不可宣称科学验收通过、普遍降噪、量子优势或真实硬件有效。

安装、许可证、资源和验证记录见 [接入说明](../../../docs/integrations/MITIQ.md)。
本能力目录按 GPL-3.0-only 许可；详见 [NOTICE](NOTICE) 和 [LICENSE](LICENSE)。
