# OpenQuantum 桌面测试安装包

安装包把 OpenQuantum 工作台、固定版本的 Desktop / Harness、Node.js 和 uv / uvx 一起交付。
打开工作台和运行内置本地工具不需要先安装 Node、npm、Corepack 或 C++ 编译器。
通过 Agent 调用模型仍需在设置中配置自己的模型服务。

当前提供的是**未签名的测试构建**，不代表已经完成 Apple 签名、公证或 Windows 签名。
首次启动可能需要在操作系统的安全提示中确认该应用。正式发布仍以 GitHub Release 的实际附件为准。

2026-09-20 本地验证：Apple Silicon DMG 已完成介质校验、复制安装和两次真实工作台启动，
自定义配置、Skill 保留与本地计算检查通过。Intel Mac 和 Windows 已有原生构建任务，尚待 CI 实际执行，
不能据此宣称这两个平台的安装包已经通过验证。

## 下载、安装与首次启动

测试构建工作流输出以下文件；只使用对应平台实际构建、验证成功的附件：

| 系统 | 安装文件 | 安装方式 |
| --- | --- | --- |
| macOS，Apple Silicon | `OpenQuantum-<version>-macOS-arm64.dmg` | 打开磁盘映像，将 OpenQuantum Desktop 拖到 Applications，再从 Applications 启动 |
| macOS，Intel | `OpenQuantum-<version>-macOS-x64.dmg` | 同上 |
| Windows，64 位 | `OpenQuantum-<version>-Windows-x64-Setup.exe` | 运行安装向导，选择安装位置，再从开始菜单启动 |

每次构建同时生成 `SHA256SUMS`。GitHub Actions 的测试附件保留 14 天；公开版本应上传到对应 Release，
不能把短期 CI 附件链接写成长期下载入口。

首次打开会显示 OpenQuantum Desktop 设置向导，可以使用默认的兼容模式和仅本机访问。
进入工作台后选择工作区，再在模型设置中添加服务。未配置模型时仍可使用不依赖模型的内置计算工具。

Python 计算组件按各自的固定依赖首次准备，可能需要网络。Julia、Git 依赖的可选组件，以及
[量子学习通原版界面](integrations/OPENMAIC.md)仍有各自的准备步骤；本安装包不会把这些步骤宣称为已经完成。

## 数据与升级

| 系统 | 默认数据目录 |
| --- | --- |
| macOS | `~/Library/Application Support/OpenQuantum/` |
| Windows | `%APPDATA%\OpenQuantum\` |

目录内 `native/` 保存窗口设置、诊断和首次设置记录，`project/` 保存可写的 OpenQuantum 部署。
`project/.openquantum/` 保存 Harness 会话、配置和计算组件缓存；`project/.agents/skills/` 包含内置和用户添加的 Skill。
测试和迁移可以通过 `OPENQUANTUM_DESKTOP_DATA_DIR` 明确指定另一个目录。

安装版使用独立的数据目录，不会自动搬动源码版的 `.openquantum/dsh` 或原 DSH Desktop 的数据。
覆盖安装、正常卸载不会主动删除上述 OpenQuantum 数据目录。备份时先退出应用，再复制整个目录；
不要只复制安装目录。

应用启动时按上一次分发清单更新程序文件：

- 未修改的内置文件随安装包更新；会话、凭据、缓存和自定义文件保留。
- 用户改过的 Skill 和 MCP 配置保留。若新版同时改变了对应默认文件，新默认内容另存到
  `project/.openquantum/distribution-defaults/`，供明确比较后采用。
- 从设置中删除的内置 Skill 不会在每次启动时被重新创建。
- 对损坏的安装内容、越界路径和改过的程序代码，准备过程先检查并停止，不覆盖已有内容。
  更新中断后再次启动可以继续准备；这不是版本回滚或后台自动安装机制。

当前[版本提醒](UPDATES.md)负责发现新版本并打开发布页；用户下载并覆盖安装新版本。

## 构建与验证

在与目标架构相同的原生系统上运行。构建机器需要锁定的 Node.js 24.14.1、npm、Git、Corepack 和 C++ 工具链。
这些是开发依赖，不是打开已生成安装包的前置条件。

```sh
npm ci
npm run desktop:setup
npm run desktop:package:check
npm run desktop:package
npm run desktop:package:smoke
```

`desktop:package -- --dir` 只生成应用目录，便于排查；正常命令生成 DMG 或 NSIS 安装包。
产物在 `.openquantum/distributions/<platform>-<arch>/artifacts/`，验证报告在同级 `validation/`。
可以把从安装介质复制出来的应用路径传给验证命令：

```sh
npm run desktop:package:smoke -- "/path/to/OpenQuantum Desktop.app"
```

Windows 传入安装后的 `OpenQuantum Desktop.exe`。验证使用独立临时用户目录和仅包含系统命令的初始 PATH，
检查内置 Node / uv、两次真实 Host / renderer 健康启动、自定义配置和 Skill 保留，以及固定本地量子工具。
自动检查使用“已跳过首次设置”的测试状态，**首次向导和安装器交互仍需另做人工 UI 验证**。
测试数据位置会输出到日志，供故障复现；不读取现有用户数据，不调用外部模型或真实硬件。

[Desktop test installers 工作流](../.github/workflows/desktop-installers.yml)在原生 Apple Silicon、Intel Mac、
Windows 运行这些命令，并在 macOS 从 DMG 复制应用、在 Windows 执行静默安装后，检查实际安装的应用。
只有完成 smoke 检查的任务才上传安装文件，失败任务保留诊断证据。
该工作流不创建 Release，也不修改正式更新清单。

## 维护约定

- `scripts/lib/desktop-source.mjs` 固定 Desktop commit 与 Harness family；`desktop/runtime-lock.json`
  固定 Node / uv 版本、官方归档地址及 SHA-256，缓存复用也验证归档校验值。
- `scripts/lib/desktop-branding.mjs` 在独立副本应用品牌适配，包括首次设置和恢复界面。
  安装脚本在副本中明确适配应用 ID 和内置运行环境的 PATH；上游匹配数量变化会令构建失败。
- Desktop 的生产依赖使用固定打包器的遍历能力物化，保留可选原生模块和嵌套依赖。
  OpenQuantum 的五个 Host / Client 包进入应用自身的依赖目录，避免首次 Profile 初始化移走它们。
- OpenQuantum 的 Node 工具依赖按 `package-lock.json` 单独准备并随包携带，保持 Electron 原生模块与
  独立 Node worker 的边界。程序包只收录指定的 Git 跟踪路径，不包含 `.env`、本地 Harness home 或实验输出。
- 打包继承上游的 ASAR / 原生模块 / CLI 和 Electron fuse 检查，并增加 OpenQuantum 实际工作台与工具检查。
  原生依赖缓存以平台、架构、npm 锁文件摘要及 Node ABI 区分。
- 后续签名构建使用 `npm run desktop:package -- --signed`，要求签名成功；macOS 同时要求公证。
  通过系统证书存储和受保护的 CI Secrets 配置凭据。未签名模式关闭自动证书选择，避免误用本机证书。

安装包只是现有 Harness Host Adapter 的分发方式，没有增加独立的 Agent Runtime。
