# 计算工具使用说明

更新于 2026-09-15。OpenQuantum 提供 DMRG 基态求解、张量跳跃动力学、Flow-VQE 参数学习、Clifford+T 采样和分子活性空间 SQD。系统规模、求解精度和计算投入由用户选择；本地验证算例用于回归检查，不定义功能的规模上限。

## 功能与求解参数

| OpenQuantum Tool | 功能 | 用户选择的计算参数 |
| --- | --- | --- |
| `tenpy_local.solve_tenpy_chain` | spin-1/2 XYZ 开放链 DMRG、局域磁化、纠缠熵与收敛信息 | 站点数、bond dimension、sweeps |
| `tjm_local.simulate_tjm_dynamics` | 开放横场 Ising 链的张量跳跃轨迹、局域振幅衰减与观测量统计 | qubit 数、演化时间、步数、轨迹数、bond dimension |
| `flow_vqe_local.train_flow_vqe` | Pauli Hamiltonian 的 flow 参数学习、RY/CNOT ansatz 与等评估次数随机搜索比较 | qubit 数、Pauli 项、ansatz 层数、epochs、batch size |
| `clifft_local.sample_clifft_circuit` | Clifford+T 电路、门后去极化与最终 Z 测量 | qubit 数、电路、shots；可自行设置 `maxActiveWidth` |
| `sqd_local.run_sqd_chemistry` | 分子活性空间采样子空间对角化、配置恢复、能量和轨道占据 | 分子、基组、活性空间、counts、抽样批次、迭代与子空间维数 |

五项桥接均移除了人为的规模上限和组合工作量门槛。Clifft 的 `maxActiveWidth` 为可选参数，省略时不设活跃宽度门槛。数值方法和物理输入约定见各 Skill；程序仍检查参数有效性、位序和数据类型可表示范围。

## 配置执行资源

调用参数中的 `execution` 控制本次工作进程：

```json
{
  "execution": {
    "timeoutMs": 0,
    "maxOutputBytes": 67108864,
    "threads": 8
  },
  "referenceMode": "auto"
}
```

- `timeoutMs`：工作进程时间预算，默认 180000 ms；设为 `0` 关闭该定时器。
- `maxOutputBytes`：工作进程 stdout 与 stderr 的合计字节预算，默认 2 MiB，可按结果量调整。
- `threads`：支持此配置的 CPU 数值内核线程数，默认 1；传递给 OpenMP、BLAS、Torch 和 Clifft。它不启用分布式计算，也不把 TJM 轨迹改为并行执行。

Harness MCP Client 还拥有连接级请求超时。在**设置中心 → MCP Server 连接**配置 `toolCallTimeoutMs`，长任务应同步增加该值，并重启 Harness 使配置生效。例如一小时为 `3600000` ms。这里沿用 Node.js 定时器的正整数表示范围（至 `2147483647` ms）；`0` 仅在上述工作进程选项中表示关闭定时器。直接调用 MCP 的客户端也应设置自己的请求超时。

每个连接一次运行一个计算；取消会停止该调用拥有的进程组。依赖版本保持固定，运行参数和依赖摘要随结果记录。

## 选择独立参考

主计算与独立参考分别执行。`referenceMode` 默认为 `auto`：

| 模式 | 行为 |
| --- | --- |
| `auto` | 对默认选中的算例运行独立参考，其余输入直接运行主算法 |
| `required` | 按请求运行独立参考，包括超出默认选择范围的输入 |
| `skip` | 只运行主算法，省略独立参考 |

默认选择为 TeNPy 至 10 站点、TJM 至 6 qubits、Flow-VQE 至 10 qubits、Clifft 至 6 qubits；SQD 为至 12 活性空间轨道且不超过 10000 个行列式。这些数值只决定 `auto` 的行为，用户可用 `required` 显式请求参考。

`reference` 返回 `mode`、`status`、`method` 和 `reason`。未执行时 `status="not_run"`，相应能量、轨迹、概率及差异为 `null`；执行后为 `computed`。参考计算失败会返回错误，不会伪装成跳过。

