# 大型科学计算结果的交付

OpenQuantum Harness 的默认 Agent Preset 会把大型科学结果保存为会话工作区中的 JSON，
然后给 Agent 返回结构化摘要和文件引用。用户无需增加配置或选择额外 Tool。

## 用户获得的行为

- 不超过 8,192 字符的小结果保持原样。
- 大结果保留小型数值字段、期望、Jacobian、范数、单位、位序和科学状态；大型数组以
  `omitted: true`、`jsonPointer`、长度和形状描述。形状中的 `null` 表示不规则维度。
  摘要主体上限为 6,144 字符，字段过多时明确省略并指向完整文件。
- `fullResult.path` 是相对于当前 Session 工作区的 `results/openquantum/tool-results/.../result.json`，
  引用同时给出字节数和 SHA-256。文件保留完整的输入、来源、依赖锁摘要、结果与局限，JSON 数值不裁剪或重新归一化。
- Agent 复用 Harness 的 `read` 或 shell Tool 按需查看、绘图或后续分析。
  `jsonPointer` 指向完整 JSON 中的字段，例如 `/result/amplitudes`。省略不等于零值或计算缺失。
- 同一 Session 重开后使用已有引用，不需要重新计算。完整数据随工作区文件保留，删除文件会使该引用失效。
- 只读 Session、取消、磁盘错误、文件冲突或读回校验失败时，保留完整 Tool 输出，并明确说明未交付文件。

## 实现边界

此行为属于 OpenQuantum Harness 的结果展示与文件交付。MCP 的原始 `content`、`structuredContent`
和科学输出 schema 保持不变；直接连接 MCP Server 的 Codex 等其他客户端仍收到完整结果。
本次没有改变算法、依赖版本、求解资源上限或科学验收规则。

`science-result-delivery.mjs` 是 agent-scoped Host Plugin，使用已有的 `tools/post-execute`、
Session 身份、沙箱策略与 `ctx.fs`。Skill 无法保证模型读到结果前已保存完整数据；MCP Server
也不拥有 Session 工作区，因此保存由 Host hook 完成。摘要投影不修改执行期 canonical value。

仅处理 capability policy 中 `source: package`、已声明允许写入的 MCP Tool，且结果必须符合共享
科学 envelope、输入摘要与完整文本一致。第三方、自定义或只读 Tool 不因返回相似字段而获得写入能力。
文件路径由 Session ID、实际 Tool call ID 和事件序号推导；禁止覆盖不同内容，必须原子写入并读回一致后才替换长文本。
持久化沿用 Harness 的有效 Session 沙箱，不提供新的网络、凭据、安装、Tool 或 Runtime。

Harness 的通用上下文裁剪机制继续负责其他长输出。这里的领域摘要与科学状态解释留在 OpenQuantum；
通用“文件引用代替长输出”若由上游提供，可用相同合同替换此薄适配。它不是 L3 Result Package 或
Acceptance Report，`scientificValidation=not_evaluated` 不因保存成功而改变。

## 本地验证（2026-10-11）

基线：`16b621e674c58e206f54f4180ad304dd82bee06f`，Harness `0.1.5-rc.1`，macOS arm64，Node.js `24.19.0`。
本轮下列定向测试共 33 项通过、零跳过；相关文件 ESLint、能力声明一致性检查与 Harness 配置展开通过。

```sh
node --test tests/science-result-delivery.test.mjs tests/harness-science-result-delivery.test.mjs
node --test tests/sdk-differentiable-contracts.test.mjs
node --test tests/scientific-result-materialization.test.mjs tests/quantum-information-materialization.test.mjs tests/scientific-tool-effects.test.mjs
```

定向检查覆盖：完整数据逐值读回、SHA-256、关键指标保留、小结果兼容、真实只读沙箱、取消、磁盘错误、
冲突与越界、Session/call 隔离，以及真实 MCP Client → Harness Agent → 模型上下文 → 原生 `read`
→ Host 进程重启 → 同会话再次读取。模型和数值工作进程使用本地协议夹具，没有调用外部模型或真实 SDK/QPU。

12 量子位解析 RY-GHZ 夹具含 4,096 个复振幅：原始紧凑 JSON 为 34,180 字符，摘要主体为 1,534 字符
（不含文件引用和读取说明）。这只是该夹具的输出体积对比，不是性能基准或科学验收。
