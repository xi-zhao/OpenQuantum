---
name: quantum-metal-layout
description: 通过 Quantum Metal 的原生 Python 接口，从已有参数化超导器件设计、显式约瑟夫森结单元与布线生成无 GUI 的 GDSII。适用于焊盘几何和掩模文件交接。
---

# 参数化超导器件版图

<!-- BEGIN NATIVE SDK ACCESS -->
## 原生 SDK 路径

本能力使用 **Quantum Metal 的原生公开 API**。用户需要 将参数化超导器件设计、结单元和共面波导导出为可供独立读回的 GDSII 版图 时，由 Agent 在固定依赖环境中编写和运行任务代码。

使用 `node scripts/sdk-access.mjs inspect quantum-metal-layout` 定位环境，按[完整 SDK 工作流](../quantum-sdk-workbench/references/workflow.md)执行。模块导航：`qiskit_metal`、`gdstk`；导航不是 API 白名单。

显式提供结模板，核对单位、掩模极性、结位置和引用；几何读回仅覆盖给定设计，频谱与制造规则另行验证。

本入口复用宿主文件与代码工具，没有新增通用执行 Tool。原生 SDK 受上游版本、可选依赖、宿主资源与用户授权约束。已禁用或被拒绝的动作不能借代码路径绕过。执行状态和科研验收分别报告。
<!-- END NATIVE SDK ACCESS -->


在新的任务目录使用[可编辑示例](references/native-example.py)。示例给出芯片尺寸、焊盘、共面波导及独立结单元，并写出诊断、正掩模和负掩模三个 GDSII 文件。自定义设计时可沿用已准备环境中的 `qiskit_metal` 元件和 `design.renderers.gds`。

约瑟夫森结的模板必须与组件的 `gds_cell_name` 对应，且显式设置 `gds.options.path_filename`。缺少模板时上游仍可能返回成功。交接前用独立读者从顶层沿引用检查实际的结图形、位置和方向，并比对数据库单位、保护区、掩模层和极性。保留输入及磁盘输出。几何核对的范围限于给定设计。频谱、工艺规则与可流片性需要各自的模型或验证。[固定版本导出教程](https://github.com/qiskit-community/qiskit-metal/blob/aff87e59e2b2fbf015e6a7e43fa4409ce5e6563d/docs/tut/3-Renderers/3.2-Export-your-design-to-GDS.ipynb)
