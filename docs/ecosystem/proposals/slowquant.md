# SlowQuant：量子线性响应与分子谱学接入规格

- 调研日期：2026-10-31（Asia/Shanghai）；OpenQuantum 基线 `b0f7161313a4a119079ce41e5d6233a3f6d384e6`。
- 上游：[erikkjellgren/SlowQuant](https://github.com/erikkjellgren/SlowQuant)。
- 固定源码：[`b0d12b2e7e680141e50f3de0c9ba029d9574bbca`](https://github.com/erikkjellgren/SlowQuant/tree/b0d12b2e7e680141e50f3de0c9ba029d9574bbca)。
- 当前仅为候选提案：未安装、执行或接入 SlowQuant，没有新增 Skill、Tool、MCP Server 或科学验收结论。
  后续“候选接入”任务沿用本分支与同一 Draft PR；用户可以随时关闭、暂停或要求停止。

## 用户任务与增量价值

用户在变分基态之后，可能需要研究激发能、跃迁性质和吸收谱，并比较轨道响应、活性空间和不同
量子线性响应（qLR）形式对结果的影响。[SlowQuant README](https://github.com/erikkjellgren/SlowQuant/blob/b0d12b2e7e680141e50f3de0c9ba029d9574bbca/README.md)
与[响应模块导航](https://github.com/erikkjellgren/SlowQuant/blob/b0d12b2e7e680141e50f3de0c9ba029d9574bbca/docs/autodoc/unitary_coupled_cluster_lr.rst)
提供酉参数化波函数、轨道优化、naive/projected/self-consistent/state-transfer 等响应方法，另有 Qiskit 路径。
其增量是这些方法及其选择工作流，不能笼统写成“新增量子化学”或“新增激发态计算”。

当前已有 [OpenQARP VQD](../../../.agents/skills/openqarp-excited-states/SKILL.md)、
[SQD](../../../.agents/skills/sqd-chemistry/SKILL.md)、[QDK Chemistry](../../../.agents/skills/qdk-chemistry/SKILL.md)
及 [Qiskit/PennyLane/PySCF](../../../.agents/skills/quantum-algorithms/SKILL.md) 原生 SDK。
这些分别覆盖变分激发态、采样子空间和广泛电子结构计算；不应为普通 HF/积分重建重复入口。
在本轮主线的 Skill、SDK 和能力说明中未找到专门的 qLR 工作流，但这不意味着所有已有 SDK 都不能计算任何响应性质。

作者的[方法论文](https://arxiv.org/abs/2312.13937)比较八种近程 qLR 形式，研究活性空间下的激发态势能曲线和吸收谱。
这是方法出处，不是当前源码全部正确或具备量子优势的证明。本次优先级为**中等**：方法与已有能力互补，
可先交付共享 SDK/Skill，维护成本主要落在源码加载、依赖兼容和独立数值回归上。

## 本轮变化与来源固定

SlowQuant 是已有项目，本轮并非发现全新发布。窗口内的
[提交 #125](https://github.com/erikkjellgren/SlowQuant/commit/b0d12b2e7e680141e50f3de0c9ba029d9574bbca)
修正 Qiskit Interface 对误差缓解及后选择分布的保存位置与标记。该变化涉及测量结果复用的语义，
应在后续验证中覆盖；本轮没有运行旧版复现错误，也不据此断言所有旧结果都受影响。

调查时 GitHub releases 列表为空；[PyPI 包名查询](https://pypi.org/pypi/slowquant/json)返回 404。
这不证明所有发行渠道均不存在，也不禁止用完整 SHA 接入。
[固定文件树](https://github.com/erikkjellgren/SlowQuant/tree/b0d12b2e7e680141e50f3de0c9ba029d9574bbca)
没有 `setup.py`/`setup.cfg`，其 [pyproject.toml](https://github.com/erikkjellgren/SlowQuant/blob/b0d12b2e7e680141e50f3de0c9ba029d9574bbca/pyproject.toml)
只有 Ruff 配置。因此不能把 `pip install slowquant` 或安装 Git URL 当作已经成立的准备方案。
Ruff 的 `py314` 设置也不能单独证明运行时必须使用 Python 3.14。

上游有 HF、积分、波函数、Qiskit Interface、性质和
[振子强度测试](https://github.com/erikkjellgren/SlowQuant/blob/b0d12b2e7e680141e50f3de0c9ba029d9574bbca/tests/test_oscillator_strength.py)。
固定文件树没有 `.github/workflows`；本轮未核验其他 CI 服务，不能宣称上游 CI 通过。
测试中的 H2/LiH 数值可用于回归调查，但部分标为 generic/working comparison 的比较实际构造同一个
`naive.LinearResponse` 类，不能将这种比较作为独立理论参考。

## 最小接入与维护设计

采用 [L0 贡献路径](../../../CONTRIBUTING.md)：拟增加 `slowquant-response` Skill、独立依赖环境、
固定源码记录和可编辑例子，登记现有 capability/SDK 清单。首先验证离线 state-vector 路径，
再明确 Qiskit 本地模拟路径的实际覆盖；不得在未验证时把后者或硬件运行写成已完成。

- **Module / Interface**：直接复用上游 `WaveFunctionUCC`、`WaveFunctionUPS`、相应
  `LinearResponse` 类及 `calc_excitation_energies()`、`get_oscillator_strength()`。
  Skill 负责输入约定、方法选择、诊断解释和独立对照；不重写响应方程。
- **源码准备**：复用现有 [`sourceProject` 目录](../../../.agents/sdk-libraries.json)、
  [显式 SDK setup](../../../scripts/setup-sdk.mjs) 和
  [完整 SHA/文件摘要校验](../../../src/lib/sdk-source.mjs)，参考已有 Flow-VQE 源码方式。
  明确区分依赖环境和校验后的源码目录；源码校验及模块加载需要真实测试，不能仅凭配置存在就报就绪。
- **依赖**：独立锁定 NumPy、SciPy、Numba 及实际需要的 Qiskit 组件；
  [上游 docs requirements](https://github.com/erikkjellgren/SlowQuant/blob/b0d12b2e7e680141e50f3de0c9ba029d9574bbca/docs/requirements.txt)
  只作依赖线索，不作为完整运行依赖合同。由接入任务依据真实导入和检查固定兼容版本。
  不给上游补一套私有发行包，不修改现有量子化学环境的锁，不把开发/文档依赖全部默认安装。
- **设计删除测试**：若增加的 Tool/MCP Server 只是转发上述公开函数，删除它不会损失算法封装，
  因而本提案不增加。复用现有工作台与宿主代码执行；如源码初始化确需调整，只在既有 SDK Interface 内
  做最小复用，不新增 Runtime、执行协议或独立安装器。
- **宿主与副作用**：DSH/Codex 复用同一份能力定义、依赖锁和指南，各宿主准备及资源状态沿用既有隔离约定。
  发现只读，准备显式下载，执行不隐式安装。
  遵守现有工作区、缓存、预算和访问授权；不配置量子云凭据，不进行真实硬件或外部模型调用。

能力说明应先描述用户可自定义的分子、基组、电子数、活性空间、波函数、激发阶数、方法与输出。
原生 SDK 导航不作为公开函数白名单，小型 H2/LiH 例子仅是验证样本，不是能力规模上限。
稠密参考和响应矩阵可能迅速增长，应单独说明成本，并使用现有超时、内存及用户任务预算。

## 科学边界

1. 记录几何单位、基组、电子数/自旋、冻结轨道与活性空间、积分和轨道约定、ansatz、优化残差、
   激发阶数及 qLR 形式。近似响应方法的结果不应被统一解释为精确多体谱。
2. [固定响应基类](https://github.com/erikkjellgren/SlowQuant/blob/b0d12b2e7e680141e50f3de0c9ba029d9574bbca/slowquant/unitary_coupled_cluster/linear_response/lr_baseclass.py)
   处理 Hessian/metric 广义本征问题，对负 Hessian 或低范数有异常/警告，并对返回本征量取实部。
   验证须保留警告、范数、矩阵残差与适用性诊断；不能仅以返回实数或程序退出正常认定响应稳定、物理正确。
3. 比较振子强度需要核对跃迁偶极、能量单位、规范和态的选择；简并态宜比较对应子空间或适当合并的强度，
   不用任意本征向量排序制造一致性。不得隐藏失败或通过改变模型/响应形式来“修复”科学结果。
4. state-vector、本地 shot 模拟和硬件结果分别留证据。噪声、误差缓解、后选择及测量复用有各自假设；
   不将离线谱学回归推广为硬件性能或量子优势。
5. 首版保持 L0，不增加 Validator、Acceptance Profile 或最终 Acceptance 推导。
   工程测试、独立数值对照和最终科学验收分别报告；后者仍为 `not_evaluated`。

## 同一 PR 的接入验收条件

| 检查 | 必须保留的证据与边界 |
| --- | --- |
| 固定来源与准备 | 固定上述完整 SHA 和依赖锁；从干净任务环境显式准备，核对源码摘要、真实模块路径和许可证。缺失、被修改的源码或依赖不能被报为就绪。 |
| 用户自定义任务 | 通过上游公开 Interface 改变分子/基组或输入积分、活性空间与响应形式，证明不限于一个硬编码预设；分别写清已验证与未验证的范围。 |
| 离线波函数与激发能 | 在明确可与精确理论比较的小活性空间中，用独立 PySCF FCI 或显式 Hamiltonian 对角化核对能量及对应激发。近似方法不强求普遍等于 FCI；报告差异和残差。 |
| 跃迁性质与强度 | 用独立态矢量/偶极矩阵计算的参考，或可追溯解析/已核验文献例子，检查至少一个非零和一个对称性禁戒跃迁；不以同一 SlowQuant 方法重算作为答案。 |
| 不稳定与失败情况 | 覆盖无效输入、未收敛基态或可构造的不稳定响应情形；保留上游异常/警告和未验收状态。若上游静默丢弃信息，先明确限制，不能伪装成功。 |
| Qiskit 本地路径 | 若交付该路径，用离线 primitive 对同一小问题交叉核对，并检查不同缓解/后选择标记下缓存分布的复用。未完成则明确标注部分接入，不能宣称 Qiskit/硬件已验证。 |
| 共享工程入口 | 现有 conformance、真实 Skill 发现、SDK 准备/执行与适用的 DSH/Codex 投影检查通过；改变源码加载行为时补真实失败路径回归。 |
| 用户入口 | 同一 PR 更新根 README 的能力、用法与限制，按仓库约定同步其他语言入口、数量和链接；保留现有首屏布局，不只更新内部清单。 |

独立参考及数值容差应先依据模型与参考精度固定，并记录优化、积分、浮点和采样误差，不能为过测放宽。
涉及新的科学作用域、阈值或验收规则时，遵循仓库的独立领域审阅要求，不能用单代理自审替代。
后续实现使用当前单代理工程 Skill 方法，分别保存 Standards/Spec 自审结论，标注 `independent=false`；
必要验证或语义问题未解决时保持 Draft。纯提案阶段不运行 TDD，也不声称已完成实现审查。

## 许可、成本与后续维护

[源码许可证](https://github.com/erikkjellgren/SlowQuant/blob/b0d12b2e7e680141e50f3de0c9ba029d9574bbca/LICENSE)
为 BSD-3-Clause；保留版权、许可条件和免责声明。依赖的许可证及发行方式另按固定锁核查。
不需要为了离线首版开通账户、购买求解器或调用 QPU；所有依赖准备只在任务隔离环境进行。

维护成本评为中等：上游未提供本轮可核验的安装包/CI 证据，因此需自己留可复现的工程与数值回归；
现成源码准备 Module 可复用，避免维护 fork 或重复实现。每周同步时核对源码加载、依赖兼容、响应矩阵/
范数语义及 Qiskit 测量缓存变化。若实际接入必须依赖私有补丁、大范围安装机制改造或未确定的科学合同，
先在本 Draft 记录具体证据与取舍，不把它自动扩成新的谱学框架。
