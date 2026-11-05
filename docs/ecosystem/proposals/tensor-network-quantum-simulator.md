# TensorNetworkQuantumSimulator：非规则平面图张量网络候选

- 调研日期：2026-11-02（Asia/Shanghai）；OpenQuantum 基线 `b0f7161313a4a119079ce41e5d6233a3f6d384e6`。
- 上游：[JoeyT1994/TensorNetworkQuantumSimulator.jl](https://github.com/JoeyT1994/TensorNetworkQuantumSimulator.jl)。
- 固定候选：[v0.5.0](https://github.com/JoeyT1994/TensorNetworkQuantumSimulator.jl/releases/tag/v0.5.0)，完整提交 `c37fba6eac78649f7bf146888e04df3f1deebb92`；已解引用 annotated tag，不能把 tag 对象摘要当源码提交。
- **状态：同一 PR #76 接入中。** 2026-11-05 已加入原生 Julia 环境、L0 Skill、示例、数值检查与 README；实际验证和合并结果见 PR 与[使用记录](../../integrations/TNQS.md)。以下保留候选阶段的依据和验收规格。

## 用户任务与为什么值得接入

研究非规则二维晶格或处理器几何上的量子电路与多体动力学时，需要在同一张图上比较近似环境收缩方法，
并检查截断误差怎样影响局域观测量、范数和采样。把蜂窝、kagome 或 Penrose 图手工转换为另一种格点表示，
再维护几套环境参数，会增加模型与实现之间的转换负担。

优先级为中等。[11 月 1 日正式发布的 v0.5.0](https://github.com/JoeyT1994/TensorNetworkQuantumSimulator.jl/releases/tag/v0.5.0)
新增有限平面图 CTMRG、OpenQASM 2 / Qiskit.jl 导入，并调整环境维数、门约定及自由能的语义。
这是新发行包含的功能变化；发布当天默认分支的几个提交主要补文档，不能把那些文档提交说成新算法。

已有 [quimb 1.15.0 的 tensor 依赖组](../../../examples/quantum-algorithms/pyproject.toml)
支持任意张量网络，且已有
[BP 门操作、压缩与采样](https://github.com/jcmgray/quimb/blob/f4267f52afc8fd8f26aa9f8f4d0b89fc2c2c700d/quimb/tensor/belief_propagation/d2bp.py)。
它的 [TensorNetwork2D / contract_ctmrg](https://github.com/jcmgray/quimb/blob/f4267f52afc8fd8f26aa9f8f4d0b89fc2c2c700d/quimb/tensor/tn2d/core.py)
以行列索引的方格结构组织有限 CTMRG。不能宣称 OpenQuantum 此前没有 BP、CTMRG 或二维模拟。

本候选的增量是直接使用[平面嵌入、面与有向边的 CTMRG Interface](https://github.com/JoeyT1994/TensorNetworkQuantumSimulator.jl/blob/c37fba6eac78649f7bf146888e04df3f1deebb92/src/MessagePassing/ctmrg.jl)，
让非规则图保留原来的顶点、边和物理位点，并在同一套张量对象上选择 BP、boundary MPS 或 CTMRG。
已有 Quimb、TeNPy、TJM 和 Julia Yao 路径继续用于各自任务；本候选不替换这些后端。
这是一项减少几何转换工作的互补 Interface，不是经本轮证明的速度优势，也不是声称其他库无法表示这些图。

## 一手依据、版本与维护质量

| 依据 | 已核对的事实与限制 |
| --- | --- |
| [固定 Project.toml](https://github.com/JoeyT1994/TensorNetworkQuantumSimulator.jl/blob/c37fba6eac78649f7bf146888e04df3f1deebb92/Project.toml) | v0.5.0，Julia 1.10 兼容线、ITensors 0.9、NamedGraphs 0.14；Qiskit.jl 是 weak dependency。release 的历史合并列表提及 ITensorBase/MPI，不据此推断这些就是固定版本的直接依赖或默认能力。 |
| [CTMRG 测试](https://github.com/JoeyT1994/TensorNetworkQuantumSimulator.jl/blob/c37fba6eac78649f7bf146888e04df3f1deebb92/test/test_ctmrg.jl) | 上游将多种小图的收缩与其自身 exact contraction 比较，也检查环境维数与观测量。OpenQuantum 仍需独立参考，不能只复跑同一 oracle。 |
| [采样测试](https://github.com/JoeyT1994/TensorNetworkQuantumSimulator.jl/blob/c37fba6eac78649f7bf146888e04df3f1deebb92/test/test_sampling.jl) / [导入测试](https://github.com/JoeyT1994/TensorNetworkQuantumSimulator.jl/blob/c37fba6eac78649f7bf146888e04df3f1deebb92/test/test_circuit_import.jl) | 有积态/GHZ 和门约定的用例；样本很小，不构成大规模分布或完整 QASM 语义的验证。 |
| [固定提交的检查](https://github.com/JoeyT1994/TensorNetworkQuantumSimulator.jl/commit/c37fba6eac78649f7bf146888e04df3f1deebb92/checks) / [CI 配置](https://github.com/JoeyT1994/TensorNetworkQuantumSimulator.jl/blob/c37fba6eac78649f7bf146888e04df3f1deebb92/.github/workflows/CI.yml) | 读取时该提交返回的 11 个检查均成功；测试矩阵包括 Linux Julia 1.10、stable、pre 和 macOS x64。它不是本项目或 macOS arm64/Windows 的安装与数值验收。 |

相关方法论文有 [Tindall 与 Fishman 的 BP gauging](https://arxiv.org/abs/2306.17837)
以及 [Rudolph 与 Tindall 的二维电路模拟和采样](https://www.nature.com/articles/s41534-026-01372-2)。
本轮核对作者、摘要及仓库方法对应关系，没有复现论文算例，也未证明新 CTMRG 实现的全部主张。
论文可用于解释方法，不能替代固定源码与实际数值检查；不复制论文图、数据或正文进发行版。

## 最小接入与设计取舍

沿用 [L0 与原生 SDK 贡献路径](../../../CONTRIBUTING.md)和
[扩展对象规则](../../architecture/EXTENSION_MODEL.md)，建议新增一个 `tnqs-dynamics` Skill 和隔离 Julia SDK 环境，
复用已有 `setup-sdk`、`sdk-access`、环境准备与宿主代码执行。DSH/Codex 共用同一份 Skill、来源和示例。

- **Module / Interface**：直接使用上游公开的图、`TensorNetworkState`、`apply_gates`、`expect`、
  `contract`、`CTMRGCache`、`sample_certified`。Interface 包括图的几何条件、位序、门约定、
  dtype、环境维数、截断与收敛参数及失败语义；用户可编辑原生程序，不把测试预设当成 API 白名单。
- **复用与 Adapter**：环境锁定、发现、准备和脚本运行由现有 SDK Module 负责；当前没有需要新 Adapter 的宿主差异。
  Julia 跨语言这一事实本身不要求新增 MCP Server，现有 SDK 工作台已经承担代码执行。
- **删除测试**：另包装一层只转发上游函数的 Tool，删除后不会把必要规则分散回多个调用者，因此不加这层。
  Skill 的价值是方法选择、几何检查、收敛与误差解释；不重写上游收缩算法，不新增 Runtime、Validator 或 Acceptance 规则。
- **维护成本**：新增一组 Julia Project/Manifest、来源/许可、一份指南与原生示例回归。优先沿用本仓库的
  Julia 1.12.7 基线，但必须实际解析并验证；固定版本或完整 SHA 与间接依赖，不能只留兼容范围。
  Qiskit.jl、Python juliacall、GPU/MPI 不作为初次接入的必需项。
- **继续实施的条件**：若既有 Julia SDK 机制不能承载它，或必须维护私有算法补丁、另建接口才能实现核心价值，
  在本 PR 写明具体阻碍，保留 Draft，不顺势扩展框架。

## 科学与使用边界

1. [BP](https://github.com/JoeyT1994/TensorNetworkQuantumSimulator.jl/blob/c37fba6eac78649f7bf146888e04df3f1deebb92/docs/src/caches.md)
   在树结构和有环图上的性质不同；有环图的消息收敛不是结果精确的证明。记录迭代与收敛条件，
   不能仅靠“未报错”判定可信。
2. CTMRG 需要有效的有限平面嵌入。[几何检查](https://github.com/JoeyT1994/TensorNetworkQuantumSimulator.jl/blob/c37fba6eac78649f7bf146888e04df3f1deebb92/src/Planar/planar_embedding.jl)
   要求连通图、不同顶点位置和无交叉边等条件；不能把“库可表示三维图”写成“三维图可用 CTMRG”。
   初次指南使用默认 SVD projector；`eig` 为实验选项且不适用于每种平面图，不静默替换。
3. 波函数 bond dimension、环境维数、门的 SVD 截断、时间步误差与浮点误差要分别记录。
   上游角点计算有伪逆正则化；增大环境维数不自动给出通用单调误差界。
4. [采样实现](https://github.com/JoeyT1994/TensorNetworkQuantumSimulator.jl/blob/c37fba6eac78649f7bf146888e04df3f1deebb92/src/sampling.jl)
   的 `poverq` 来自近似幅度收缩，并与采样时规约/缩放后的态有关。
   “certified”这个函数名不是严格误差证书或 OpenQuantum 科学验收；保留归一化、权重和参考误差，
   不把五个 GHZ 样本当成概率分布检验。
5. v0.5 改动 `freenergy=-ln Z`、Qiskit 门参数约定和环境关键词。
   指南及程序必须按固定版本编写；OpenQASM 导入先限定经核对的 unitary 子集，
   不据导入成功承诺测量、反馈或任意动态电路语义。
6. 初次检查使用 CPU、小规模和显式精度。规模由用户与实际资源决定，不把小测试规模硬编码为能力上限；
   超出验证范围如实标记。GPU、MPI、127 量子位论文结果和性能宣传均不在本轮验收内。
   开发检查与运行时 Acceptance 分开，`scientificValidation=not_evaluated`。

## 同一 PR 的接入验收条件

先记录实际测试入口及其范围；期望值来自独立解析/数组参考，不调用同一个上游 exact 方法作为唯一答案。

| 用例 | 独立参考与应保存证据 |
| --- | --- |
| 小型树和三角形/蜂窝等非方格平面图的正张量收缩 | 使用独立显式指标枚举或 NumPy einsum 参考，核对顶点/边映射、张量数据和收缩值；保存原始输入及误差。 |
| 小 Ising 图的配分函数 | 独立枚举所有自旋配置计算 Z；核对 `freenergy=-ln Z`。例如三角环、无场、均匀 K=βJ 的参考为 `Z=2exp(3K)+6exp(-K)`，不从上游函数反推。 |
| 小型电路的波函数、范数和非对角观测量 | 解析单/双比特门与独立稠密态矢量；显式固定 Pauli 旋转角及位序，使用 ComplexF64，不能只比较采样计数。 |
| 至少一张非方格有环图，改变状态/环境维数 | 报告相对稠密或指标枚举参考的偏差与收敛轨迹；无单调性就原样记录，不以缩小范围掩盖问题。 |
| 积态及小 GHZ 的采样与权重 | 检查支持集、归一化、seed 和对应采样态；对可枚举小态独立核对幅度/权重，统计容差与样本预算明确，不作全分布保证。 |
| 无效/有交叉的嵌入、缺位置或不支持的 projector | 明确失败并保留原因；不能静默改图、换算法或返回假结果。 |
| 工程接入 | 固定来源和许可、完整依赖锁、显式准备及无隐式安装、SDK 可发现、原生程序实际执行、能力清单与 DSH/Codex 投影检查。 |
| 文档交付 | **同 PR 更新根 README 的能力说明、使用入口与边界**；按现有规则同步语言入口、数量和链接。README 不得把上游 CI 或本地小例子写成全平台/科学验收。 |

接入阶段为新增执行行为选择有意义的失败与最小实现步骤，按已授权的单代理 TDD/检查方法推进；
Standards 与 Spec 分别自审并记录 `reviewMode=self-review, independent=false`。
本提案不改科学验收阈值或 Profile；若后续确需改动，原有独立领域审阅要求仍适用。

## 许可、成本与任务衔接

[固定源码 LICENSE](https://github.com/JoeyT1994/TensorNetworkQuantumSimulator.jl/blob/c37fba6eac78649f7bf146888e04df3f1deebb92/LICENSE)
为 MIT，保留作者与许可声明；间接依赖及平台工件的许可随实际锁定结果逐项核对。
本地核心计算不要求账户、硬件或付费服务。Julia/ITensors 的下载、预编译和高维张量可能占用较大磁盘/内存；
本轮只读调研，无安装或执行。Elements 当前低于 40 GiB 保留线，后续不能直接启动大规模本地准备，
应复用合规的现有验证环境或远端 CI，或等待存储条件恢复，不能回写内置盘。

当前 [SlowQuant PR #74](https://github.com/xi-zhao/OpenQuantum/pull/74) 正在修改 SDK/能力清单、README、
分类和共享 SDK 测试。[Runtime PR #75](https://github.com/xi-zhao/OpenQuantum/pull/75) 修改七个环境锁与升级证据。
本提案只新增这一个 Markdown 文件，与两项实际改动无重叠。
接入任务须先读回两个 PR 的状态及实际文件；共享清单应在 #74 合并或以其他明确方式完成后再修改，
基于当时最新 main 续办本分支，避免并发改写。不要为本候选另开第二个 PR。

交付顺序：候选 Draft → 顺序接入与真实验证 → README 同步 → 两方面自审 → 可审查 PR。
未通过的检查继续调试并保存真实进度；超出授权或必要材料不可用才保留具体阻塞，不把版本号或 CI 绿色当接入完成。
