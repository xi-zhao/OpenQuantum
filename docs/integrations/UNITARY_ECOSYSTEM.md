# Unitary 生态计算与数据接入

OpenQuantum 新增 Dynamiqs、Clifft、OQuPy、Deltakit 与 Metriq 数据查询。四项计算各提供一个有界 Tool 和有用的领域 Skill；Metriq 是原生只读 Tool。默认 Preset 已声明全部五项，Harness 继续负责调度、进程生命周期和会话记录。

## 固定来源与执行范围

| 项目 | 固定来源 | 当前切口 | 执行入口 |
| --- | --- | --- | --- |
| [Dynamiqs](https://github.com/dynamiqs/dynamiqs) | 0.3.6，提交 `a49b30fe5cacb5cf7c1d981f2e7ed03b18e05318`；Apache-2.0 | CPU 单量子位批量 Lindblad 动力学与驱动梯度 | `dynamiqs_local.simulate_dynamiqs_dynamics` |
| [Clifft](https://github.com/unitaryfoundation/clifft) | PyPI 0.10.0；Apache-2.0 | Clifford+T 电路、门后独立去极化与最终 Z 测量，可选密度矩阵参照 | `clifft_local.sample_clifft_circuit` |
| [OQuPy](https://github.com/tempoCollaboration/OQuPy) | PyPI 0.5.0；Apache-2.0 | Ohmic spin-boson TEMPO、有限环境记忆 | `oqupy_local.simulate_oqupy_spin_boson` |
| [Deltakit](https://github.com/Deltakit/deltakit) | PyPI 0.10.0；Apache-2.0 | 矩形 rotated planar-code、ToyNoise、Stim 1.16.0 与 PyMatching 2.4.0 | `deltakit_local.run_deltakit_memory` |
| [Metriq data](https://github.com/unitaryfoundation/metriq-data/tree/6730f78b135a9af67691a0ef4fbea041978056c5) | 提交 `6730f78b135a9af67691a0ef4fbea041978056c5`；CC-BY-4.0 | 公开历史基准的原始参数、指标与来源查询 | 原生 `metriq_benchmarks` |

四个 Python 项目使用各自的 `pyproject.toml` 与带摘要的 `uv.lock`，均限制为 Python 3.12。Dynamiqs 固定 JAX 0.6.2、Diffrax 0.7.0，并显式开启 CPU 与 64 位；OQuPy 的 NumPy 1.x 环境与其他能力隔离。Dynamiqs 使用完整源码提交，不依赖浮动分支或 PyPI 最新版本。第三方源码由包管理器安装；随仓库分发的 Metriq 数据保留原版许可证、署名和转换说明，见 [第三方声明](../../THIRD_PARTY_NOTICES.md)。

## 准备与使用

在仓库目录准备四个锁定环境：

```bash
npm run capability:unitary:setup
```

需要 Node.js 24、Git 与 uv。安装器使用 `uv sync --frozen`，环境位于 `.openquantum/python-envs/<capability-id>/`。Metriq 数据已经随源码提供，不需要 Python 或联网。首次数值调用也可能下载固定依赖并写入环境、编译或绘图缓存，因此四个计算 Tool 的完整副作用声明是 `workspace-write`；Metriq 查询声明为 `read-only`。

运行中的 OpenQuantum 需要重启 Harness 后加载新增 Preset 行。连接设置页可分别开关四个计算服务，Metriq 由默认 Preset 的原生 Tool Provider 注册。所有数值输入均为结构化参数，不接收任意 Python、任意电路文本或文件路径；单次 worker 限时 180 秒，输出上限 2 MiB。

可以在科研对话中发起：

| 目的 | 可复制请求 |
| --- | --- |
| 驱动灵敏度 | 用 Dynamiqs 比较驱动幅度 0.5 和 1、失谐 0、衰减率 0.1、时长 1、20 步，从计算基态出发，画激发态人口并解释末态人口梯度和独立参考偏差。使用一致的无量纲单位。 |
| T 门干涉 | 用 Clifft 对两量子位全零态执行 H(0)、T(0)、H(0)、CX(0,1)，无噪声，4096 shots、seed 7，比较最终位串频数与密度矩阵参考。 |
| 环境记忆 | 用 OQuPy 从 plus 态出发，tunneling=0、bias=0.4、alpha=0.1、cutoff=2、temperature=0、duration=0.5，分别用 steps=memorySteps=8 和 12，与零温纯退相干解析式比较。 |
| 纠错建模 | 用 Deltakit 构建 5×3 码片的 Z 存储实验，3 轮、ToyNoise p=0.02、4096 shots、seed 718，返回生成的电路、逻辑失败数和 Wilson 区间。 |
| 设备公开基准 | 查询 Metriq 快照中 provider 包含 origin 的记录，列出设备、基准名、测试时间、原始参数和指标，标明来源。 |

## 物理模型与解释边界

**Dynamiqs** 使用 `H=(drive X+detuning Z)/2`、`L=sqrt(gamma)|0><1|`，`hbar=1`。批量最多 8 个驱动，时长最多 5、最多 100 步。梯度来自 JAX 自动微分，并与独立 SciPy Lindblad 积分及中央有限差分比较；不开放任意波形、多体系统、GPU 配置或控制优化。`ground/excited` 是计算基标签。

**Clifft** 支持 H、S、T、X、Y、Z、CX、CZ，电路规模与 shots 由用户指定，可用 `execution` 配置执行资源、`maxActiveWidth` 自行设置活跃宽度门槛。门后对该门涉及的各量子位施加 `DEPOLARIZE1(p)`，p 是三类 Pauli 错误的总概率。结果从左到右为 q0、q1……；`auto` 默认对至 6 qubits 计算独立密度矩阵参照，`required` 可显式运行更大输入的参考。`referenceMode=auto|required|skip` 控制参考；运行参考时返回完整位串，跳过时仅返回实际观察到的位串（observed_only），参考概率与 TVD 为 null。loss、leakage、续算与动态反馈仍未开放。执行配置、参考模式与实测记录见[计算工具使用说明](SCALABLE_BRIDGES.md)。

**OQuPy** 使用 `H=(tunneling X+bias Z)/2`，耦合算符 `Z/2`，`J(w)=2 alpha w exp(-w/cutoff)`，`hbar=kB=1`，系统初态与热 Gaussian bath 因子化。最多 40 个时间步、12 个记忆步，`alpha<=0.2`、时长不超过 2。`memoryTime=memorySteps*duration/steps`，减小 dt 时必须同时考虑物理记忆长度；固定 `epsrel=1e-7` 不代表观测量误差上界。适配器对请求终点增加一个向上的浮点 ULP，防止 OQuPy 0.5.0 将整步数取整为少一步，并核对真实输出网格。

**Deltakit** 的 width/height 各取 3 或 5，表示数据量子位码片尺寸；实际物理量子位和 detector 数由电路返回。最多 10 轮、8192 shots，只用本地 ToyNoise。适配器对互相独立的 R/DEPOLARIZE1 目标及纯记录 XOR 操作数排序，保留实际测量次序、控制门、TICK 与 repeat 调度，再对实际用于采样的电路计算 SHA-256。seed 只在固定软件和机器环境下用于重现。Wilson 区间只描述二项采样误差，零失败不代表零概率；这里不包含专有解码器、云任务、实测校准、泄漏服务或 threshold 验收。

四项均返回输入、上游版本、输入摘要、依赖锁摘要和数值限制；当前等级是 L1，`scientificValidation=not_evaluated`。解析对照与回归是开发证据，没有接入 central Acceptance Builder，也不宣称整个参数域收敛。

## Metriq 数据来源与转换

快照覆盖固定提交的 `metriq-gym/v*/` 下全部 JSON 记录数组：331 个文件、413 次记录出现，按完整原始记录去重后为 410 条。没有重算或聚合指标。每条记录保留全部来源文件、数组位置、原始文件 SHA-256 与固定提交链接；`get` 同时返回完整 `originalRecord`。快照摘要为 `45a81f9deadd6c583249817944637c5835b488a30c426ebbae945bc0be834426`。

`list/search/get` 是同一个原生 Tool 的动作参数。按 provider、device、benchmark 或文字进行大小写不敏感查询；每页最多 20 条，返回结果上限 160,000 字符。查询词匹配厂商、设备、基准名称与时间，不做全文论文检索。旧记录没有显式 outcome 时会标记 `outcomeExplicit=false`；本地模拟器保留 provider=`local`。这些历史结果不能当作当前真机状态，跨设备比较必须先匹配基准定义、规模和采样条件。

每次查询返回 Unitary Foundation 与贡献者署名及 CC-BY-4.0 许可标识。[source.json](../../src/metriq-data/upstream/source.json)、[NOTICE](../../src/metriq-data/upstream/NOTICE) 和 [LICENSE](../../src/metriq-data/upstream/LICENSE) 随源码保留。导入脚本只读取本地 tar 内的 JSON 与许可证，不执行上游代码，也不解包路径：

```bash
gh api repos/unitaryfoundation/metriq-data/tarball/6730f78b135a9af67691a0ef4fbea041978056c5 > .openquantum/metriq-pinned.tar.gz
python3 scripts/import-metriq-snapshot.py .openquantum/metriq-pinned.tar.gz
```

## 验证与证据

```bash
npm run capability:unitary:test
npm run capability:unitary:live
npm run check
```

合同检查覆盖严格输入、资源上限、未知动作、错误输出、来源不匹配、凭据环境隔离以及取消后的恢复。数值回归使用真实锁定依赖，覆盖 Rabi 解析人口和梯度、振幅衰减、T 干涉与噪声位序、TEMPO 解析极限及浮点网格，以及两逻辑基、矩形码片、固定 shots 和重现性。独立领域审阅另用 Bloch 矩阵指数与 Fréchet 导数、解析噪声和 detector error model 故障项复核。

Harness 检查启动隔离的真实 Host，确认四个 Skill 可发现，五个 Tool 可调用，五次成功与一次预期错误写入并重读 Session event log。模型端是本地协议替身，只验证运行接线；没有调用外部模型或真实硬件。

日期化结果与源码摘要见 [2026-09-14 验证记录](evidence/unitary-2026-09-14.json)。本机原始数值结果和 Harness 会话保存于 `.openquantum/unitary-tools-evidence/`，供复查。
