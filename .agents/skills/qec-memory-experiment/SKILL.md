---
name: qec-memory-experiment
description: 使用 OpenQuantum 的固定版本 Stim 与 PyMatching 运行有界 rotated surface-code X/Z memory 蒙特卡洛实验，生成 detector error model、采样 syndrome、执行 MWPM 解码并报告逻辑错误率及区间。用于 QEC 教学、解码回归、噪声设置对比和小规模研究预检；不用于从单点估计阈值、声称真实硬件性能、接受任意 Stim 文件或在缺少来源链时宣称最终科学验收通过。
---

# QEC Memory Experiment

## 核心对象

核心对象是一份可重放的 surface-code memory 实验配置：basis、code distance、rounds、shots、统一物理错误率和 seed。Stim 生成并采样电路，PyMatching 从 detector error model 构建 MWPM 解码器。

固定边界：

- `basis`: `x` 或 `z`；
- `distance`: 奇数 3、5、7；
- `rounds`: 1–20；
- `shots`: 100–50,000；
- `physicalErrorRate`: 0–0.05；
- `seed`: 0–2^32-1。

统一错误率同时用于 Clifford 后退极化、每轮数据退极化、测量翻转和 reset 翻转。这是版本化实验 profile，不代表某台真实 QPU 的校准模型。

## 工作流

1. 先调用 `inspect_qec_runtime`，记录 Stim、PyMatching 版本和资源上限。
2. 选择 basis、distance、rounds、shots、physicalErrorRate 和显式 seed。
3. 调用 `run_qec_memory_experiment`。
4. 报告：电路/DEM 摘要与 SHA-256、逻辑错误数、逻辑错误率、标准误和 Wilson 95% 区间。
5. 检查 observations：实验摘要、seed、计数恒等式、错误率重算、区间边界、零噪声不变量、来源链。
6. 比较多组实验时，每组都保留固定 shots 与 seed 策略；不要选择性丢弃失败点。

## 解释规则

- 零逻辑错误不等于真实错误率为零，必须同时报告 shots 和 Wilson 区间。
- 单个 distance、单个物理错误率的结果不能证明 threshold。
- 不同 distance 的比较必须使用同一噪声 profile 和可比 shots。
- `physicalErrorRate` 是模拟器参数，不是硬件校准事实。
- 工具完成只产生 `observations_available`；Result Package 和 Session Event Log 未物化时，不宣称最终科学验收通过。

## 输出格式

1. 固定实验配置和包版本；
2. code task、电路/DEM 规模与摘要；
3. 逻辑错误数/率、标准误、Wilson 95% 区间；
4. validation observations；
5. 明确写出不能支持的 threshold 与硬件结论。
