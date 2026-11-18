# OpenQuantum Codex 插件 0.8.11

此版本与 [Desktop 0.8.11](v0.8.11.md)来自同一源码提交。共享 Tool backend 统一参数校验、并发、权限复查与资源回收；设置页能够持续显示 Agent 启动的环境准备进度，并在隐藏、恢复和任务结束时正确调度读取。

本次还收录 SlowQuant、TNQS 与 RcmpsCore 的 SDK 工作流和参考验证，具体范围见 [0.8.11 更新说明](v0.8.11.md)。Codex 继续拥有原生对话、模型和执行循环；科学 SDK 按任务准备，既有 Tool 合同和设置数据格式保持兼容。

从 [codex-v0.8.11 Release](https://github.com/xi-zhao/OpenQuantum/releases/tag/codex-v0.8.11) 下载 `openquantum-0.8.11-codex-install.zip` 与 `SHA256SUMS`，按 [安装指南](../integrations/CODEX_AGENT_INSTALL.md)核对、安装并重载插件。保留 `openquantum@personal` 身份、其他插件、已有设置、凭据和计算环境。

最终包摘要、源码提交、完整安装包检查和原生宿主验证以 Release 的 `release-validation.json` 为准。工程验证不代表 Codex 的自动科学 Acceptance 已接通。
