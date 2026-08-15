# OpenQuantum Domain Language

OpenQuantum 是 DeepSeek Harness 的开源量子科研发行版。本文件约定产品与科研领域语言，避免把
Harness 已有 Runtime 对象重新命名或复制。

## Platform

**OpenQuantum Distribution（OpenQuantum 发行版）**：
DeepSeek Harness、量子 preset、量子 Skill、科学 MCP、Validator 和必要科研 UI 的可运行组合。
_Avoid_: 新 Agent Runtime、插件市场、Capability 操作系统

**Harness Runtime（Harness 运行时）**：
Session、Agent loop、Turn、Step、Goal、Job、Tool、Skill、MCP、Plugin、审批、权限、沙箱、模型路由、
事件和持久化的权威实现。OpenQuantum 不复制这些对象。
_Avoid_: OpenQuantum Runtime、第二套会话系统

**Harness Native UI Extension（Harness 原生 UI 扩展）**：
通过 Harness Client Plugin、Slot、Settings 和 Web Host 扩展点增加 OpenQuantum 品牌与科研展示；
不复制 Session 投影、事件重连、模型调用或 Tool 生命周期。
_Avoid_: 平行 Web UI、第二套浏览器状态机

## Research execution

**Research Session（科研会话）**：
直接使用 Harness `Session` 表示的持续科研上下文。事件日志是执行事实的唯一来源。
_Avoid_: Chat 数据副本、ResearchRun

**Research Goal（科研目标）**：
直接使用 Harness `Goal` 表示的、有明确完成条件的长期目标。
_Avoid_: Prompt、消息、平台自定义任务状态机

**Experiment（实验）**：
在固定输入、方法、参数和环境下，由 Harness Session / Turn / Tool 调用完成的一次可重复尝试。
它是对原生执行事实的科研解释，不是新的 Runtime 实体。
_Avoid_: 随手运行、模型回答

**Artifact（科研产物）**：
Skill 或 MCP 产生的可引用结构化结果，例如数据、图表、参数、代码或报告。
_Avoid_: 最终聊天文本、无法追溯的附件

**Provenance（来源链）**：
把科研产物追溯到输入、方法、参数、依赖、模型、工具和 Harness 事件的记录。
_Avoid_: 模型解释、日志摘要

## Native extensions

**Native Skill（原生 Skill）**：
Harness 能直接发现和加载的 `SKILL.md` 及同目录科研资源。它描述问题范围、工作方法、工具使用、
产物约定和验证流程，但 Prompt 本身不能强制安全或科学规则。
_Avoid_: OpenQuantum 私有插件包、页面模式

**Scientific MCP（科学 MCP）**：
通过 Harness 原生 MCP client 接入的确定性或外部科学工具，使用 stdio 或 Streamable HTTP 协议。
它负责实际计算、数据查询或后端连接，不负责 Session 生命周期。
_Avoid_: Agent Model、UI 直连脚本

**Trusted dsh-plugin（可信 dsh-plugin）**：
只有原生 Skill/MCP/配置无法表达时才使用的 Harness 宿主扩展。插件拥有宿主代码权限，因此必须在
Fork 中显式审查和测试，不能把未经信任的远程代码自动装入 Runtime。
_Avoid_: 默认扩展方式、任意第三方脚本

**Quantum Preset（量子 preset）**：
通过 Harness 原生配置组合 Agent、模型 route、Skill、MCP 和权限策略的发行版入口。
_Avoid_: UI 硬编码模式、另一个编排层

**Scientific Validator（科学 Validator）**：
与对应 Skill 一起维护、从结构化产物推导科学检查事实的确定性程序。模型可以解释其结果，不能改写结论。
_Avoid_: LLM 自评、通用总分

**Evaluation Case（评测案例）**：
带有固定输入、预期证据和判定依据的回归样本，用于证明 Skill 在声明范围内的行为。
_Avoid_: Demo、营销示例

## Trust and acceptance

**Runtime Completion（执行完成）**：
Harness Turn、Goal 或 Job 已经停止且没有待处理步骤；它不表示结果在科学上正确。
_Avoid_: 验收通过、科研成功

**Scientific Acceptance（科学验收）**：
科研产物在声明适用范围内通过全部强制科学检查的结论，只能由 Skill Validator 推导。
_Avoid_: Runtime Completion、模型确信、Benchmark 均分

**Acceptance Report（验收报告）**：
记录被验收产物、检查项、证据、限制和结论的结构化产物。
_Avoid_: 自评、结果摘要

**Valid Score（有效评分）**：
由版本化规则从完整证据中计算的评分。证据不足或硬门槛失败时不能形成有效评分。
_Avoid_: LLM 打分、人工印象分

**Reproduction（复现）**：
在锁定输入、方法和环境后，独立获得处于规定容差内的目标结果。复现不自动表示科学特征验收通过。
_Avoid_: 再运行一次、答案相似

## Orthogonal states

执行、评分、复现和科学验收是相互独立的事实，不能压缩成一个“完成度”：

| 维度 | 示例状态 | 权威来源 |
| --- | --- | --- |
| 执行 | pending / running / idle / failed / cancelled | Harness events |
| 评分 | unscored / invalid / valid | Skill eval runner |
| 复现 | not_attempted / reproduced / not_reproduced | 复现证据 |
| 科学验收 | not_evaluated / passed / conditional / failed | Skill Validator |

因此：

- “11 篇做过复现，但科学特征未通过验收”应表示为 `reproduced + scientific failed`；
- “6 篇尚未形成有效评分”应表示为 `unscored`；
- Harness 已 idle 但没有 Validator 报告，应表示为 `idle + not_evaluated`。

这些状态用于科研呈现和验证，不要求 OpenQuantum 新建一套平行于 Harness 的持久化或发布系统。
