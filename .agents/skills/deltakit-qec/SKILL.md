---
name: deltakit-qec
description: 使用固定 Deltakit 构建矩形 rotated planar-code 存储实验，应用本地 ToyNoise，调用 Stim 采样和 PyMatching 解码，返回真实电路与逻辑错误统计。
---

# Deltakit 纠错实验构建

<!-- BEGIN NATIVE SDK ACCESS -->
## 原生 SDK 路径

本能力同时支持 **Deltakit 的原生公开 API**。用户需要 自定义码、电路、噪声、QPU 模型、采样与译码 时，由 Agent 在固定依赖环境中编写和运行任务代码，不限于下文便捷 Tool 的预设模型。

使用 `node scripts/sdk-access.mjs inspect deltakit-qec` 定位环境，按[完整 SDK 工作流](../quantum-sdk-workbench/references/workflow.md)执行。模块导航：`deltakit`、`stim`、`pymatching`；导航不是 API 白名单。

下文关于模型、门集、输入与预算的限制描述便捷 Tool 的合同；原生 SDK 另受上游版本、可选依赖、宿主资源与用户授权约束。已禁用或被拒绝的动作不能借代码路径绕过。执行状态和科研验收分别报告。
<!-- END NATIVE SDK ACCESS -->


调用 Harness 注册的 `deltakit_local.run_deltakit_memory`。适用于比较不同奇数宽高码片在 X/Z 存储实验中的表现，或查看 Deltakit 生成的实际含噪电路。

- `width` 和 `height` 是数据量子位码片尺寸，不是全部物理量子位数；实际资源以结果 `numQubits/numDetectors/numObservables` 为准。
- 首版只用 Deltakit `ToyNoise(p)`；它是合成噪声模型，不能将 p 解释为实测硬件保真度。轮数与 shots 由输入决定，保留 seed。
- Tool 生成电路后由固定 Stim 采样 detector 与 observable，再由 PyMatching MWPM 解码。报告失败数、固定 shots 分母和 Wilson 95% 区间；零失败时上界仍大于零。
- 返回的 Stim 电路及 SHA-256 是本次真实生成对象。不同码片/轮次/噪声模型之间比较时说明各自资源与统计预算。
- 单点或少数码距结果不能支持 threshold 或实时硬件性能主张。未开放云平台、专有解码器或泄漏服务。
- 当前 L1，`scientificValidation=not_evaluated`；依赖须显式准备；计算可能写本地缓存。

版本、安装与验证见 [接入说明](../../../docs/integrations/UNITARY_ECOSYSTEM.md)。

码片宽高、存储轮数和采样数由调用方选择，适配器不额外设置人工规模上限。具体资源配置见[本地计算说明](../../../docs/integrations/SCALABLE_BRIDGES.md)。

## 依赖准备

运行前执行 `node scripts/setup-paper-tools.mjs deltakit-qec`。缺失、旧锁和已安装环境的处理见[共同准备说明](../../../docs/integrations/LOCAL_ENVIRONMENTS.md)；Tool 不自动安装或升级依赖。
