---
name: cqlib-kernel
description: 用固定 cqlib-qml 执行角度编码核与 QSVM，解释输入语义、独立数值对照、成本与科学边界。
---

# cqlib-qml

<!-- BEGIN NATIVE SDK ACCESS -->
## 原生 SDK 路径

本能力同时支持 **CQLib 的原生公开 API**。用户需要 上游计算内核、编码器、量子核、学习算法与用户数据 时，由 Agent 在固定依赖环境中编写和运行任务代码，不限于下文便捷 Tool 的预设模型。

使用 `node scripts/sdk-access.mjs inspect cqlib-kernel` 定位环境，按[完整 SDK 工作流](../quantum-sdk-workbench/references/workflow.md)执行。模块导航：`cqlib`、`cqlib_qml`；导航不是 API 白名单。

固定兼容的 CQLib 2.0.0b4 与完整 cqlib-qml Git 包；两者仍属上游预发布接口。原生 API 使用已安装 QML 包，不能把 Skill/upstream 的旧裁剪适配目录加到 sys.path。便捷 Tool 保留旧 angle-kernel 适配及独立回归。

下文关于模型、门集、输入与预算的限制描述便捷 Tool 的合同；原生 SDK 另受上游版本、可选依赖、宿主资源与用户授权约束。已禁用或被拒绝的动作不能借代码路径绕过。执行状态和科研验收分别报告。
<!-- END NATIVE SDK ACCESS -->


先在设置中心按需启用 `cqlib_kernel_local`，准备 Rust 构建环境。明确给出 trainX/trainY、testX 及可选 testY，再调用 `fit_cqlib_angle_kernel`。不从全数据拟合缩放或选择划分；所有实特征按弧度使用，实际编码为 RY(2x)。

报告真实 SDK 核与独立 ∏cos²(x−y) 对照，区分无 jitter 的 fidelity Gram 与上游训练时的 1e-8 对角 jitter；同时给解析核分类和同数据 RBF baseline。该核可经典解析，不宣称量子优势。只开放 classical angle 核，不开放 signed amplitude、共享参数 parameter-shift、VQC 或 swap test。若用户要求这些路径，解释上游当前缺陷，不能暗中用不同算法替代。

资源由用户选择，通过 `execution.timeoutMs`、`maxOutputBytes`、`threads` 控制进程；依赖须显式准备；计算仍可能写 SDK 缓存，保留 workspace-write。不要把执行成功或参考相符写成最终科学验收。安装、来源与示例见 [候选库接入说明](../../../docs/integrations/CANDIDATE_LIBRARIES.md)。

## 依赖准备

运行前执行 `node scripts/setup-paper-tools.mjs cqlib-kernel`。缺失、旧锁和已安装环境的处理见[共同准备说明](../../../docs/integrations/LOCAL_ENVIRONMENTS.md)；Tool 不自动安装或升级依赖。
