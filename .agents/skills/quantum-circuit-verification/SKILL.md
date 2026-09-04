---
name: quantum-circuit-verification
description: 使用 OpenQuantum 的固定版本 MQT QCEC 本地检查两份有界、无测量的 OpenQASM 2 量子电路是否等价，并区分严格等价、相位等价、不等价、概率性结果和无信息结果。用于转译前后语义验证、电路重写审计和回归检查；不用于含测量/经典控制的动态电路、真实硬件、任意文件路径，或在缺少来源链时宣称最终科学验收通过。
---

# 量子电路等价性验证

## 核心边界

核心对象是“一对待比较的有界 unitary OpenQASM 2 电路”。Qiskit 电路工作台负责加载、转换、门数与深度分析；本 Skill 使用 MQT QCEC 回答更窄但更关键的问题：两个电路是否实现等价的量子变换。

- 每份 QASM 最多 64 KiB、最多 16 个量子位、最多 512 个语句。
- 两份电路必须声明相同的总量子位数。
- 只允许标准 `qelib1.inc`；不接受任意 include 路径。
- 不接受 `measure`、`reset`、`if`、`creg` 或 `opaque`。
- 固定 10 秒 QCEC 超时，调用方不能扩大运行预算。

## 工作流

1. 先确认比较目标：通常是原电路与转译/优化后的电路。
2. 若输入是 OpenQASM 3 或 QPY，先用 `$qiskit-circuit-workbench` 做受控转换；不要自行猜测语义。
3. 调用 `verify_circuit_equivalence`，传入两份 QASM 文本，不传文件路径。主动作加载固定环境并返回 `packageVersion`；首次调用可能下载依赖并写入工作区环境，无需单独检查运行时。
4. 按以下语义解释 `result.equivalence`：
   - `equivalent`：QCEC 给出等价结论；
   - `equivalent_up_to_phase` / `equivalent_up_to_global_phase`：只在用户目标允许相位等价时采用；
   - `not_equivalent`：本次比较不等价；
   - `probably_equivalent` / `probably_not_equivalent` / `no_information`：不确定，不能升级成确定结论。
5. 同时报告实际包版本、输入 SHA-256、QCEC checker 记录、耗时和 `provenance.complete=not_checked`；环境不可用时报告工具错误，不编造结果。

## 必须保持的规则

- “门数更少”不等于语义等价，必须看 QCEC observation。
- provider 超时或 `no_information` 不算电路语义失败，只算验证未交付。
- `circuits.equivalent=fail` 是科学 observation，不是 MCP 运行错误。
- 相位等价必须原样报告，不能静默写成严格等价。
- 没有 Result Package 和 Session Event Log 来源链时，输出只能是 `observations_available`。

## 输出格式

1. 两份输入摘要与 SHA-256；
2. QCEC 的完整 criterion；
3. checker 与耗时摘要；
4. conclusive / equivalent / provenance 三类 observations；
5. 适用范围和未验证项。
