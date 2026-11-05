# RcmpsCore：连续相对论场论候选

- 调研日期：2026-11-04（Asia/Shanghai）；OpenQuantum 基线 `b0f7161313a4a119079ce41e5d6233a3f6d384e6`。
- 上游：[AntoineTilloy/RcmpsCore.jl](https://github.com/AntoineTilloy/RcmpsCore.jl)；作者维护的 GitLab 仓库也由上游 README 明确链接。
- 固定候选：[v0.2.1](https://github.com/AntoineTilloy/RcmpsCore.jl/tree/v0.2.1)，解引用后的完整源码提交 **`175b0aa41c2e4eee7d26f44a33d7d59ea641fbe1`**；annotated tag 对象 `d2a1b9bcc0903954da6c931f046d765dfa7e1cc1` 不是源码提交。
- **状态：同一 PR #78 接入中。** 2026-11-05 已加入固定 Julia 环境、L0 Skill、示例、数值检查与 README；实际验证和合并结果见 PR 与[使用说明](../../integrations/RCMPS.md)。以下保留候选阶段依据与验收规格。

## 用户任务与增量价值

目标任务是在连续空间、热力学极限直接研究 **1+1 维单标量玻色场**的平移不变基态、能量密度和同一真空上的切空间激发。
优先级中等：相较再增加通用电路模拟器，它补充一条具体的连续相对论场论方法。

现有 [TeNPy](../../../.agents/skills/tenpy-ground-state/SKILL.md)、[MPS 工作流](../../../.agents/skills/quantum-mps/SKILL.md)
以及 [quantum-algorithms 的 quimb 环境](../../../examples/quantum-algorithms/pyproject.toml)
已提供格点 MPS/MPO、DMRG、任意张量网络等工具，可以离散化场论后研究其连续极限。
本候选增加的是由上游维护的 **RCMPS 自由场基底、正常序相互作用、变分优化和动量激发 Interface**，
使调用方不必在通用张量库上重新实现这组连续场论规则；不是声称已有库不能研究场论。

另一个一手替代 [CMPSKit.jl](https://github.com/Jutho/CMPSKit.jl)
主要面向一维非相对论场论的连续 MPS，包含均匀、周期与有限非均匀系统。
RcmpsCore 的相对论基底和指定正常序 Hamiltonian 是此处的选择理由，不是按 Stars 或语言选库。
在办 [TNQS #76](https://github.com/xi-zhao/OpenQuantum/pull/76) 面向非规则平面图收缩，与此目标不同。

[固定版本 README](https://github.com/AntoineTilloy/RcmpsCore.jl/blob/175b0aa41c2e4eee7d26f44a33d7d59ea641fbe1/README.md)
列出 φ⁴、sinh-Gordon、sine-Gordon 和修改质量的 φ⁴ 目标。
首次接入建议提供完整 **Julia CPU SDK** 的公开调用方式与方法指南；小算例是验证证据，不把它们写成能力白名单。
`gpu/` 是另一个 Python/CUDA 实现，本提案不接入它。

## 一手来源、时间与固定版本

GitHub 元数据显示仓库于 **2026-11-03** 创建，但导入了更早的提交和 tags；
v0.2.1 的源码提交与 tag 日期都是 **2026-10-15**。
因此本次是新发现的官方 GitHub 入口和现有能力缺口，**不是 11 月 3 日新发布了 RCMPS 方法**。
GitHub Releases 列表为空，不能把已有 tag 写成刚发布的 GitHub Release。

| 已读取的一手依据 | 能说明什么 |
| --- | --- |
| [v0.2.1 提交](https://github.com/AntoineTilloy/RcmpsCore.jl/commit/175b0aa41c2e4eee7d26f44a33d7d59ea641fbe1)及 tag 对象 | CPU 包版本 0.2.1；发布说明称 Julia 部分沿用 0.2.0，主要增加 GPU 包。本提案选已存在的 tag，不追逐默认分支。 |
| [tag 到本轮 main 的差异](https://github.com/AntoineTilloy/RcmpsCore.jl/compare/175b0aa41c2e4eee7d26f44a33d7d59ea641fbe1...e7d2637855f3b9ecad38b2c1e0f60a9aae76eefa) | 20 个提交主要修改 GPU、CI 和文档；所读取的 CPU `src/`、Julia `test/`、`Project.toml`、许可及数值指南未变，不必为初次 CPU 接入采用未发布 SHA。 |
| [Project.toml](https://github.com/AntoineTilloy/RcmpsCore.jl/blob/175b0aa41c2e4eee7d26f44a33d7d59ea641fbe1/Project.toml) | Julia ≥1.10；JLD2 0.6、KrylovKit 0.10、OptimKit 0.5、OrdinaryDiffEqVerner 2、SciMLBase 3、SpecialFunctions 2。上游未提交 Manifest；兼容范围不是本项目的完整锁。 |
| [上游测试](https://github.com/AntoineTilloy/RcmpsCore.jl/blob/175b0aa41c2e4eee7d26f44a33d7d59ea641fbe1/test/runtests.jl) / [激发测试](https://github.com/AntoineTilloy/RcmpsCore.jl/blob/175b0aa41c2e4eee7d26f44a33d7d59ea641fbe1/test/excitations.jl) | 有解析相干态、自由色散、梯度有限差分、规范不变性、有限盒收缩、数值与输入失败检查。只读取代码，没有运行这些测试。 |
| [CI 配置](https://github.com/AntoineTilloy/RcmpsCore.jl/blob/175b0aa41c2e4eee7d26f44a33d7d59ea641fbe1/.gitlab-ci.yml)与固定版本 README | 声明 Julia 1.12/1.10 矩阵，1.10 允许失败；README 记载曾使用 1.12.7。固定 tag 的 GitHub check-runs 为零，本轮未取得 GitLab 流水线结果，不宣称上游 CI 或全平台验证通过。 |

方法依据是 [Tilloy 的 RCMPS 论文](https://arxiv.org/abs/2102.07741)
和 [Pufu、Søgaard、Terlemes 的相对论准粒子 ansatz 论文](https://arxiv.org/abs/2610.13824)。
本轮核对作者、摘要和源码指南的对应关系，没有复现论文。
后一篇包含跨真空孤子，不能把论文全部范围归给这个 SDK；固定实现只处理同真空切空间激发。
数学 ansatz 没有格点 UV 截断，不表示实际求积、有限窗口和浮点计算没有误差。

## 最小接入与维护成本

按 [贡献路径](../../../CONTRIBUTING.md)及[扩展对象模型](../../architecture/EXTENSION_MODEL.md)，
建议一个 L0 `rcmps-field-theory` Skill 加隔离 Julia SDK，沿用 `setup-sdk`、`sdk-access` 和宿主原生代码执行。
DSH 与 Codex 共用同一份 Skill、来源和示例。

- **Module / Interface**：直接使用上游 `State`、`fg_phi4` / `fg_sgordon`、
  `optimize_state`、`ExcitationModel`、`excitation_spectrum`、`dispersion_relation` 与保存恢复函数。
  Interface 同时包含规范、正常序与单位、模型参数、精度、收敛和失败语义，不只有函数名。
- **复用 / Adapter**：既有 Julia SDK 准备代码已从提交的 Project/Manifest 显式实例化环境。
  优先采用本项目与上游曾测试的 Julia **1.12.7**，在 Manifest 中固定 Git 来源、完整 revision、tree hash 和间接依赖；
  实施时必须真实解析、安装与核对，不能把这个建议写成安装成功。
  暂无需要新增 Adapter 的宿主差异；Julia 跨语言不单独构成再加 MCP Server 的理由。
- **删除检验**：再包装一个仅转发 Julia 函数的 Tool，删掉后不会把必要规则分散到多个调用方，因此不加。
  Skill 的价值在于模型选择、质量/能隙区分、误差预算及结果解释。不开第二套 Runtime，不复制上游求解器。
- **成本**：一组 Julia 环境锁、来源与 MIT 许可记录、一份使用指南及原生回归。
  Julia/SciML 预编译有磁盘与时间成本；稠密传递算子和激发装配会随 bond dimension 快速增长。
  CPU 路径不要求账户、GPU、云端硬件或外部模型。不开 GPU/远程服务，也不为对称目录引入新公开入口。
- 如果固定 tag 不能在既有 SDK 机制中正常准备，先保留可复现失败、尝试现有环境配置范围内的修复。
  需要私有算法补丁、额外 Runtime 或改变科学合同才能实现核心价值时，在同一 Draft 写明具体取舍，不扩大范围。

## 必须保留的科学与使用边界

以下约定来自固定版本的
[数值指南](https://github.com/AntoineTilloy/RcmpsCore.jl/blob/175b0aa41c2e4eee7d26f44a33d7d59ea641fbe1/docs/numerics.md)、
[激发指南](https://github.com/AntoineTilloy/RcmpsCore.jl/blob/175b0aa41c2e4eee7d26f44a33d7d59ea641fbe1/docs/excitations.md)
与[状态实现](https://github.com/AntoineTilloy/RcmpsCore.jl/blob/175b0aa41c2e4eee7d26f44a33d7d59ea641fbe1/src/state.jl)。

1. 单标量玻色场、平移不变无限体积，正常序参考质量为 1；φ⁴ 耦合采用 `g :φ⁴:`，没有 `1/4!`。
   不宣称支持任意维数、多场、费米场、有限温度或实时场论演化。
2. `mass_gap(s)` 的历史含义是 **传递算子 gap**；Hamiltonian 静止能隙必须显式使用
   `excitation_gap(s; model)` 或 `mass_gap(s, model)`。自由真空前者可为 Inf、后者为 1，不能混用。
   激发仅在同真空切空间内，既不是跨真空 kink，也不是一般多粒子谱。
3. `State` 使用 ComplexF64 和左规范 `Q=-iK-R†R/2`；修改矩阵须经构造器或 retraction，保持稳态一致。
   优化器的带正则化度量与物理切空间度量不同；`vertex` 返回复值，但梯度是其实部的梯度。
4. `fg_phi4` 的一次调用不会替优化器设置模型元数据。示例必须显式设置模型和耦合；
   修改质量的模型还要显式传同一个 `massmod`，不能混用函数默认值或在未经换算时检验光速为 1 的色散。
5. 分别检查 bond dimension、积分窗口、求积点数、ODE 容差、动量/扇区和本征残差。
   转移稳态假定唯一；小残差不证明大维数下唯一性或最终误差小。优化停止、`converged`、
   上游 `accepted` 和物理结论分别报告；上游一致性检查不是严格误差界，也不检查背景是否真基态。
6. 对有相互作用的激发，先检查背景优化与 bond-dimension 收敛；负能级原样保留。
   不同动量各自排序的能级在交叉处不自动代表同一分支。不得把 ansatz 的理论变分性质直接当作有舍入误差的输出证书。
7. CPU SDK 的可调用范围与实际验证范围分开写。大 D、GPU、临界外推、孤子、论文精度和性能提升没有本轮证据。
   不新增 Validator、Acceptance Profile 或中央科学验收，`scientificValidation=not_evaluated`。

## 同一 PR 的接入验收条件

实施前记录实际入口、输入与容差。通过公开 SDK 进行验证；数值答案采用解析式或独立数组实现，
不只让两个共用同一内核的上游方法互相核对。

| 检查 | 应保存的独立依据和证据 |
| --- | --- |
| 固定准备及原生程序 | Julia 1.12.7、v0.2.1 解引用 SHA、完整 Manifest 与实际包路径/版本；执行前确认来源没有被 JULIA_LOAD_PATH 中另一份同名包遮蔽。显式准备后执行不下载依赖。 |
| D=1 自由真空 | `R=K=0`、`g=0`，以解析 `E(p)=sqrt(1+p²)` 为参考，含正/负/零动量；分别记录传递 gap 与 Hamiltonian gap，不从上游输出反推期望值。 |
| D=1 相干态及模型约定 | 独立采用 `R=a+ib`、`K=0`：正常序 `〈:φⁿ:〉=(sqrt(2)a)^n`、顶角期望 `exp(β sqrt(2)a)`、φ⁴ 能量密度 `a²+b²+4ga⁴`；实/虚 β 及修改质量模型的常数、重标度按固定 Hamiltonian 推导后检查。 |
| 小 D 非平凡状态 | 独立 NumPy 构造 Lindblad 矩阵求稳态，核对 trace、Hermiticity、positivity 和物理残差；显式独立小步参数扰动核对梯度方向导数。不要把上游 `generate_T` 当独立参考。 |
| 优化与相互作用激发 | 小 D、有固定 seed 的优化保存完整控制量、能量/梯度轨迹与停止原因；至少一个相互作用小例子对窗口、求积和 ODE 容差做分项变化。上游 D4 fixture 可作回归，另保留解析相干态激发或独立有限盒收缩参考，不能只比同一来源快照。 |
| 失败与往返 | 非方阵、非 Hermitian K、非有限输入、非唯一稳态、非法模型/动量、强制数值不收敛，以及保存后重读。保留明确错误，不静默剪特征值、换模型或把未收敛伪装为成功。 |
| 工程与文档 | SDK 清单、能力声明、分类、Skill 发现及 DSH/Codex 投影一致；**同 PR 更新根 README 的能力、入口和限制**，按约定同步语言、数量、链接，尊重现有首屏结构。 |

TDD 只在接入新增执行行为或实际修错时按有意义的失败推进；此文档提案不运行 TDD。
交付前按固定 base/head 完成 Standards 与 Spec 单代理自审，标明 `reviewMode=self-review, independent=false`。
若将来触及科学阈值、作用域或 Acceptance 合同，仍须对应的独立领域审阅；不能用本提案或自审代替。

## 许可、成本与任务衔接

[固定 LICENSE](https://github.com/AntoineTilloy/RcmpsCore.jl/blob/175b0aa41c2e4eee7d26f44a33d7d59ea641fbe1/LICENSE)
为 MIT，保留作者与许可；间接依赖许可随最终锁逐项核对。论文、外部研究结果和 benchmark 工件不整包复制进发行版。
本轮只读调研与文档检查，没有安装、运行或证明该 SDK 已在本项目可用。
Elements 当前低于 40 GiB 保留线，后续较大准备必须使用合规现有环境或远端 CI，或等待容量恢复，不能回写内置盘。

本提案仅增加一个独立 Markdown，与已读取的在办文件无重叠。
共享 SDK/能力清单和 README 的实现写入按 **#74 SlowQuant → #76 TNQS → 本候选**顺序，
前项合并或以其他明确方式完成后，基于当时最新 main 续同一分支与 PR。
同时重新读取 [#75 Runtime](https://github.com/xi-zhao/OpenQuantum/pull/75) 的锁文件范围和
[#77 README](https://github.com/xi-zhao/OpenQuantum/pull/77) 的实际变更，避免覆盖并发工作。
若前项关闭或范围改变，重新核实剩余重叠，不盲目永久等待。

本候选入队后，开放候选/接入 PR 总量为 3，达到当前上限；不自动关闭旧 PR 腾位置。
交接顺序为候选 Draft → 顺序实施及真实验证 → README 同步 → 两方面自审 → 可审查 PR。
不自动合并、发行或部署。
