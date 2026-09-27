---
name: tensorcircuit-differentiable
description: 使用 腾讯量子实验室 的 TensorCircuit 在本地对用户定义量子线路计算原始态概率、Pauli 期望和指定旋转角的解析梯度。
---

# TensorCircuit 可微分量子线路

当用户需要用 TensorCircuit 计算线路期望、验证变分线路导数或与其他 SDK 交叉对照时，Agent 经 Harness 调用 `tensorcircuit_local` 提供的 `differentiate_tensorcircuit_circuit`。本 Skill 指导参数选择与结果解释；计算由 TensorCircuit + JAX CPU 完成。

- `numQubits` 与 `gates` 定义全零初态的理想酉线路。支持 H、X、Y、Z、S、T、RX、RY、RZ、CX、CZ、SWAP；双比特门的 targets 为 `[control,target]`（SWAP 为两个交换位），角度单位 rad。
- `observables` 是与量子位数同长的 I/X/Y/Z 字符串，最左字符对应 q0。例如 `ZI` 表示 Z0，`XY` 表示 X0Y1；输出期望保留输入顺序。加权 Hamiltonian 可由调用方按系数组合期望和 Jacobian，勿把 Pauli words 当作系数。
- `trainableGateIndices` 明确选择 gates 数组中需要求导的 RX/RY/RZ；每项是独立参数。可填空数组只做仿真。Jacobian 行对应 observables，列严格对应该索引数组的顺序，不是所有旋转门的隐含顺序。
- `amplitudes[k]` 为 `[real,imag]`，概率向量按 q0 在最左的二进制字典序排列。返回 SDK 原始数值，不裁剪、不归一化；`stateNormSquared` 用来检查数值漂移。这些是精确线路仿真的数值期望，不是 finite-shots 频数。
- 参数数量、量子位数和门数由调用方决定；完整输出按 2^N 增长，可寻址数组表示限制仍适用。资源预算通过独立 `execution` 参数设置，不改变线路语义。
- 固定 TensorCircuit 0.12.0、JAX 0.4.38 和 NumPy 1.26.4，使用 CPU 与 complex128；未开放 GPU、云平台和优化器。
- 梯度仅对当前输入的理想线路有效，不自动构成优化收敛、抗噪声能力或硬件优势结论。对复杂电路先选择解析可核对例子，必要时与第二 SDK、参数移位或有限差分对照。
- 当前是 L1，`scientificValidation=not_evaluated`；成功计算与数值回归不等于最终科学 Acceptance。

首次使用前显式运行 `node scripts/setup-paper-tools.mjs tensorcircuit-differentiable` 准备固定依赖。计算不会安装依赖、提交云/QPU 或读取凭据，数值库可能写本地缓存。上游许可为 Apache-2.0，详细版本锁见本目录 `pyproject.toml` 和 `uv.lock`；[官方接口来源](https://tensorcircuit.readthedocs.io/en/latest/quickstart.html)。
