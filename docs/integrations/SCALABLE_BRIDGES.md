# 本地计算功能与资源配置

OpenQuantum 为本地量子计算提供结构化输入、SDK 调用和结果返回。量子位数、电路长度、Hamiltonian 项数、矩阵维数、采样量、轨迹数和迭代预算由调用方选择，适配器不设置人工规模上限。实际可运行规模由算法、已安装后端和用户的计算资源决定。

## 功能与输入输出

| 方法 | 输入 | 主要输出 |
| --- | --- | --- |
| PyZX | Clifford+T 门电路 | ZX 优化与提取后的 QASM、门数和 T-count |
| Graphix | 门电路、初态、测量采样次数 | MBQC 模式、资源图、空间调度及可选的模拟输出态 |
| Symmer | Pauli Hamiltonian、独立对称性与 ±1 扇区 | 降维 Hamiltonian、扇区维数；允许降为零量子位标量 |
| PauLie | 独立控制的非恒等 Pauli 生成元 | Lie 代数分类、精确维数、可选显式闭包 |
| MQT QCEC | 两份同宽度、无测量的 OpenQASM 2 电路 | 等价、相位等价、不等价或不确定的检查结果 |
| TyxonQ | 门电路、噪声与 shots | 态矢、概率或带噪采样分布 |
| Clifft | Clifford+T 电路、门后去极化与 shots | 最终位串频数、编译后的活跃宽度 |
| FatQat | 门电路与原生门约束，或恒定驱动的物理模型 | 电路概率、可选采样，transmon/里德堡链动力学与图像 |
| toqito | 复密度矩阵、子系统维数与转置子区 | 迹、纯度、部分转置谱与 negativity，独立 Validator observations |
| QPanda QUBO | QUBO 系数，或二值目标与线性等式约束 | 编译后的 QUBO、遍历最优解或 QAOA 分布 |
| Stim + PyMatching | 奇数码距、轮数、噪声和 shots | 表面码存储电路、MWPM 解码及逻辑错误统计 |
| Deltakit | 奇数矩形码片宽高、轮数和 ToyNoise 参数 | 存储实验电路、采样和解码结果 |
| BP+LSD | 二元校验矩阵、syndrome 批次与迭代参数 | 纠正向量、残余 syndrome 与校验一致性 |
| Qiskit SQD | 分子、基组、闭壳层活性空间与频数 | 子空间对角化能量、占据数和冻结核贡献 |
| TeNPy | XYZ 自旋链、局域场、bond dimension 和 sweeps | DMRG 能量、磁化、纠缠熵与收敛诊断 |
| TJM | 开放 Ising 链、振幅衰减、时间网格与轨迹预算 | 张量跳跃轨迹的观测量和抽样标准误 |
| Flow-VQE | Pauli Hamiltonian、RY/CNOT 层数与训练预算 | 低能量参数、能量历史和等预算随机搜索基线 |
| Dynamiqs | 单量子位驱动批次、失谐、衰减和时间网格 | Lindblad 动力学、末态人口梯度与可选参照 |
| OQuPy | Ohmic spin-boson 参数、时间网格与记忆长度 | TEMPO 动力学、Bloch 轨迹和数值诊断 |
| RandomMeas.jl | product/GHZ 态、子区、随机设置和 shots | 局域 Haar 测量、纯度估计与抽样误差 |
| QMClaw 原生 Tool | 调校实验类型、扫描网格与 shots | S21、Rabi、Ramsey、T₁ 等 13 类实验的合成数据 |
| 内置基态原生 Tool | 二量子位实 Pauli Hamiltonian、固定权重一扇区、优化预算 | VQE 基态及独立检查，可进入中央科学验收链 |

具体模型由各 Tool 定义。例如内置基态工具的二量子位扇区、Dynamiqs 的单量子位恒定驱动、FatQat 的两个三能级 transmon，以及 QMClaw 的单量子位调校流程都是所提供的模型。适配器继续检查概率、有限数、门目标、矩阵形状、粒子数、对称性对易和独立性。TeNPy 的当前 two-site sweep 至少需要三个站点。

整数参数必须能被 JSON/JavaScript 精确表示。计算所得的 PauLie 代数维数、Symmer 扇区维数和 SQD 行列式维数若超过 `Number.MAX_SAFE_INTEGER`，返回十进制字符串，避免舍入。

## 主计算与可选参考

PyZX、Graphix、Symmer、PauLie、TeNPy、TJM、Flow-VQE、Clifft、SQD、Dynamiqs 和 QPanda 提供 `referenceMode`：

| 模式 | 行为 |
| --- | --- |
| `auto`（默认） | 按默认阈值选择额外参考；较大输入继续主计算 |
| `required` | 在请求规模上尝试参考，使用调用方资源；计算失败或被取消时返回错误 |
| `skip` | 直接运行主计算，跳过额外参考 |

未执行的参考值及其差异为 `null`，状态为 `not_run`；QPanda 未做穷举的最优性、可行性与 penalty observations 为 `not_checked`。参考失败不会被伪装成正常跳过。计算和参考的完成状态与最终科学验收分别记录。

Graphix 的 `simulate=false` 仅生成模式和资源图，返回 `simulation.status=not_run`；不能同时要求 `referenceMode=required`。模拟时独立电路参考直接作用于态矢，不构造完整酉矩阵。

