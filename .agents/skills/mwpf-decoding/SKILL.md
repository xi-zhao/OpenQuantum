---
name: mwpf-decoding
description: 使用 MWPF 原生 API 对用户自定义加权超图和 syndrome 译码、查看 primal/dual 权重界，或通过 Stim/Sinter 预测逻辑 observable 翻转。适用于多 detector 超边、译码方法比较和可复核小规模实例。
---

# MWPF 超图译码

<!-- BEGIN NATIVE SDK ACCESS -->
## 原生 SDK 路径

本能力使用 **MWPF 的原生公开 API**。用户需要 用户自定义加权超图、syndrome 与权重界，以及 Stim/Sinter 逻辑 observable 译码 时，由 Agent 在固定依赖环境中编写和运行任务代码。

使用 `node scripts/sdk-access.mjs inspect mwpf-decoding` 定位环境，按[完整 SDK 工作流](../quantum-sdk-workbench/references/workflow.md)执行。模块导航：`mwpf`、`stim`、`sinter`、`numpy`；导航不是 API 白名单。

固定 MWPF 0.2.18；Sinter 必须显式 PanicAction.RAISE，有限 cluster 预算可回退 UF，float64 权重界不是形式化证明。一般超图求解无最坏耗时保证；使用宿主进程预算。

本入口复用宿主文件与代码工具，没有新增通用执行 Tool。原生 SDK 受上游版本、可选依赖、宿主资源与用户授权约束。已禁用或被拒绝的动作不能借代码路径绕过。执行状态和科研验收分别报告。
<!-- END NATIVE SDK ACCESS -->


## 方法选择与准备

需要直接表达加权超图及权重界时选择 MWPF；图状匹配可继续用 PyMatching，BP/OSD/LSD 可用
`ldpc-decoding`，带颜色/基标注的色码可用 Chromobius。不要为套用某个译码器改变原始模型。

按 SDK 工作台显式准备环境，再运行原生程序。准备下载并写入依赖；执行本身不安装。
固定 Python 3.12、MWPF 0.2.18、Stim/Sinter 1.16.0 与 NumPy 2.5.3，其余版本见 `uv.lock`。
这是可选 L0 SDK/Skill，不新增 Tool、MCP Server、常驻进程或科学验收器。

## 原生任务流程

1. 保存加权超图/校验约束、syndrome，或原始 circuit/DEM、detector/observable 定义、噪声模型与种子。
   使用 `HyperEdge`、`SolverInitializer`、`SolverSerialJointSingleHair` 和 `SyndromePattern` 求解。
   `subgraph_range()` 返回选中边和上下界；分别保存解权重、上下界、配置和实际差距。
2. 原生 solver 省略 `cluster_node_limit` 才使用上游默认的大预算；**0 是有限预算，不表示无限**。
   Sinter 默认值为 50；达到预算可退回 Union-Find。不要把成功返回等同于最优解，也不要编造每次回退标志。
   Sinter 的 `timeout` 字段没有通过其 `config` 传给核心，不能拿它当整次任务时限；使用宿主进程预算/取消机制。
3. 使用 Sinter 时必须显式设置 `panic_action=mwpf.PanicAction.RAISE`。上游默认 CATCH 会在译码异常后
   返回随机预测，不能用于可信比较。保留异常和失败输入；不得统计随机替代预测为成功结果。
4. `compile_decoder_for_dem` 后调用 `decode_shots_bit_packed`；输入为二维 uint8、每 shot
   `ceil(num_detectors/8)` 字节、little-endian。输出宽度按 observable 数计算，不能与 detector 混用。
   [可编辑示例](references/native-example.py)显式检查输入宽度并抛出错误。
5. DEM 会丢失部分 heralded erasure 上下文；需要时按上游 `with_circuit(circuit)` 传原电路，
   并单独验证该路径。本接入未验证 heralded erasure，不擅自分解或近似 DEM。
6. 比较译码器时共用同一噪声模型、输入样本和预算，保留原始 samples、实际/预测 observables、失败记录和版本。
   样本量由用户任务决定；固定种子不保证跨版本/平台逐位相同。

## 示例与自定义程序

在新输出目录用 `inspect` 给出的解释器运行 `references/native-example.py`：默认解一个独立可枚举的超图。
`--input graph.json` 接受 `vertex_count`、`edges`（`[[顶点列表, 权重], ...]`）和 `syndrome`。
`--dem model.dem --shots 1024 --seed 7` 在原始 DEM 上采样与译码，保存 `result.json` 和 `samples.npz`。
`--cluster-node-limit N` 显式选择有限预算；无此参数时，超图模式用核心默认值，DEM 模式用 Sinter 默认 50。
示例不覆盖已有结果文件。用户可直接编写原生 API 程序，不受示例对象大小或预设任务限制。

上游顶层 `import mwpf` 会吞掉可选 Sinter 导入错误；就绪检查还须检验实际 Sinter 符号及调用。
BP 可选路径需显式准备 `ldpc`；本环境未包含它，也未包含 rational/fast 变体。平台和可选组件按实际条件核实。

## 解释与维护边界

一般 MWPF 为 NP-hard，无最坏耗时或实时保证。独立 Bernoulli 模型可用 `log((1-p)/p)` 权重，
非负权重例子限定 `p <= 0.5`；相关噪声的映射需另行论证。最可能错误配置不等于最可能逻辑 coset。
普通 wheel 使用 float64 与 `loose_sanity_check`；上下界接近不能当形式化证明。
小例子只核对可行性、权重、位序和失败语义，不证明阈值、码距、硬件容错或大码性能。
`scientificValidation=not_evaluated`；最终科学验收仍由既有 central Acceptance Builder 推导。

- [固定源码与 MIT 许可](https://github.com/yuewuo/mwpf/tree/e50f72e2f389950db50bce075163a4e4022c9dcd)
- [发行包](https://pypi.org/project/mwpf/0.2.18/)与[方法论文](https://arxiv.org/abs/2508.04969)
- [接入规格、替代方案与验收条件](../../../docs/ecosystem/proposals/mwpf.md)

默认使用已发布 wheel；macOS arm64 本地验证与其他平台 CI 分别留证据。Linux aarch64 当前无该版 wheel，
不把源码构建、包可导入或上游 CI 当作运行/科学验收。升级时重点回归预算、失败语义和 Stim/Sinter 位序。
