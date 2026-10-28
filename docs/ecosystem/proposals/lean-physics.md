# Lean 4、mathlib 与 physlib 接入提案

- 调研日期：2026-10-28；OpenQuantum 基线 `e70af1722e48025e705055a856f7c15fad51ac56`。
- 来源：用户在本轮四任务手动联调中明确要求接入 Lean 4、mathlib 与 physlib；不是将三个现有项目描述为今日新建库。
- 候选作为一个共享的 `lean-physics` 能力进入接入队列；沿用同一 PR 实现，用户可关闭或暂停。

## 用户问题与增量价值

现有 Qiskit、PennyLane、QCEC 和量子信息检查主要提供数值计算、有限范围等价判定或特定 observations。
本能力让用户把数学或物理命题、定义和假设写成 Lean 文件，复用 mathlib 与 physlib 的定理，
由 Lean 检查证明项。它补充形式化推导与定理复用，不替代数值模拟、实验检验或 central Acceptance Builder。
当前 SDK/capability 清单及开放、已关闭 PR 中没有这一接入；112 个既有 SDK 环境不能提供 Lean/Lake 环境。

## 固定来源及版本关系

| 对象 | 固定来源 | 关系 |
| --- | --- | --- |
| Lean 4 / Lake | [v4.35.0](https://github.com/leanprover/lean4/releases/tag/v4.35.0) | 官方工具链，2026-10-12 发布；编译产物与具体 Lean 版本绑定 |
| mathlib | [完整 SHA `56a005855ea17e0b0958f73ec801ae140b0a1679`](https://github.com/leanprover-community/mathlib4/tree/56a005855ea17e0b0958f73ec801ae140b0a1679) | physlib 的 v4.35.0 依赖，由 Lake manifest 锁定间接依赖 |
| physlib | [完整 SHA `6fd50cbcfafb503e4b96435e49bedb0e220f09e2`](https://github.com/leanprover-community/physlib/tree/6fd50cbcfafb503e4b96435e49bedb0e220f09e2) | 无 GitHub release；固定已通过上游构建的提交，不跟随浮动 master |

版本依据为 physlib 的 [lean-toolchain](https://github.com/leanprover-community/physlib/blob/6fd50cbcfafb503e4b96435e49bedb0e220f09e2/lean-toolchain)、
[Lake 配置](https://github.com/leanprover-community/physlib/blob/6fd50cbcfafb503e4b96435e49bedb0e220f09e2/lakefile.toml) 和
[依赖锁](https://github.com/leanprover-community/physlib/blob/6fd50cbcfafb503e4b96435e49bedb0e220f09e2/lake-manifest.json)。
physlib 已合并原 PhysLean 与 Lean-QuantumInfo；`Physlib`、`QuantumInfo` 与 `PhyslibAlpha`
仍有不同组织/审阅约定，Alpha 不作为首版默认示例或已验证内容。
见[固定版本说明](https://github.com/leanprover-community/physlib/blob/6fd50cbcfafb503e4b96435e49bedb0e220f09e2/README.md)。

## 最小 Interface 与架构取舍

增加一个 L0 Skill、Lake 项目模板和固定依赖锁，扩展已有 SDK 目录的 Lean 环境支持。
沿用 `sdk-access list/inventory/inspect` 和显式 `setup-sdk`，由已有宿主文件、代码工具运行 Lean。
共享 Skill 同时投影到 DSH/Codex；不添加专用证明 Tool、MCP Server、证明调度服务或第二套 Runtime。

发现只读取清单/就绪证据；准备显式处理该项目的工具链前提、固定依赖与所需模块。
用户已有 Lean 项目、全局工具链、编辑器与缓存不被修改。执行模板使用已准备的 Lean 和导入路径，
不在检查用户证明时隐式下载依赖；其他模块缺少编译产物时，先显式准备，再继续原任务。
最小示例的导入范围不成为完整库的功能白名单。

codebase-design 判断：SDK 环境定位和准备已经是共享的深 Module；Lean/Lake 是实际新增的生态差异，
把版本、锁和就绪处理放在这一处。Skill 保留假设、公理、可信范围及结果解释，具有独立工作流价值。
删除额外转发 Tool 不会损失行为，因此不增加这层；删除共享准备支持则会把版本核对和路径处理散落到调用方。

## 验证与交付条件

1. 在现有 `describeSdk` / `sdkInventory` / setup 入口做 TDD：Lean 项目可被发现且发现无副作用；
   缺失、错误版本、锁变化、未完成准备应保持非就绪；准备不能覆盖用户修改。
   这些检查验证环境合同，不证明 Lean 本身或物理命题正确。
2. 隔离环境实际运行 Lean 核心证明、mathlib 数学例子及 physlib 的 Pauli 矩阵关系。
   用可解释的命题验证正例，以错误命题验证拒绝；记录 `#print axioms`，不能只测试 import。
   参考 [Pauli 矩阵定义和关系](https://github.com/leanprover-community/physlib/blob/6fd50cbcfafb503e4b96435e49bedb0e220f09e2/Physlib/Relativity/PauliMatrices/Basic.lean)。
3. 保存工具链、依赖 SHA、命令、源文件、输出和实际覆盖；把 `sorry`/`sorryAx`、自定义公理、
   非内核计算捷径和未解决目标明确披露。Lean 接受一个文件不自动代表无额外假设。
4. 检查 SDK 目录、Skill 发现、DSH/Codex 投影、设置分类与打包；共享准备代码变化运行相关合同/集成检查。
   单代理分别做 Standards 和 Spec 自审，固定 base/head；不称为独立审查。
5. 同 PR 更新根 README：形式化能力、使用入口和实际边界；同步必要数量、生成指南与文档链接。
   验证失败保留 Draft，不能以文档已写或上游 CI 通过代替本项目的运行证据。

## 许可、资源与维护成本

三项目采用 Apache-2.0，保留来源、许可及依赖声明，不复制整个库进 OpenQuantum 源码。
Lean 官方工具链、mathlib 编译缓存和 physlib 构建可能消耗数 GiB；按任务显式准备，遵守外置盘空间保留线。
Lean、mathlib、physlib 作为兼容生态一起升级，不分别追逐最新版；固定 SHA 的变化由上游同步任务审阅。
准备可复用 [mathlib 按模块获取缓存](https://github.com/leanprover-community/mathlib4/blob/56a005855ea17e0b0958f73ec801ae140b0a1679/Cache/Main.lean)，
禁止为命中缓存自动选择另一提交的产物或忽略固定版本。

证明结论只覆盖文件中形式化的定义、假设及依赖公理，不证明这些定义对应真实物理系统，
也不验证数值代码、硬件或完整上游库的所有定理。首版不新增科学验收器，科学状态保持 `not_evaluated`。