PauLie 的 `closureMode=full` 枚举闭包，`skip` 不枚举，`auto` 在分类维数不超过 4096 时枚举。分类和维数本身无需闭包枚举。独立矩阵参考可单独执行，`spanResidualTarget` 说明残差检查的是显式闭包还是输入生成元。

QPanda 的 `method=traversal` 本身就是穷举求解；`referenceMode=skip` 只跳过额外检查，不会把遍历算法变为 QAOA。`method=qaoa` 不再先强制穷举，模型编译也可单独跳过穷举重放。模型编译在可取消的独立进程中执行。

Clifft 的 `maxActiveWidth` 默认为 `null`；只有调用方明确提供该预算时才检查。运行密度矩阵参考时返回完整位串分布；跳过时仅返回观测到的位串，TVD 和参考概率为 `null`。

<details>
<summary>默认自动参考阈值</summary>

| 参考 | auto 执行条件 |
| --- | --- |
| PyZX 完整酉矩阵、Symmer 同扇区能谱 | 不超过 6 qubits |
| Graphix 电路态矢 | 开启模拟且不超过 10 个逻辑 qubits |
| PauLie 稠密 Lie 空间 | 不超过 4 qubits |
| TeNPy、Flow-VQE 精确对角化 | 不超过 10 站点/qubits |
| TJM Lindblad、Clifft 密度矩阵 | 不超过 6 qubits |
| SQD 同一活性空间 FCI | 不超过 12 个空间轨道且行列式维数不超过 10000 |
| Dynamiqs 独立积分与有限差分 | 驱动批次不超过 8，steps 不超过 100 |
| QPanda 编译重放与 QAOA 经典参照 | 不超过 12 个变量 |

这些值只控制 auto 的默认行为，`required` 可以在更大输入上执行参考。

</details>

## 运行资源由部署配置

本地计算子进程默认不设置执行时间与输出字节上限。按需设置：

```bash
# 0 或未设置表示不由计算 worker 限制
export OPENQUANTUM_COMPUTE_TIMEOUT_MS=0
export OPENQUANTUM_COMPUTE_MAX_OUTPUT_BYTES=0
npm run dev
```

用户设置的 `OMP_NUM_THREADS`、`OPENBLAS_NUM_THREADS`、`MKL_NUM_THREADS`、`NUMBA_NUM_THREADS`、`JULIA_NUM_THREADS` 和 JAX/CUDA 设备、显存配置会传入计算环境。未设置时使用库的默认值。设备选择仍须由所安装的库和后端支持；本适配不自动安装 GPU 运行时。

**连接层另有超时配置。** 当前固定版本的 Harness MCP Client 使用 Node 单个定时器，不支持无限等待。默认 Preset 将本地计算连接的 `toolCallTimeoutMs` 设为该计时器可表示的最大值 `2147483647` 毫秒（约 24.9 天）；可在 `agent.cordis.yml` 的对应连接设置更短超时。外部 MCP 客户端也需设置自己的调用超时。因此 worker 无默认期限不等于所有客户端都无限等待。

每个共享科学服务同时运行一个调用，FatQat 保留两个执行槽；这是连接并发配置。取消会结束本次子进程组并释放执行槽；worker 故障、数值失败及用户配置的超时或输出预算会保留错误语义。QMClaw 与内置基态是原生进程内计算，使用调用参数控制工作量，上述 worker 环境变量不适用于它们。

## SQD 的分子与活性空间

`molecule.atoms/charge` 定义分子，`basis` 使用已安装 PySCF 目录中的命名基组。省略 molecule 时保留 H₂ 键长接口，省略 activeSpace 时使用全空间。当前使用闭壳层 RHF 轨道，活性电子数为偶数，固定 `n_alpha=n_beta`（M_s=0）；活性轨道从冻结核后连续选取。

```json
{
  "molecule": { "atoms": [
    { "element": "Li", "positionAngstrom": [0, 0, 0] },
    { "element": "H", "positionAngstrom": [0, 0, 1.6] }
  ], "charge": 0 },
  "basis": "sto-3g",
  "activeSpace": { "numOrbitals": 4, "numElectrons": 2 },
  "counts": { "00010001": 64 },
  "referenceMode": "auto"
}
```

counts 的位宽为活性空间轨道数的两倍，顺序为 `beta(n−1)…beta0 alpha(n−1)…alpha0`，保留前导零。`maxSubspaceDimension` 是每个自旋子空间的预算；其乘积构成总子空间。`coreEnergyOffsetHartree` 已包含核排斥与冻结核贡献，不能再次相加。FCI 与 SQD 对照同一个有效 Hamiltonian。缺少 counts 时使用标注为 `synthetic_uniform` 的样本。

## 开发核验记录

可复现检查入口：

```bash
node --test tests/local-compute-scale.test.mjs tests/scalable-bridges.test.mjs
OPENQUANTUM_REAL_LOCAL_SCALE=1 node --test --test-concurrency=1 tests/local-compute-scale-live.test.mjs
npm run capability:unitary-next:live
```

本次核验摘要见 [2026-09-15 记录](evidence/local-compute-scale-2026-09-15.json)。历史输入与结果保留在 [五项计算桥接记录](evidence/scalable-bridges-2026-09-14.json)和[四项电路代数记录](evidence/unitary-next-2026-09-14.json)。这些记录用于复现与回归，所测规模不定义功能上限。
