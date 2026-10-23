---
name: qililab-control
description: 用 Qililab 将结构化 I/Q 方波和等待离线编译为 Qblox Q1ASM 及波形表，核对仪器指令，不连接实验设备。
---

# Qililab 离线测控编译

<!-- BEGIN NATIVE SDK ACCESS -->
## 原生 SDK 路径

本能力同时支持 **Qililab 的原生公开 API**。用户需要 QProgram、波形、校准、runcard、平台与执行 时，由 Agent 在固定依赖环境中编写和运行任务代码，不限于下文便捷 Tool 的预设模型。

使用 `node scripts/sdk-access.mjs inspect qililab-control` 定位环境，按[完整 SDK 工作流](../quantum-sdk-workbench/references/workflow.md)执行。模块导航：`qililab`；导航不是 API 白名单。

本地程序构建与外部调用分开；账户、凭据、费用、设备操作和数据外发沿用宿主及用户授权。原生 SDK 访问不自动启用服务。

下文关于模型、门集、输入与预算的限制描述便捷 Tool 的合同；原生 SDK 另受上游版本、可选依赖、宿主资源与用户授权约束。已禁用或被拒绝的动作不能借代码路径绕过。执行状态和科研验收分别报告。
<!-- END NATIVE SDK ACCESS -->


调用 `qililab_local` 的 `compile_qililab_pulses`。固定 `qililab==0.33.3`，Apache-2.0。
先显式执行 `node scripts/setup-paper-tools.mjs qililab-control`。

1. 使用场景是把一个逻辑 I/Q 总线上的方波序列编译成控制指令。此入口不消费真实 runcard，不自动连接设备。
2. `iAmplitude` 与 `qAmplitude` 为 `[-1,1]` 归一化 DAC 幅度。`durationNs` 至少 4 ns，
   `waitAfterNs` 可为零，两者须为 4 ns 的整数倍；波形采样率固定 1 GSa/s。
3. 工具通过真实 `QProgram`、`IQPair` 与 `QbloxCompiler` 生成 `program`（Q1ASM）、
   `sequenceJson` 与 `waveforms`。检查 play 指令的波形索引、持续时间、等待和 I/Q 符号。
4. 解释波形时同时读取 Q1ASM：编译器可能把常量脉冲转为增益指令与共享波形。
   `requestedDurationNs` 只累加用户请求，未计入编译器的同步、标记和停止开销。

未知参数、幅度越界或不符合指令时间栅格会失败。环境缺失/锁变化时运行显式 setup，
SDK 编译错误按原错误解释，不降级为手写假 Q1ASM。`execution` 单独控制 worker 资源。

适配不实例化 `Platform`、仪器、实验执行器或云客户端；没有鉴权步骤。实际硬件连接与校准由用户另行配置。
编译成功不证明芯片表征、真实电压、量子态或实验测量正确；此 L1 工具返回 `scientificValidation=not_evaluated`。

来源：[官方仓库](https://github.com/qilimanjaro-tech/qililab)、
[QProgram](https://github.com/qilimanjaro-tech/qililab/blob/main/src/qililab/qprogram/qprogram.py)、
[Qblox 编译器](https://github.com/qilimanjaro-tech/qililab/blob/main/src/qililab/qprogram/qblox_compiler.py)。
