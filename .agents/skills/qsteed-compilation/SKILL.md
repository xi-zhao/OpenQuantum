---
name: qsteed-compilation
description: 用 BAQIS QSteed 将 PyQuafu 结构化幺正电路分解到 CX/RX/RY/RZ，保留线序并解释全局相位。
---

# QSteed 基门编译

Agent 经 Harness 调用 `qsteed_local` 的 `compile_qsteed_circuit`。Skill 负责选择与解释，Tool 负责真实 SDK 执行。

输入 `numQubits` 与按时间排列的 `gates`；支持 H/S/T/X/Y/Z/CX/CZ/RX/RY/RZ，旋转角 `angle` 使用 rad。目标索引从 0 开始，双量子位门的首个目标是控制位。

Tool 使用 QSteed `Transpiler`、`Model` 与 `UnrollToBasis`，输出结构化基门电路、OpenQASM 2 和前后门数。它不连接资源数据库、不做耦合图映射。需要设备路由时，不把本工具的基门输出称为已匹配硬件。

`globalPhaseRadians` 的定义为 `U_input = exp(i*phase) * U_output`。OpenQASM 2 丢弃该相位；需要受控子程序、干涉比较或精确矩阵等价时务必保留它。编译不会改变逻辑线标签，门数增加是分解的正常结果。

使用固定版本的基门分解路径；未启用存在混合 DAG 节点标签故障的 `OneQubitGateOptimization`。当前没有最优门数或保真度保证。

固定依赖需显式执行 `node scripts/setup-paper-tools.mjs qsteed-compilation`；调用时不安装依赖，数值库可能写入本地缓存。规模参数不按开发机算例设人工上限；通过独立的 `execution` 选择部署资源。

当前为 L1，`scientificValidation=not_evaluated`。成功执行与工程回归不代表科学 Acceptance。

[上游、许可与验证边界](references/UPSTREAM.md)。
