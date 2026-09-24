---
name: qdmi-device
description: 通过显式配置的固定 QDMI C 驱动只读查询设备、门集和耦合关系，区分官方示例元数据与真实设备验证。
---

# QDMI 设备能力查询

调用 Harness 注册的 `qdmi_local.inspect_qdmi_devices`。连接默认关闭，使用前在量子组件设置中启用。

- 先显式运行 `npm run capability:qdmi:setup` 准备官方示例驱动，或由维护者配置审阅后的 QDMI 1.3.3 client driver。查询调用不会下载、安装或编译依赖。
- Tool 参数只控制查询预算和执行期限，不接受库路径、凭据或任意命令。驱动及其配置从项目受控文件读取并验证 SHA-256。
- 查询设备名称、版本、量子位数、site indices、操作名称/元数和有向 coupling。未支持属性返回 null，不能解释成零或空集合。
- `driverKind=example` 只是官方示例元数据。任何驱动的返回都不是实际硬件验收；hardwareVerified=false，jobsSubmitted=0。
- 没有作业创建、提交、取消或校准入口。当前接口不转发宿主凭据，不支持需要认证参数的设备发现。
- 原生驱动是受信任代码；添加厂商驱动前核对 ABI、初始化、权限和网络行为。示例安装器当前支持 macOS/Linux。

[准备方式、驱动配置和验证](../../../docs/integrations/QUANTUM_INTEROP.md)。
