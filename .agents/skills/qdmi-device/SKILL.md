---
name: qdmi-device
description: 通过显式配置的固定 QDMI C 驱动只读查询设备、门集和耦合关系，区分官方示例元数据与真实设备验证。
---

# QDMI 设备能力查询

<!-- BEGIN NATIVE SDK ACCESS -->
## 原生 SDK 路径

本能力同时支持 **QDMI C API 的原生公开 API**。用户需要 完整已固定版本的 QDMI client/device 头文件与驱动源码 时，由 Agent 在固定依赖环境中编写和运行任务代码，不限于下文便捷 Tool 的预设模型。

使用 `node scripts/sdk-access.mjs inspect qdmi-device` 定位环境，按[完整 SDK 工作流](../quantum-sdk-workbench/references/workflow.md)执行。模块导航：固定版本的原生头文件与源码；导航不是 API 白名单。

原生 C ABI；setup 下载已固定源码并构建官方示例，真实驱动需单独配置，示例驱动不代表硬件支持。

本地程序构建与外部调用分开；账户、凭据、费用、设备操作和数据外发沿用宿主及用户授权。原生 SDK 访问不自动启用服务。

下文关于模型、门集、输入与预算的限制描述便捷 Tool 的合同；原生 SDK 另受上游版本、可选依赖、宿主资源与用户授权约束。已禁用或被拒绝的动作不能借代码路径绕过。执行状态和科研验收分别报告。
<!-- END NATIVE SDK ACCESS -->


调用 Harness 注册的 `qdmi_local.inspect_qdmi_devices`。连接默认关闭，使用前在量子组件设置中启用。

- 先显式运行 `npm run capability:qdmi:setup` 准备官方示例驱动，或由维护者配置审阅后的 QDMI 1.3.3 client driver。查询调用不会下载、安装或编译依赖。
- Tool 参数只控制查询预算和执行期限，不接受库路径、凭据或任意命令。驱动及其配置从项目受控文件读取并验证 SHA-256。
- 查询设备名称、版本、量子位数、site indices、操作名称/元数和有向 coupling。未支持属性返回 null，不能解释成零或空集合。
- `driverKind=example` 只是官方示例元数据。任何驱动的返回都不是实际硬件验收；hardwareVerified=false，jobsSubmitted=0。
- 没有作业创建、提交、取消或校准入口。当前接口不转发宿主凭据，不支持需要认证参数的设备发现。
- 原生驱动是受信任代码；添加厂商驱动前核对 ABI、初始化、权限和网络行为。示例安装器当前支持 macOS/Linux。

[准备方式、驱动配置和验证](../../../docs/integrations/QUANTUM_INTEROP.md)。
