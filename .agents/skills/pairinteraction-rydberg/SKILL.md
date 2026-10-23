---
name: pairinteraction-rydberg
description: 使用独立固定版本 PairInteraction 计算 Rb Rydberg 原子对势能与二阶有效哈密顿量，检查单位、基底截断和微扰适用范围。
---

# PairInteraction 原子对相互作用

<!-- BEGIN NATIVE SDK ACCESS -->
## 原生 SDK 路径

本能力同时支持 **PairInteraction 的原生公开 API**。用户需要 原子态、单原子与双原子基、相互作用矩阵、场扫描与截断选择 时，由 Agent 在固定依赖环境中编写和运行任务代码，不限于下文便捷 Tool 的预设模型。

使用 `node scripts/sdk-access.mjs inspect pairinteraction-rydberg` 定位环境，按[完整 SDK 工作流](../quantum-sdk-workbench/references/workflow.md)执行。模块导航：`pairinteraction.real`、`pairinteraction.complex`；导航不是 API 白名单。

默认数据锁仅含 Rb 和通用 Wigner 表。其他原子及模型的表可通过上游数据准备接口在独立任务目录显式下载或生成，记录版本与文件摘要后，以 bootstrap 的 data_directory 参数接入；不是把原生 API 限定为 Rb。

原生程序导入库前，按环境定位器的 `bootstrap` 执行启动兼容处理：显式使用已准备的原子数据库并禁止计算阶段自动下载；其他原子或自定义表通过 data_directory 指定独立数据快照。这不限制公开 API，也不替换数值算法。

下文关于模型、门集、输入与预算的限制描述便捷 Tool 的合同；原生 SDK 另受上游版本、可选依赖、宿主资源与用户授权约束。已禁用或被拒绝的动作不能借代码路径绕过。执行状态和科研验收分别报告。
<!-- END NATIVE SDK ACCESS -->


用于两个 Rb Rydberg 原子的静态相互作用或小模型有效哈密顿量。原子对沿 z，磁场沿 z，电场为零；当前仅支持 S–S 与 S–P 交换，目标态均为 m=1/2，忽略超精细结构和抗磁项。

通过 Harness 调用 `mcp__pairinteraction_local__calculate_rydberg_pair`。Skill 提供步骤，独立 MCP Server 执行计算；不启动其他 Runtime，不依赖 FatQat。

1. 确认问题落在两原子、Rb SQDT、偶极相互作用的范围内。S–S 使用 `channel="ss"`；S–P 使用 `channel="sp_exchange"` 并指定 `nP`。不将该模型泛化到其他元素、多体动力学或任意场方向。
2. 环境未准备时说明显式 setup 会下载固定软件和数据库，并写入项目 `.openquantum/`。在已有安装授权范围内运行 `npm run capability:pairinteraction:setup`；计算 Tool 本身不安装或下载。不要用 `pip install -U` 替换锁定版本。
3. 先用少量距离和小基底。输入上限：n=45..70、B=1..30 G、R=4..30 µm、最多 9 个距离、deltaN=1..3、能窗 1..25 GHz。单原子超过 300 态或原子对超过 1024 态时拒绝计算。
4. 读取 `targetBasisWeights`、`exactTargetWeights`、谱误差和 `perturbationStatus`。`within_screen` 只表示启发式筛选通过，不能称微扰收敛或科学验收；`outside_screen` 必须保留并解释。近简并导致二阶展开无定义时停止，不把失败替换成零相互作用。
5. 有定量精度要求时，分别增加 `deltaN` 和 `energyWindowGHz`，报告可观测量变化及未覆盖的通道。每次输出的 `convergence.status` 都是 `not_evaluated`；比较少量基底也不证明完备基底极限。
6. 给出输入、软件版本、依赖锁摘要、数据库发布与摘要、基底大小和限制。输出 `effectiveHamiltonianMHz` 为公共能量零点下的 **H/h，单位 MHz**，是普通频率；`energyReferenceMHz` 记录该零点。`exactEigenvaluesMHz` 的“精确”仅指已截断矩阵的对角化。

S–P 有效基底依次为 |S;P>、|P;S> 对应的场修饰态。逐距离按目标子空间权重选态，再按能量排序；不要宣称跨距离绝热分支跟踪。独立矩阵求和和 SciPy 对角化共享原子数据，不能替代原子参数、实验或论文案例的独立验证。

FatQat 独立提供电路与动力学能力。当前不自动转换 PairInteraction 输出，也不强制同时升级两者。以后连接时必须单独核对模型、基底、符号、单位与有效范围；尤其 H/h 的 MHz 转 H/ħ 的 rad/µs 需要 2π 因子。

当前能力为 L1，`scientificValidation=not_evaluated`。操作与版本治理见 `docs/integrations/PAIRINTERACTION.md`。
