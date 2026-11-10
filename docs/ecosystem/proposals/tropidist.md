# tropidist：纠错码与电路距离候选提案

- 调研日期：2026-11-07（Asia/Shanghai）；OpenQuantum 基线 `0da563fa87c6592a8923d2eb98eea80f484d2151`。
- 官方仓库：[Fanerst/tropidist](https://github.com/Fanerst/tropidist)；固定完整 SHA：[`b03ec2d4077f287f89f97b5c2c16ce5ce17c2c58`](https://github.com/Fanerst/tropidist/tree/b03ec2d4077f287f89f97b5c2c16ce5ce17c2c58)。
- 上游没有列出的 GitHub Release；这是固定研究源码提案，不把 main 或论文发布当稳定软件版本。
- 状态：**尚未接入、安装或运行**。本 Draft 由“候选接入”任务沿用同一分支与 PR 实现；用户可随时关闭或要求停止。

## 用户任务、增量价值与优先级

用户比较纠错码或修改 syndrome-extraction 调度后，需要区分“找到一个低权重逻辑错误”与
“已排除所有更轻的错误”。tropidist 为给定二进制约束或 Stim 电路搜索距离上下界，返回显式错误支持；
电路路径还能在无噪声电路中重放故障。这可以帮助审查 qLDPC 调度的距离假设，不代替解码器。

现有 [quantum-qldpc](../../../.agents/skills/quantum-qldpc/SKILL.md) 的已声明路径是 HGP 校验矩阵、
GF(2) 秩和 syndrome，明确未计算码距；[emlint](../../../.agents/skills/emlint-dem-audit/SKILL.md)
做 DEM 结构诊断，不证明一般多故障距离。Stim、PyMatching、Tesseract、Chromobius 和在办 MWPF #79
仍负责各自模型、采样或解码任务。不能将一个 syndrome 的最优译码目标直接等同于全局电路距离。

现有 Stim 也有距离搜索，应优先复用适用部分：
[`shortest_graphlike_error` 与通用启发式搜索](https://github.com/quantumlib/Stim/blob/v1.16.0/doc/python_api_reference_vDev.md)
各有范围；graphlike 距离不能不加条件地当作包含一般超边的真实距离。
本候选的增量是一般二进制距离问题的上下界、完整性状态和 witness/replay 工作流，而非再包装一套采样器。

优先级为**中高**：能力缺口明确，官方核心只依赖 NumPy、Stim 与 C 编译器，有独立穷举验证入口。
[2026-11-05 方法预印本](https://arxiv.org/abs/2611.08247v1)和本窗口的可重建测试/记录整理构成新信号；
11 月 6 日该固定提交本身主要补论文引用，不把引用更新误报为新算法发布。
论文的硬件规模结果和性能比较是作者报告，本轮没有复现。

## 方法、维护质量与成熟度

[方法全文](https://arxiv.org/html/2611.08247v1)以 tropical partition function 表述距离，
使用 rank-based dynamic programming、截断动态规划和有界权重搜索。
[固定 README](https://github.com/Fanerst/tropidist/blob/b03ec2d4077f287f89f97b5c2c16ce5ce17c2c58/README.md)
及 [Problem 实现](https://github.com/Fanerst/tropidist/blob/b03ec2d4077f287f89f97b5c2c16ce5ce17c2c58/cdist/problem.py)
定义核心目标为：最小化选中列的数量，使 `H e = 0` 且 `L e != 0`（GF(2)）。
上下界相遇只是所声明模型下的计算结论，不是 Lean 形式证明或 OpenQuantum 科学验收。

上游有 [CLI 正例](https://github.com/Fanerst/tropidist/blob/b03ec2d4077f287f89f97b5c2c16ce5ce17c2c58/tests/test_cli.py)、
[核与穷举对照](https://github.com/Fanerst/tropidist/blob/b03ec2d4077f287f89f97b5c2c16ce5ce17c2c58/tests/test_kernel.py)、
[错误下界回归](https://github.com/Fanerst/tropidist/blob/b03ec2d4077f287f89f97b5c2c16ce5ce17c2c58/tests/test_false_bounds.py)
和 [Stim 重放检查](https://github.com/Fanerst/tropidist/blob/b03ec2d4077f287f89f97b5c2c16ce5ce17c2c58/tests/test_replay.py)。
后者包含枚举截断、搜索深度和整数饱和等实际失败风险，不能只跑成功例。
当前根目录未见 GitHub Actions 配置，也没有打包清单或正式 release；不声称上游 CI 或多平台验收通过。
因此首轮交付只能是有来源和实测边界的研究 SDK/Skill，不能宣传生产级距离认证服务。

## 最小接入与设计取舍

沿用 [L0 与原生 SDK 路径](../../../CONTRIBUTING.md)，拟增加 `tropidist-distance` Skill、
固定完整源码、隔离 Python 环境和可编辑示例。复用 [SDK 工作台](../../../.agents/skills/quantum-sdk-workbench/SKILL.md)、
现有来源准备/摘要校验和宿主代码工具，DSH/Codex 使用同一份能力内容。

- **Module / Interface**：采用上游公开 `python -m cdist` 入口，接受用户 Stim 文件或两份 GF(2) MatrixMarket
  矩阵；记录输入摘要、basis、噪声/列权重解释、时间和线程预算、上下界、status、witness、replay 及 trace。
  示例和小型验收用例不是上游 SDK 的 API 白名单。
- **复用与必要 Adapter**：固定源码继续由 `sourceProject` 和现有 `prepareSdkSource` 拥有。
  上游 [C 内核准备](https://github.com/Fanerst/tropidist/blob/b03ec2d4077f287f89f97b5c2c16ce5ce17c2c58/cdist/kernel.py)
  及 [搜索内核](https://github.com/Fanerst/tropidist/blob/b03ec2d4077f287f89f97b5c2c16ce5ce17c2c58/cdist/search.py)
  会在源码目录生成共享库，不能直接污染受完整文件清单校验的原始快照。
  采用仓库已有“保留原始快照、在独立构建输入中生成产物”的准备模式，做能力专属的显式准备步骤：
  从已校验源码复制构建输入，在隔离目录编译，记录编译器/选项及源码和产物摘要；执行时只使用已核验产物。
  不放宽共享源码校验，不跳过未记录文件，不修改上游算法。
- **删除测试**：新增只转发 CLI 的 Tool 或 MCP Server，删掉后不会丢失必需能力，故不增加。
  必要的编译准备与产物校验有真实职责；先实现这一小处，不扩成通用 Runtime 或新构建框架。
- 准备与执行分别留证据；运行阶段不能下载、安装或补编译。若现有准备入口无法安全承载上述步骤，
  在本 PR 记录具体差异后继续评估，不能靠启动时 monkeypatch 上游私有路径绕过。
- 沿用既有来源/锁文件作为版本权威；新增维护集中在一份环境锁、来源记录、准备兼容处理和接口回归。
  没有足够收益时不扩展到全部论文驱动、benchmark 适配器或第三方代码集合。

## 必须保留的语义与限制

1. CSS 的 `H_X/L_X` 给出 `d_Z`，另一基需单独计算；不能只算一个基就宣称完整码距。
   一般 stabilizer 的 Pauli 权重不等于随意拼接 X/Z 位后的 Hamming 权重。
2. 电路距离依赖具体电路和故障模型。[上游模型约束](https://github.com/Fanerst/tropidist/blob/b03ec2d4077f287f89f97b5c2c16ce5ce17c2c58/cdist/problem.py)
   对 DEM 机制数与物理故障位置数的等价有局部 Pauli 支持条件。不能推广到任意相关噪声、漏泄、
   或丢失模型；重复机制合并、未分解 DEM 和 observable 来源必须留证。
3. CSS memory 的 sector/time-collapse 依赖 detector 坐标和有效提升条件；普通电路走完整 DEM。
   不能仅因坐标存在就由 OpenQuantum 私自声明这些约化正确，更不能只重放 witness 就说下界已验证。
4. [CLI](https://github.com/Fanerst/tropidist/blob/b03ec2d4077f287f89f97b5c2c16ce5ce17c2c58/cdist/__main__.py)
   默认时间上限为 0（无上限），接入示例必须显式给预算，并由宿主约束整个调用。
   [pipeline](https://github.com/Fanerst/tropidist/blob/b03ec2d4077f287f89f97b5c2c16ce5ce17c2c58/bench/adapters/ours_pipeline.py)
   默认查表预算约 1 GiB，不等于整个进程峰值；规模/宽度增长可能有指数成本。
5. 该 pipeline 的搜索阈值范围为 1–40，dense DP 8-bit 饱和会报错；不是全方法统一的距离上限。
   `kmin>1` 的续跑下界依赖之前确实完成的记录，首轮用 `kmin=1`，不把部分分片当全局穷尽。
6. [结果序列化](https://github.com/Fanerst/tropidist/blob/b03ec2d4077f287f89f97b5c2c16ce5ce17c2c58/bench/common.py)
   区分 `exact/bounds/timeout/unavailable/error`，还应检查 `witness_ok`、`value_only` 和 replay。
   CLI 正常退出或终端出现“certified”均不足以证明本次成功；每次使用全新输出目录，禁止复用旧结果充数。
   精确结果须核对上下界相等、有效 witness 和对应模型；失败/不完整保留原状。
7. 上游 MatrixMarket 读取以坐标做 XOR，不使用数值列；示例必须生成并校验真正的 GF(2) pattern，
   不把任意带权 MatrixMarket 文件静默解释成二进制约束。
8. 可复现记录包含固定源码/依赖、编译器/架构、完整配置、输入/输出摘要和原始诊断。
   核查平台后才描述支持范围；当前源码有 macOS 分支，但 Windows 编译和其他平台均未由本轮验证。

## 接入任务的验收条件

本轮只读源码和文档；下面均为**尚未执行**的验收计划。
优先沿用公开 CLI、原生 SDK 与现有工程入口，独立参考不能再调用相同 solver 生成答案。

| 入口/用例 | 应检查的行为与范围 |
| --- | --- |
| GF(2) 小矩阵 | 对最多 12 列的自包含实例，独立枚举所有位向量求精确最小权重；逐项核对上下界、witness 的 `H e=0, L e!=0` 和权重。覆盖重复列、多 observable、零列和无可行逻辑错误。 |
| CSS 码 | Steane 的 X/Z 两基分别得到 3；零 detector 的单逻辑机制距离为 1。解析/枚举答案与上游结果分开保存。 |
| 小型 Stim 电路 | 用自包含 repetition/surface memory 与至少一个含超边的小 DEM 对应电路，独立枚举约束并重放故障；确认无 detector 翻转、目标 observable 翻转，记录完整电路及噪声。 |
| 不完整与失败 | 预算截止、低 `kmax`、无 witness、非法矩阵/电路、编译器或依赖缺失分别有可解释结果；不通过缩小问题或提高下界伪造 exact。 |
| 结果新鲜度 | 新目录与输入摘要绑定；子进程失败、JSON 缺失/错误状态、旧文件存在时不能当作新成功；stdout 和 JSON 矛盾照实披露。 |
| 准备/完整性 | 干净来源快照保持不变；篡改构建输入或共享库时拒绝使用。未准备运行不触发编译/下载；显式准备后才执行。 |
| 平台与维护 | macOS arm64 和 Linux 分别验证真实 CLI；其他平台如不可用应明确条件。运行适用的来源、SDK、capability、Skill 发现及宿主投影检查。 |
| 用户文档 | 在实现的同一 PR 更新根 README 的能力、入口和边界，按现有约定同步数量/其他入口并检查链接；与在办 README/SDK 改动顺序处理。 |

首轮工程和小规模数值检查不等于科学验收；保留 `scientificValidation=not_evaluated`。
不新增或放宽 Acceptance Profile、阈值、独立领域审阅要求，也不把作者的大规模结果标为本项目已复现。
实现后按单代理方式分别自审 Standards/Spec；缺少必要结论或验证时继续保持 Draft。

## 许可证、依赖与成本

核心 [MIT](https://github.com/Fanerst/tropidist/blob/b03ec2d4077f287f89f97b5c2c16ce5ce17c2c58/LICENSE)
要求保留版权和许可；仓库自带部分电路来自 Tesseract，须保留
[Apache-2.0 来源 NOTICE](https://github.com/Fanerst/tropidist/blob/b03ec2d4077f287f89f97b5c2c16ce5ce17c2c58/circuits/NOTICE.md)。
其他论文复现材料的许可独立核查，不整包下载或再分发。

[requirements](https://github.com/Fanerst/tropidist/blob/b03ec2d4077f287f89f97b5c2c16ce5ce17c2c58/requirements.txt)
把核心和 benchmark 依赖列在同一文件；不能直接全部安装。
首轮拟用 Python 3.12、固定 NumPy 和现有 Stim 1.16.0 基线，兼容性以实际解析/运行结果为准；
C 编译器和 Linux OpenMP 支持单独核验。不需要 Gurobi、其他竞品求解器、GPU、账户或真实 QPU。

预期维护成本**中等**：无稳定发布、C 编译/平台差异及下界完整性语义比纯 Python 库更敏感。
按完整 SHA 比较后续修改，重点回归准备产物、status、约化条件、时间截止、深度/整数边界和 witness 来源。
若需要维护私有算法补丁或大范围重写准备系统才能成立，保留观察并说明原因，不扩张本候选范围。
