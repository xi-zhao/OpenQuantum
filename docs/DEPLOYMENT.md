# 部署与启动

OpenQuantum 第一阶段以本地工作台和单机 Docker 部署为主。它不是多租户 SaaS，也没有单独的
OpenQuantum Runtime；启动命令运行的是固定版本的 DeepSeek Harness Web Host，并加载 OpenQuantum patch。

## 选择一种启动方式

| 场景 | 建议方式 | 需要什么 |
| --- | --- | --- |
| 第一次体验量子能力 | 零密钥本地示例 | Node.js 24、uv / uvx |
| 使用完整 Web 工作台 | 本地开发启动 | Node.js 24、uv / uvx、至少一个模型 Provider |
| 独立环境或服务器试用 | Docker Compose | Docker、至少一个模型 Provider |

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
cp .env.example .env
npm run dev
```

打开 <http://127.0.0.1:3000>。首次进入后：

1. 在“设置 → 模型”中配置一个兼容的 Provider URL、模型和 API Key；
2. 保持 OpenQuantum 为默认 Agent preset；
3. 在“设置 → 量子组件”查看 Skill、MCP 和凭据状态；
4. 创建新会话并发送一个不涉及真实硬件的测试请求。

`.env` 也可以提供部署环境中的模型配置。真实值不会写入 Git；设置中心已经保存的密钥不会回显。

## 方式三：Docker Compose

```bash
cp .env.example .env
docker compose up --build
```

默认访问 <http://127.0.0.1:3000>。修改端口：

```bash
PORT=3080 docker compose up --build
```

Compose 使用两个命名卷：

- `openquantum-state`：Harness 本地状态与凭据；
- `openquantum-results`：科研结果。

重建容器不会自动删除卷。备份、迁移或删除卷前，应先停止服务并确认其中是否包含仍需保留的会话、凭据和结果。

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
- 未提供多租户、组织权限、计费、托管数据库或高可用编排；
- 本地 MCP 和受信任插件以宿主权限运行，启用社区代码前必须审阅来源；
- DeepSeek Harness 仍处于 Developer Preview，升级版本前必须重新运行完整检查和真实 E2E。

遇到问题时按 [故障排查](TROUBLESHOOTING.md) 从运行层向外部 Provider 逐层定位。
