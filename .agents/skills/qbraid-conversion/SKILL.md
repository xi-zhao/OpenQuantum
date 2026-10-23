---
name: qbraid-conversion
description: 用固定 qBraid 在 Qiskit 与 Cirq 间转换结构化酉电路，导出 OpenQASM 2 并检查位序和完整酉矩阵等价性。
---

# qBraid 本地电路转换

<!-- BEGIN NATIVE SDK ACCESS -->
## 原生 SDK 路径

本能力同时支持 **qBraid / Cirq 的原生公开 API**。用户需要 程序类型、转换图、转译路径、序列化与供应商接口 时，由 Agent 在固定依赖环境中编写和运行任务代码，不限于下文便捷 Tool 的预设模型。

使用 `node scripts/sdk-access.mjs inspect qbraid-conversion` 定位环境，按[完整 SDK 工作流](../quantum-sdk-workbench/references/workflow.md)执行。模块导航：`qbraid`、`cirq`、`qiskit`；导航不是 API 白名单。

下文关于模型、门集、输入与预算的限制描述便捷 Tool 的合同；原生 SDK 另受上游版本、可选依赖、宿主资源与用户授权约束。已禁用或被拒绝的动作不能借代码路径绕过。执行状态和科研验收分别报告。
<!-- END NATIVE SDK ACCESS -->


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
