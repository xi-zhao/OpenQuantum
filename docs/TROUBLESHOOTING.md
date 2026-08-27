# 常见问题与故障排查

OpenQuantum 复用 DeepSeek Harness。出现问题时，先判断故障属于 UI、Harness、Skill、Tool Provider、
MCP Server、Harness MCP Client、Validator、Model Provider 还是外部量子服务，不要把所有失败都归因于模型。

## 先运行最小诊断

```bash
node --version
uvx --version
npm run harness:config
npm run demo:quantum-ground-state
npm run check
```

这些命令分别检查运行环境、Harness 组合、本地量子纵切和离线回归。若某一步失败，先处理这一层，再运行
真实模型或云硬件测试。

## 页面无法打开

1. 确认 `npm run dev` 仍在运行；
2. 确认终端没有端口占用或配置解析错误；
3. 默认打开 <http://127.0.0.1:3000>；
4. 更换端口可运行 `npm run harness:dev -- --port 3080 --trusted-host localhost:3080`。

Docker 用户可以检查：

```bash
docker compose ps
docker compose logs openquantum
```

## 页面能打开，但模型不可用

- `.env.example` 中的 `api.example.invalid` 是安全占位地址，不能直接提供模型服务；
- 在设置中心确认 Provider URL、模型名和 API Key；
- 已保存密钥不会回显，这是预期行为；输入新值表示替换；
- 用 `npm run models:probe -- --provider <provider-id>` 区分路由错误、鉴权失败和模型能力问题。

不要把探针输出中的私有 Endpoint、请求头或 Token 粘贴到公开 Issue。

## Skill 看不到

1. 确认路径为 `.agents/skills/<name>/SKILL.md`；
2. 确认 Skill 名称使用小写 kebab-case；
3. 检查 `SKILL.md` frontmatter 和描述；
4. 运行相关 Skill 测试或 Harness `skill.list` 探针；
5. 修改后重启 OpenQuantum。

同目录中的 `mcp/`、`validators/` 或 `scripts/` 不会因为和 Skill 共置而自动连接 MCP Server、注册 Tool 或执行 Validator。

## MCP Server 已声明但 Harness MCP Client 没有启用

- 涉及凭据、网络、费用或真实硬件的 MCP Server 连接默认关闭；
- 先在设置中心配置所需凭据，再主动启用；
- 设置保存后需要重启 Harness；
- 自定义 MCP Server 连接创建后保持关闭，确认命令、参数、来源和许可证后再启用。

如果服务由 `uvx` 启动，首次运行可能需要下载固定依赖；离线环境可以显式禁用对应 MCP，避免把网络下载
问题误判成 Agent 故障。

## MCP Server 启动失败或 MCP-exposed Tool 重复注册

`agent.cordis.yml` 修改后，旧开发进程可能仍持有相同 `serverName`。停止旧 OpenQuantum 进程并完整重启，
不要同时运行两个使用同一 Harness 状态目录的开发实例。

检查静态组合：

```bash
npm run harness:config
npm run mcp:qiskit:probe
```

## IBM、IonQ 或国内量子云不可用

- IBM Runtime / Transpiler 通常需要 `QISKIT_IBM_TOKEN`；
- IonQ 或社区硬件控制需要对应凭据，且默认关闭；
- FieldQKit 当前主要提供只读后端发现，不应被描述为已经提交真实任务；
- 真实硬件可能产生费用、排队和数据外发，只有用户明确启用后才能执行。

设置中心只显示“是否已配置”，不会显示凭据值。

## 任务完成，但没有科学验收通过

这是允许出现的状态。Harness 的 Turn / Tool 完成只表示执行结束；Scientific Validator 只产生 observations，
科学验收必须由 central Acceptance Builder 按版本化 Acceptance Profile 和来源链要求推导。

按顺序检查：

1. MCP-exposed Tool 是否返回了结构化事实；
2. Harness 是否物化了 Result Package；
3. Validator 是否运行；
4. required observation 是否全部通过；
5. Acceptance Builder 是否成功加载版本化 Profile 与完整来源链；
6. 输入是否超出 Skill 声明的科学作用域。

不要通过修改 UI 文案或 Prompt 把未验收结果显示为通过。

## 配置冲突或设置保存失败

设置中心使用 revision 做并发保护，并通过受控 Interface 修改项目配置。如果文件同时被编辑，刷新设置页面，
确认最新状态后重新操作；不要直接复制旧 YAML 覆盖新配置。

提交前始终检查：

```bash
git status --short
git diff
git diff --check
```

## 报告问题时提供什么

可以提供：

- 操作系统、Node 和 uvx 版本；
- 使用本地还是 Docker；
- 失败命令和脱敏后的错误；
- `npm run harness:config` 是否通过；
- 故障属于 Skill、Tool Provider、MCP Server、Harness MCP Client、Model Provider 还是外部后端的初步判断。

不要提供 `.env`、API Key、Harness 凭据文件、私有 Endpoint、未脱敏 Session 或付费任务标识。
