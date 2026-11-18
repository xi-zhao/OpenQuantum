# ST-GRAPE：多误差源鲁棒脉冲优化候选提案

- 调研日期：2026-11-08（Asia/Shanghai）；OpenQuantum 基线 `0da563fa87c6592a8923d2eb98eea80f484d2151`。
- 官方仓库：[Fanyd271/ST-GRAPE](https://github.com/Fanyd271/ST-GRAPE)；稳定发布 [v1.0.0](https://github.com/Fanyd271/ST-GRAPE/releases/tag/v1.0.0)，发布时间 2026-11-07 12:04（北京时间）。
- 固定源码：[`5f0d75dd250649b0a8ff629b104a4fc30c9b6c5b`](https://github.com/Fanyd271/ST-GRAPE/tree/5f0d75dd250649b0a8ff629b104a4fc30c9b6c5b)；annotated tag 对象为 `9108e1d41ad0b13d99ed3e11936b171f606f07cd`。
- 状态：**仅候选规格，尚未接入、安装或运行**。由“候选接入”任务沿用同一分支与 PR 续办；用户可随时关闭或要求停止。

## 用户任务与增量价值

用户需要对自定义有限维 Hamiltonian、目标态或目标门，设计同时抵抗多个准静态误差和有色噪声的脉冲，
并比较传播近似、优化预算与独立验证结果。多误差源和高阶响应会扩大增广系统，直接传播成本成为实际限制。

OpenQuantum 已有 [QuantumControl.jl](../../../.agents/skills/quantumcontrol-julia/SKILL.md) 的最优控制工作流，
以及 QuTiP、dynamiqs、Pulser 等动力学与控制能力；本候选不是填补“没有 GRAPE”的空白。
增量是作者维护的 **Taylor 增广误差响应、结构化 Suzuki–Trotter 传播及其目标梯度**，
并在同一问题上保留 dense / block-sparse DOP853 对照。它为研究多误差鲁棒性与计算成本提供一个可复现入口，
不替代通用控制库，也不自行重写优化算法。

优先级为**中高**：本窗口首次稳定软件发布，有可隔离准备的小型纯 Python wheel、
明确的方法边界和小规模独立参考路径。公开维护历史仍短，首轮只接研究 SDK/Skill；
不因星数、论文接收或作者的大规模加速结果而宣称生产成熟或必然更快。

## 一手证据、维护与科学边界

方法论文 [APS 接收页](https://journals.aps.org/pra/accepted/10.1103/959l-ms9v)
确认论文于 2026-10-21 接收，主题为用 Suzuki–Trotter 分解处理高维量子系统的多重不确定性。
[早期预印本 v2](https://arxiv.org/abs/2506.18590v2)是背景资料；
最终接入语义以固定源码及 [methods.md](https://github.com/Fanyd271/ST-GRAPE/blob/5f0d75dd250649b0a8ff629b104a4fc30c9b6c5b/docs/methods.md)
为准，不能把早期论文、最新 main 和正式 release 混为一套版本。

上游有梯度、传播精度和 Gaussian RMS 等测试：
[test_trotter_gradient.py](https://github.com/Fanyd271/ST-GRAPE/blob/5f0d75dd250649b0a8ff629b104a4fc30c9b6c5b/tests/test_trotter_gradient.py)、
[test_rms_penalties.py](https://github.com/Fanyd271/ST-GRAPE/blob/5f0d75dd250649b0a8ff629b104a4fc30c9b6c5b/tests/test_rms_penalties.py)。
[CI 配置](https://github.com/Fanyd271/ST-GRAPE/blob/5f0d75dd250649b0a8ff629b104a4fc30c9b6c5b/.github/workflows/ci.yml)
覆盖 Python 3.12 的 Ubuntu/Windows；固定提交的 [上游运行](https://github.com/Fanyd271/ST-GRAPE/actions/runs/42336720908)
已成功。[verification.json](https://github.com/Fanyd271/ST-GRAPE/blob/5f0d75dd250649b0a8ff629b104a4fc30c9b6c5b/docs/verification.json)
另外记录作者在 macOS arm64 的 121 项测试。以上均是上游证据，**本轮没有复现**，不等于 OpenQuantum 宿主验收。

接入必须保留以下限制：

1. 梯度精确性针对 **Trotterized objective**，不等于未分裂传播的精确梯度。
   Trotter 步数、Taylor 截断阶数、有色噪声指数拟合都会影响结果；损失降低不是误差已经受控的证明。
2. 准静态 Taylor 模型使用独立零均值 Gaussian 参数；物理标准差与扰动算符的组合、
   二阶交叉矩等须明确，不能推广为任意相关分布或量子环境模型。
3. 有色噪声优化使用辅助系统；[噪声验证](https://github.com/Fanyd271/ST-GRAPE/blob/5f0d75dd250649b0a8ff629b104a4fc30c9b6c5b/docs/noise_sampling.md)
   区分拟合模型与原始平滑带限 1/f 参考。保留频段、谱归一化、拟合误差和抽样种子；
   不把对同一近似的重复计算当独立验证，也不能无声截断非法协方差谱。
4. [ControlProblem](https://github.com/Fanyd271/ST-GRAPE/blob/5f0d75dd250649b0a8ff629b104a4fc30c9b6c5b/src/stgrape/problem.py)
   使用角频率 Hamiltonian，`H × time_step` 无量纲；必须声明时间单位、2π 约定、
   初态/目标归一化、门或态保真度定义，校验维数、有限值与时间网格。
5. ST 路径需要满足公开接口要求的 `control_groups`。
   [workflow](https://github.com/Fanyd271/ST-GRAPE/blob/5f0d75dd250649b0a8ff629b104a4fc30c9b6c5b/src/stgrape/workflow.py)
   检查通道覆盖、重复和变换基下的对角形式；不能对任意非对易控制项随意声称分组成立。
6. [优化选项](https://github.com/Fanyd271/ST-GRAPE/blob/5f0d75dd250649b0a8ff629b104a4fc30c9b6c5b/src/stgrape/optimizers/options.py)
   默认没有时间上限，迭代上限很大。示例必须显式限制时间、迭代、求值和规模；
   宿主外层超时覆盖整个调用，包括单次线性代数与最终参考计算。
   timeout、迭代用尽、非有限值或参考计算失败不能报为已收敛。
7. 保存数据的 `reproduce` 是重算表格/绘图，不等于重新优化或传播噪声。
   [stress 预设](https://github.com/Fanyd271/ST-GRAPE/blob/5f0d75dd250649b0a8ff629b104a4fc30c9b6c5b/docs/reproduction.md)
   的长时运行、关闭周期精确检查和计时边界必须单独说明，不能成为默认执行或通用性能结论。

## 最小接入与维护取舍

采用 [CONTRIBUTING 的 L0/原生 SDK 路径](../../../CONTRIBUTING.md)，建议能力标识 `stgrape-control`：
一份领域 Skill、隔离环境与锁、固定来源/许可记录、可编辑的 Python 示例。
复用 [SDK 工作台](../../../.agents/skills/quantum-sdk-workbench/SKILL.md) 的发现和显式准备，
以及 DSH/Codex 已有的代码与文件工具；遵循 [扩展职责](../../architecture/EXTENSION_MODEL.md)。

- **Module / Interface**：直接使用上游公开的 `ControlProblem`、`ControlTask`、
  `RobustnessModel`、脉冲类型、`OptimizationConfig` 和 `optimize`。
  用户可提供自己的系统、控制通道、目标、噪声和预算；验收用的 1–2 qubit 实例不是 SDK API 白名单。
  输入、固定依赖、单位、请求/实际预算、种子、终止原因、脉冲和独立参考结果均留档。
- **复用 / Adapter**：只在现有环境准备和宿主投影处登记，算法及其行为保留在上游 SDK。
  优先固定官方 code-only wheel 及摘要；若现有准备入口不能表示该发行包，沿用已有完整 SHA
  源码准备方式并在实现 PR 说明，不为此建立第二套安装器或版本权威。
- **删除测试**：若增加只转发 Python/CLI 的 Tool 或 MCP Server，删掉后现有代码工具仍能完成同一任务，
  因而首轮不增加这些入口，也不新增 Runtime。Skill 负责方法选择、约束和解释，不能自己执行或隐式安装。
- **成本归属**：新增维护集中在一份环境锁、公开 API 示例及科学边界回归。
  同一份 Skill/SDK 内容供两个宿主使用；不复制控制算法或包内私有梯度函数。
  上游测试引用私有函数不构成 OpenQuantum 新公共接口的理由。
- **数据与输出**：默认只准备代码，不下载整套科研归档。
  [paths.py](https://github.com/Fanyd271/ST-GRAPE/blob/5f0d75dd250649b0a8ff629b104a4fc30c9b6c5b/src/stgrape/paths.py)
  允许没有归档时使用独立输出目录；数据复现入口缺归档则明确 unavailable。
  使用新任务目录，不覆盖已有结果、不向来源或上游 `data/` 写入。执行阶段不下载、不安装。
- **交接顺序**：#79 MWPF 已实现中，#80 tropidist 先于本提案；实现时先复核它们的共享清单写入，
  并复核 #77 README 与 #75 环境锁的实际差异。纯提案路径不重叠，本轮不修改这些 PR。

预期维护成本**低到中等**：代码体积小且已有正式版本，但首次公开发行、数值方法和依赖精度仍需持续回归。
如果必须维护私有算法补丁、重写通用执行层或无法给出独立参考，就保留 Draft/观察，不扩大范围。

## 接入验收计划（尚未执行）

| 入口/用例 | 必须验证的内容 |
| --- | --- |
| 既有 SDK inspect / prepare / 执行 | 只发现不写入；显式准备固定版本与完整依赖；未准备执行不能隐式安装。宿主发现、Skill/SDK 清单、来源与环境检查采用既有入口。 |
| 单 qubit 固定脉冲 | 用常 Hamiltonian 的解析旋转核对传播、时间/角频率单位及门/态保真度，答案独立于 ST-GRAPE。 |
| 非对易 2 qubit 脉冲 | 固定输入，独立 SciPy 矩阵指数逐段乘积或独立 ODE 作参考；改变时间步或分裂子步，报告误差与收敛趋势，不能只比两个共享内核输出。 |
| 低阶鲁棒性 | 1–2 个误差源的第一/第二阶响应，使用独立解析 Gaussian 矩、数值微分或明确的积分参考；保留方差、阶数和交叉项。另用未参与优化的噪声样本评估。 |
| 有界真实优化 | 通过公开 `optimize` 对相同初始脉冲、目标、误差与预算比较 ST / dense / block-sparse 路径，记录实际开销、终止原因与独立终态；不要求不同求解器逐位相同或 ST 必须更快。 |
| 失败和边界 | 非法维数、非整数时间网格、不满足条件的 control groups、非法参数、非有限值、预算截止、参考失败及数据归档缺失均可解释；不把部分结果当已收敛或完整复现。 |
| 输出与可复现 | 新目录绑定输入摘要、源码/包摘要、环境锁、平台/BLAS、种子、请求/有效配置及原始结果；旧结果或保存图表不能冒充本次运行。 |
| 宿主与文档 | 按实际改动运行 capability/Skill/SDK 一致性与 DSH/Codex 适用检查；实现的同一 PR 更新根 README 的能力、使用入口与边界，按现有约定同步数量/语言入口并检查链接，保留已确认的首屏。 |

这里的工程和小规模数值验证不等于中央科学验收，保留 `scientificValidation=not_evaluated`。
不新增或放宽 Acceptance Profile、科学阈值及独立领域审阅要求；作者大规模基准不算本项目复现。
实现阶段补齐 Standards/Spec 单代理自审及必要验证后才转为可审查，缺失时保持 Draft。

## 发行、许可、依赖与资源

代码和代码文档为 [MIT](https://github.com/Fanyd271/ST-GRAPE/blob/5f0d75dd250649b0a8ff629b104a4fc30c9b6c5b/LICENSE)，保留版权和许可。
仓库 `data/` 单独采用 [CC BY 4.0](https://github.com/Fanyd271/ST-GRAPE/blob/5f0d75dd250649b0a8ff629b104a4fc30c9b6c5b/data/LICENSE)；
可选复现数据若后续获取，必须保留归属和来源，不能一律标成 MIT。

首选 [官方 code-only wheel](https://github.com/Fanyd271/ST-GRAPE/releases/download/v1.0.0/stgrape-1.0.0-py3-none-any.whl)
大小 181,212 bytes，release 元数据 SHA-256 为
`a45119e0ebf8a66381112c42679bfda3ad424f73ae13c8996f5fb69baaf8ca64`。
本轮核对元数据，未下载或验证发行包内部字节；接入准备必须实际校验该摘要。
完整源码/数据归档约 41 MB，不是默认所需；未据此声称存在 PyPI 发行。

[pyproject.toml](https://github.com/Fanyd271/ST-GRAPE/blob/5f0d75dd250649b0a8ff629b104a4fc30c9b6c5b/pyproject.toml)
要求 Python >=3.12、NumPy >=1.26、SciPy >=1.13、QuTiP >=5.0、Matplotlib >=3.8、Pillow >=10。
这些是上游下界，实际解析版本和锁文件在接入 PR 中审查；小 wheel 不代表总依赖或内存很小。
普通优化无需 GPU、账户、QPU、LaTeX 或 Poppler；可选出版图像工具不纳入首轮。

增广块数随误差源数/阶数增长，Hilbert 空间随 qubit 数指数增长，目标门的传播列数也高于单态任务。
默认采用小规模、有明确预算的 CPU 验证，不运行完整 stress 套件；大环境和临时产物按外置盘规则准备。
发布后重点追踪公开 API、噪声/单位约定、默认精度、分裂误差、终止状态及依赖兼容，不能按版本号盲升。
