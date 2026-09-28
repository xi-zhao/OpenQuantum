---
name: qcompute-simulation
description: 用百度 QCompute 固定本地模拟器计算结构化幺正电路的振幅和概率，解释位序与旧版依赖边界。
---

# QCompute 本地模拟

Agent 经 Harness 调用 `qcompute_local` 的 `simulate_qcompute_circuit`。Skill 负责选择与解释，Tool 负责真实 SDK 执行。

接受 `numQubits` 与 H/S/T/X/Y/Z/CX/CZ/RX/RY/RZ 的有序门列表；旋转角 `angle` 为 rad。初态全零，输出完整振幅 `[real,imag]` 与概率，qubit 0 在位串最左侧。

适配层直接调用 QCompute `local_baidu_sim2` 的 `output_state` 路径，不调用云 `commit`。末端测量只作为该 SDK 所需的程序元数据；output_state 不塌缩状态，返回值不是有限 shots 计数。

固定 QCompute 3.3.5 使用隔离 Python 3.10 与 NumPy 1.26.4。其 SDK 导入会创建工作区缓存目录。后端用每量子位一个 NumPy 数组轴，受该版本 MAXDIMS 表示限制；其他规模由调用方与执行资源决定。

QCompute 的原生 RZ 是相位门 diag(1,exp(iθ))。适配输出乘以 `exp(i*globalPhaseCorrectionRadians)`，统一为 `exp(−iθZ/2)`；该相位修正在结果中明确记录。

检查 `normError`，使用非对称 X 门和旋转算例确认位序。没有噪声、云任务、测量前馈或设备保真度模型。

固定依赖需显式执行 `node scripts/setup-paper-tools.mjs qcompute-simulation`；调用时不安装依赖，数值库可能写入本地缓存。规模参数不按开发机算例设人工上限；通过独立的 `execution` 选择部署资源。

当前为 L1，`scientificValidation=not_evaluated`。成功执行与工程回归不代表科学 Acceptance。

[上游、许可与验证边界](references/UPSTREAM.md)。
