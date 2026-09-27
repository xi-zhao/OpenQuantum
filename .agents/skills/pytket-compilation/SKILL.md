---
name: pytket-compilation
description: 用 Quantinuum pytket 在本地优化用户电路，并转换为 CX/Rx/Ry/Rz 门集，返回 OpenQASM、全局相位与资源统计。
---

# pytket 电路编译

Agent 经 Harness 调用 `pytket_local` 提供的 `compile_pytket_circuit`。本 Skill 负责模型选择和结果解释，Tool 在独立 Python 环境执行真实上游 SDK。

输入 `numQubits` 和 `gates`。每项包括 `gate`、`targets`；支持 H/S/T/X/Y/Z/CX/CZ 和 RX/RY/RZ，旋转必须提供 `angle`（rad），其他门不得提供。CX 的首个 target 是控制位。

`optimize=true` 使用 FullPeepholeOptimise，随后 AutoRebase 到 CX/Rx/Ry/Rz；可设为 false 只做门集转换。没有连接图路由或硬件校准。`q[i]` 始终对应原输入量子位 i，隐式交换被关闭。

比较 `before` 与 `after` 的总门数、双量子位门数和深度时说明目标门集变化。优化不保证每项资源都下降，更不证明真机保真度提升。OpenQASM 2 不保存全局相位：完整编译电路的酉矩阵为 `exp(i*globalPhaseRadians) * U(qasm)`。本工具不会默认构建指数规模的酉矩阵。

计算规模由调用方选择，后端数值表示限制仍适用。资源限制用 `execution` 设置，与模型参数分开。先运行 `node scripts/setup-paper-tools.mjs pytket-compilation` 显式准备固定依赖；计算调用不安装依赖或联网，数值库可能写本地缓存。

固定上游版本：2.18.4；来源与许可见[上游仓库](https://github.com/Quantinuum/tket)（Apache-2.0）。本地数值和协议检查属于开发证据；当前 L1，`scientificValidation=not_evaluated`，成功执行不等于最终科学 Acceptance。
