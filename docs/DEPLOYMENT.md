# 部署与启动

OpenQuantum 第一阶段以本地工作台和单机 Docker 部署为主。它不是多租户 SaaS，也没有单独的
OpenQuantum Runtime；启动命令运行的是固定版本的 DeepSeek Harness Host，并从同一个 DSH Home 加载
OpenQuantum patch。浏览器和 Desktop 是两个启动表面，不是两套 Agent Runtime。

## 选择一种启动方式

| 场景 | 建议方式 | 需要什么 |
| --- | --- | --- |
| 第一次体验量子能力 | 零密钥本地示例 | Git、Node.js 24、uv / uvx |
| 使用完整 Web 工作台 | 本地开发启动 | Git、Node.js 24、uv / uvx、至少一个模型 Provider |
| 使用原生桌面窗口 | OpenQuantum Desktop 源码启动 | macOS / Windows、Git、Node.js 24、uv / uvx、至少一个模型 Provider |
| Linux 本机隔离试用 | Docker Compose + host network | Linux、Docker、至少一个模型 Provider |

## 方式一：零密钥验证

这一步不调用云模型或真实量子硬件，用来确认 Node、MCP SDK、Solver 和 Validator 可以正常工作。

```bash
git clone https://github.com/xi-zhao/openQuantum.git
cd openQuantum
npm ci
npm run demo:quantum-ground-state
npm run mcp:qiskit:probe
```

成功标准：基态示例输出计算结果和逐项科学检查；Qiskit 探针能够列出预期 MCP Tool。

## 方式二：本地 Web 工作台

```bash
npm run dev
```

打开 <http://127.0.0.1:3000>。首次进入后：

1. 在“设置 → 模型”中配置一个兼容的 Provider URL、模型和 API Key；
2. 保持 OpenQuantum 为默认 Agent preset；
3. 在“设置 → 量子组件”查看 Skill、MCP 和凭据状态；
4. 创建新会话并发送一个不涉及真实硬件的测试请求。

`.env` 也可以提供部署环境中的模型配置，但不是启动前提：macOS 终端使用 `cp .env.example .env`，
Windows PowerShell 使用 `Copy-Item .env.example .env`，再填写需要的值。启动器会读取这个文件，且 shell
中显式设置的环境变量优先。真实值不会写入 Git；设置中心已经保存的密钥不会回显。

## 方式三：原生桌面工作台

当前 OpenQuantum Desktop 只提供源码启动方式，完整安装命令如下：

```bash
git clone https://github.com/xi-zhao/openQuantum.git
cd openQuantum
npm ci --include=dev
npm run desktop:verify-install
npm run desktop
```

`desktop:verify-install` 是无图形界面的安装检查：它验证 Desktop 与 Harness 版本、OpenQuantum 最终组合和
桌面启动器。首次真正启动可能继续准备 Desktop profile 和下载 Electron 运行文件，等待原生窗口出现即可。
模型优先在“设置 → 模型”中配置；只有选择环境文件时，才需要按方式二中的系统对应命令创建 `.env`。

