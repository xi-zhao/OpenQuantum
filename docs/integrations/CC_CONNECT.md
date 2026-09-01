# 通过 CC Connect 使用 OpenQuantum

[CC Connect](https://github.com/chenhg5/cc-connect) 可以把本地 Agent 接入飞书、钉钉、企业微信、Slack、Telegram、Discord、QQ、微信等消息平台。OpenQuantum 使用它已经支持的 [Agent Client Protocol（ACP）](https://agentclientprotocol.com/) 接口，不修改 CC Connect，也不新增一套 Agent Runtime。

```text
消息平台
  → CC Connect（消息收发、平台 Bot 配置）
  → ACP stdio
  → DeepSeek Harness（Session、Agent、权限、工具与执行记录）
  → OpenQuantum Skill + Tool Provider + optional Validator
```

这条边界意味着：从消息平台发来的请求与 Web 工作台使用同一套量子能力配置。设置中心启用或关闭的是
Harness MCP Client 连接；它仍由 Agent Preset 管理。CC Connect 不直接加载 Skill，也不直接调用 MCP-exposed Tool。
Web、Desktop 和 ACP 还共用 `model-routes.cordis.yml` 的静态 Provider catalog，以及同一个 DSH Home 中
Git 忽略的 `settings.yaml` 用户覆盖。因此在“设置 → 模型”保存的 Endpoint 等 Route 配置会进入消息入口；
真实 API Key 仍只来自环境变量或 Harness credential store，不进入这些文件或 Git。

## 第一次使用

先完成 OpenQuantum 的普通安装和模型配置，然后运行：

```bash
npm run cc-connect:setup
```

这个命令只在被 Git 忽略的 `.openquantum/cc-connect/config.toml` 创建本地配置。它会：

- 注册一个名为 `openquantum` 的 ACP Agent；
- 指向 DeepSeek Harness 官方 `dsh-acp-demo` 入口；
- 使用 OpenQuantum 的项目根、Skill 目录、Agent Preset 中的 Harness MCP Client 配置、共享静态模型 Route
  和同一 DSH Home 的用户设置；
- 生成只属于本机的 CC Connect 管理凭据；
- 已有配置存在时保持原样，不覆盖平台或密钥。

CC Connect 稳定版要求启动前至少存在一个消息平台。飞书可以直接使用上游的二维码/凭据流程：

```bash
npm run cc-connect:feishu
```

个人微信和腾讯元宝也有对应快捷入口：

```bash
npm run cc-connect:weixin
npm run cc-connect:yuanbao
```

Slack、Telegram、钉钉、企业微信、Discord 等平台按 [CC Connect 安装与配置说明](https://github.com/chenhg5/cc-connect/blob/main/INSTALL.md)把第一项 `[[projects.platforms]]` 写入本地配置。OpenQuantum 不用假平台或空 Token 绕过上游校验。

完成第一项平台配置后启动消息服务：

```bash
npm run cc-connect:start
```

保持这个终端运行，在另一个终端打开管理后台：

```bash
npm run cc-connect:web
```

CC Connect 会打开带本地登录凭据的管理页面。此后可以继续添加或修改消息平台，保存后即可向对应机器人发送消息。

## 设置中心显示什么

OpenQuantum 的“设置 → 消息渠道”只展示这条连接的产品状态：

- 依赖是否已经安装；
- 本地配置是否已经初始化、是否还缺少第一项平台；
- CC Connect 管理服务是否正在运行；
- 已经配置了哪些消息平台类型；
- 固定的启动命令和上游源码入口。

页面不会回显管理 Token、Bot Secret 或平台 API Key。具体平台配置仍由 CC Connect 自己的管理后台负责，避免 OpenQuantum 再造一份配置数据库。

## 能力与限制

- `cc-connect` 固定为 `1.5.0`，DeepSeek Harness ACP 入口固定为 `0.1.0-rc.6`；开发期使用固定的 ACP TypeScript SDK `1.4.0` 复核真实 stdio 握手，任一方升级时都要重跑该测试。
- ACP 入口创建独立 Harness Session，执行事实写入 `.openquantum/cc-connect/sessions`，不与 Web Host 的 JSONL writer 混用。
- CC Connect 可以转发文本、权限选择和已提交的 Agent 回复；更完整的工具轨迹仍以 Harness Session 记录为准。
- 真实量子硬件、付费云任务和需要凭据的 MCP Server 连接继续遵循设置中心的默认关闭与显式启用规则。
- 当前提供本地进程启动方式，没有把 CC Connect 加入 Docker Compose 或系统守护进程；长期运行可继续使用 CC Connect 自带的 `daemon` 命令，但应由部署者独立管理。

## 排查顺序

1. `npm run cc-connect:status` 检查本地配置、管理服务和消息平台状态；
2. 在设置中心确认消息渠道状态；
3. 确认 `npm run cc-connect:start` 的终端没有退出；
4. 运行 `npm run harness:config` 检查共享 MCP preset；
5. 若消息能到达但 Agent 失败，再检查模型 Provider、Skill、MCP Server/Harness MCP Client 或权限，而不是修改 CC Connect。

CC Connect 本身使用 MIT License；DeepSeek Harness、ACP SDK 和量子组件继续使用各自的上游许可证，详见 [THIRD_PARTY_NOTICES.md](../../THIRD_PARTY_NOTICES.md)。
