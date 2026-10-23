# OpenQuantum Codex 插件 0.8.4

OpenQuantum 0.8.4 提供 **168 个 Skill、87 个科学 Tool**，新增 26 个原生 SDK Skill，随包携带 **111 个 SDK/源码环境入口**的固定依赖、显式准备脚本和原生 API 导航。库的完整清单、许可与实际检查范围见[生态扩展记录](../integrations/SDK_ECOSYSTEM_2026-10-14.md)。QuCumber 不在本轮集成范围内。

TensorCircuit 迁移到 `tensorcircuit-ng==1.10.0`，保留 Skill ID 和 Tool 名称。原生 SDK 由宿主代码工具执行；新增 Skill 不为示例程序另建科学 Tool。环境、Julia 和 C++ 编译工具按条目准备，上游 API 与目标平台仍须核实。

设置页与 Desktop 共用运行状态、MCP、Skills、服务密钥四个标签，展示全部 183 个源 Skill 与 91 个 MCP 连接及未适配原因。新增 8 个凭据服务的 16 个 Tool 默认关闭，既有默认开关保留。目录展示不表示连接、账户或科学计算已经就绪。

## 下载与安装

- `openquantum-0.8.4-codex-install.zip`：完整安装包，含插件 ZIP、安装器和依赖锁文件。
- `openquantum-0.8.4-codex-plugin.zip`：独立插件 ZIP。
- `SHA256SUMS`：下载摘要；先核对再解压。
- `release-validation.json`：实际发布源码、检查、附件与验证范围。

需要 Node.js 24+ 与支持插件的 Codex。按[Agent 安装指南](../integrations/CODEX_AGENT_INSTALL.md)定位目标应用的 CLI，在完整包解压目录执行 `npm ci --ignore-scripts` 与 `npm run plugin:install`。安装器保留已有配置和其他插件，按宿主提示重载后从左侧“…”打开“OpenQuantum 设置”。

聊天、项目、线程、登录和模型由 Codex 管理，量子学习通属于 Desktop。发行不替换用户安装。两条渠道使用同一产品版本和已审阅提交，GitHub `latest` 与稳定更新清单保留给 `v0.8.4` 的 Desktop 能力包。

## 验证范围

新增 SDK 的 26/26 个 API 示例、TensorCircuit 迁移对照和独立审查已通过；科学库检查限于 macOS arm64。正式 Codex 附件由干净提交构建，须完成独立目录的完整包安装、原生宿主 Skill 发现、禁用、缓存升级保留与恢复检查，实际结果以 `release-validation.json` 为准。

设置功能的原生显示与交互采用已记录的功能验收范围；本轮发行不将 CLI 安装或本地预览当作所有宿主操作系统的界面验收。真实厂商账户、外部模型和 Cloud/QPU 未验证，`scientificValidation=not_evaluated`。
