# Chromobius 色码解码接入提案

- 调研日期：2026-10-26；基线：OpenQuantum main `f4da33fb15a09721d1070e7486a91555bfeaad2a`。
- 上游：[quantumlib/chromobius](https://github.com/quantumlib/chromobius)。
- 固定候选：[v1.1.1](https://github.com/quantumlib/chromobius/releases/tag/v1.1.1)，完整提交 `efae0325e4a8fc13be981434d38e499aa06b989f`。
- 本提案进入自动接入队列；实现与验证完成前保持 Draft，用户可关闭或暂停。

## 用户价值与重要性

Chromobius 把受支持色码的解码近似转换为匹配问题，补充当前 Stim/PyMatching surface-code memory
以及 Tesseract 搜索式解码路径。具体任务是：读取带颜色/基标注的 Stim detector error model（DEM），
对 detector 样本预测逻辑 observable 翻转，并保留程序、模型、随机种子与统计。

现有 MQT QECC、TQEC 和通用 SDK 工作台不等于已准备 Chromobius 依赖；当前 capability 与 SDK 清单
均无此项。它适合作为有界、CPU 可运行的色码解码选择，优先级为中等；不宣称替代所有 QEC 解码器。

这次纳入依据是首次巡检发现的能力缺口。最近两周的上游提交主要为 CI、许可头与拼写维护；
v1.1.1 发布于 2025-11-21，不能称为本周新算法或新稳定版。该版提供 macOS arm64、
Linux 与 Windows 预编译 Python wheel，降低本地准备成本。

## 最小接入方式

沿用已有原生 SDK 路径：增加 `chromobius-decoding` L0 Skill、SDK 导航、独立 Python 3.12
manifest/锁文件和小型可编辑示例，复用 `sdk-access` / `setup-sdk` 与宿主代码工具。
不新增通用执行 Tool 或 MCP Server。L0 是发行版知识/工作流级别，不代表完整科学验收。

首版固定 `chromobius==1.1.1`，并锁定 Stim/NumPy；可选 Sinter 不自动引入。
下载与环境准备有文件写入副作用，需显式执行；没有账户、付费或 QPU 需求。
共享 Skill 同时由 DSH 与 Codex 适配投影，避免复制实现。

## 科学边界与验收计划

- 按[固定版本 API](https://github.com/quantumlib/chromobius/blob/v1.1.1/doc/chromobius_api_reference.md)
  核对 detector 第四坐标：0/1/2 为 X 基红/绿/蓝，3/4/5 为 Z 基红/绿/蓝，-1 为忽略。
  还需满足 rainbow triplets、movable excitations 与 matchable-avoids-color 条件。
- 缺颜色/基标注、不可分解误差或不支持的模型必须显式失败，不通过猜测坐标“修好”模型。
- 验证 bit-packed 输入与 observable 输出的位序/形状；用可穷举的小 DEM 对照独立解答，
  同时检查无误差与非法模型路径。
- 跑现有 SDK 清单、生成指南、capability 一致性、Skill 发现与 Codex 投影检查；
  必要检查失败时保留 Draft 并记录实际原因。
- 示例只是 API/数值回归，不提供阈值、实时延迟或容错正确性保证；未经独立 Validator、
  来源物化与 central Acceptance Builder，不报告科学验收通过。

## 许可、维护与取舍

上游为 Apache-2.0；仅分发 OpenQuantum 指令、依赖元数据与原创示例，安装时保留各依赖许可。
参考[方法论文](https://arxiv.org/abs/2312.08813)，此处不复现论文性能。
上游明确不是正式支持的 Google 产品；未来升级应重新检查模型限制和原生 wheel 支持。

同时发现 NVIDIA Ising-Decoding 的神经预解码路线，但其 Torch/cuStabilizer、模型权重和 GPU
训练/推理条件更重，当前保留观察，不因本次联调新增这些依赖。


## 首次接入记录

本 PR 已实现上述 L0 Skill 与固定 SDK 环境，并通过八种 syndrome 的独立穷举对照、1,024 shots、
缺失坐标拒绝检查、SDK/文档一致性与 Codex 目录设置测试。
[数值证据与验证边界](../../integrations/evidence/chromobius-2026-10-26.json)。
本机复用的旧 Node 依赖不匹配当前锁文件，Harness 注册检查须由使用提交锁文件的 CI 完成；
在此之前保持 Draft。接入未合并、未发布，不代表完整色码科学验收。
