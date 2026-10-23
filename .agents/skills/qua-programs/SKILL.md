---
name: qua-programs
description: 用 Quantum Machines qm-qua SDK 本地生成 OPX 单通道脉冲程序、配置与 protobuf；解释电压、4 ns 时钟和 QOP 编译/模拟的边界。
---

# QUA 脉冲程序准备

<!-- BEGIN NATIVE SDK ACCESS -->
## 原生 SDK 路径

本能力同时支持 **QUA 的原生公开 API**。用户需要 任意 program、控制流、stream processing、配置与量子机器接口 时，由 Agent 在固定依赖环境中编写和运行任务代码，不限于下文便捷 Tool 的预设模型。

使用 `node scripts/sdk-access.mjs inspect qua-programs` 定位环境，按[完整 SDK 工作流](../quantum-sdk-workbench/references/workflow.md)执行。模块导航：`qm.qua`、`qm`；导航不是 API 白名单。

本地程序构建与外部调用分开；账户、凭据、费用、设备操作和数据外发沿用宿主及用户授权。原生 SDK 访问不自动启用服务。

qm 导入会读取用户配置并初始化日志；离线程序构建先使用本 Skill bridge.py 的 offline_user_config 上下文，真实设备任务则使用用户授权的实际配置。不要在离线步骤构造 QuantumMachinesManager。

下文关于模型、门集、输入与预算的限制描述便捷 Tool 的合同；原生 SDK 另受上游版本、可选依赖、宿主资源与用户授权约束。已禁用或被拒绝的动作不能借代码路径绕过。执行状态和科研验收分别报告。
<!-- END NATIVE SDK ACCESS -->


调用 `qua_local` 的 `prepare_qua_pulse_program`，为 Quantum Machines OPX1 单模拟输出构建确定性的常数脉冲序列。
显式准备环境：`node scripts/setup-paper-tools.mjs qua-programs`。固定 `qm-qua==1.4.1`，SDK 为 BSD-3-Clause。

- `pulses` 按输入顺序执行；`amplitudeVolts` 是电压，范围 `[-0.5, 0.5)` V。
- `durationNs` 至少 16 ns，且为 4 ns 的整数倍；`waitAfterNs` 为 0 时不生成等待指令，非零时至少 16 ns 且为 4 ns 整数倍，遵循 [QUA 最小 4 时钟周期要求](https://docs.quantum-machines.co/1.4.1/docs/Guides/best_practices/)。`repetitions` 是有限循环次数，受 QUA int 表示限制。
- 使用固定 OPX1 单输入元素、`con1` 模拟输出 1、零中频；没有任意配置、Python、设备地址、数字 I/O 或触发等待入口。
- 返回 SDK 生成的 `quaSource`、`configurationJson` 和 `programBase64`。这些是可交给用户的程序工件，工具自身不执行返回的源码。
- 通过官方静态 `set_capabilities_offline([])` 选择基线能力，不构造 QuantumMachinesManager，不连接 QOP。
- `nominalDurationNs` 只累加脉冲和 wait，不含编译器调度及循环开销。序列化验证不等于硬件时序验证。
- QOP 编译和输出模拟需要相应控制系统或 QM 服务，未包含在本 Tool 中；不要把程序生成叫作本地 OPX 仿真。用户自行配置以后实际运行所需的地址、权限与凭据。
- 本地工具隔离 QM 用户配置，避免继承既有的日志上传和控制器连接设置。`execution` 提供 worker 资源设置。
- 当前 L1，`scientificValidation=not_evaluated`；没有设备运行或最终科学验收。

参考：[官方 SDK](https://github.com/qm-labs/qm-qua-sdk-public)、[序列化接口](https://docs.quantum-machines.co/latest/docs/API_references/serialization/)。
