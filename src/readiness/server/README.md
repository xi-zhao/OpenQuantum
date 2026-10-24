# Runtime Readiness Application Interface

这个目录负责回答一个严格受限的问题：**当前 Harness Host 和已经挂载的 OpenQuantum Agent scope 中，
Model、Skill、Tool Registry 实际观察到了什么？**

唯一对外 Interface 由 `runtime-readiness.mjs` 创建：

```js
const readRuntimeReadiness = createRuntimeReadinessReader({ observer });
const snapshot = await readRuntimeReadiness();
```

Snapshot 是一次瞬时、只读、被动观测，不是第二套 Runtime 状态机。它使用以下状态：

- `observed`：本次 Registry 读取完整；
- `incomplete`：读取成功，但目录不完整或没有观察到预期类型的条目；
- `not_observed`：当前 Host 还没有已经挂载的 OpenQuantum Agent Preset；
- `failed`：读取失败或超过有界超时。

`not_observed` 不是故障，`observed` 也只证明 Registry 事实。它们都不能直接证明 MCP Server 当前连接、模型
Endpoint、量子云或其他下游 External API 可达。

## 模块边界

```text
Harness Client Plugin
  -> POST /openquantum/api/runtime-readiness
     -> Bounded Host Route
        -> readRuntimeReadiness()
           -> Harness Runtime Observer Adapter
              -> existing preset mount + llm / skills / tools Registry
```

- Application Interface 负责状态语义、去重、排序、超时、错误隔离和最小 JSON 投影；
- `runtime/openquantum/web-capabilities/runtime-readiness.mjs` 负责 Cordis scope 与 Harness Registry Adapter；
- Client Plugin 只展示 Snapshot，不推导业务状态；
- Project Settings Interface 继续独立拥有“期望配置”的读取与写入。

“被动”表示不创建或执行 Runtime 资源，不表示完全没有本地读取。`ctx.skills.snapshot()` 可能触发 Skill Provider
进行本地目录发现和 frontmatter 解析；Readiness 只保留 Skill 名称，不返回正文、路径或 Provider locator。

读取路径不会调用 `agentPresets.standingKeyFor()`，因为它会主动挂载 Preset，并可能启动 MCP stdio 进程。
它也不会启动或重启 MCP Server、执行 Tool、发送模型请求、访问真实量子硬件、读取凭据值或自动修复配置。
Host Adapter 直接依赖固定版本的 `@deepseek-ai/dsh-agent-presets`，只使用其公开只读
`livePresetMounts()` helper；显式声明这个本来已由 Harness 带入的依赖，是为了避免依赖未声明的传递包。

相关验证：

```bash
node --test tests/runtime-readiness.test.mjs
node --test tests/harness-web-capabilities.test.mjs
node --test tests/harness-native-quantum.test.mjs
```
