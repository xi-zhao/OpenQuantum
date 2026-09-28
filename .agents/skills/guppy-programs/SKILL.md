---
name: guppy-programs
description: 用 Guppy 编译结构化量子程序，并由 Selene QuEST 仿真中途测量、复位和经典条件门；用于检查动态电路反馈与比特顺序。
---

# Guppy 与 Selene 混合程序

调用 `guppy_local` 的 `simulate_guppy_feedback`。固定 `guppylang==1.1.1` 与 `selene-sim==0.3.2`，
均为 Apache-2.0。先显式执行 `node scripts/setup-paper-tools.mjs guppy-programs`；需要 Python 3.12，
锁中包含平台对应的原生编译与仿真组件。

1. 指定 `numQubits`、结构化 `operations`、`shots` 和 `seed`。初态为全零；支持 H/X/Y/Z/S/T、CX、
   RX/RY/RZ，以及 `MEASURE_RESET`。旋转 `angleRadians` 用弧度，适配转换为 Guppy 的半周单位。
2. `MEASURE_RESET` 在 Z 基测量、消耗当前 qubit，再分配全零 qubit；测量按出现顺序编号。
   后续门通过 `conditionMeasurement` 和 `conditionValue` 控制是否执行。默认 -1 表示无条件。
   测量自身必须无条件，保证所有运行分支拥有相同的测量记录结构。
3. 例如 H(q0) → 测量复位(q0) → 若结果为 1 则 X(q1)，应该得到测量值与 q1 完全相关、q0 恒零。
   从 `counts` 同时检查 `measurementBits` 和 `finalBits`，不要只看最终直方图。
4. `measurementBits` 按测量出现顺序排列，`finalBits` 按 q0、q1、… 排列；没有中途测量时前者为空串。
   `programSource` 是工具从固定语法生成的可读程序，HUGR 大小与 SHA-256 来自真实 Guppy 编译结果。

输入不接受 Python、QIR、模块路径或任意代码。越界/重复目标、错误门元数、未来测量索引会显式失败。
SDK 环境或本地编译失败时保留错误，不以其他模拟器替换。`execution` 控制资源，规模由调用者选择。
临时本地编译产物在调用后清理，Zig 缓存保留于工作区。

Selene 使用 QuEST 理想态矢量后端；有限 shots 有统计波动。这里没有噪声、设备时序、反馈延迟或云运行。
编译与分支行为核对属于 L1 工程证据，`scientificValidation=not_evaluated`，不构成最终科学 Acceptance。

来源：[Guppy](https://github.com/Quantinuum/guppylang)、[Selene](https://github.com/Quantinuum/selene)、
[语言指南](https://docs.quantinuum.com/guppy/language_guide/language_guide_index.html)。
