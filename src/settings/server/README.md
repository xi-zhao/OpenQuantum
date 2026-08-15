# 项目设置 Interface

这个目录是设置中心修改项目级 Skill、MCP 和凭据引用时唯一的服务端写入 seam。浏览器插件只提交用户意图，
具体校验、并发控制和文件写入由这里完成。

## 模块

- `project-settings.mjs`：读取设置投影，并处理 Skill 启用/删除、MCP 启用/注册/删除；使用 revision 防止旧页面
  覆盖新配置，使用受控路径和原子写入保护项目文件。
- `quantum-hardware-mcp.mjs`：集中保存社区 Quantum Hardware MCP 的来源 URL、固定 commit、安装路径和来源标记。

## 配置关系

```text
Harness Settings UI
  -> runtime/openquantum/web-capabilities
     -> project-settings.mjs
        -> .agents/skills/<name>/SKILL.md
        -> runtime/openquantum/agent-presets/openquantum/agent.cordis.yml
```

真实密钥不经过 `project-settings.mjs` 写入项目配置。凭据值由 Harness credential store 保存；项目配置只保存
凭据引用名称。

新增设置行为时，应先扩展这里的 Interface 和测试，再让 UI 调用它。不要在 Client Plugin 中复制 YAML、路径、
命名、凭据或并发规则。

相关测试：

```bash
node --test tests/project-settings.test.mjs
node --test tests/harness-web-capabilities.test.mjs
```

完整权威映射见 [仓库地图](../../../docs/REPOSITORY_GUIDE.md)。
