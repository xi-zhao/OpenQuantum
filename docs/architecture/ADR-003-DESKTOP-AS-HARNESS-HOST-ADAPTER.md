# ADR-003：Desktop 作为 Harness Host Adapter

状态：已接受
日期：2026-08-23
关联工作：OpenQuantum Desktop

## 背景

OpenQuantum 已经通过 DeepSeek Harness 原生 Web UI 提供量子 Agent 工作台。用户还需要 macOS / Windows
桌面入口，包括原生窗口、托盘、终端和通知，但这些能力不应产生第二套 Session、Agent loop、Tool registry
或科研状态。

[DSH Desktop](https://github.com/anywhere-labs/deepseek-harness-desktop) 的产品角色是 Host Adapter；其实现可以
由上游 Cordis Plugin 组合，并继续使用 loopback HTTP/WebSocket 承载官方 Web UI。它提供了适合复用的
宿主入口 seam，但不是 OpenQuantum 领域 Host Plugin。

## 决策

OpenQuantum 把 Web 与 Desktop 建模为同一个 Harness 产品组合的两个 Host adapter：

```text
OpenQuantum Harness Home
  ├── cordis.patch.yml        默认模型/preset、品牌与设置扩展
  ├── profiles/model-routes.cordis.yml  静态 Provider catalog
  ├── settings.yaml           用户 Route 覆盖（Git 忽略）
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
7. OpenQuantum 当前只支持仓库内源码启动。上游的全局安装和 `npx` 入口使用默认 DSH Home，不能作为
   OpenQuantum Agent Preset、Skill、Tool Provider 与 Validator 组合的安装入口。

## 结果

收益：

- 用户获得原生桌面入口，同时保留完全相同的量子能力和执行证据；
- OpenQuantum 只维护一个 Home patch，Web 与 Desktop 不会发生产品配置漂移；
- Desktop 未来可以替换或升级，而不触碰量子 Skill、Tool Provider、MCP Server 或 Validator。

代价与风险：

- 安装会增加 Electron 及其桌面依赖；
- 同一 DSH Home 不能由两个本地 Host 并发写入；
- Desktop 上游可能先于当前发行版切换 Harness family；任何升级都必须作为 Harness/Desktop 成对升级处理，
  不能只替换 Desktop 包版本。

## 验证

`npm run desktop:verify-install` 在不启动图形界面的情况下验证：

- Desktop 与 Harness 的固定版本一致；
- Desktop shell 与 OpenQuantum Home patch 出现在同一最终 Cordis 组合；
- 默认 OpenQuantum preset、Provider route、品牌与设置插件仍然生效；
- 桌面启动器能够解析并报告预期版本。

CI 在 macOS 与 Windows 上分别从 `npm ci` 开始运行这项检查；macOS 另外保留真实 Electron 窗口与 loopback
页面冒烟验证记录。Windows 生成的 preset 依赖链接使用 directory junction，避免要求管理员级符号链接权限。
