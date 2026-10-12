---
name: kaiwu-qubo
description: 用玻色 Kaiwu Community 构建带线性等式平方罚项的 QUBO，转换增广 Ising 矩阵并评估指定二进制方案。
---

# Kaiwu Community 符号 QUBO 建模

<!-- BEGIN NATIVE SDK ACCESS -->
## 原生 SDK 路径

本能力同时支持 **Kaiwu Community 的原生公开 API**。用户需要 上游社区版表达式、约束、QUBO/Ising 转换与优化接口 时，由 Agent 在固定依赖环境中编写和运行任务代码，不限于下文便捷 Tool 的预设模型。

使用 `node scripts/sdk-access.mjs inspect kaiwu-qubo` 定位环境，按[完整 SDK 工作流](../quantum-sdk-workbench/references/workflow.md)执行。模块导航：`kaiwu`；导航不是 API 白名单。

固定的是 Kaiwu Community；商业服务和企业版不是该发行版的一部分。

下文关于模型、门集、输入与预算的限制描述便捷 Tool 的合同；原生 SDK 另受上游版本、可选依赖、宿主资源与用户授权约束。已禁用或被拒绝的动作不能借代码路径绕过。执行状态和科研验收分别报告。
<!-- END NATIVE SDK ACCESS -->


Agent 经 Harness 调用 `kaiwu_local` 提供的 `build_kaiwu_qubo`。本 Skill 负责模型选择和结果解释，Tool 在独立 Python 环境执行真实上游 SDK。

输入目标函数的 `linear`、`quadratic=[{i,j,bias}]`、`offset`，以及可选 `constraints=[{coefficients,rhs,penalty}]`。每个约束贡献 `penalty*(coefficients.x-rhs)^2`；penalty 必须为正，变量及约束维度必须一致。

SDK 使用真实 Binary 表达式与 QuboModel。输出 `variableNames` 按输入索引排列，包括零系数变量。QUBO 能量为 `x^T quboMatrix x + quboOffset`；非对角元严格按矩阵相乘计数，不另乘二。

Kaiwu 的 Ising 符号约定是 `E=-s^T isingMatrix s + isingOffset`。设置 `s_i=2*x_i-1`，并把额外的最后一个辅助 spin 固定为 +1。不要直接把这一矩阵当成通常正号的 J 系数表。

`assignments` 是要评估的二进制向量，可为空。返回原目标能量、每个等式残差、罚项能量和总能量。此动作只建模和评估，不求解；有限罚项不保证最优解可行。后续可将编译的 QUBO 转为 Ocean 等求解器的对应系数时保留 offset 与非对角元约定。

只安装 Apache-2.0 的 kaiwu-community，不使用企业版 kaiwu、license、数据上报或真机优化器。

计算规模由调用方选择，后端数值表示限制仍适用。资源限制用 `execution` 设置，与模型参数分开。先运行 `node scripts/setup-paper-tools.mjs kaiwu-qubo` 显式准备固定依赖；计算调用不安装依赖或联网，数值库可能写本地缓存。

固定上游版本：1.0.7；来源与许可见[上游仓库](https://github.com/qboson/kaiwu_community)（Apache-2.0）。本地数值和协议检查属于开发证据；当前 L1，`scientificValidation=not_evaluated`，成功执行不等于最终科学 Acceptance。
