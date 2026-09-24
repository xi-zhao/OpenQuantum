---
name: qbraid-conversion
description: 用固定 qBraid 在 Qiskit 与 Cirq 间转换结构化酉电路，导出 OpenQASM 2 并检查位序和完整酉矩阵等价性。
---

# qBraid 本地电路转换

调用 Harness 注册的 `qbraid_local.convert_qbraid_circuit`。适用于已有电路迁移与跨框架核对。

- 提交 `numQubits`、结构化 `gates` 和 `direction=qiskit-to-cirq|cirq-to-qiskit`；旋转角单位为弧度，支持的门见 Tool schema。
- 固定路径经过 OpenQASM 2；返回实际转换路径及可保存的 OpenQASM 2 文本。保留空闲量子位，q[i] 对应输入 i。
- `referenceMode=auto|required|skip`；auto 在至 8 qubits 时比较完整酉矩阵，required 按请求运行，skip 保留未检查状态。比较忽略整体相位，独立对照包括导出文本重新解析后的结果。
- 不接受任意 Python、文件路径、测量、重置、噪声或动态控制；不实例化云 Provider 或提交云任务。
- 依赖须显式准备；计算仍可能写 SDK 缓存，保留 workspace-write；当前 L1，scientificValidation=not_evaluated。
- qBraid 的同名 OpenQuantumProvider 面向 openquantum.com，不代表本仓库已接入该云服务。

[安装、验证和限制](../../../docs/integrations/QUANTUM_INTEROP.md)。

## 依赖准备

运行前执行 `node scripts/setup-paper-tools.mjs qbraid-conversion`。缺失、旧锁和已安装环境的处理见[共同准备说明](../../../docs/integrations/LOCAL_ENVIRONMENTS.md)；Tool 不自动安装或升级依赖。
