# ADR-001：知情审批默认拒绝

状态：已由 Harness 原生审批机制取代
日期：2026-08-14
关联工作：P1-06、HAR-006A

## 背景

Harness 会在 Tool 执行前产生审批请求。UI 如果只展示 Tool 名称或一段模型生成的理由，用户无法确认自己批准的具体操作；UI 如果直接接收原始 Tool 参数和 Harness wire ID，又会扩大敏感信息暴露面，并把 Harness 内部协议泄漏成前端合同。

审批既是安全边界，也是通用 Runtime 机制。它不属于量子科研 Skill，也不需要新增第五层。

## 决策

审批状态、关联与执行门禁全部复用 DeepSeek Harness 原生实现。OpenQuantum 不再维护独立
`ApprovalDisclosure`、交互映射或浏览器 Session adapter；原生 Web UI 只展示 Harness 已提供的审批事实并提交用户意图。

只有同时满足以下条件时，`allow once` 才可用：

1. Session history 中存在尚未解决的 `approval/asked`；
2. 能将它精确关联到同一 Step 内唯一的 Tool call；
3. 审批请求、Tool call 和安全展示由同一个关联结果共同生成；
4. presenter 只包含允许披露的字段，并完整说明用户将批准的操作；
5. UI 提交的 opaque interaction ID 和 disclosure version 与当前待审批记录完全一致。

任一条件缺失、歧义、过期或解析失败时，交互必须降级为 `deny-only`。不得通过文本相似度、Tool 名猜测、数组位置或 UI 本地状态补全关联。

安全展示可以包含经过明确 allowlist 和脱敏后的 Tool 名、操作摘要、影响类别和目标摘要；不得包含原始 Tool arguments、Harness raw request/call ID、凭证、环境变量值或未审计的自由文本字段。Harness 内部保留 raw ID 与参数，仅向 UI 暴露 opaque ID、版本和安全展示。

`allow once` 只授权当前版本所绑定的这一次 Tool call，不建立后续权限。Harness 在执行前再次校验 pending 状态、opaque ID、version 和关联指纹；任何变化都拒绝执行，以阻止检查与使用之间的状态替换（TOCTOU）。拒绝操作也必须关联当前版本，但在信息不足时仍保持可用。

## 边界

- Skill 可以声明某类领域操作需要审批及其风险类别，但不能自行放行；审批状态机、关联、执行门禁和审计属于 Harness。
- UI 负责展示和收集选择，不拥有授权规则，不接触 raw arguments/IDs，也不能把普通问题回答转换成审批。
- Model 不能生成或覆盖授权事实；其说明最多作为未经信任的输入，经 allowlist presenter 处理后才能展示。
- OpenQuantum Client Plugin 不改写审批协议，也不保存第二份审批状态。
- 本决策不定义组织级长期授权、角色权限或科研结果是否可信；这些需要独立证据和决策。

## 退出测试

以下测试全部通过后，P1 的知情审批路径才算完成：

1. 精确的 `approval/asked`、同 Step 唯一 Tool call 和安全 presenter 可产生 `allow-once-or-deny`；批准后只执行该调用一次。
2. 缺历史、跨 Step、零个或多个候选 Tool call、字段解析失败及 presenter 不完整时均为 `deny-only`。
3. 原始 Tool arguments、raw request/call ID 和凭证不会出现在 snapshot、event、DOM、日志或错误消息中。
4. disclosure version 或关联指纹过期时，批准请求被拒绝，且 Tool 不执行。
5. 重复响应、断线重放和旧审批结果不能解决或删除新的待审批请求。
6. history 重基线和进程重启后，同一事实生成相同的审批模式；无法恢复完整证据时降级为 `deny-only`。
7. Harness 原生浏览器 E2E 证明 UI 不能伪造 `allow once` 所需信息。

## 后果

用户只有在系统能说明并锁定具体操作时才能批准，协议错误会安全地退化为拒绝。代价是某些当前 Harness 事件证据不足的操作暂时无法在 UI 放行；应补齐可验证的 history 事实或安全 presenter，而不是放宽关联规则。
