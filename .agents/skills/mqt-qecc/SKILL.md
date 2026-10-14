---
name: mqt-qecc
description: 使用 MQT QECC 的原生公开 API 完成CSS 码、容错态制备、色码与模拟信息解码，支持用户自定义模型、程序与结果文件。
---

# MQT QECC

<!-- BEGIN NATIVE SDK ACCESS -->
## 原生 SDK 路径

本能力使用 **MQT QECC 的原生公开 API**。用户需要 CSS 码、容错态制备、色码与模拟信息解码 时，由 Agent 在固定依赖环境中编写和运行任务代码。

使用 `node scripts/sdk-access.mjs inspect mqt-qecc` 定位环境，按[完整 SDK 工作流](../quantum-sdk-workbench/references/workflow.md)执行。模块导航：`mqt.qecc`；导航不是 API 白名单。

明确 Hx/Hz 的 GF(2) 约定、逻辑算符、故障模型与后选择。2.x 不包含旧 union-find 实现；qsample 是另备的可选组件。

本入口复用宿主文件与代码工具，没有新增通用执行 Tool。原生 SDK 受上游版本、可选依赖、宿主资源与用户授权约束。已禁用或被拒绝的动作不能借代码路径绕过。执行状态和科研验收分别报告。
<!-- END NATIVE SDK ACCESS -->


明确 Hx/Hz 的 GF(2) 约定、逻辑算符、故障模型与后选择。2.x 不包含旧 union-find 实现；qsample 是另备的可选组件。

按固定版本的公开文档和签名选择方法；输入、算法与资源预算由任务决定。该 Skill 通过[原生 SDK 工作台](../quantum-sdk-workbench/SKILL.md)和宿主代码工具执行自定义程序，没有新增通用执行服务或专用计算 Tool。

保留程序、输入、完整结果、依赖锁摘要和实际检查。原生 API 的执行不推导最终科学验收，`scientificValidation=not_evaluated`。

[上游源码与文档入口](https://github.com/munich-quantum-toolkit/qecc)。

## 原生程序示例

[固定版本的可编辑程序](references/native-example.py)展示公开 API 的使用方式，参数与模型可按研究任务修改。先显式准备环境，再在独立任务目录运行，保留结果文件；示例检查不构成最终科学验收。