桌面启动器使用社区项目 [DSH Desktop](https://github.com/anywhere-labs/deepseek-harness-desktop) 的 Electron
壳承载同一个 Harness Web UI。OpenQuantum 的 Home patch 仍然组合 Provider route、默认 Agent preset、品牌、
设置、Skill、MCP 与 Validator；Desktop 只增加窗口、托盘、终端和原生通知。

Web 和 Desktop 共用 `.openquantum/dsh`。两种启动方式用于访问同一份本地配置和 Session 状态，不应同时
运行；从 Web 切换到 Desktop 前先停止 `npm run dev`。当前固定 `dsh-plugin-desktop@2.0.0`，它与项目固定的
Harness `0.1.0-rc.6` 完全对齐。上游 Desktop `2.0.2` 使用存在破坏性变化的 Harness `0.1.1-rc.2`，不能在
没有完整平台检查和真实 E2E 的情况下直接替换。

不要全局安装或直接 `npx dsh-plugin-desktop`：那条上游命令使用默认 DSH Home，不会自动组合 OpenQuantum
preset、Skill、MCP 与 Validator。OpenQuantum 品牌 `.dmg` / `.exe` 安装包尚未发布。

无图形界面的 CI 可以运行：

```bash
npm run desktop:verify-install
```

这个检查会在 macOS 和 Windows CI 中从 `npm ci` 开始执行，验证版本锁、最终 Cordis 组合和启动器版本，
不会打开 Electron 窗口。

## 方式四：Docker Compose

这个方式仅支持 Linux 主机上的本机隔离运行。DeepSeek Harness 有意拒绝监听 `0.0.0.0`，避免把具备代码
执行能力的 Host 暴露到网络；Compose 因此使用 host network，同时 Harness 仍只监听 `127.0.0.1`。

```bash
cp .env.example .env
docker compose up --build
```

访问 <http://127.0.0.1:3000>。当前不支持通过 Docker 端口映射对外提供服务，也不支持用 `PORT` 修改这个
入口。macOS 和 Windows 用户请使用前面的桌面客户端或本地 Web 启动方式。

Compose 使用两个命名卷：

- `openquantum-state`：Harness 本地状态与凭据；
- `openquantum-results`：科研结果。

重建容器不会自动删除卷。备份、迁移或删除卷前，应先停止服务并确认其中是否包含仍需保留的会话、凭据和结果。

## 可选：接入消息平台

本地安装可以通过 CC Connect 把 OpenQuantum 接入飞书、钉钉、企业微信、Slack、Telegram、Discord、QQ 和微信等平台。CC Connect 只负责消息收发；Agent、Session、权限、Skill、MCP 和科学 Validator 仍由 DeepSeek Harness / OpenQuantum 负责。

```bash
npm run cc-connect:setup
npm run cc-connect:feishu
npm run cc-connect:start
```

保持消息服务运行，然后在另一个终端打开本地管理后台：

```bash
npm run cc-connect:web
```

第一项消息平台必须在启动前配置；上面的飞书命令使用 CC Connect 官方二维码/凭据流程，微信可改用 `npm run cc-connect:weixin`。服务启动后，可以在管理后台继续管理平台和 Bot 凭据。OpenQuantum 设置中心的“消息渠道”页面可以查看初始化、运行和已配置平台状态。当前集成面向本地部署；Docker Compose 尚未把 CC Connect 作为常驻服务编排。完整边界和故障判断见[消息渠道接入](integrations/CC_CONNECT.md)。

## 可选量子云能力

无凭据、无硬件副作用的 Qiskit Circuits、Qiskit Docs 和本地量子能力可以默认启用。IBM Runtime、IBM
Transpiler、Quantum Hardware MCP 等云端能力保持关闭，直到用户：

1. 在设置中心保存所需凭据；
2. 阅读对应网络、费用和数据外发说明；
3. 主动启用 MCP；
4. 重启 OpenQuantum 使 Agent preset 使用新配置。

不要把 API Key 写进 `agent.cordis.yml`、Skill、MCP 参数、日志或科研 Artifact。

## 启动前检查

```bash
node --version
uvx --version
npm run harness:config
npm run check
```

`npm run check` 是离线质量门槛，不证明云模型或真实量子硬件可用。配置模型后，再运行：

```bash
npm run models:probe -- --provider openquantum-public
npm run e2e:quantum-harness -- --provider openquantum-public
```

在线探针可能访问外部服务。运行前确认 Provider、费用和数据策略。

## 当前部署边界

- 适合本地研发、团队内试用和单机容器部署；
- Desktop 是本地单用户宿主，不是远程访问或多租户隔离层；
- 未提供多租户、组织权限、计费、托管数据库或高可用编排；
- 本地 MCP 和受信任插件以宿主权限运行，启用社区代码前必须审阅来源；
- DeepSeek Harness 仍处于 Developer Preview，升级版本前必须重新运行完整检查和真实 E2E。

遇到问题时按 [故障排查](TROUBLESHOOTING.md) 从运行层向外部 Provider 逐层定位。
