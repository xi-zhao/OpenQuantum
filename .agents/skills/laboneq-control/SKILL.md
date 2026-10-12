---
name: laboneq-control
description: 使用 Zurich Instruments LabOne Q 离线编译 HDAWG 脉冲和模拟仪器输出波形；区分输出信号仿真、量子动力学与实际硬件执行。
---

# LabOne Q 离线脉冲编译

<!-- BEGIN NATIVE SDK ACCESS -->
## 原生 SDK 路径

本能力同时支持 **LabOne Q 的原生公开 API**。用户需要 DeviceSetup、Experiment、校准、pulse、sweep、编译与 session 时，由 Agent 在固定依赖环境中编写和运行任务代码，不限于下文便捷 Tool 的预设模型。

使用 `node scripts/sdk-access.mjs inspect laboneq-control` 定位环境，按[完整 SDK 工作流](../quantum-sdk-workbench/references/workflow.md)执行。模块导航：`laboneq`；导航不是 API 白名单。

本地程序构建与外部调用分开；账户、凭据、费用、设备操作和数据外发沿用宿主及用户授权。原生 SDK 访问不自动启用服务。

下文关于模型、门集、输入与预算的限制描述便捷 Tool 的合同；原生 SDK 另受上游版本、可选依赖、宿主资源与用户授权约束。已禁用或被拒绝的动作不能借代码路径绕过。执行状态和科研验收分别报告。
<!-- END NATIVE SDK ACCESS -->


调用 `laboneq_local` 的 `compile_laboneq_pulses`，把结构化顺序脉冲转为 HDAWG sequencer 程序并提取输出波形。
显式执行 `node scripts/setup-paper-tools.mjs laboneq-control`。固定 `laboneq==26.7.0`，Apache-2.0。

- 输入 `pulses` 的 `shape` 为 `constant` 或 `gaussian`。`amplitude` 是归一化幅度 `[-1,1]`，`lengthSeconds` 与 `delayAfterSeconds` 单位为秒。
- Gaussian 使用 SDK 默认的标准高斯包络，截取 `[-3σ,+3σ)`，不强制把边界置零。此处脉冲参数不是 Rabi 频率或已经校准的旋转角。
- 固定虚拟独立 HDAWG 的 RF 输出 0，采样率 2.4 GSa/s，内部时钟；`repetitions` 给出实验重复次数。编译器负责样本对齐和仪器表示约束，可能调整输入时长。
- `snippetStartSeconds` 与 `snippetLengthSeconds` 选择返回的波形片段；实际输出长度可以小于请求窗口。`execution` 独立控制 worker 资源。
- 返回真实编译器的 sequencer 源码、估计执行时长、采样时刻及波形实虚部。可用常数脉冲的幅度、持续样本数和间隔核对生成结果。
- 当前 SDK 的 `Session.compile` 可直接调用离线编译器；适配不调用 `Session.connect` 或 `Session.run`，不连接 data server，不写仪器。
- 输出模拟描述仪器信号，不能当作量子态动力学、实际测量信号或校准后的设备行为。后续真实仪器连接与权限由用户自行设置。
- 当前 L1，`scientificValidation=not_evaluated`；编译成功与波形对照不等于最终科学 Acceptance。

参考：[官方仓库](https://github.com/zhinst/laboneq)、[实验与输出模拟](https://docs.zhinst.com/labone_q_user_manual/core/functionality_and_concepts/05_experiment/concepts/index.html)、
[单 HDAWG 设置](https://docs.zhinst.com/labone_q_user_manual/core/functionality_and_concepts/00_device_setup/concepts/index.html)。
