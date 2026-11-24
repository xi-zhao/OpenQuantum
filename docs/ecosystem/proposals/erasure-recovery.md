# 已知擦除后的稳定子恢复线路

调研于 2026-11-24（北京时间）。上游 GoGoKo699/Quantum-Erasure-Recovery-Compiler 在本窗口发布 v1.0.0 和 v1.1.0，后者对应完整提交 `159c6122610972d703d15f60f6d011fcb494c50f`，根许可为 MIT。[正式发行](https://github.com/GoGoKo699/Quantum-Erasure-Recovery-Compiler/releases/tag/v1.1.0) · [固定源码](https://github.com/GoGoKo699/Quantum-Erasure-Recovery-Compiler/tree/159c6122610972d703d15f60f6d011fcb494c50f) · [许可](https://github.com/GoGoKo699/Quantum-Erasure-Recovery-Compiler/blob/159c6122610972d703d15f60f6d011fcb494c50f/LICENSE)

## 科研任务与现有路径

一个逻辑量子比特已经编码，其未知输入可能与外部参考纠缠。给定丢失的物理位置、剩余耦合边和指定输出位，研究者要拿到可执行的恢复线路，并知道它用了多少带权 CNOT。OpenQuantum 基线为 `4b06e3ce0f1fa62f6a294c7c538c9e9e2c0f8c92`。当前 MQT QECC 提供码与编码构造，MWPF 输出与症状相容的故障解释及权重界，tropidist 给出距离界和故障见证。它们的交付接口均未由擦除标记生成把逻辑态送到指定幸存位的自适应线路。现有 Qiskit/Stim 可用于独立回放固定输入。候选推进量子科研软件接入主线，接通编码到物理态提取及线路核对。[产品定位](../../../README.md#科研能力) · [长期方向](../../roadmap/VISION.md) · [MQT QECC](../../../.agents/skills/mqt-qecc/SKILL.md) · [MWPF](../../../.agents/skills/mwpf-decoding/SKILL.md) · [tropidist](../../../.agents/skills/tropidist-distance/SKILL.md)

独立的 stabilizer pathfinding 研究给出只用单比特测量的丢失容忍传态路径。它是零 CNOT 的同题基线。上游的具体增量是在该路径失效时也能返回带边约束的恢复线路和费用。作者进一步主张其费用在所定义的理想稳定子操作模型中最小。该一般性下界及扩展到更多码的表现仍待独立验证。[单比特测量基线](https://arxiv.org/abs/1807.08729) · [上游资源模型](https://github.com/GoGoKo699/Quantum-Erasure-Recovery-Compiler/blob/159c6122610972d703d15f60f6d011fcb494c50f/science/model.md) · [上游论证](https://github.com/GoGoKo699/Quantum-Erasure-Recovery-Compiler/blob/159c6122610972d703d15f60f6d011fcb494c50f/science/theorem.md)

## 最小接入与维护成本

沿用原生 SDK 工作台、已审阅源码固定机制及宿主代码执行。上游 Python 3.10 及以上的参考实现只用标准库，直接调用 `verification.compiler.compile_recovery`。输入是带符号的 Choi 稳定子生成元（首位为不可操作的参考）、从零编号的擦除位和输出位、非负精确边权。结果给出幸存逻辑 Pauli、费用、选中边、测量、奇偶前馈和条件校正。维护集中在固定源码、位序和校正符号示例。删除一层函数转发仍可完整调用上游，因此拟以共享 Skill 和可编辑示例交付。[公开接口](https://github.com/GoGoKo699/Quantum-Erasure-Recovery-Compiler/blob/159c6122610972d703d15f60f6d011fcb494c50f/verification/README.md) · [实现](https://github.com/GoGoKo699/Quantum-Erasure-Recovery-Compiler/blob/159c6122610972d703d15f60f6d011fcb494c50f/verification/compiler.py#L287) · [SDK 工作台](../../../.agents/skills/quantum-sdk-workbench/SKILL.md)

## 接入阶段的有界核验

1. **恢复与费用。** 用五量子比特码编码半个 Bell 对，擦除站点 0、4，选 2 为输出。幸存图是单位权路径 1–2–3，再用完整三角形对照。上游例子分别报 2 和 1 个 CNOT。对每个可发生的测量分支，用独立的密度矩阵回放先偏迹擦除位，再按上游输出执行并校正。核对分支概率和、参考与输出的 Bell 态、每个 CNOT 的确落在允许边及逐门费用。[上游用例与数据](https://github.com/GoGoKo699/Quantum-Erasure-Recovery-Compiler/blob/159c6122610972d703d15f60f6d011fcb494c50f/science/benchmarks.md)
2. **独立下界。** 在这个五比特特例，从编码矩阵独立得到擦除后的四方态，先核对局部 Clifford 变换及 Smolin 态的 Bell 对可分分解。把参考与站点 1 放在截面一侧时，路径上只有 1–2 跨界。把参考与站点 3 放在同侧时，只有 2–3 跨界。若初态在这两种划分下各自可分，恢复参考与输出的纠缠要求两条边各用至少一次。三角形中的 1–3 可同时跨越两种划分。以返回线路作上界，与这一特例下界配对。[Smolin 原文](https://arxiv.org/abs/quant-ph/0001001)
3. **失败与边界。** 选取仍保有逻辑信息但输出与必要边断开的图，预期 `NoRecovery`。分开检验擦除位被移除和作为新鲜中继被复位两种语义。只计擦除后 CNOT，默认单比特稳定子操作、复位、测量和经典前馈免费，无额外预共享纠缠。该参考实现的枚举成本随规模指数增长，必须记录输入规模、耗时与内存。若任何非零分支损失纠缠、费用违反独立下界，或现有入口已能直接完成同一提取，则退回观察。[实现与错误约定](https://github.com/GoGoKo699/Quantum-Erasure-Recovery-Compiler/blob/159c6122610972d703d15f60f6d011fcb494c50f/verification/README.md)

本轮仅核对发行、源码、作者的测试与独立文献，尚无 OpenQuantum 线路实测。下一步由“候选接入”任务在同一 PR 验证。用户可随时暂停或关闭。
