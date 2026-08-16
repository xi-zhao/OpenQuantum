# OpenQuantum Harness 组合层

这个目录把 OpenQuantum 量子内容接到 DeepSeek Harness 原生 seam。它不是第二套 Runtime。

## 入口

| 路径 | 职责 |
| --- | --- |
| `cordis.patch.yml` | Web Host patch：Provider route、OpenQuantum preset、品牌与设置插件 |
| `agent-presets/openquantum/preset.yml` | OpenQuantum Agent preset 元数据 |
| `agent-presets/openquantum/agent.cordis.yml` | Agent scope 内的 Tool、Skill provider、MCP、权限与结果投影组合 |
| `agent-presets/openquantum/credentialed-mcp-client.mjs` | Harness credential reference 到 MCP 子进程环境变量的薄 Adapter |
| `agent-presets/openquantum/scientific-result-*.mjs` | 在 Harness 官方 Tool seam 物化、校验并投影有界科研结果 |
| `web-branding/` | 通过 Harness 原生 Web 扩展点注入 OpenQuantum 品牌 |
| `web-capabilities/` | 通过 Harness Settings seam 展示和修改量子 Skill、MCP 与凭据引用 |

## 不变量

- 不修改 `node_modules` 中的 Harness；
- 不复制 Session、Agent loop、Tool registry、MCP client、凭据库或事件日志；
- `agent.cordis.yml` 是 OpenQuantum Agent 组合的运行权威；
- 设置中心通过 `src/settings/server/` 的受控 Interface 修改配置，不维护第二份状态；
- 修改 MCP composition 后完整重启 Harness，避免旧 generation 占用相同 `serverName`；
- API Key 只以凭据引用出现，不能写入本目录。

`web-branding/identity.mjs` 定义用户可见的品牌名、标语、颜色和资产 URL；
`public/openquantum/mark.svg` 是主标源文件。侧栏、首页、favicon 和 Web App manifest 必须使用同一主标。

验证组合：

```bash
npm run harness:config
npm run check
```

完整目录关系见 [仓库地图](../../docs/REPOSITORY_GUIDE.md)。
