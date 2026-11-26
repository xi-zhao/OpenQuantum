---
name: erasure-recovery
description: 给定单逻辑量子比特的稳定子编码、已知擦除位置、物理耦合图和指定输出位，编译带条件校正的恢复线路，核对带权 CNOT 费用。
---

# 已知擦除后的逻辑态恢复

<!-- BEGIN NATIVE SDK ACCESS -->
## 原生 SDK 路径

本能力使用 **Quantum Erasure Recovery Compiler 的原生公开 API**。用户需要 根据单逻辑比特的稳定子编码、已知擦除与带权耦合图，把逻辑态恢复到指定站点 时，由 Agent 在固定依赖环境中编写和运行任务代码。

使用 `node scripts/sdk-access.mjs inspect erasure-recovery` 定位环境，按[完整 SDK 工作流](../quantum-sdk-workbench/references/workflow.md)执行。模块导航：`verification.compiler`；导航不是 API 白名单。

v1.1.0 的 Python 参考编译器只用标准库。费用只计擦除后的 CNOT，单比特操作、复位、测量及经典前馈免费。枚举成本随规模增长。

原生程序导入库前，按环境定位器的 `bootstrap` 执行启动兼容处理：校验固定的参考编译器源码并加入 Python 搜索路径。这不限制公开 API，也不替换数值算法。

本入口复用宿主文件与代码工具，没有新增通用执行 Tool。原生 SDK 受上游版本、可选依赖、宿主资源与用户授权约束。已禁用或被拒绝的动作不能借代码路径绕过。执行状态和科研验收分别报告。
<!-- END NATIVE SDK ACCESS -->


用此入口把可能与外部参考纠缠的逻辑态提取到指定物理站点。若要从 detector 采样预测逻辑翻转，使用 [QEC memory experiment](../qec-memory-experiment/SKILL.md) 或 [MWPF](../mwpf-decoding/SKILL.md)。

1. 显式准备 `node scripts/setup-sdk.mjs erasure-recovery`。用 `node scripts/sdk-access.mjs inspect erasure-recovery` 查出解释器，在新任务目录用它执行 `-B` 和[可编辑示例](references/native-example.py)的绝对路径。Codex 安装版使用 SDK 工作台的定位器，取返回的 `project/references/native-example.py`，并把 `run.environment` 传给宿主。把示例另存时，设置 `OPENQUANTUM_ROOT` 指向包含 `src/lib/sdk_bootstrap.py` 的已准备运行目录。
2. 调用 `verification.compiler.compile_recovery(generators, erased, hardware, output, relay_erased=...)`。对 `n` 个物理比特提供 `n+1` 个独立、对易的带符号 Choi 生成元。首字母作用在不可操作的参考上，其余字母按物理站点从 0 排列。每条无向边只列一次，权重使用非负整数或 `fractions.Fraction`。默认移走擦除位。仅当设备能重新制备新鲜比特时，把相应擦除位置列入 `relay_erased`。
3. 保存 `logical_x`、`logical_z`、`join_edges`、`cost` 和有序的 `operations`。CNOT 的两个站点依次为控制和目标。测量本征值 +1 记作 0，−1 记作 1。将 `parity` 中各站点的测量位与 `offset` 异或，结果为 1 时执行条件校正。例程在当前任务目录新建 `result.json`。
4. 对于 `NoRecovery`，区分幸存子系统丢失逻辑信息和硬件图无法到达输出位。其余输入错误保留原始 `ValueError`。按给定图逐门核账，若需证明费用最小，再给出独立下界。上游方法枚举幸存逻辑代表与匹配，小例下界只适用于已核对的编码、擦除、边权与操作模型。

[上游接口与资源模型](https://github.com/GoGoKo699/Quantum-Erasure-Recovery-Compiler/blob/159c6122610972d703d15f60f6d011fcb494c50f/verification/README.md)
