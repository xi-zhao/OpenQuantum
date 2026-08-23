# ADR-003：Desktop 作为 Harness Host Adapter

状态：已接受
日期：2026-08-23
关联工作：OpenQuantum Desktop

## 背景

OpenQuantum 已经通过 DeepSeek Harness 原生 Web UI 提供量子 Agent 工作台。用户还需要 macOS / Windows
桌面入口，包括原生窗口、托盘、终端和通知，但这些能力不应产生第二套 Session、Agent loop、Tool registry
或科研状态。

[DSH Desktop](https://github.com/anywhere-labs/deepseek-harness-desktop) 已把 Electron 实现为 Harness Cordis
插件，并继续使用 loopback HTTP/WebSocket 承载官方 Web UI。它提供了适合复用的 Host seam。

## 决策

OpenQuantum 把 Web 与 Desktop 建模为同一个 Harness 产品组合的两个 Host adapter：

```text
OpenQuantum Harness Home
  ├── cordis.patch.yml        Provider、品牌、设置与默认 preset
  ├── .agent-presets/         OpenQuantum Agent 组合
  └── Session / credentials   Harness 权威状态
           ▲
           ├── Web adapter
           └── DSH Desktop adapter
```

具体规则：

1. `runtime/openquantum/cordis.patch.yml` 在启动前物化为 DSH Home 级 patch，所有 Host 使用同一产品组合；
2. Desktop 只负责窗口、托盘、终端、通知和 Host 生命周期，不拥有量子业务规则；
3. Session、Agent preset、Skill、MCP、Validator、Provider 与凭据仍以 Harness / OpenQuantum 现有模块为权威；
4. Web 与 Desktop 共用 `.openquantum/dsh`，本地单用户模式不同时运行两个 Host；
5. Desktop 与 Harness family 成对固定。当前使用 `dsh-plugin-desktop@2.0.0` 和 Harness `0.1.0-rc.6`；
6. 不依赖 `desktopRuntime`、Electron Window 或其他 DSH Desktop 私有 Interface。
7. Desktop 的传递依赖 `pnpm` 覆盖为 `11.8.0`，避开高危路径穿越公告
   [GHSA-qrv3-253h-g69c](https://github.com/advisories/GHSA-qrv3-253h-g69c)。

## 结果

收益：

- 用户获得原生桌面入口，同时保留完全相同的量子能力和执行证据；
- OpenQuantum 只维护一个 Home patch，Web 与 Desktop 不会发生产品配置漂移；
- Desktop 未来可以替换或升级，而不触碰量子 Skill、MCP 和 Validator。

代价与风险：

- 安装会增加 Electron 及其桌面依赖；
- 同一 DSH Home 不能由两个本地 Host 并发写入；
- DSH Desktop `2.0.2` 已迁移到存在破坏性变化的 Harness `0.1.1-rc.2`，必须作为独立 Harness 升级处理，
  不能只替换 Desktop 版本。

## 验证

`npm run desktop:check` 在不启动图形界面的情况下验证：

- Desktop 与 Harness 的固定版本一致；
- Desktop shell 与 OpenQuantum Home patch 出现在同一最终 Cordis 组合；
- 默认 OpenQuantum preset、Provider route、品牌与设置插件仍然生效。
