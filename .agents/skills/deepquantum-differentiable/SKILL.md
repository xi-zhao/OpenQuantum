---
name: deepquantum-differentiable
description: 使用 图灵量子 的 DeepQuantum 在本地对用户定义量子线路计算原始态概率、Pauli 期望和指定旋转角的解析梯度。
---

# DeepQuantum 可微分量子线路

<!-- BEGIN NATIVE SDK ACCESS -->
## 原生 SDK 路径

本能力同时支持 **DeepQuantum 的原生公开 API**。用户需要 自定义 qubit/光学电路、噪声、测量、编码与训练 时，由 Agent 在固定依赖环境中编写和运行任务代码，不限于下文便捷 Tool 的预设模型。

使用 `node scripts/sdk-access.mjs inspect deepquantum-differentiable` 定位环境，按[完整 SDK 工作流](../quantum-sdk-workbench/references/workflow.md)执行。模块导航：`deepquantum`、`torch`；导航不是 API 白名单。

下文关于模型、门集、输入与预算的限制描述便捷 Tool 的合同；原生 SDK 另受上游版本、可选依赖、宿主资源与用户授权约束。已禁用或被拒绝的动作不能借代码路径绕过。执行状态和科研验收分别报告。
<!-- END NATIVE SDK ACCESS -->


当用户需要用 DeepQuantum 计算线路期望、验证变分线路导数或与其他 SDK 交叉对照时，Agent 经 Harness 调用 `deepquantum_local` 提供的 `differentiate_deepquantum_circuit`。本 Skill 指导参数选择与结果解释；计算由 QubitCircuit + PyTorch 完成。

- `numQubits` 与 `gates` 定义全零初态的理想酉线路。支持 H、X、Y、Z、S、T、RX、RY、RZ、CX、CZ、SWAP；双比特门的 targets 为 `[control,target]`（SWAP 为两个交换位），角度单位 rad。
- `observables` 是与量子位数同长的 I/X/Y/Z 字符串，最左字符对应 q0。例如 `ZI` 表示 Z0，`XY` 表示 X0Y1；输出期望保留输入顺序。加权 Hamiltonian 可由调用方按系数组合期望和 Jacobian，勿把 Pauli words 当作系数。
- `trainableGateIndices` 明确选择 gates 数组中需要求导的 RX/RY/RZ；每项是独立参数。可填空数组只做仿真。Jacobian 行对应 observables，列严格对应该索引数组的顺序，不是所有旋转门的隐含顺序。
- `amplitudes[k]` 为 `[real,imag]`，概率向量按 q0 在最左的二进制字典序排列。返回 SDK 原始数值，不裁剪、不归一化；`stateNormSquared` 用来检查数值漂移。这些是精确线路仿真的数值期望，不是 finite-shots 频数。
- 参数数量、量子位数和门数由调用方决定；完整输出按 2^N 增长，可寻址数组表示限制仍适用。资源预算通过独立 `execution` 参数设置，不改变线路语义。
- OpenQuantum Harness 对大结果自动返回 `openquantum-science-summary`：先查看 `summary.result` 中的期望、Jacobian、范数与单位；需要完整态矢量时，用已有文件或 shell Tool 读取会话工作区内的 `fullResult.path`，再取 JSON 的 `result.amplitudes` / `result.probabilities`。`omitted: true` 表示数据保存在文件中，不表示零值或计算缺失；不要为了获取被省略的数据重新计算。保存失败时仍返回完整输出，科学状态保持 `not_evaluated`。
- DeepQuantum 的部分固定门（包括 H）先在上游以 complex64 常量构造再提升精度；检查返回的原始范数，勿把舍入漂移当作物理损耗。这里只接可微分量子比特线路，未覆盖该 SDK 的光子/Fock/Gaussian/MPS 和分布式接口。
- 梯度仅对当前输入的理想线路有效，不自动构成优化收敛、抗噪声能力或硬件优势结论。对复杂电路先选择解析可核对例子，必要时与第二 SDK、参数移位或有限差分对照。
- 当前是 L1，`scientificValidation=not_evaluated`；成功计算与数值回归不等于最终科学 Acceptance。

首次使用前显式运行 `node scripts/setup-paper-tools.mjs deepquantum-differentiable` 准备固定依赖。计算不会安装依赖、提交云/QPU 或读取凭据，数值库可能写本地缓存。上游许可为 Apache-2.0，详细版本锁见本目录 `pyproject.toml` 和 `uv.lock`；[官方接口来源](https://github.com/TuringQ/deepquantum)。
