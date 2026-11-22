---
name: tropidist-distance
description: 用固定的 tropidist CLI 为 GF(2) 校验与逻辑矩阵或 Stim 电路计算单位权故障距离上下界，核查见证和电路重放。
---

# 纠错距离上下界与故障见证

<!-- BEGIN NATIVE SDK ACCESS -->
## 原生 SDK 路径

本能力使用 **tropidist 的原生公开 API**。用户需要 从二进制校验矩阵或 Stim 纠错电路求单位权距离的上下界与故障见证 时，由 Agent 在固定依赖环境中编写和运行任务代码。

使用 `node scripts/sdk-access.mjs inspect tropidist-distance` 定位环境，按[完整 SDK 工作流](../quantum-sdk-workbench/references/workflow.md)执行。模块导航：`cdist`、`stim`、`numpy`；导航不是 API 白名单。

显式准备固定源码及本机 C 内核。Linux 需要 OpenMP。完整结果需要匹配上下界、有效见证和适用的故障模型。

原生程序导入库前，按环境定位器的 `bootstrap` 执行启动兼容处理：只读复核来源和 C 内核后定位已构建的 cdist。这不限制公开 API，也不替换数值算法。

本入口复用宿主文件与代码工具，没有新增通用执行 Tool。原生 SDK 受上游版本、可选依赖、宿主资源与用户授权约束。已禁用或被拒绝的动作不能借代码路径绕过。执行状态和科研验收分别报告。
<!-- END NATIVE SDK ACCESS -->


需要知道“还排除了哪些更轻的故障”时，保留搜索下界、实际见证和终止状态。求某个 syndrome 的最优译码时选相应译码器。对纯图状故障可先用 Stim 的 graphlike 距离作对照。

## 使用

1. 在 Linux 或 macOS 上显式运行 `node scripts/setup-sdk.mjs tropidist-distance`。Linux 的 C 编译器需支持 OpenMP。准备程序只取固定提交的 CLI、内核与许可，并将编译产物写在独立目录中。
2. 通过 SDK 工作台的 `inspect` 获取解释器、运行环境和 bootstrap。原生程序调用 `prepare_sdk("tropidist-distance")` 后使用其返回的目录作为 `python -B -m cdist` 的工作目录。每次创建新的结果目录，设置单线程、有限的内层搜索时间、宿主墙钟预算和可用内存。
3. [可编辑示例](references/native-example.py)默认检查三列奇偶约束。使用 `--matrices H.mtx L.mtx` 或 `--circuit memory.stim` 传入任务输入。先看 `result.json` 中的输入摘要和状态，再打开同次运行的原始记录、搜索 trace 和重放结果。
4. 矩阵使用从 1 开始的 MatrixMarket coordinate pattern general 坐标，同一坐标按 XOR 合并。故障集合必须满足 \(He=0,\ Le\ne0\)。CSS 的 \(H_X,L_X\) 给出 Z 距离，X 距离需用另一组矩阵。电路路径以未分解 DEM 中的单位权机制为模型，保留检测器、observable、故障来源及等权提升的适用条件。
5. `bounds`、`timeout` 或缺少见证只能报告已获得的界。首次运行从 `kmin=1` 开始。搜索深度、内核饱和与内存会限制规模。电路上重放成功验证了上界见证，下界仍依赖固定算法和约化假设。

[版本、模型与穷举对照](../../../docs/ecosystem/proposals/tropidist.md)包含三位重复码和旋转表面码的实际输入。常规执行保留 `scientificValidation=not_evaluated`。
