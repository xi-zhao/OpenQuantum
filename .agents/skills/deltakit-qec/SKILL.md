---
name: deltakit-qec
description: 使用固定 Deltakit 构建矩形 rotated planar-code 存储实验，应用本地 ToyNoise，调用 Stim 采样和 PyMatching 解码，返回真实电路与逻辑错误统计。
---

# Deltakit 纠错实验构建

调用 Harness 注册的 `deltakit_local.run_deltakit_memory`。适用于比较不同奇数宽高码片在 X/Z 存储实验中的表现，或查看 Deltakit 生成的实际含噪电路。

- `width` 和 `height` 是数据量子位码片尺寸，不是全部物理量子位数；实际资源以结果 `numQubits/numDetectors/numObservables` 为准。
- 首版只用 Deltakit `ToyNoise(p)`；它是合成噪声模型，不能将 p 解释为实测硬件保真度。轮数与 shots 由输入决定，保留 seed。
- Tool 生成电路后由固定 Stim 采样 detector 与 observable，再由 PyMatching MWPM 解码。报告失败数、固定 shots 分母和 Wilson 95% 区间；零失败时上界仍大于零。
- 返回的 Stim 电路及 SHA-256 是本次真实生成对象。不同码片/轮次/噪声模型之间比较时说明各自资源与统计预算。
- 单点或少数码距结果不能支持 threshold 或实时硬件性能主张。未开放云平台、专有解码器或泄漏服务。
- 当前 L1，`scientificValidation=not_evaluated`；首次调用可能安装固定依赖和写本地缓存。

版本、安装与验证见 [接入说明](../../../docs/integrations/UNITARY_ECOSYSTEM.md)。

计算规模和资源由调用方选择，适配器不设置量子位、门数、项数、采样数或迭代数的人工上限。默认值用于方便调用；模型、格式和数值表示要求仍由输入合同检查。详见[计算参数与资源配置](../../../docs/integrations/SCALABLE_BRIDGES.md)。
