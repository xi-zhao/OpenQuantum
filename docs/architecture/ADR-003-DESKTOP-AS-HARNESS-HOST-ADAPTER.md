# ADR-003：Desktop 作为 Harness Host Adapter

状态：已接受
日期：2026-08-23
关联工作：OpenQuantum Desktop

## 背景

OpenQuantum 已经通过 DeepSeek Harness 原生 Web UI 提供量子 Agent 工作台。用户还需要 macOS / Windows
桌面入口，包括原生窗口、托盘、终端和通知，但这些能力不应产生第二套 Session、Agent loop、Tool registry
或科研状态。

[DSH Desktop](https://github.com/anywhere-labs/dsh-desktop) 的产品角色是 Host Adapter；其实现可以
由上游 Cordis Plugin 组合，并继续使用 loopback HTTP/WebSocket 承载官方 Web UI。它提供了适合复用的
宿主入口 seam，但不是 OpenQuantum 领域 Host Plugin。

## 决策

OpenQuantum 把 Web 与 Desktop 建模为同一个 Harness 产品组合的两个 Host adapter：

```text
OpenQuantum Harness Home
  ├── cordis.patch.yml        Preset 声明、品牌与设置扩展
  ├── profiles/<profile>/     原生 profile；bundle 层提供静态 Provider catalog 与默认值，
  │                           cordis.patch.yml 保存用户 Route 覆盖（Git 忽略）
  ├── profiles/.agent-presets/presets.cordis.yml  dsh-agent-preset 声明
  ├── .agent-presets/         OpenQuantum Agent 组合
  └── Session / credentials   Harness 权威状态
           ▲
           ├── Web adapter
           └── DSH Desktop adapter
```

具体规则：

1. `runtime/openquantum/cordis.patch.yml` 与共享模型 Route fragment 在启动前物化进 DSH Home，Web 与 Desktop
   Host 使用同一产品组合和用户模型设置；
2. Desktop 只负责桌面进程、窗口、托盘、终端和通知生命周期，不拥有 Session/Agent 生命周期或量子业务规则；
3. Session、Agent Preset、Skill、Tool Provider、MCP Server、Harness MCP Client、Validator、Model Provider 与凭据仍以 Harness/OpenQuantum 现有模块为权威；
4. Web 与 Desktop 共用 `.openquantum/dsh`，本地单用户模式不同时运行两个 Host；
5. Desktop 与 Harness family 成对固定；当前版本与安全覆盖以 `package.json`、lockfile 和 Desktop 集成测试为权威，
   不在 ADR 中维护第二份版本常量；
6. 不依赖 `desktopRuntime`、Electron Window 或其他 DSH Desktop 私有 Interface；
7. 2026-10-12 起，直接使用第三方原版客户端。OpenQuantum 独立交付能力包和正式 Profile 依赖，Desktop 的启用配置放在同一 Profile 的声明式 bundle 中，不复制或修改上游应用。
8. 原生应用名称、图标、向导和更新渠道属于 DSH Desktop；OpenQuantum 设置扩展与内容版本属于 OpenQuantum。具体安装方式见[桌面发行说明](../DESKTOP_INSTALLERS.md)。
9. 通过部署位置记录解析领域代码根目录，不依赖 Finder 的进程工作目录。生成的 MCP 配置使用明确的 Node/uv 路径及 worker 环境。
10. 旧版运行时不得写入新版 V4 Home；有不兼容会话时准备必须在写入前停止。

## 结果

收益：

- 用户获得原生桌面入口，同时保留完全相同的量子能力和执行证据；
- Web 的 Home patch 与 Desktop 的 Profile bundle 共用产品配置源；Desktop 在此基础上保留原生设置与更新方式；
- Desktop 未来可以替换或升级，而不触碰量子 Skill、Tool Provider、MCP Server 或 Validator。

代价与风险：

- 安装会增加 Electron 及其桌面依赖；
- 同一 DSH Home 不能由两个本地 Host 并发写入；
- Desktop 上游可能先于当前发行版切换 Harness family；任何升级都必须作为 Harness/Desktop 成对升级处理，
  不能只替换 Desktop 包版本。

## 验证

`npm run desktop:verify-install` 在不启动图形界面的情况下验证：

- Desktop 与 Harness 的固定版本一致；
- Desktop shell 与 OpenQuantum Profile bundle 出现在同一最终 Cordis 组合，其他原生 Profile 不加载 OpenQuantum 扩展；
- 默认 OpenQuantum preset、Provider route、品牌与设置插件仍然生效；
- 桌面启动器能够解析并报告预期版本。
- 正式 Profile 依赖可恢复，且上游 JavaScript 与原生资源完全不变。

CI 在 macOS 与 Windows 上分别从 `npm ci` 开始运行这项检查；macOS 另外保留真实 Electron 窗口与 loopback
页面冒烟验证记录。Windows 生成的 preset 依赖链接使用 directory junction，避免要求管理员级符号链接权限。
