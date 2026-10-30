# OpenQuantum Desktop

OpenQuantum 是基于 DSH 二次开发的独立个人 Harness。默认界面聚焦会话与任务、工作区与文件、工具执行、
历史恢复、操作安全，以及模型、语言、外观和 OpenQuantum 插件设置。量子工具按任务需要加载；不要求登录上游账号，不提供插件市场、
Agent 预设管理、自动化中心或 Magpie 专用连接页。

复用固定版本 DSH 的窗口、会话、权限和持久化机制，通过官方配置与 Client Slot 扩展收拢界面。
普通界面、窗口与图标使用 OpenQuantum 品牌，上游来源保留在设置底部的开源许可链接。不自动吸收上游新增功能。

## OpenQuantum 0.8.9 独立安装包（Mac Apple Silicon）

从 [v0.8.9 Release](https://github.com/xi-zhao/OpenQuantum/releases/tag/v0.8.9) 下载
`OpenQuantum-0.8.9-macOS-arm64.dmg` 和 `SHA256SUMS`，校验摘要后打开 DMG，将 `OpenQuantum.app`
拖入「应用程序」再打开。应用自带桌面程序、Node、uv 与锁定依赖，无需另装 DSH Desktop。
Codex 插件同步发行 [codex-v0.8.9](https://github.com/xi-zhao/OpenQuantum/releases/tag/codex-v0.8.9)，两个标签指向同一源码提交。
0.8.8 的应用与 Dock 图标使用白色圆角底板，菜单栏继续使用适合系统背景的透明标志。

本次独立安装包只覆盖 Apple Silicon；Intel 和 Windows 的既有能力包见下文。

此安装包使用 ad-hoc 本地签名，**没有 Apple Developer ID 分发签名或公证**。校验摘要不等于 Apple 公证。
若 macOS 拦截启动，仅在确认下载来源与摘要后，使用「系统设置 → 隐私与安全性」对该应用单独允许打开；
不关闭系统安全检查。若系统仍拒绝启动，保留报错并使用源码入口，不执行全局绕过命令。

默认数据目录是 `~/Library/Application Support/OpenQuantum/Desktop/`：`project/` 保存可写部署、会话和配置，
`native/` 保存窗口与原生偏好。应用更新只替换 `/Applications/OpenQuantum.app`；不要删除数据目录。
0.8.9 将依赖与 Node、uv 保留到该数据目录的 `versions/`，供成功安装和失败恢复使用。
首次从旧实现迁移时，已被外部替换掉的旧应用内依赖无法恢复，因此升级前仍须备份旧应用与数据。
Finder 和 Dock 启动也使用这个独立目录，不复用旧启动器的 `OpenQuantum/project/` 和 `OpenQuantum/native/`。
旧会话、配置和程序留在原位；简洁版从新会话开始。模型配置与凭据可以在备份后单独复制，
但 V3 等后续会话格式不能复制进简洁版继续使用。需要阅读旧会话时，另行导出阅读副本。
升级前退出应用，完整备份 `~/Library/Application Support/OpenQuantum/` 及任何自选 Home。
旧启动器应停用或改为新应用的链接，避免旧程序再次写入共用部署；保留备份和旧 `versions/` 以便恢复。

内置基线固定为 DSH Desktop `2.0.0`、Harness `0.1.0-rc.6`，同时包含经过审查的依赖安全修复。
不是上游签名应用的改包。0.8.7 源码构建增加可核验的原生菜单展示接口，由品牌 Host Plugin 提供文案、菜单规则和图标；Harness 执行机制保持原样。

## 既有能力包安装（0.8.4）

以下流程仍适用于 [v0.8.4 能力包](https://github.com/xi-zhao/OpenQuantum/releases/tag/v0.8.4)，
覆盖 Mac Apple Silicon、Mac Intel 与 Windows x64，依赖另行安装的
[DSH Desktop 2.0.7](https://github.com/anywhere-labs/dsh-desktop/releases/tag/v2.0.7)。
不要用上游 `latest` 链接自动替换固定版本；它可能指向不同 Harness family。
这些既有附件不包含 0.8.5 的简洁桌面与安全更新。

1. 从上述上游 `v2.0.7` Release 安装原版 DSH Desktop。Mac 使用 universal DMG，Windows 使用 x64 Setup。
2. 从 OpenQuantum 对应 Release 下载 `OpenQuantum-<version>-DSH-<platform>-<arch>.tar.gz`，按同页 `SHA256SUMS` 验证后解压。
3. Mac 运行解压目录的 `install.command`；Windows 运行 `install.cmd`。能力包包含 Node、uv 与锁定的程序依赖。
4. Mac 打开安装器输出的 `OpenQuantum.app`；Windows 打开 `OpenQuantum.lnk`。它们启动原版 DSH Desktop 并传入 OpenQuantum Home；也保留 `OpenQuantum DSH.command/.cmd` 命令行入口。Mac 启动入口可放入应用程序文件夹或拖入 Dock。
5. 如果此前在 DSH Desktop 设置过数据目录，原生设置优先于启动环境。先退出客户端，在 DSH Desktop 的数据目录设置中选择本次安装的 `project/.openquantum/dsh`，再启动入口。

默认安装目录：Mac 为 `~/Library/Application Support/OpenQuantum/`，Windows 为 `%APPDATA%\OpenQuantum\`。
Mac 默认安装还在 `~/Applications/OpenQuantum.app` 创建品牌启动入口，可直接打开或放入 Dock；已有的同名用户应用不会被替换。
`project/` 是可写部署，`versions/` 保存安装依赖和运行环境，原版客户端继续使用自己的 `DSH Desktop` 原生设置目录。
解压目录安装完成后可移走；不要删除 `versions/`。自定义目录可作为安装命令的唯一绝对路径参数。
Windows 自定义客户端位置通过 `DSH_DESKTOP_EXECUTABLE` 指定原版 `DSH Desktop.exe`。
安装后重启 Desktop，使 Dock／任务栏使用新图标。品牌启动入口依赖原版 DSH Desktop，安装客户端仍是第一步；上游客户端升级继续遵守上面的固定版本要求。

安装不会覆盖已有模型 Route、凭据、自定义 Skill 或修改过的 MCP 配置。新默认配置存放在
`.openquantum/distribution-defaults/` 或 Home 的 `.openquantum-defaults/` 供比较。更新前应退出相关 Host。
旧私有客户端安装迁移时，仅自动替换能与旧分发清单逐字节匹配的生成默认文件；用户修改继续保留。

安装器按语义版本比较分发清单，在复制能力包、更新程序或启动入口前拒绝降级；同版本修复和升级仍可执行。
版本缺失或无效时停止，不猜测版本顺序。程序、依赖和 Home 准备全部成功后才提交新版本收据；
普通失败恢复此前状态，进程中断后从安装或启动入口先恢复未完成事务。成功升级后的降级保护继续生效。
恢复只覆盖本次安装管理的文件，不纳入用户会话、工作区或 SDK 环境；凭据格式迁移与默认配置投影遵循下述规则。
已经安装的旧私有 `OpenQuantum Desktop.app` 自带旧安装器，不能自动获得此保护。
完成迁移后应备份并停用这个旧入口；可将其原路径改为新版 `OpenQuantum.app` 的链接，使已有快捷入口继续指向新版。
若旧入口曾把共用 `project/` 回写为旧版，需要重新安装对应能力包恢复程序与依赖；不要通过删除 Home 或数据目录处理。

原版客户端保存数据目录后，也可以直接从 Finder 或开始菜单打开。安装器将项目 `.env` 中的两条模型
`BASE_URL`、三个 Tool profile 与 `OPENQUANTUM_DISABLE_QISKIT_MCP` 固化为 Home 配置的默认值；启动环境仍优先。
配置声明的 `apiKeyEnv`、`credentialEnv` 和 `optionalCredentialEnv` 引用若在项目 `.env` 有值，安装器通过
DSH 的凭据服务写入原生存储（macOS 为 `0600`），已有原生凭据不覆盖，密钥不进入配置或安装报告。
之后请在原生设置中管理凭据。启动入口不再将这些旧 `.env` 凭据注入进程，原生设置中的更换和删除会继续生效；显式 shell 环境仍优先。修改上述 `.env` 默认值后需重新运行安装器或启动入口；独立修改过的 Home 配置需自行比较合并。
其他自定义进程环境（例如 Python 环境目录、计算资源限制）仍使用 `OpenQuantum DSH.command/.cmd` 启动入口加载，
不声称原版 Finder 启动会读取整个项目 `.env`。

此版本只支持 Harness 0.1.0-rc.6 的 V0 会话。安装与准备会拒绝含 V1–V5 文件的 Home；使用单独兼容 Home，并保留原目录。
这不提供后续会话格式向 V0 的转换。旧源码 Home 没有分发清单时，无法证明的旧程序副本或仍引用进程目录的 preset 会阻止启动；先备份并比较 Home 的 `.openquantum-defaults/`，或选择新的兼容 Home。既有 SDK 的显式安装、账户、平台与许可要求仍见[环境说明](integrations/LOCAL_ENVIRONMENTS.md)。
量子库原生 API 入口和完整接入范围见[完整接入记录](integrations/FULL_SDK_ACCESS.md)。

## 开发与工程验证

```sh
npm ci
npm run desktop:setup          # 固定源码，应用并验证菜单接口与依赖安全补丁
npm run desktop -- --source   # 使用已构建的独立测试桌面
npm run desktop:package:check
npm run desktop:package       # 只构建 OpenQuantum 能力包
npm run desktop:package:smoke
# 独立 macOS 应用：输出目录应位于容量充足的构建盘
npm run desktop:app:signing:check # 低文件上限下验证官方签名扫描完整性
npm run desktop:app:package -- --output /absolute/build-directory
npm run desktop:app:smoke -- /absolute/build-directory/artifacts/mac-arm64/OpenQuantum.app /absolute/evidence-directory
```

打包需要与目标架构相同的原生 runner、Node `24.14.1` 和 npm；输出在
`.openquantum/distributions/<platform>-<arch>/artifacts/`。`--dir` 仅准备 `content/`，不生成压缩包。
独立应用输出 DMG、`SHA256SUMS` 和 `.app`；`desktop:app:package -- --dir --output ...` 只生成 `directory/` 中的应用。
Desktop 保留原生会话、模型表单、文件和审批组件。设置提供「通用设置」「模型」「OpenQuantum」三个入口；语言、外观和输入习惯由原生表单保存。桌面语言暂为原版支持的中文与英文，其他语言 README 和译文文件继续保留。

「OpenQuantum」使用与本机 Codex 0.8.4 侧边应用一致的「首页、Skills、MCP」三栏布局。按用途浏览卡片，展开相应 Skill 或 MCP 后配置环境、账户和 Tool 使用限制。分类、搜索、准备状态和管理操作共用一套实现；桌面通过本机受控接口保存到自己的数据目录，不读取或同步 Codex 的凭据和使用限制。打开页面只读取状态，不自动安装 SDK 或启动 MCP 服务。
插件管理、Agent 预设、开发调试与上游升级入口默认关闭，学习通不出现在个人桌面的侧栏。
这只改变产品入口；Skill、Tool Provider、Harness MCP Client 与量子验收合同仍按原职责运行。

全新安装不预置 OpenQuantum Gateway 或 Kimi、GLM 等模型；用户在原生模型设置中添加提供方。更新时只移除仍使用示例地址且没有端点、凭据或原生设置的占位路由，并清除指向它们的默认模型选择。已配置的路由以及用户单独修改过的 Home 配置继续保留。

模型目录为空时，原生输入区显示「请在设置 → 模型中添加模型」。配置后恢复原版模型选择器；读取失败时保留原版错误处理，不改写历史会话的模型选择。量子组件使用 Tools、MCP、Skills 名称，中文说明分别解释工具、服务连接和任务指导的用途；首次配置或等待会话时显示下一步操作，读取超时等异常仍明确显示。技术状态与检查边界保留在折叠的「诊断详情」中，已加载不等于连接或科学验收通过。

OpenQuantum 的 Web、访问保护与能力 Host 包及声明配置的 bundle 通过 `desktop` Profile 的正式 `link:` 依赖注册。
扩展只在该 Profile 激活，新建和切换其他原生 Profile 不会加载这些依赖。用户的 Profile patch 保留原文，覆盖顺序沿用上游规则。
升级只迁移仍与安装记录一致的全局 Home patch，并在 `.openquantum-migrations` 保留原件；若其中的 OpenQuantum 配置已被手动修改，先停止迁移并提示合并配置。
原生 Profile 修复可以按 manifest 重建链接，无需向上游 app 或其 `node_modules` 注入文件。
Desktop 品牌扩展只在 OpenQuantum 的 Desktop Profile 内加载。它通过 `DesktopRuntime.schedule` 提供窗口与菜单栏图标、产品名和标题，并固定 compatibility 窗口样式。0.8.7 独立应用的菜单只保留「打开 OpenQuantum」「退出 OpenQuantum」，跟随原生 `locale` 设置；关闭窗口后仍可从菜单重新打开。Agent 的终端执行 Tool 不受影响。

固定 Desktop 2.0.0 的菜单没有原生精简开关，因此构建时应用 `scripts/patches/dsh-desktop-2.0.0-tray-menu.patch`，仅增加 `readTrayMenu` 展示策略和 `refreshTrayMenu` 刷新接口。默认行为与现有回调不变；此合同可独立向上游贡献。品牌插件只读取语言设置，不直接导入 Electron，不读取凭据、不新增网络或子进程权限。实际打开、退出和清理仍由原生桌面执行。

`desktop:setup` 运行原生窗口、菜单与图标回归后恢复上游源码字节，构建记录保存补丁及入口与原生菜单模块的摘要；打包拒绝缺失或不匹配的构建记录，不改写 `node_modules` 或发行二进制。原版第三方 Desktop 没有该新增接口，仍沿用其原生菜单；OpenQuantum 独立应用和源码入口提供精简菜单。菜单图像由现有 `mark.svg` 生成，可运行 `node scripts/generate-desktop-tray-icons.mjs` 重新生成。
原生桌面通过 Cordis 依赖等待图标扩展就绪；Profile 卸载会等待桌面清理完成，恢复原接口可与清理并行。已启动桌面的图标参数不受影响，后续其他 Profile 继续使用原版图标。桌面入口通过本机启动令牌自动取得访问 Cookie，无需账户或登录页；令牌使用内存密钥，重启重新授权，不迁移凭据格式。扩展不读取模型凭据或会话，不注册新的 Tool；设置导航的精简由独立 Client Plugin 完成，表单与写入仍由 Harness 管理。

工程检查覆盖安装、再次安装、配置保留、独立工作目录和捆绑运行环境；不运行外部模型或真实科研任务。
独立应用检查还会实际启动两次并确认 Host 与界面健康，不预填模型或凭据；首次设置与用户数据迁移另做 GUI 验收。
发布前对最终 DMG 中的应用完成实际启动、设置、关键操作和重启检查。
[能力包 CI](../.github/workflows/desktop-installers.yml)覆盖三个原生构建目标，
[发布附件流程](../.github/workflows/release-artifacts.yml)只接受同一提交通过 CI 的能力包。
上游桌面版本升级须另行评审，默认界面关闭其自动更新入口；OpenQuantum 内容更新使用[自身的版本提醒](UPDATES.md)。
源码构建额外修复 Electron 与传递依赖的已知安全通告。该修复不作用于用户另外安装的原版签名应用，
发布前需要核对实际交付的二进制与依赖，不能用源码审计结果代替原版应用的安全状态。

[独立应用 CI](../.github/workflows/desktop-app.yml)构建 macOS arm64 应用并验证捆绑运行环境、实际启动与设置保留。
Release 附件须来自通过检查的干净提交；发布前挂载并验证 DMG、应用签名与摘要，不上传用户 Home 或凭据。
