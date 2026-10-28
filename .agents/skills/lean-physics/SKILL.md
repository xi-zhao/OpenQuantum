---
name: lean-physics
description: 用 Lean 4、mathlib 与 physlib 形式化数学或物理命题、复用定理并检查证明与依赖公理；适用于量子信息、Pauli 矩阵与物理推导的形式化审计。
---

# Lean 数学与物理证明

<!-- BEGIN NATIVE SDK ACCESS -->
## 原生 SDK 路径

本能力使用 **Lean 4 / mathlib / physlib 的原生公开 API**。用户需要 数学与物理命题、Pauli 矩阵关系、量子信息定理与依赖公理审计 时，由 Agent 在固定依赖环境中编写和运行任务代码。

使用 `node scripts/sdk-access.mjs inspect lean-physics` 定位环境，按[完整 SDK 工作流](../quantum-sdk-workbench/references/workflow.md)执行。模块导航：`Mathlib`、`Physlib`、`QuantumInfo`；导航不是 API 白名单。

固定兼容的 Lean 4.35.0 与 Lake 依赖锁；显式准备导入闭包。形式证明仅覆盖给定定义和假设，不代表真实物理或科学验收。

本入口复用宿主文件与代码工具，没有新增通用执行 Tool。原生 SDK 受上游版本、可选依赖、宿主资源与用户授权约束。已禁用或被拒绝的动作不能借代码路径绕过。执行状态和科研验收分别报告。
<!-- END NATIVE SDK ACCESS -->


## 选择与边界

当用户要检查形式推导、定义中的假设或复用已有定理时使用。本 Skill 复用宿主文件与代码工具，
没有专用证明 Tool 或 MCP Server。数值模拟继续使用对应量子 SDK；Lean 接受证明项不表示
形式定义符合真实物理系统，也不验证数值实现、硬件或科研结论。科学状态保持 `not_evaluated`。

## 固定环境与准备

使用 `node scripts/sdk-access.mjs inspect lean-physics` 只读定位环境。Lean/Lake 为 **4.35.0**，
mathlib 为 `56a005855ea17e0b0958f73ec801ae140b0a1679`，physlib 为
`6fd50cbcfafb503e4b96435e49bedb0e220f09e2`，间接依赖见 [Lake 锁](lake-manifest.json)。
三者作为兼容组升级；不能单独改工具链或取另一个提交的缓存。

显式准备前指定 `OPENQUANTUM_LEAN_BIN` 为该版本实际 Lean 可执行文件的绝对路径，
`OPENQUANTUM_LEAN_ENV_ROOT` 为本任务环境目录；需要工具链时从官方 release 获取并核对摘要。
不修改全局 elan、编辑器或已有用户 Lean 项目。遵守宿主安装授权、资源预算与外置盘规则。
`node scripts/setup-sdk.mjs lean-physics` 下载固定源码、按示例的导入闭包获取 mathlib 缓存并构建
[小型证明](OpenQuantumProofs.lean)；源代码、构建及缓存均留在指定环境。预计需要数 GiB，先检查空间。
默认仅准备示例的导入闭包，不声称已编译全部 Mathlib、Physlib 或 QuantumInfo。

准备后重新 inspect；只使用返回的绝对 `run.command` 与 `run.environment.LEAN_PATH` 检查保存到
用户工作区的 `.lean` 文件。执行不经 elan/Lake 自动下载。缺少其他模块的编译产物时，先用同目录
工具链在 `leanProject.directory` 显式运行 `lake exe cache get <module>`、`lake --no-cache build <module>`，
保留相同依赖锁与本地缓存目录，再继续证明检查；模块导航不是功能白名单。
准备拒绝覆盖已有模板或依赖源码修改；版本变化请保留旧环境，指定新的环境根目录。

## 证明工作流

1. 明确待证命题、定义域、单位/归一化、有限维或无限维等假设。先查固定版本源码中的定义和已有定理。
   新物理假设若改变结论，向用户给出具体取舍；不要为让证明通过偷偷弱化目标。
2. 把命题写为具名 `theorem`，先用小型独立命题检查导入和记号。优先直接复用已有定理与内核可检查证明。
3. 在保存文件上运行 Lean，保留完整错误/警告。错误命题必须报错；退出码为零仍需检查 `sorry` 警告。
4. 对每个交付定理运行 `#print axioms <name>`，检查包括间接依赖的 `sorryAx`、自定义公理、
   `Lean.ofReduceBool` 等非内核计算信任边界。允许的 `propext`、`Classical.choice`、`Quot.sound`
   也须如实列出。禁止以 `sorry`、`admit` 或新公理绕过目标后宣称证明完成。
5. 保存源文件、原始目标/假设、命令、Lean版本、依赖完整 SHA、输出及公理列表。
   分开报告环境准备、文件编译、目标证明与科学验收；额外公理或未闭合目标明确标为未完成。

physlib 合并了 PhysLean 与 Lean-QuantumInfo，`PhyslibAlpha` 另有较弱的维护/审阅约定。
本示例不导入 Alpha，不把上游全库或所有平台称为本项目已验证。

## 来源与许可

- [Lean 4 v4.35.0](https://github.com/leanprover/lean4/releases/tag/v4.35.0)，Apache-2.0。
- [mathlib 固定源码](https://github.com/leanprover-community/mathlib4/tree/56a005855ea17e0b0958f73ec801ae140b0a1679)，Apache-2.0。
- [physlib 固定源码](https://github.com/leanprover-community/physlib/tree/6fd50cbcfafb503e4b96435e49bedb0e220f09e2)，Apache-2.0。
- [Pauli 矩阵定义及定理](https://github.com/leanprover-community/physlib/blob/6fd50cbcfafb503e4b96435e49bedb0e220f09e2/Physlib/Relativity/PauliMatrices/Basic.lean)。

这里只提供项目模板及指南，不把完整上游库复制入插件。准备所得源码保留各自许可证。
