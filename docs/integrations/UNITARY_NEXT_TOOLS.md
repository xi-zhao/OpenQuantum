# PyZX、Graphix、Symmer 与 PauLie

OpenQuantum 对四个上游项目做了计算适配，分别解决电路优化、测量式计算、对称性降比特和电路代数问题。每项独立提供一个 Skill 与一个本地 Tool，由默认 Agent Preset 的 Harness MCP Client 注册；没有新增 Agent Runtime。

| 项目与固定版本 | 连接 / Tool | 当前范围 |
| --- | --- | --- |
| [PyZX 0.10.6](https://github.com/zxcalc/pyzx/tree/v0.10.6)，Apache-2.0 | `pyzx_local` / `optimize_pyzx_circuit` | Clifford+T 电路的 ZX 重写、提取、QASM 和门数；可选完整酉矩阵对照 |
| [Graphix 0.4](https://github.com/TeamGraphix/graphix/tree/v0.4)，Apache-2.0 | `graphix_local` / `simulate_graphix_pattern` | 电路转 MBQC 模式与资源图；可选测量过程模拟、输出纠正及独立态矢对照 |
| [Symmer 0.0.13 / a4ba56e3](https://github.com/qmatter-labs/symmer/tree/a4ba56e3332424a65d4a2c088fd6363aca0c68e6)，MIT | `symmer_local` / `taper_symmer_hamiltonian` | 实 Pauli Hamiltonian 按指定独立对称性和扇区降维；允许零量子位标量 |
| [PauLie 0.2.3](https://github.com/QPauLie/PauLie/tree/v0.2.3)，MIT | `paulie_local` / `analyze_paulie_algebra` | 非恒等 Pauli 生成元的分类与精确维数；可选闭包及独立实 Lie 空间对照 |

每个目录的 `pyproject.toml` 与带包摘要的 `uv.lock` 固定完整依赖。Symmer 使用表中的完整源码 SHA，避免把较旧 GitHub Release 与开发分支混为同一版本。Graphix 升至 0.4 后继续固定 `numpy==2.4.6`；0.4 在 PyPI 可用，但 GitHub Release 仍标记为预发布。资源图、空间调度和测量结果 API 的迁移与验证见[2026-09-22 升级记录](../releases/2026-09-22-quantum-upstream-update.md)。四个项目的许可证及分发边界见[第三方声明](../../THIRD_PARTY_NOTICES.md)。

## 安装与执行

需要 Node.js 24+、uv 和可由 uv 使用的 Python 3.12；Symmer 的固定 Git 来源另需 Git。

```bash
npm run capability:unitary-next:setup
npm run capability:unitary-next:test
npm run capability:unitary-next:live
```

安装器使用 `uv sync --frozen`，环境位于 `.openquantum/python-envs/<capability-id>/`。首次调用也可能下载依赖、写缓存，完整调用副作用为 `workspace-write`。工具只接收结构化参数，不执行用户提供的程序，不接收任意文件路径，也不使用量子云凭据。worker 默认不设置时间或输出大小上限，支持按调用方配置预算及取消；连接层配置见[本地计算与资源配置](SCALABLE_BRIDGES.md)。

运行中的 Harness 需重启后加载新增 Preset 连接。工具是否配置开启、是否能成功执行、结果是否获得正式科学验收是不同状态。

## 可复制的任务

| 任务 | 请求示例 |
| --- | --- |
| 电路优化 | 用 PyZX 优化两量子位 H(0)、T(0)、T(0)、CX(0,1)，给出前后 QASM、T-count、双量子位门数及独立等价性误差。 |
| MBQC | 用 Graphix 把两量子位 H(0)、RZ(0,π/2)、CX(0,1) 转成测量模式，从全零态开始，运行 8 次测量过程，seed=7，解释资源图、输出节点和纠正后的态矢。旋转角输入用弧度数值。 |
| 对称性降维 | 对 H=ZI+0.5IZ+0.3XX，分别取 ZZ 的 +1 和 -1 扇区，用 Symmer 降到一量子位，比较各自完整能谱；不要把单个扇区的最低能量当成全局基态。 |
| Lie 代数 | 用 PauLie 比较 XI、ZI、IX、IZ 与加入 ZZ 后的动力学 Lie 代数维数，假设各 Pauli 项可独立控制，并检查与稠密矩阵闭包是否一致。 |

计算规模由用户输入与资源决定；`referenceMode=required` 可在超过默认自动参考阈值时继续执行，skip 不分配独立参考。完整参数见[本地计算说明](SCALABLE_BRIDGES.md)。

## 科学边界

PyZX 使用 `full_reduce`、保持输出排列的电路提取和基础门优化。选择参考时，适配器独立构造输入及提取电路的完整酉矩阵，在整体相位下比较，最大逐元素误差超过 `1e-8` 时失败。输入 Y 在 PyZX QASM 中展开为 X 后接 Z；门数统计对应展开后的电路。T-count、总门数和双量子位门数可能互相取舍，不保证每项都减少，也不提供硬件路由或规模性能结论。

Graphix 对门电路生成测量模式，执行标准化、信号移动与空间调度。Tool 输入角度是弧度，桥接明确转换为 Graphix 使用的 π 倍数；初态明确为全零或全 plus。每次模拟包含自适应测量和输出 Pauli 纠正，态矢按 outputNodes 对应的逻辑量子位排序。模拟与参考分别由 simulate 和 referenceMode 控制；参考态采用无矩阵门作用。实际运行的 fidelity 和归一化偏差容差为 `1e-8`。seed+i 采样可以重复分支，有限次对照不证明全部分支或任意输入通道等价；当前不做 Pauli 预处理、带噪 MBQC 或光子硬件实验。

Symmer 使用 `IndependentOp` 和 `S3Projection.perform_projection`，不自动发现或挑选稳定子。投影前强制检查生成元独立、两两对易并与每个非零 Hamiltonian 项对易，避免上游投影操作静默删除反对易项。参考开启时独立计算 `P=∏(I+s_i S_i)/2`，取 P 的 range 正交基 Q 后对角化 `Q†HQ`，不把 PHP 的补空间零特征值混入能谱。与降维能谱最大绝对差超过 `1e-8` 时失败。保谱仅限所选扇区，降维坐标不等于删去原始物理量子位。

PauLie 先运行分类和 `get_dla_dim`；closureMode 按需选择显式闭包，referenceMode 单独选择稠密参考。独立参考从 iP 出发，以原始生成元的伴随作用迭代构造实反厄米矩阵空间，双次正交化、增加基向量阈值 `1e-10`；维数必须一致且 span 残差不超过 `1e-8`。spanResidualTarget 标注残差覆盖的是闭包还是输入生成元；未枚举时不声称检查了 SDK 完整表示空间。这是实线性 Lie 维数，不是 GF(2) 秩。上游 classification 可以用同构名称，如 so(6) 与 su(4)；独立检查不构成完整抽象分类证明。全部控制系数独立是输入假设，不能由此推出有限深 ansatz 表现、训练性质或真实设备的可控性。

四项均为 L1，返回输入、版本、输入摘要、依赖锁摘要、数值对照与限制，`scientificValidation=not_evaluated`。当前没有新增 L3 Materializer 或 central Acceptance Builder 适配；开发回归不替代正式科学验收。

## 验证与证据

合同测试查询真实 `tools/list` 并与能力 policy 比对，覆盖严格输入、资源配置、未知 Tool、来源篡改、非法输出、worker 失败、凭据隔离、并发拒绝及取消后的恢复。数值测试使用真实锁定依赖，覆盖全酉矩阵、角度和位序、不同测量分支、相反扇区、Y 稳定子及生成元乘积符号、零 Hamiltonian、实线性独立性和完整 su(16) 闭包。

Harness 端到端测试使用隔离的真实 Host 和本地模型协议替身，检查四个 Skill 的发现、四个 Tool 的成功调用、一次预期错误及 Session event log 重读。它不验证外部模型自主选工具，也不涉及真实硬件。

本次扩展的检查见[2026-09-15 记录](evidence/local-compute-scale-2026-09-15.json)。原接入时的本地原始结果位于 `.openquantum/unitary-next-evidence/`；版本化摘要见 [2026-09-14 验证记录](evidence/unitary-next-2026-09-14.json)。
