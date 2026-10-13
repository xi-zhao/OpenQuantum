# Codex 与 Desktop 量子组件内容一致（2026-10-13）

用户要求两个入口完整使用同一套内容，降低学习成本。本轮沿用 `c/codex-settings-complete`，实施基线为
前次交付 `226e8a68`，集成目标仍为 `main@05944b3a1f5f528a82edbdea35f34530e822d977`。
源码保存为 `af6f66fe`、`5381b0bc`、`005710500086ac53093134263482e088bf7a2a1e`。
本轮更新本机插件，不包含推送、合并或正式发行。

## 用户得到的内容

默认进入运行状态，标签按 Desktop“量子组件”的顺序排列：运行状态、MCP、Skills、服务密钥。
MCP 与 Skills 使用相同目录、名称、描述、用途分类和卡片结构；Codex 完整展示 91 个 MCP、157 个 Skill。
运行状态标题及服务密钥卡片也来自共享模块。原有服务开关、Tool 开关和密钥操作继续保留。

不同宿主的真实状态不能互相代替。Codex 仍实际提供 142 个 Skill、87 个科学 Tool（默认开放 71 个）；
未适配的 20 个 MCP 和其他未提供的 Skill 在原位置说明限制并禁用操作。目录可见不构成运行能力证明。
无需 Token 的本地准备和模拟功能仍可启用；需要认证的远程操作沿用执行层校验。
当前用户的配置、凭据、模型、聊天和其他插件保持各自原有归属。

## 同一来源与宿主边界

`src/settings/component-view.mjs` 拥有四标签、介绍、状态标题和通用卡片，沿用已有跨 React/DOM 渲染模式。
Desktop 与 Codex 使用它提供结构，宿主分别提供 IO、状态和可支持的动作。
`scripts/lib/component-directory.mjs` 在构建期读取 Desktop 权威 `readProjectSettings`，输出
`components.json`，只保留展示字段及现有中文文案，不打包 Skill 正文、凭据值、用户开关或 DSH Runtime。

Codex 设置读取该目录后叠加当前插件支持范围和原生 Skill 配置。目录字段不会触发安装、计算或联网认证。
服务密钥继续使用前次已审查的 JWE app-only Tool 通道和系统凭据库，不迁移 Desktop 凭据。

## 验证及修复

- 61/61 相关回归通过，零跳过，包含 Desktop 设置、完整目录、禁用操作、原生配置保留、跨进程资源及凭据通道；Keyring 使用随机测试 namespace 并清理。
- 导航构建调整后，受影响的原生入口和语言检查 10/10 通过；ESLint、差异格式检查通过。
- 独立审查发现并关闭三个回归：遗漏原生 provider 开关、缺凭据阻止无凭据本地功能、未适配凭据筛选失效。
- 实际浏览器验证：157/91 完整目录、相同分类、Skill 关闭及重开、AQT 无 Token 服务启停、6 个需单独配置字段筛选、QCArchive 合成地址的加密保存与移除。
- 最终排版实测发现并修复筛选栏挂载时序错误；四标签往返及原生开关反复操作通过。随后修复搜索重挂载失焦，连续键入得到完整 `qiskit`，焦点仍为 `search`。组合输入期间不重绘，在 `compositionend` 后更新；不宣称已做原生输入法全面验收。
- 420 像素侧栏实测为单列，`scrollWidth=clientWidth=405`，无横向溢出；测试后撤销视口覆盖。

这些是工程检查及隔离浏览器交互证据。没有执行真实账户认证、外部模型或 QPU；科学结果未验收。

## 本机安装及原生显示

最终从干净 `00571050` 构建并通过现有离线安装器更新 `openquantum@personal`，产品版本仍为 `0.8.3`。
安装器验证宿主原生插件目录、设置资源、跨进程读取、加密通道以及停用后的拒绝行为。
当前用户 `config.toml` 与插件 `settings.json` 摘要前后相同，其他插件条目未变；安装后页面和目录须与最终构建逐字节相同。
最终读回 `installed=true`、`enabled=true`，HTML 与完整目录逐字节一致。
运行目录为 `~/.local/share/openquantum/desktop/0.8.3-e29c8f3467a71043/runtime`，
ZIP SHA-256 为 `e29c8f3467a7104360e82a0246845740e45f769299edb56cde822a7603d4c54f`。

用户首次反馈仍显示旧界面；进程证据同时存在旧 `16224cc150c1a9db` 与新版后台，缓存 MCP 配置已指向新安装。
本机进程链确认宿主为 `/Applications/ChatGPT.app`，随后提示完整退出并重开该应用，再从 Codex 侧边打开 OpenQuantum 设置。
2026-10-13 用户明确确认“现在正常了”，关闭原生侧边页显示验收项。该证据来自用户实际观察，
不以安装 probe 或隔离浏览器截图代替；确认范围不扩展为原生密钥写入、账户认证或模型调用。

原始记录位于本任务 `.openquantum/codex-settings-evidence/`：`parity-sealed-build.txt`、`parity-install.txt`、
`parity-installed-readback.json`、`parity-regressions.txt`、`parity-final-affected-tests.txt`、
`parity-continuous-input.json`、`parity-narrow.json`；页面截图为 `parity-final-runtime.png`。
这些本机工件不纳入公开仓库，用户配置及凭据值不进入报告。
