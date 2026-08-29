# 项目设置 Interface

这个目录是设置中心修改项目级 Skill、MCP Server 连接和凭据引用时唯一的服务端写入 seam。浏览器插件只提交用户意图，
具体校验、并发控制和文件写入由这里完成。

设置页的“运行状态”不属于这个写模型。它由 `src/readiness/server/` 的独立只读 Interface 从当前 Harness
Registry 生成，避免把“配置已启用”误写成“当前运行就绪”。

## 模块

- `project-settings.mjs`：通过 `executeProjectSettingsCommand` 处理 Skill 加载策略/删除、MCP Server 连接启用/注册/删除；统一
  强制 setup 与凭据门控，使用 revision 防止旧页面覆盖新配置，并用受控路径和原子写入保护项目文件。
- `project-settings-catalog.mjs`：集中保存 MCP Server 连接与凭据的展示元数据、固定版本和 setup 描述；只提供只读查询，
  不读取或写入项目设置。
- `quantum-hardware-mcp.mjs`：集中保存社区 Quantum Hardware MCP Server 的来源 URL、固定 commit、安装路径和来源标记。
- `qpanda-runtime-mcp.mjs`、`qpanda-skill.mjs`：集中保存受控上游来源和固定 revision，供设置投影与安装脚本复用。

## 配置关系

```text
Harness Settings UI
  -> runtime/openquantum/web-capabilities
     -> project-settings.mjs::executeProjectSettingsCommand
        -> project-settings-catalog.mjs      只读产品元数据
        -> .agents/skills/<name>/SKILL.md
        -> runtime/openquantum/agent-presets/openquantum/agent.cordis.yml
```

真实密钥不经过 `project-settings.mjs` 写入项目配置。凭据值由 Harness credential store 保存；项目配置只保存
凭据引用名称。

新增设置行为时，应先扩展这里的命令 Interface 和测试，再让 HTTP route/UI 调用它。不要在 Client Plugin 或
route 中复制 YAML、路径、命名、setup、凭据或并发规则。

新增一个已审查的 MCP Server 连接时，产品名称、来源、固定版本和凭据说明进入 catalog；启停、revision、路径安全和
原子写入仍留在 Settings Interface。不要让静态目录反向写配置。

相关测试：

```bash
node --test tests/project-settings.test.mjs
node --test tests/harness-web-capabilities.test.mjs
```

完整权威映射见 [仓库地图](../../../docs/REPOSITORY_GUIDE.md)，模块依赖规则见
[模块地图](../../../docs/architecture/MODULES.md)。
