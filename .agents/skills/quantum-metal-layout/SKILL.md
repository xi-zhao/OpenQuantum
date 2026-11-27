---
name: quantum-metal-layout
description: 使用 Quantum Metal 从已有 QDesign 和显式结模板导出超导器件正掩模 GDSII，用 KLayout 独立核对示例的焊盘、约瑟夫森结和波导。
---

# 参数化超导器件版图

<!-- BEGIN NATIVE SDK ACCESS -->
## 原生 SDK 路径

本能力使用 **Quantum Metal 的原生公开 API**。用户需要 从已有超导器件设计导出正掩模 GDSII，并独立核对焊盘、结位置与波导几何 时，由 Agent 在固定依赖环境中编写和运行任务代码。

使用 `node scripts/sdk-access.mjs inspect quantum-metal-layout` 定位环境，按[完整 SDK 工作流](../quantum-sdk-workbench/references/workflow.md)执行。模块导航：`qiskit_metal`、`gdstk`；导航不是 API 白名单。

显式提供结模板。0.10.2 的负掩模样例重复放置结，本入口仅交付正掩模。独立几何参考限于给定设计。

本入口复用宿主文件与代码工具，没有新增通用执行 Tool。原生 SDK 受上游版本、可选依赖、宿主资源与用户授权约束。已禁用或被拒绝的动作不能借代码路径绕过。执行状态和科研验收分别报告。
<!-- END NATIVE SDK ACCESS -->

## 正掩模交接

用 `node scripts/setup-sdk.mjs quantum-metal-layout` 准备冻结环境，通过工作台在新任务目录运行[原生示例](references/native-example.py)。示例把 2 mm × 2 mm 芯片上的 transmon、显式传入的约瑟夫森结单元及直共面波导写入 `layout/positive.gds`。同目录保留输入 `junction.gds` 和诊断图 `diagnostic.gds`。自定义设计可复用 `design.renderers.gds`，结模板中的单元名须匹配组件的 `gds_cell_name`。

在含 `layout/` 的任务目录运行下面的命令，将 `VERIFY` 设为本 Skill 中[独立读回脚本](references/verify-positive.py)的路径。KLayout 0.30.14 在单独的 Python 3.12 环境读取磁盘文件。脚本对这个固定示例核对 1 nm 网格、焊盘、波导、孔洞和结的个数与方向，失败时返回非零并输出具体差异。改动设计参数后须同时给出相应的独立几何参考。

```sh
uv run --isolated --no-project --python 3.12 --with klayout==0.30.14 python "$VERIFY" layout/positive.gds
```

固定版 0.10.2 在省略结模板时可返回成功并输出零个结。在同一设计的第 1 层负掩模中，独立读回数到三个重合的结，焊盘和波导掩模也偏离参考。此示例交付正掩模。器件频率、工艺设计规则及可流片性需要另外验证。[正负掩模与缺结实测](../../../docs/ecosystem/proposals/quantum-metal.md#geometry-evidence)
