---
name: qrisp-arithmetic
description: 用 Eclipse Qrisp 的 QuantumFloat 编译并本地模拟无符号模加法，解释溢出、叠加态和资源计数。
---

# Qrisp 量子模加法

Agent 经 Harness 调用 `qrisp_local` 的 `compute_qrisp_modular_sum`。Skill 负责选择与解释，Tool 负责真实 SDK 执行。

输入 `bitWidth`、二进制 `initialBits` 与 `addendBits`；二进制串均为最高有效位在左，不得超过寄存器宽度。`preparation=basis` 编码指定整数；`uniform` 要求 `initialBits` 为零，再对全部数据位施加 H。

真实 Qrisp QuantumFloat 以逐位 X 门编码输入，再由整数保持的 `gidney_adder` 执行经典常数加法，结果是模 `2^bitWidth` 的环绕；例如宽度 3、110 加 011 得到 001。不要把溢出解释成计算错误。初始化、加数和输出标签均不经过浮点编码，能保留超过 2^53 的整数低位；输出位串保留精确整数标签。

`outcomes` 是 Qrisp 本地模拟概率；编译后的量子位、深度和门计数可能包含复合操作，不能当成某硬件的基础门成本。该接口不接受任意 Python 程序。

连接默认关闭，用户按需启用；依赖独立安装，采用上游 EPL-2.0 OR GPL-2.0 WITH Classpath-exception-2.0。当前不连接任何云供应商。

固定依赖需显式执行 `node scripts/setup-paper-tools.mjs qrisp-arithmetic`；调用时不安装依赖，数值库可能写入本地缓存。规模参数不按开发机算例设人工上限；通过独立的 `execution` 选择部署资源。

当前为 L1，`scientificValidation=not_evaluated`。成功执行与工程回归不代表科学 Acceptance。

[上游、许可与验证边界](references/UPSTREAM.md)。
