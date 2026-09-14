# 计算规模与独立参考检查

2026-09-14。OpenQuantum 扩展了 TeNPy、TJM、Flow-VQE、Clifft 和 SQD 的计算桥接。张量算法可以直接处理更长的链，近 Clifford 采样按实际活跃宽度控制成本，Flow-VQE 使用不构造完整矩阵的状态向量运算，SQD 接受分子与活性空间。独立参考按自身成本选择，主算法不再受小系统精确校验规模约束。

## 支持范围

下表是**当前接口允许的范围**，各参数还需同时满足组合预算。它不表示极端参数组合已逐一运行，也不是算法或上游软件的理论上限。超过本地实测规模但满足输入合同的任务可以提交计算；是否在单次时限内完成、是否数值收敛，以实际返回结果为准。

| OpenQuantum Tool | 主计算范围 | 可选独立参考 |
| --- | --- | --- |
| `tenpy_local.solve_tenpy_chain` | 3–256 站点 spin-1/2 XYZ 开放链；局域 x/z 场；bond dimension≤256、sweeps≤100 | 至 10 站点的稠密精确对角化 |
| `tjm_local.simulate_tjm_dynamics` | 2–128 qubits 开放横场 Ising 链；局域振幅衰减；bond dimension≤64、steps≤80、trajectories≤128 | 至 6 qubits 的独立 Lindblad 积分 |
| `flow_vqe_local.train_flow_vqe` | 2–20 qubits，最多 128 个实系数 Pauli 项、4 层 RY/CNOT；每种搜索≤4096 次目标评估 | 至 10 qubits 的独立稠密 Pauli 对角化 |
| `clifft_local.sample_clifft_circuit` | 1–128 qubits；H/S/T/X/Y/Z/CX/CZ 共≤2048 门；门后去极化与最终 Z 测量；shots≤8192 | 至 6 qubits 的独立密度矩阵演化 |
| `sqd_local.run_sqd_chemistry` | 最多 16 个 H–Ne 原子；STO-3G、6-31G、cc-pVDZ；闭壳层 RHF 轨道，2–32 个空间轨道的活性空间；可输入对应位宽 counts | 同一活性空间 Hamiltonian 的 FCI：空间轨道≤12 且行列式维数≤10000 |

Flow-VQE 的主计算仍有状态向量的指数内存成本；本次将门作用和 Pauli 期望值从完整矩阵运算改为直接作用于向量。TeNPy 与 TJM 的张量截断和有限迭代误差仍需按任务检查。Clifft 的成本取决于编译后的 active width，不能只看总 qubit 数。

### 组合资源预算

| Tool | 额外预算 |
| --- | --- |
| TeNPy | `numSites × maxBondDimension² ≤ 4194304` |
| TJM | `steps × trajectories ≤ 4096`；`numQubits × steps × trajectories × maxBondDimension³ ≤ 2147483648` |
| Flow-VQE | `2 × epochs × batchSize × 2^numQubits × [numQubits × (2 × layers + 1) + terms.length] ≤ 536870912`；包含训练与随机搜索两份预算，最终重算单独用于核对 |
| Clifft | `numQubits × shots ≤ 524288`；编译后的 `peakActiveWidth ≤ maxActiveWidth`（默认 16，可设 0–24）；`2^peakActiveWidth × shots × gates.length ≤ 536870912`，在采样前检查 |
| SQD | 全分子空间轨道≤128；`activeOrbitals⁴ × maxSubspaceDimension² ≤ 268435456`；`maxSubspaceDimension≤128` 是**每个自旋子空间**的上限，总子空间维数受其平方限制 |

这些预算是本地接口的计算成本防护，不是运行时间预测。延续现有每连接一个计算、单次 180 秒、输出≤2 MiB、进程组取消与超时合同；依赖版本保持固定。

## 如何选择参考检查

五个 Tool 均新增 `referenceMode`，默认 `auto`。

| 模式 | 行为 |
| --- | --- |
| `auto` | 在参考预算内运行独立参考；超限时继续主计算，返回 `reference.status="not_run"` 和具体原因 |
| `required` | 必须运行参考；超过参考预算则明确拒绝，不自动降级 |
| `skip` | 主动跳过独立参考，直接运行主计算 |

未执行参考时，参考能量、参考轨迹、参考概率及其差异均为 `null`。`reference` 同时返回 `mode`、`status`、`method` 和 `reason`；输入模式、结果模式、状态与 nullable 字段由输出合同共同检查。已经尝试但失败的参考会使调用失败，不会被转换为普通跳过。

Clifft 在计算参考时返回完整位串分布（`outcomesCoverage="complete"`）；跳过参考时返回实际出现的位串（`observed_only`），计数之和仍为 shots。TVD 与参考概率为 null 时，不能按零误差解释。

