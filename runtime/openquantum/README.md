# OpenQuantum Harness 组合层

这个目录把 OpenQuantum 量子内容接到 DeepSeek Harness 原生 seam。它不是第二套 Runtime。

## 入口

| 路径 | 职责 |
| --- | --- |
| `cordis.patch.yml` | Harness Home patch：为 Web、Desktop 等 Host 统一组合 Provider route、OpenQuantum preset、品牌与设置插件 |
| `agent-presets/openquantum/preset.yml` | OpenQuantum Agent preset 元数据 |
| `agent-presets/openquantum/agent.cordis.yml` | Agent scope 内的 Tool、Skill provider、MCP、权限与结果投影组合 |
| `agent-presets/openquantum/credentialed-mcp-client.mjs` | Harness credential reference 到 MCP 子进程环境变量的薄 Adapter |
| `agent-presets/openquantum/scientific-result-materializer.mjs` | QGS/QI 共用的 workspace 物化、真实字节重读、中央 Acceptance 与 Result Commit Module |
| `agent-presets/openquantum/scientific-result-adapters.mjs` | Tool 到领域投影、Materializer 和 Artifact 合同的双 L3 Adapter Registry |
| `agent-presets/openquantum/scientific-result-protocol.mjs` | 有界、可回放的 `tool/result` 科研投影协议 |
| `../../packages/openquantum-web-branding/` | 可独立安装的 Harness Web 品牌插件 |
| `web-capabilities/` | 通过 Harness Settings seam 展示和修改量子 Skill、MCP 与凭据引用 |

## 不变量

- 不修改 `node_modules` 中的 Harness；
- 不复制 Session、Agent loop、Tool registry、MCP client、凭据库或事件日志；
- Web 与 Desktop 从同一个 DSH Home 加载这份 patch，不维护两套产品组合；
- `agent.cordis.yml` 是 OpenQuantum Agent 组合的运行权威；
- 设置中心通过 `src/settings/server/` 的受控 Interface 修改配置，不维护第二份状态；
- 修改 MCP composition 后完整重启 Harness，避免旧 generation 占用相同 `serverName`；
- API Key 只以凭据引用出现，不能写入本目录。

`scientific-result-*.mjs` 不是通用 Capability Runtime。它只在 Harness 官方 `tools/post-execute` seam 对已登记的
QGS 与 QI Adapter 执行 Result Package -> Acceptance -> Result Commit 物化；新增能力必须显式实现并测试 Adapter，
不会因存在 `SKILL.md` 或 `capability.yaml` 就被自动执行。

`packages/openquantum-web-branding/identity.mjs` 定义用户可见的品牌名、标语、颜色和资产 URL；
`packages/openquantum-web-branding/assets/mark.svg` 是主标源文件。侧栏、首页、favicon 和 Web App manifest 必须使用同一主标。

验证组合：

```bash
npm run harness:config
npm run check
```

完整目录关系见 [仓库地图](../../docs/REPOSITORY_GUIDE.md)，模块演进契约见
[模块地图](../../docs/architecture/MODULES.md)。
