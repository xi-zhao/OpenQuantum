---
name: quantum-information-audit
description: 使用固定版本 toqito 对用户提供的有界多体密度矩阵做本地审计，并由 OpenQuantum 独立重算关键不变量。用于密度矩阵合法性、纯度、部分转置谱和 negativity 的可追溯检查；不用于任意量子信道、态层析、物理硬件、云任务或在缺少来源链时宣称最终科学验收通过。
---

# 量子信息审计

## 核心边界

本能力只审计用户已经给出的密度矩阵。核心对象是版本化的审计请求：复矩阵的实部/虚部、子系统维数，以及需要做部分转置的子系统索引。

- `toqito` MCP-exposed Tool 产生数值事实。
- OpenQuantum Validator 用独立 JavaScript 实现重算迹、Hermiticity、正半定性、纯度、部分转置谱和 negativity。
- MCP-exposed Tool 的结果标记 `observations_available`，不等于最终科学验收。只有物化 Result Package
  并核对 Session Event Log 来源链后，才可能形成最终 Acceptance。

## 工作流

1. 确认矩阵总维数等于 `subsystemDimensions` 的乘积，且不超过 16。
2. 明确 `transposeSubsystems` 采用从 0 开始的子系统索引，并且是非空真子集。
3. 调用 `audit_density_matrix`。复矩阵用 `matrixReal` 和可选的 `matrixImag` 表示；未给虚部时按全零处理。主动作加载固定环境并返回 `packageVersion`，首次调用可能下载依赖并写入工作区环境，无需单独检查运行时。
4. 分栏报告实际包版本及：
   - toqito 事实；
   - 独立 Validator observations；
   - 失败、不检查项和适用范围。
5. 确认 `tool/result` 是否包含 `acceptance_available` 与 Result Commit；只有可信 Host Plugin 通过
   内部 Scientific Result Adapter 进入 Materializer，并完成物化、重读和校验时，才能按 central
   Acceptance Builder 推导的状态报告最终验收。
6. 不把 negativity 写成普适的纠缠分类结论；它只对应本次指定的二分和部分转置判据。

## 必须保持的规则

- 不提交云任务或真实量子硬件任务。
- 不接受调用方自定义容差；容差由版本化 Acceptance Profile 固定。
- `provenance.complete=not_checked` 时不得宣称科学验收通过。
- 不凭 MCP-exposed Tool 的文本内容自行推断 `passed`；最终状态必须来自 Harness 物化后的 Acceptance Report。
- 工具失败、科学 observation 失败、来源链未检查是三种不同状态。
- 不从分子结构、实验层析数据或任意量子信道自动推导密度矩阵。

## 示例

Bell 态 `|Phi+><Phi+|` 使用 `subsystemDimensions=[2,2]`、`transposeSubsystems=[0]`。预期纯度为 1、部分转置最小本征值为 -0.5、negativity 为 0.5；仍需以实际工具事实和 Validator observations 为准。
