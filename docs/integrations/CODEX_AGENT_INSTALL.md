# 由 AI Agent 安装 OpenQuantum Codex 插件

这份指南供用户交给 Codex Agent 执行。目标是在用户当前使用的 Codex 中安装同一个 OpenQuantum
插件，同时加载 Skills、本机 MCP 服务及科学 Tools、左侧全局“OpenQuantum 设置”入口。
聊天、项目、线程、登录和模型继续使用 Codex；本次安装不启动 Desktop 或量子学习通。

正式插件版本为 **0.8.9**。Skill 与科学 Tool 数量按所安装包的 `release.json` 核对。
macOS 本机安装已验证；其他操作系统、Codex 版本与全新机器仍需逐项验证。

## 1. 取得本次安装材料

从 [Codex 插件 0.8.9 Release](https://github.com/xi-zhao/OpenQuantum/releases/tag/codex-v0.8.9)
下载 `openquantum-0.8.9-codex-install.zip` 和 `SHA256SUMS`。完整安装包已包含插件 ZIP、
安装脚本与依赖锁文件，解压后无需克隆仓库或构建插件。

先比较完整安装包的 SHA-256 与同一 Release 的 `SHA256SUMS`，一致后再解压。
macOS/Linux 可用 `shasum -a 256 <文件>`，PowerShell 可用 `Get-FileHash <文件> -Algorithm SHA256`。
使用带 `codex-v` 前缀的版本标签定位插件发行及其安装附件。

解压目录应包含 `package.json`、`package-lock.json`、`scripts/install-codex-plugin.mjs`，以及
`dist/codex-plugin/openquantum-0.8.9-codex-plugin.zip`。单独的 `codex-plugin.zip` 面向已有
安装器的使用者；首次安装优先下载 `codex-install.zip`。

需要从源码构建时，在独立目录检出 `codex-v0.8.9` 标签，不要切换或重置用户正在开发的工作区。
构建要求 Git checkout；没有 `.git` 的源码压缩包应搭配预构建插件 ZIP。

不要用“复制 Skill 文件”或“仅添加一个 MCP 地址”代替完整插件安装，那样不能交付全部三个入口。

## 2. 检查运行环境

在实际用于安装的终端环境中确认：

```sh
node --version
npm --version
```

需要 **Node.js 24+** 和可用的 npm。优先使用已有合适的 Node，并保持配套的 npm 与 PATH；
缺少依赖时，在用户授权及宿主权限允许的范围内补齐，不为此替换用户其他项目的全局环境。
安装通常需要访问 npm 包源；`--offline` 只适用于本机已有全部依赖缓存的情况。

定位用户当前 Codex 应用配套的 CLI。优先检查 `PATH` 中的 `codex`；确认它与目标应用一致。
在本次验证的 macOS 应用中，配套 CLI 位于：

```text
/Applications/ChatGPT.app/Contents/Resources/codex-cli/bin/codex
```

其他机器以实际发现的路径为准。以下命令使用 POSIX shell；Agent 应按实际终端调整变量语法。
先把 `oq_codex_cli` 设置为已确认的可执行文件绝对路径，替换示例中的占位值：

```sh
oq_codex_cli='/实际路径/codex'
"$oq_codex_cli" --version
"$oq_codex_cli" plugin add --help
"$oq_codex_cli" plugin list --json
```

若没有 `plugin add`，说明当前 CLI 不具备所需安装能力，应先确认应用及版本。CLI 能安装插件也不代表
应用一定支持全局设置页，界面仍需在第 4 步检查。本机已验证的 CLI 为 `0.162.0-alpha.17.2`。
安装到当前用户正在使用的 Codex 配置目录；不要另设临时 `HOME` 或 `CODEX_HOME` 后声称用户已安装。
已有的自定义 `CODEX_HOME` 保持原样。不要把完整用户配置、Token 或凭据输出到聊天和日志。

## 3. 执行安装

推荐在完整安装包解压目录中执行：

```sh
npm ci --ignore-scripts
OPENQUANTUM_CODEX_CLI="$oq_codex_cli" npm run plugin:install
```

这会使用包内固定版本的插件 ZIP。安装器本身只安装必要的 Node 依赖，随后准备插件的运行依赖。
不要在插件 ZIP 的 `openquantum/` 目录中执行这组命令。

已有同版本源码 checkout 时，也可安装 Release 的独立插件 ZIP：

```sh
npm ci
oq_plugin_zip='/实际路径/openquantum-0.8.9-codex-plugin.zip'
OPENQUANTUM_CODEX_CLI="$oq_codex_cli" npm run plugin:install -- "$oq_plugin_zip"
```

只有开发者需要从 Git checkout 构建：

```sh
npm run plugin:build
OPENQUANTUM_CODEX_CLI="$oq_codex_cli" npm run plugin:install
```

安装器会核对包内版本，安装插件的 Node 运行依赖，检查 MCP 服务、科学工具和设置资源，再调用原生
`codex plugin add` 注册插件。默认身份为 `openquantum@personal`；保留已有的其他插件来源和用户设置。
服务文件存入 `~/.local/share/openquantum/desktop/<版本>-<摘要>/runtime`，目录中的 `desktop`
沿用旧命名，不表示安装了 DeepSeek Desktop。

记录安装器最终输出中的 `version`、`pluginDirectory`、`runtimeDirectory`、`archiveSha256` 和 `probe`。
不要把整段混有 npm 输出的日志直接当作一个 JSON 对象解析。退出码非零时先处理具体错误，不进入成功汇报。

## 4. 验收用户实际得到的内容

安装结束后，用同一个 CLI 读回：

```sh
"$oq_codex_cli" plugin list --json
```

在返回的 `installed` 列表中找到 OpenQuantum，核对 `installed=true`、`enabled=true` 和目标版本。
检查安装器 `probe` 中的 Skill 与科学 Tool 数量是否和该包的 `release.json` 一致；同时应有
`settingsResource=true`、`referenceExecution=true`、`disabledToolRejected=true`。
这些探测使用隔离设置，不需要改动用户已有的能力开关。

然后完成宿主检查：

1. 按 Codex 提示重载插件或重新打开应用；若需要用户操作，说明具体动作，不擅自中断正在运行的聊天。
2. 新开聊天，确认能发现 OpenQuantum Skills 和工具；可执行一次已启用的只读资料查询，例如
   `quantum_practices`。已有用户禁用的能力保持禁用，不为验收擅自开启。
3. 从左侧“…”→“OpenQuantum 设置”进入，确认品牌介绍、Skills / MCP 连接 / Tools 三个标签和刷新操作。
   这是全局应用入口；聊天旁的预览或设置标签页不能代替这项检查。

如果当前 Agent 无法查看全局入口，记录“安装与协议检查通过，全局界面待用户确认”，并告诉用户打开路径。
协议结果中的 `hostPlacementVerified=false` 是界面尚未验收的标记，不等同于插件安装失败。

## 5. 按具体失败处理

| 现象 | 下一步 |
| --- | --- |
| 下载不到完整安装包或摘要不符 | 核对上面的插件 Release 与下载结果；停止执行不完整或摘要不符的材料 |
| Node 版本过低或找不到 npm | 选择已有的合适环境，或在授权范围内准备 Node.js 24+，随后重新检查实际版本 |
| npm 下载失败 | 根据错误检查网络、代理和包源；没有完整缓存时不要使用 `--offline`，不关闭证书验证 |
| 现有 OpenQuantum 来源不属于本安装器 | 报告来源冲突，保留原配置；不要删掉旧插件或整个 marketplace 文件来强行继续 |
| MCP 探测失败 | 检查输出中的启动命令、Node、依赖及版本错误；不要跳过探测后手工注册一个未通过检查的包 |
| 安装列表正常但没有全局入口 | 先核对 Codex 应用版本、是否已重载及打开位置；记录界面未验证，不反复安装同一个包 |
| 某个计算工具提示缺少 Python/SDK | 按该能力的准备说明处理；插件安装不会一次装齐全部科学计算环境 |

插件本身不申请 GitHub Star 授权，也不要求远程 MCP Token 或量子云账号。后续连接第三方服务时，用户在设置页的
专用凭据窗口中配置，凭据不经聊天传递。宿主未打开窗口时，复制设置页卡片中的本机地址到浏览器；
该地址短时有效，也不要发到聊天中。GitHub Star 按钮只是仓库链接，由用户在 GitHub 自己操作。

## 6. 向用户交付安装结果

简短报告插件版本、安装是否启用、Skills/科学 Tools 数量、全局设置页是否实际检查，以及剩余操作。
区分“安装成功”“界面已确认”和“某个科学计算环境已准备”；不要把安装成功说成所有计算工具均已实跑。

## 可以直接交给 Codex 的话

> 请帮我安装 OpenQuantum Codex 插件 0.8.9。先阅读
> https://github.com/xi-zhao/OpenQuantum/blob/codex-v0.8.9/docs/integrations/CODEX_AGENT_INSTALL.md，
> 从 https://github.com/xi-zhao/OpenQuantum/releases/tag/codex-v0.8.9 下载完整安装包与 SHA256SUMS，
> 核对摘要后，检查 Codex、Node.js 24+ 与 npm，使用包内安装器完成安装。
> 请保留已有插件和用户配置，核对 Skills、MCP 工具和左侧全局“OpenQuantum 设置”入口。
> 需要我重载应用时，告诉我具体操作。最后说明已验证的结果和仍需准备的计算环境。
