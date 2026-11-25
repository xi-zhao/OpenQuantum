---
name: qec-memory-experiment
description: 使用 OpenQuantum 的固定版本 Stim 与 PyMatching 运行 rotated surface-code X/Z memory 蒙特卡洛实验，生成 detector error model、采样 syndrome、执行 MWPM 解码并报告逻辑错误率及区间。用于 QEC 教学、解码回归、噪声设置对比和研究计算；不用于从单点估计阈值、声称真实硬件性能、接受任意 Stim 文件或在缺少来源链时宣称最终科学验收通过。
---

# QEC Memory Experiment

开发证据等级为 **L3**：计算期独立 observations、物化后复核、版本化 Profile 与中央 Acceptance 已接通。
Tool 内仍保留 `provenance.complete=not_checked`；只有 Harness 保存并重读证据后才派生验收。

<!-- BEGIN NATIVE SDK ACCESS -->
## 原生 SDK 路径

本能力同时支持 **Stim / PyMatching 的原生公开 API**。用户需要 自定义 Stim 电路、detector error model、Matching 图与批量译码 时，由 Agent 在固定依赖环境中编写和运行任务代码，不限于下文便捷 Tool 的预设模型。

使用 `node scripts/sdk-access.mjs inspect qec-memory-experiment` 定位环境，按[完整 SDK 工作流](../quantum-sdk-workbench/references/workflow.md)执行。模块导航：`stim`、`pymatching`；导航不是 API 白名单。

下文关于模型、门集、输入与预算的限制描述便捷 Tool 的合同；原生 SDK 另受上游版本、可选依赖、宿主资源与用户授权约束。已禁用或被拒绝的动作不能借代码路径绕过。执行状态和科研验收分别报告。
<!-- END NATIVE SDK ACCESS -->


## 核心对象

核心对象是一份可重放的 surface-code memory 实验配置：basis、code distance、rounds、shots、统一物理错误率和 seed。Stim 生成并采样电路，PyMatching 从 detector error model 构建 MWPM 解码器。

固定边界：

- `basis`: `x` 或 `z`；
- `distance`: 不小于 3 的奇数；
- `rounds`: 正整数；
- `shots`: 正整数；
- `physicalErrorRate`: 0–1；
- `seed`: 0–2^32-1。

统一错误率同时用于 Clifford 后退极化、每轮数据退极化、测量翻转和 reset 翻转。这是版本化实验 profile，不代表某台真实 QPU 的校准模型。

## 工作流

1. 选择 basis、distance、rounds、shots、physicalErrorRate 和显式 seed。
2. 调用 `run_qec_memory_experiment`。主动作加载固定环境并返回 `packages`；依赖须显式准备；缺失或旧锁环境返回准备命令，不在 Tool 中安装。
3. 报告实际包版本、电路/DEM 文本与 SHA-256、逻辑错误数、逻辑错误率、标准误和 Wilson score 95% 区间（`z=1.959963984540054`）。
4. 检查 observations：独立统计逐 shot 失败位、重算点估计/标准误/Wilson 区间；独立进程从原始请求重新生成电路与 DEM，核对 basis、distance、rounds 和四类噪声，并重新采样解码核对 seed、样本摘要及失败记录。来源链仍为 `not_checked`。
5. 比较多组实验时，每组都保留固定 shots 与 seed 策略；不要选择性丢弃失败点。环境不可用时报告工具错误，不编造结果。

## 解释规则

- 零逻辑错误不等于真实错误率为零，必须同时报告 shots 和 Wilson 区间。
- 单个 distance、单个物理错误率的结果不能证明 threshold。
- 不同 distance 的比较必须使用同一噪声 profile 和可比 shots。
- `physicalErrorRate` 是模拟器参数，不是硬件校准事实。
- 精确 seed 重放只覆盖同一机器、固定包版本、Stim 实现及单次批量采样约定；不能外推到其他 CPU、版本或分批方式。
- 独立参考不导入 Tool 实现，也不读取其自报计数或电路；两者仍使用同一固定 Stim/PyMatching 库，不构成这些库本身正确性的独立证明。
- 工具完成只产生 `observations_available`；检查失败须报告对应 observation，不宣称最终科学验收通过。

## 输出格式

1. 固定实验配置和包版本；
2. code task、电路/DEM 规模与摘要；
3. 逻辑错误数/率、标准误、Wilson 95% 区间；
4. validation observations；
5. 明确写出不能支持的 threshold 与硬件结论。

码距、存储轮数和采样数由调用方选择，适配器不额外设置人工规模上限。具体资源配置见[本地计算说明](../../../docs/integrations/SCALABLE_BRIDGES.md)。

## 依赖准备

运行前执行 `node scripts/setup-paper-tools.mjs qec-memory-experiment`。缺失、旧锁和已安装环境的处理见[共同准备说明](../../../docs/integrations/LOCAL_ENVIRONMENTS.md)；Tool 不自动安装或升级依赖。

## 验证入口

`npm run capability:qec-memory-experiment:test` 默认运行离线合同、固定 eval 和失败路径测试。
环境准备后以 `OPENQUANTUM_REAL_QEC_MEMORY=1 npm run capability:qec-memory-experiment:test`
显式运行本地 SDK 重放；不调用模型、云服务或硬件。参考运行缺席时，离线检查把模型一致性和 seed 重放
标为 `not_checked`；未准备环境不能替代这些检查。固定案例、实际执行记录及单 shot 统计边界见
[eval 说明](evals/README.md)。

## 可回放科学验收

版本化 Profile `rotated-surface-memory-audit@1.0.0` 的验收范围：码距不超过 11、轮数不超过 100、shots 不超过 100000。
这些边界只限制科学验收，不限制原计算 Tool。范围外结果保留执行期 observations。
完整调用包含 Host 后置证据保存，副作用为 `workspace-write`，MCP `readOnlyHint=false`。
证据位于 `results/openquantum/qec-memory-experiment/`，包括输入、Artifact、Result Package、
中央 Acceptance Report 和确定性可读报告；Session 日志保存可回放的 Result Commit。
缺失或不兼容的独立参考产生 conditional，数值不一致产生 failed，证据字节篡改阻止发布验收。
`reproductionProfiles: []`，不宣称另行完成独立科学复现。
