# 2026-09-20 候选库接入计划

用户已授权制定并实施适合 OpenQuantum 的候选接入。实现分支以 `3f43b6e` 为基线；原工作树 Graphix/PyZX/Symmer/PauLie 等暂存改动保持独立。本计划不把这些既有文件算成本轮交付。随后按用户指示合并至 `e92bf0b`（v0.5.1）之上的本地 main；该主线已包含上述四项能力。

## 目标与核心对象

新增四项 L1 计算 Capability：线路切割、线路优化、量子核学习、变分激发态；另登记一个默认关闭的上游 FlagQuantum MCP 入口。沿用 Harness Skill Provider、Harness MCP Client 与已有隔离 Python worker；每项一个完整科学动作，声明最大副作用 workspace-write（包括依赖物化）。不新增 Runtime、模型路由或科学 Acceptance 快捷路径。

| 上游 | 本轮处理 | 验收信号 |
| --- | --- | --- |
| QCut 2.2.0 | `qcut-knitting`：切割规划与本地期望值重建 | 未切割参考、实际 shots、门切割与方向/相位回归；线切割暂不开放 |
| compactq 0.2.1 | `compact-optimization`：优化与独立等价检查 | 独立全酉矩阵及实际 QASM 重读检查、保持输入回退与明确验证范围 |
| cqlib-qml b3aeb784 | `cqlib-kernel`：编码、核矩阵及显式数据划分的 QSVM | 独立核参考、RY(2x)/PSD/jitter/显式划分边界；不开放上游梯度训练 |
| OpenQARP 0.1.0 | `openqarp-excited-states`：变分激发态 | 独立能量/正交性/方差与小系统精确本征值；保留未收敛结果 |
| FlagQuantum MCP 0.3.0 | 默认关闭的固定依赖入口与 Skill | 上游实际 tools/list、逐 Tool schema/副作用、Harness 可选启用验证 |
| CleitonForge | 编译测试反例及差分方法进入开发回归 | 固定来源/许可、错误候选负例与独立全酉对照；不冒充 runtime Validator |
| qec-burst-scaling | 局域瞬态噪声实验进入 QEC 开发证据 | 相同样本的基线/知情 decoder 对照、固定物理暴露量、Stim DEM 语法回归 |
| quantum-workflows / MORSE-FT / closed-quantum-process-memory-paper | 借鉴 manifest、SOURCE-MAP、校验清单与检查覆盖范围 | 上游去重台账、输入/源码/依赖/输出摘要；不复制第二套调度器或论文结论 |
| Graphix/PyZX | 识别原工作树已有适配，保持原工作独立 | 本轮不重复提交既有暂存内容 |
| GreenPeas | 保留候选 | 需要 NVIDIA GPU/CUDA 和自适应 DEM 的明确需求 |
| rqm-compiler / tensorcircuit-ng / luoshu | 保留候选 | 需指定工作负载证明增量收益，或明确中性原子硬件任务 |
| zero-gaze / RNTS / quantum-link-research | 方法/教学参考 | 不把其他平台的状态机、采集后台或研究结论引入 OQ Runtime |
| stresscf | 参考文献题目 | 缺明确代码许可证，不复制实现 |
| Dense-Evolution / polypus / quantum-rf-pdk | 本轮不纳入发行版 | 商用限制、EUPL/第三方数据分发边界或硬件 CAD 范围 |

## 顺序与完成条件

1. 固定源码、依赖和许可；记录完整上游版本与适配边界。
2. 实现四个有界科学 Tool 与可选 FlagQuantum 入口，登记 Skill、Preset、设置目录和 capability policy。
3. 补充独立数值参考、正负/失败路径测试、编译及 QEC 开发回归；将结果与来源写入验证证据。
4. 依贡献合同完成独立领域审阅并修复问题；真实 MCP 调用及本地模型协议替身驱动的 Harness 注册、调用、错误与事件重读。
5. 更新说明/README/第三方声明，执行全仓检查并形成只含本轮变更的独立本地提交。

执行资源由用户通过 execution 指定；只约束科学方法的有效输入，不随意以量子位数替用户决定计算预算。昂贵参考单列 auto|required|skip 或明确验证作用域。所有新增 L1 输出为 scientificValidation=not_evaluated；开发回归和本地协议替身不替代外部模型自主任务或 formal Acceptance。

本轮不涉及云硬件、外部模型调用、发布或 push。确实无法满足接入合同的库应保留候选并记录具体失败证据，不以空目录或假结果称已接入。

实现范围与已知限制以[接入说明](CANDIDATE_LIBRARIES.md)为准。cqlib 使用固定 Rust SDK 与最小核方法源码适配，和 FlagQuantum 一同默认关闭。已知上游错误进入可复跑回归，不把存在候选库等同于适合默认启用。
