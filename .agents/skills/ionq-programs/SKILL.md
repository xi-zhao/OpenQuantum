---
name: ionq-programs
description: 使用 IonQ 官方 qiskit-ionq 在本地准备结构化量子电路，返回 IonQ QIS 指令、OpenQASM 2 和测量映射。
---

# IonQ 程序准备

通过 `ionq_local.prepare_ionq_program` 将用户门序列转换为 IonQ QIS 程序。输入为 `numQubits`、`gates`，
每个门具有 `gate` 和 `targets`，RX/RY/RZ 必须给出弧度 `angle`。控制门的第一个 target 是控制位。

- 支持 H/S/T/X/Y/Z/CX/CZ/RX/RY/RZ；所有量子比特从输入编号保留，不自动重排或删空闲位。
- 输出添加全量末端测量，`classicalToQubit[c]` 是经典位 c 对应的量子位。Qiskit 字符串通常把高编号经典位写在左端，不要误读为 q0 在左。
- 这是本地程序转换，不是 IonQ 原生脉冲编译、云端模拟或真实量子硬件运行。
- 真机任务沿用已有可选硬件入口，需要独立配置凭据与明确的执行授权。本 Tool 没有凭据或网络路径。
- 先运行 `node scripts/setup-paper-tools.mjs ionq-programs`。环境隔离并锁定依赖；计算时不自动安装。
- 当前为 L1，`scientificValidation=not_evaluated`。
