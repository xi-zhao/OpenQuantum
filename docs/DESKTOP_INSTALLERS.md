# 原版 DSH Desktop 与 OpenQuantum 能力包

后续桌面发行直接使用 [anywhere-labs/dsh-desktop](https://github.com/anywhere-labs/dsh-desktop) 的原版客户端。
OpenQuantum 交付 Skill、Tool、设置扩展和配置，不再修改 Electron 应用、原生名称、图标、向导或客户端更新入口。

当前兼容基线是 [DSH Desktop 2.0.7](https://github.com/anywhere-labs/dsh-desktop/releases/tag/v2.0.7)
与 Harness `0.1.5-rc.1`。不要用上游 `latest` 链接自动替换固定版本；该链接可能指向 NEXT 渠道或不同 Harness family。
OpenQuantum 能力包与 Codex 插件继续共用产品版本（当前源码 `0.8.2`）；第三方客户端显示其真实的上游版本 `2.0.7`。
[OpenQuantum 0.8.2 Desktop Release](https://github.com/xi-zhao/OpenQuantum/releases/tag/v0.8.2) 提供 Mac Apple Silicon、Mac Intel 和 Windows x64 能力包；[同版本 Codex 插件](https://github.com/xi-zhao/OpenQuantum/releases/tag/codex-v0.8.2) 单独安装。以下流程适用于能力包，旧私有 DMG/EXE 不再作为安装入口。

## 安装与启动

1. 从上述上游 `v2.0.7` Release 安装原版 DSH Desktop。Mac 使用 universal DMG，Windows 使用 x64 Setup。
2. 从 OpenQuantum 对应 Release 下载 `OpenQuantum-<version>-DSH-<platform>-<arch>.tar.gz`，按同页 `SHA256SUMS` 验证后解压。
3. Mac 运行解压目录的 `install.command`；Windows 运行 `install.cmd`。能力包包含 Node、uv 与锁定的程序依赖。
4. 打开安装器输出的 `OpenQuantum DSH.command` 或 `OpenQuantum DSH.cmd`。它启动原版 DSH Desktop 并传入 OpenQuantum Home。
5. 如果此前在 DSH Desktop 设置过数据目录，原生设置优先于启动环境。先退出客户端，在 DSH Desktop 的数据目录设置中选择本次安装的 `project/.openquantum/dsh`，再启动入口。

默认安装目录：Mac 为 `~/Library/Application Support/OpenQuantum/`，Windows 为 `%APPDATA%\OpenQuantum\`。
`project/` 是可写部署，`versions/` 保存安装依赖和运行环境，原版客户端继续使用自己的 `DSH Desktop` 原生设置目录。
解压目录安装完成后可移走；不要删除 `versions/`。自定义目录可作为安装命令的唯一绝对路径参数。
Windows 自定义客户端位置通过 `DSH_DESKTOP_EXECUTABLE` 指定原版 `DSH Desktop.exe`。

安装不会覆盖已有模型 Route、凭据、自定义 Skill 或修改过的 MCP 配置。新默认配置存放在
`.openquantum/distribution-defaults/` 或 Home 的 `.openquantum-defaults/` 供比较。更新前应退出相关 Host。
旧私有客户端安装迁移时，仅自动替换能与旧分发清单逐字节匹配的生成默认文件；用户修改继续保留。

原版客户端保存数据目录后，也可以直接从 Finder 或开始菜单打开。安装器将项目 `.env` 中的两条模型
`BASE_URL`、三个 Tool profile 与 `OPENQUANTUM_DISABLE_QISKIT_MCP` 固化为 Home 配置的默认值；启动环境仍优先。
配置声明的 `apiKeyEnv`、`credentialEnv` 和 `optionalCredentialEnv` 引用若在项目 `.env` 有值，安装器通过
DSH 的凭据服务写入原生存储（macOS 为 `0600`），已有原生凭据不覆盖，密钥不进入配置或安装报告。
之后请在原生设置中管理凭据。启动入口不再将这些旧 `.env` 凭据注入进程，原生设置中的更换和删除会继续生效；显式 shell 环境仍优先。修改上述 `.env` 默认值后需重新运行安装器或启动入口；独立修改过的 Home 配置需自行比较合并。
其他自定义进程环境（例如 Python 环境目录、计算资源限制）仍使用 `OpenQuantum DSH.command/.cmd` 启动入口加载，
不声称原版 Finder 启动会读取整个项目 `.env`。

Harness 0.2 的 V4 会话不能交给此版本改写。安装与准备会拒绝 V4 Home；使用单独兼容 Home，并保留原目录。
这不提供 V4 → V3 会话转换。旧源码 Home 没有分发清单时，无法证明的旧程序副本或仍引用进程目录的 preset 会阻止启动；先备份并比较 Home 的 `.openquantum-defaults/`，或选择新的兼容 Home。既有 SDK 的显式安装、账户、平台与许可要求仍见[环境说明](integrations/LOCAL_ENVIRONMENTS.md)。
量子库原生 API 入口和完整接入范围见[完整接入记录](integrations/FULL_SDK_ACCESS.md)。

## 开发与工程验证

```sh
npm ci
npm run desktop:setup          # 可选：构建固定上游源码，内容不作修改
npm run desktop -- --source   # 开发用的原版源码入口
npm run desktop:package:check
npm run desktop:package       # 只构建 OpenQuantum 能力包
npm run desktop:package:smoke
```

打包需要与目标架构相同的原生 runner、Node `24.14.1` 和 npm；输出在
`.openquantum/distributions/<platform>-<arch>/artifacts/`。`--dir` 仅准备 `content/`，不生成压缩包。
Desktop 保留上游设置的布局、插件、Agent 预设和原生操作，不自动展开提供方设置。OpenQuantum 仅增加品牌、量子组件、量子学习通和更新入口；额外消息渠道设置不在 Desktop 注册，内测声明通过原生 onboarding Slot 隐藏。终端入口使用「打开终端」标签，两个量子模式的简介只说明用户用途。

全新安装不预置 OpenQuantum Gateway 或 Kimi、GLM 等模型；用户在原生模型设置中添加提供方。更新时只移除仍使用示例地址且没有端点、凭据或原生设置的占位路由，并清除指向它们的默认模型选择。已配置的路由以及用户单独修改过的 Home 配置继续保留。

模型目录为空时，原生输入区显示「请在设置 → 模型中添加模型」。配置后恢复原版模型选择器；读取失败时保留原版错误处理，不改写历史会话的模型选择。量子组件使用 Tools、MCP、Skills 名称，中文说明分别解释工具、服务连接和任务指导的用途；首次配置或等待会话时显示下一步操作，读取超时等异常仍明确显示。技术状态与检查边界保留在折叠的「诊断详情」中，已加载不等于连接或科学验收通过。

五个 OpenQuantum Web 包和一个声明配置的 bundle 通过 `desktop` Profile 的正式 `link:` 依赖注册。
扩展只在该 Profile 激活，新建和切换其他原生 Profile 不会加载这些依赖。用户的 Profile patch 保留原文，覆盖顺序沿用上游规则。
升级只迁移仍与安装记录一致的全局 Home patch，并在 `.openquantum-migrations` 保留原件；若其中的 OpenQuantum 配置已被手动修改，先停止迁移并提示合并配置。
原生 Profile 修复可以按 manifest 重建链接，无需向上游 app 或其 `node_modules` 注入文件。

工程检查覆盖安装、再次安装、配置保留、独立工作目录和捆绑运行环境；不运行外部模型或真实科研任务。
该命令不宣称原生 UI 验收。发布前另需对原版客户端完成实际启动、设置、关键操作和重启检查。
[能力包 CI](../.github/workflows/desktop-installers.yml)覆盖三个原生构建目标，
[发布附件流程](../.github/workflows/release-artifacts.yml)只接受同一提交通过 CI 的能力包。
第三方应用更新由 DSH Desktop 负责；OpenQuantum 内容更新使用[自身的版本提醒](UPDATES.md)。
