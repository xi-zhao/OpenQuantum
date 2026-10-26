---
name: chromobius-decoding
description: 使用 Chromobius 的原生公开 API 对带颜色和基标注的 Stim detector error model 解码，比较预测与实际逻辑 observable 翻转；用于色码解码、样本分析和可复核小规模实验。
---

# Chromobius 色码解码

<!-- BEGIN NATIVE SDK ACCESS -->
## 原生 SDK 路径

本能力使用 **Chromobius 的原生公开 API**。用户需要 带颜色和基标注的 Stim DEM、bit-packed detector 样本与逻辑 observable 解码 时，由 Agent 在固定依赖环境中编写和运行任务代码。

使用 `node scripts/sdk-access.mjs inspect chromobius-decoding` 定位环境，按[完整 SDK 工作流](../quantum-sdk-workbench/references/workflow.md)执行。模块导航：`chromobius`、`stim`、`numpy`；导航不是 API 白名单。

固定 Chromobius 1.1.1；DEM 必须满足颜色/基坐标及上游可解码条件。Möbius 解码为近似方法；小例回归不代表阈值、实时延迟或科学验收。

本入口复用宿主文件与代码工具，没有新增通用执行 Tool。原生 SDK 受上游版本、可选依赖、宿主资源与用户授权约束。已禁用或被拒绝的动作不能借代码路径绕过。执行状态和科研验收分别报告。
<!-- END NATIVE SDK ACCESS -->


## 选择与准备

需要色码 Möbius 解码时选择本 Skill；surface-code memory 可继续使用
`qec-memory-experiment`，通用搜索式解码可比较 `tesseract-decoding`。
优先复用已有 Stim 模型与样本，不改变输入模型以迁就解码器。

通过原生 SDK 工作台显式准备固定环境。准备会下载依赖并写入文件；
本 Skill 不自行启动服务，不需要 QPU、账户或额外的专用 Tool。

## 工作流程

1. 保存原始 Stim circuit 或 DEM、噪声参数、detector/observable 数量、采样种子和预算。
2. 检查 DEM 的颜色和基：第四坐标 0/1/2 为 X 基红/绿/蓝，3/4/5 为 Z 基红/绿/蓝，
   -1 表示显式忽略该 detector。缺少坐标不能自动推断；忽略 detector 会改变问题，须记录理由。
3. 按固定版本 API 检查 rainbow triplets、movable excitations 和 matchable-avoids-color
   条件。不是所有 Stim DEM 都支持；编译或解码失败时保留输入和异常，不静默换模型或丢弃样本。
4. 用 `chromobius.compile_decoder_for_dem(dem)` 编译，再用
   `predict_obs_flips_from_dets_bit_packed` 解码。输入为 uint8、little-endian bit-packed
   detector 样本；核对实际维度，不能把 detector 位与 observable 位混用。
5. 与同一批样本的真实 observable 翻转逐 shot 比较，报告错误数、总 shots 和统计区间。
   固定种子有助于复核，但不承诺跨 Stim 版本或平台逐位复现。
6. 保留程序、输入、完整输出、版本/锁摘要和检查结果。比较解码器时统一 circuit、噪声、
   样本、observable 定义和预算；不要把不同样本的有限 shot 波动当性能提升。

## 解释边界

Möbius 解码是近似方法，不能把其预测当作最大似然最优解。零观测错误不意味着真实错误率为零。
小型数值回归不验证阈值、可扩展性、实时延迟或完整容错协议。
上游不是正式支持的 Google 产品；固定 wheel 提供 Python 模块，独立 CLI 另需源码构建。
Sinter 为可选工作流，未包含在本环境的直接依赖中。

本入口是 L0 原生 SDK 工作流，不增加科学验收器；
`scientificValidation=not_evaluated`，最终验收仍由已有的 central Acceptance Builder 推导。

## 来源与示例

- [固定上游 v1.1.1](https://github.com/quantumlib/chromobius/tree/efae0325e4a8fc13be981434d38e499aa06b989f)，Apache-2.0。
- [固定版本 API](https://github.com/quantumlib/chromobius/blob/v1.1.1/doc/chromobius_api_reference.md)。
- [可编辑原生示例](references/native-example.py)：用简单可独立解答的 DEM 验证位序和错误预测。
  该合成 fixture 不是完整色码存储实验。
