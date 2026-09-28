---
name: mqt-qmap
description: 用 MQT QMAP 将结构化电路路由到指定连接图，返回有效 OpenQASM、全局相位及完整输入输出线映射。
---

# MQT QMAP 电路拓扑映射

Agent 经 Harness 调用 `mqt_qmap_local` 提供的 `map_mqt_circuit`。先明确逻辑电路与硬件连接图，再比较路由成本；这里不使用真实校准数据。

输入 `numQubits`、`gates`、`numPhysicalQubits` 与有向 `coupling: [[control,target], ...]`。图忽略方向后必须连通，物理位数不少于逻辑位数。门集支持 H/S/T/X/Y/Z、CX/CZ、RX/RY/RZ，旋转角用 rad。

Tool 将活跃逻辑线压缩排列后以 identity placement 初始化 QMAP，采用 heuristic mapping，关闭前后优化。闲置输入量子位仍被保留在完整映射中。输入先转换到 U/CX；输出为 OpenQASM 2 的 U3/CX 及显式定义的 `oq_swap` 宏。有向 CX 遵从所给连接图；交换宏沿无向连接边，宏内部反向 CX 的设备门集分解属于后续编译步骤，不能把当前 QASM 宣称为已可直接提交的设备原生程序。

`initialMapping` 与 `finalMapping` 都表示**原始逻辑编号 → 物理 QASM 线号**。比较酉矩阵或读出结果必须应用这两个映射；输出映射不是还需执行的一层 SWAP。完整矩阵还要乘 `exp(i*globalPhaseRadians)`，因为 OpenQASM 2 不保存全局相位。额外物理辅助线以零态初始化。

`resources` 使用 QMAP 的成本口径，其中 routing SWAP 按 CX 数展开；直接数 QASM 中的宏行数会得到不同数值。启发式结果不保证最优门数、深度或真实保真度。固定 [MQT QMAP 3.10.0](https://github.com/munich-quantum-toolkit/qmap)（MIT），不改变既有 QCEC 环境。

先运行 `node scripts/setup-paper-tools.mjs mqt-qmap` 显式准备固定依赖。计算 Tool 不安装依赖、不连接外部服务；SDK 可能写本地缓存，因此最大副作用登记为 workspace-write。部署时间、输出大小与线程设置使用 `execution`，与方法规模分开。

当前为 L1，`scientificValidation=not_evaluated`。本地数值、协议与 Harness 测试是开发证据；执行成功不等于 central Acceptance Builder 已推导科学验收。
