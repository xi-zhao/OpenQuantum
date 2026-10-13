# OpenQuantum Codex 插件 0.8.2

OpenQuantum 0.8.2 将 Pasqal 实验工作流加入 Codex 原生对话，提供 **134 个 Skill、71 个科学 Tool**。聊天、项目、登录和模型继续由 Codex 管理；OpenQuantum 设置页管理本插件的量子能力。

## 本版变化

- 新增 `pasqal-experiments`，覆盖实验规范、序列构建、理想与含噪仿真、设备快照、云计划、批次生命周期及结果分析。复用 Pulser 1.9.1，提供 `pasqal-cloud==0.24.0` 的完整原生 SDK 路径。
- 便捷工作流校验执行文件的源码摘要，将研究常量、辅助函数及观测量放在同一个已审阅文件中，并拒绝本地、相对及直接动态导入。完整原生 SDK 仍支持多文件程序。
- `local-run`、`analyze` 和新 `submit` 在执行前核对 SDK、数值库版本与依赖锁摘要。环境漂移会明确拒绝执行；已有云任务仍可恢复、采集和取消。缺少新版本字段的旧计划需要重新准备和审阅。

## 下载与安装

从 [codex-v0.8.2 Release](https://github.com/xi-zhao/OpenQuantum/releases/tag/codex-v0.8.2) 下载完整安装包 `openquantum-0.8.2-codex-install.zip` 与 `SHA256SUMS`，核对摘要后解压。需要 Node.js 24+、npm 及支持插件的 Codex：

```sh
npm ci --ignore-scripts
npm run plugin:install
```

安装器保留 `openquantum@personal` 身份、其他插件及用户配置。安装后按 Codex 提示重载；依赖按具体量子任务显式准备。完整步骤见[Agent 安装指南](../integrations/CODEX_AGENT_INSTALL.md)。发布本身不会替换用户现有安装。

## 验证与范围

Pasqal 集成已通过本地真实 Pulser 数值检查、真实 Cloud SDK 的 HTTP 传输夹具和 Harness 会话读回；本轮修复另通过完整质量检查、28 项 Python 回归及 4 项 Pasqal/Harness 检查，并完成独立审查。详细范围见[Pasqal 集成记录](../integrations/PASQAL.md)。

正式附件还须在最终发布提交完成干净打包、完整安装包隔离安装、原生 Codex 宿主检查和下载摘要核对。最终源码提交、附件摘要与实际检查结果记录在 Release 的 `release-validation.json`。

这些是有范围的工程检查。没有执行真实 Cloud EMU/QPU、外部模型或科研任务验收；保持 L1 / `scientificValidation=not_evaluated`。本机原生宿主检查不代表其他操作系统或 Codex 版本全部通过。
