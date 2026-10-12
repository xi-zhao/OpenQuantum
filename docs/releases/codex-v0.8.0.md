# OpenQuantum Codex 插件 0.8.0

本版在 Codex 中提供 **133 个 Skill、71 个科学 Tool**，并为 **85 个 SDK/源码环境**提供原生程序入口。SDK workbench 和领域 Skill 可使用宿主代码工具编写自定义研究程序、组合公开 API 和保存完整工件，使用范围不再限制在便捷 Tool 的预设案例上。

插件基于 OpenQuantum 核心 `0.7.0`，使用独立标签 `codex-v0.8.0`。聊天、项目、线程、登录、模型和执行权限继续由 Codex 管理；设置页只管理本插件。Desktop 发行及稳定更新通道独立。

## 下载和安装

首次安装下载 [完整安装包](https://github.com/xi-zhao/OpenQuantum/releases/download/codex-v0.8.0/openquantum-0.8.0-codex-install.zip)，并与 [Release](https://github.com/xi-zhao/OpenQuantum/releases/tag/codex-v0.8.0) 的 `SHA256SUMS` 核对。包内包括安装器、锁文件、插件 ZIP 和 Agent 安装指南，无需另行取得源码。

需要 Node.js 24+、npm，以及支持插件和全局应用的 Codex。在解压目录执行：

```sh
npm ci --ignore-scripts
npm run plugin:install
```

也可把下面这段话交给 Codex：

```text
请按 https://github.com/xi-zhao/OpenQuantum/blob/codex-v0.8.0/docs/integrations/CODEX_AGENT_INSTALL.md
安装 OpenQuantum Codex 插件 0.8.0。从该版本 Release 下载完整安装包与 SHA256SUMS，
核对摘要并检查依赖，使用包内安装器安装。保留已有插件和用户配置，核对 Skills、MCP 工具及全局设置入口。
```

已有安装器时可使用 `openquantum-0.8.0-codex-plugin.zip`。安装器保留 `openquantum@personal` 身份、用户设置和其他插件，安装后按宿主提示重载。插件安装不会批量下载 SDK 环境；按实际任务显式准备所需依赖。说明见[安装指南](../integrations/CODEX_AGENT_INSTALL.md)和[插件合同](../integrations/CODEX_PLUGIN.md)。

## 接入范围

插件携带 85 个环境的目录、固定依赖、显式 setup、完整算法源码和工件辅助脚本；缓存 Skill 可定位分开安装的插件与运行时，不依赖研究项目的当前目录。原有未启用连接和 Skill 的状态保留。原生执行由宿主工具完成，不新增任意代码执行 MCP，也不绕过宿主授权。

补齐内容包括 Flow-VQE、CQLib QML、Ocean、QPanda 及相关导入依赖，QCEC 的 Qiskit extra、TensorCircuit 的优化/转换依赖和 QAT 安装校验。85 项是环境入口而非不同上游库；完整包/API 可访问不代表所有接口、后端或操作系统都已测试。逐库范围及证据见[完整 SDK 接入记录](../integrations/FULL_SDK_ACCESS.md)。

## 验证范围

发布检查包括插件合同和打包测试、原生 Codex 宿主中的 Skill 发现/关闭/重开及缓存路径升级，以及完整安装 ZIP 在独立解压目录和临时 HOME/CODEX_HOME 中的安装、设置资源与 Tool 调用回归。逐包版本、提交、摘要及实际结果见 Release 的 `release-validation.json`。

本机宿主验证限于 macOS arm64；其他操作系统、Codex 版本和全新机器未据此认定通过。SDK 的 13+30+24+18 项工程记录沿用其明确的平台与执行边界，没有在发布时重新执行真实科研任务。失败尝试中缺失的两个中间依赖快照在原证据中保留为缺口。

**本版没有使用真实科研任务做验收，`scientificValidation=not_evaluated`。** 插件不具备 Harness Session 的 central Acceptance Builder 链；Tool 成功和 Validator observations 不构成最终科学 Acceptance。未验证真实云账户、QPU、实验室设备或外部模型；设置页的历史显示验收不扩展为所有原生交互已重测。

## English

The 0.8.0 Codex plugin includes 133 Skills, 71 scientific Tools and native workflow navigation for 85 SDK/source environments. It bundles pinned setup definitions and source resources so users can write programs beyond preset cases through the host's code tools. SDK setup remains explicit. The plugin has its own release channel, installation preserves user configuration, and engineering validation does not imply scientific acceptance.