TeNPy 额外返回 sweep 判据是否满足、最后能量变化和最大截断误差。判据满足不构成全局基态证明。TJM 的标准误只描述有限轨迹抽样；无噪声时上游可以只使用一条有效轨迹，实际数量记录在 `effectiveTrajectories`。

所有结果继续是 L1，`scientificValidation="not_evaluated"`。独立数值对照与 Harness 调用成功都不等同于 central Acceptance Builder 的科学验收。

## SQD 分子与活性空间

原有 `bondLengthAngstrom` 请求继续计算 H₂；新增 `molecule` 时，以其 `atoms` 和 `charge` 构建几何，默认键长不参与计算。基组可通过 `basis` 选择。

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

活性电子数必须为偶数，固定 `n_alpha=n_beta`（M_s=0），不约束总自旋。冻结核轨道数为 `(全分子电子数−活性电子数)/2`，活性轨道从冻结核之后连续选取。省略 `activeSpace` 时使用全空间，仍需满足资源预算。没有任意轨道索引选择、轨道优化或开壳层输入。

桥接通过 [PySCF CASCI](https://pyscf.org/user/mcscf.html) 构造含冻结核贡献的有效积分。`activeOrbitalIndices`、`frozenCoreOrbitals` 和 `electrons` 记录实际空间；`coreEnergyOffsetHartree` **已经包含核排斥能与冻结核贡献**，不能再加 `nuclearEnergyHartree`。FCI 与 SQD 使用同一个有效 Hamiltonian；它不是全分子全空间或完备基组的精确解。

counts 位宽为活性空间轨道数的两倍，顺序为 `beta(n−1)…beta0 alpha(n−1)…alpha0`。总频数≤4096，保留前导零。HF 构型始终包含；配置恢复可以调整不符合粒子数的样本。省略 counts 时使用明确标注的合成均匀样本。

## 本地实测覆盖

以下是本次实际运行的代表性输入，完整输入、数值与日志摘要见[版本化证据](evidence/scalable-bridges-2026-09-14.json)。接口最大值与这些已测输入分开报告。

| 能力 | 超出旧范围的实测 | 核对内容 |
| --- | --- | --- |
| TeNPy | 12 站点独立自旋与 12 站点耦合 Heisenberg 链 | 场项算例能量 −4.8、每站点 Sz=0.5；耦合链能量、归一化与收敛诊断 |
| TJM | 8 qubits 无耦合 Rabi 与带阻尼轨迹 | Z(t) 与 cos(1.4t) 的解析对照；真实跳跃导致非零抽样标准误 |
| Flow-VQE | 12 qubits 真实上游训练；5 qubits 含 YY 项 | 归一化、能量重算、等搜索预算；另对 2/3 qubits 共 80 个 Pauli 字符串的随机复态与稠密矩阵逐项比较 |
| SQD | LiH 的冻结核 CAS(2e,4o)、H₄/STO-3G、H₂/cc-pVDZ、H₄/cc-pVDZ 的 20 轨道计算 | 独立手工冻结核收缩后 FCI 的能量及偏移对照；动态 counts、粒子数；20 轨道主计算正常完成且 FCI 自动跳过 |
| Clifft | 80 qubits GHZ 与超过 64 位的非对称置位 | GHZ 相关、shots 总和、首末位序；真实非零 active width 的拒绝路径 |

只含本次改动的隔离工作目录通过完整 `npm run check`（455 项通过、25 项按条件跳过、0 失败）；文档本地文件链接检查通过。

原有 H₂/FCI、TJM/Lindblad、Flow-VQE 种子与变分界、TeNPy 小链解析值、Clifft 干涉与噪声回归同时保留。独立领域审阅另行检查物理约定、参考与 null 合同、冻结核处理、矩阵自由位序以及资源边界。

本地模型协议替身驱动真实 Harness，调用五个扩展输入，并从 Session event log 重读、校验真实 Tool 结果。它验证连接、执行与持久化；没有调用外部模型或 QPU。

```bash
# 合同与资源/参考失败路径
node --test tests/scalable-bridges.test.mjs tests/paper-tools-contracts.test.mjs tests/unitary-tools-contracts.test.mjs

# 实际数值计算及 Harness 会话重读；使用已准备的固定依赖
OPENQUANTUM_REAL_SCALABLE_BRIDGES=1 node --test --test-concurrency=1 tests/scalable-bridges-live.test.mjs tests/harness-paper-tools.test.mjs
```

本地完整数据位于 `.openquantum/scalable-bridge-evidence-2026-09-14/`。这次修改不自动重启用户正在运行的 Harness；下次重启后，新输入合同和 Skill 说明随现有连接加载。