Clifft 在运行参考时返回完整位串分布（`outcomesCoverage="complete"`），省略参考时返回实际观察到的位串（`observed_only`）。TeNPy 返回 sweep 判据、能量变化与截断误差。TJM 返回实际有效轨迹数；无噪声时标准误为零，单条含噪轨迹的标准误为 `null`，以 `standardErrorStatus="insufficient_trajectories"` 标明无法从一条轨迹估计抽样误差。

## SQD 分子与活性空间

省略 `molecule` 时使用 H₂，键长由 `bondLengthAngstrom` 指定；传入 `molecule` 后按原子坐标与电荷构建几何。当前提供 H–Ne 元素和 STO-3G、6-31G、cc-pVDZ 基组。

```json
{
  "molecule": {
    "atoms": [
      { "element": "Li", "positionAngstrom": [0, 0, 0] },
      { "element": "H", "positionAngstrom": [0, 0, 1.6] }
    ],
    "charge": 0
  },
  "basis": "sto-3g",
  "activeSpace": { "numOrbitals": 4, "numElectrons": 2 },
  "counts": { "00010001": 64 },
  "referenceMode": "auto"
}
```

轨道来自闭壳层 RHF，活性电子数为偶数，固定 `n_alpha=n_beta`（M_s=0）。冻结核轨道数为 `(全分子电子数−活性电子数)/2`，活性轨道从冻结核之后连续选取；省略 `activeSpace` 使用全空间。固定 PySCF CI 位串使用 signed int64，因此活性空间须少于 64 个空间轨道；全分子的轨道数不受这个 CI 编码约束。返回的 `activeOrbitalIndices`、`frozenCoreOrbitals` 和 `electrons` 记录实际空间。

CASCI 构造含冻结核贡献的有效积分。`coreEnergyOffsetHartree` 已包含核排斥能和冻结核贡献，不再叠加 `nuclearEnergyHartree`。FCI 与 SQD 使用同一活性空间 Hamiltonian。

counts 位宽为活性空间轨道数的两倍，顺序为 `beta(n−1)…beta0 alpha(n−1)…alpha0`，须保留前导零。HF 构型始终包含，配置恢复可调整粒子数不匹配的样本；省略 counts 使用明确标注的合成均匀样本。`maxSubspaceDimension` 指每个自旋子空间的维数；`determinantDimension` 超出 JSON 安全整数表示范围时返回十进制字符串。

## 实现约定与验证记录

Flow-VQE 直接作用于状态向量，不构造主算法的稠密 Hamiltonian；索引和数组字节数遵守 NumPy 可表示范围。TeNPy、TJM 保留各自的 MPS 截断与迭代参数。数值收敛信息和独立参考随计算返回；这些工具保持 L1，`scientificValidation="not_evaluated"`。

2026-09-14 的扩展算例与检查见[原始验证记录](evidence/scalable-bridges-2026-09-14.json)。2026-09-15 的执行配置、超过原门槛的算例及回归结果见[本次验证记录](evidence/user-owned-compute-2026-09-15.json)。两份记录描述各次实际测试输入，不是用户可提交规模的目录。

```bash
# 参数、执行预算、取消、进程清理与设置持久化
node --test tests/scalable-bridges.test.mjs tests/paper-tools-contracts.test.mjs tests/local-json-process.test.mjs tests/project-settings.test.mjs

# 已准备依赖后的真实计算
OPENQUANTUM_REAL_USER_COMPUTE=1 node --test --test-concurrency=1 tests/user-compute-live.test.mjs

# 既有扩展算例与真实 Harness 调用；为此次运行单独保存证据
OPENQUANTUM_REAL_SCALABLE_BRIDGES=1 OPENQUANTUM_SCIENCE_EVIDENCE_DIR=.openquantum/user-owned-compute-2026-09-14 node --test --test-concurrency=1 tests/scalable-bridges-live.test.mjs tests/harness-paper-tools.test.mjs
```

Harness 回归使用本地模型协议替身，执行真实 MCP 计算，并从 Session event log 重读结果。完整运行工件保存在 `.openquantum/user-owned-compute-2026-09-14/`。
