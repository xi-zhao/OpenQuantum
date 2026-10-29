---
name: emlint-dem-audit
description: 用 emlint 检查 Stim detector error model 的结构，定位无 syndrome 的逻辑翻转、重复机制与模型连接问题，保留反例、上下文和不完整检查状态；适用于纠错仿真前的 DEM 排查，不证明码距或解码正确性。
---

# 纠错 DEM 静态诊断

<!-- BEGIN NATIVE SDK ACCESS -->
## 原生 SDK 路径

本能力使用 **emlint 的原生公开 API**。用户需要 Stim DEM 结构诊断、反例、profile 上下文和不完整检查披露 时，由 Agent 在固定依赖环境中编写和运行任务代码。

使用 `node scripts/sdk-access.mjs inspect emlint-dem-audit` 定位环境，按[完整 SDK 工作流](../quantum-sdk-workbench/references/workflow.md)执行。模块导航：`emlint`、`stim`；导航不是 API 白名单。

固定 emlint 0.2.4；beta 结构诊断不证明电路或解码正确。保留 warning、skipped、inconclusive、vacuous 与输入失败，不自动修模型。

本入口复用宿主文件与代码工具，没有新增通用执行 Tool。原生 SDK 受上游版本、可选依赖、宿主资源与用户授权约束。已禁用或被拒绝的动作不能借代码路径绕过。执行状态和科研验收分别报告。
<!-- END NATIVE SDK ACCESS -->


## 选择与准备

用户要排查 DEM 的机制、detector 或 observable 关系时使用本 Skill。模型生成、采样和解码继续由
Stim/PyMatching、Chromobius、Tesseract 等能力处理；lint 不是这些动作的强制前置门禁。

通过 SDK 工作台显式准备固定 `emlint==0.2.4`、`stim==1.16.0` 的 Python 3.12 环境。
准备会下载依赖和写入文件；执行使用 inspect 返回的 Python，不隐式安装、不改用户环境。
DSH/Codex 共用此 Skill 和宿主代码工具，没有新增 Tool、MCP Server 或 Runtime。

## 工作流

1. 保存原始电路/DEM、生成参数、版本与文件 SHA-256。记录 detector/observable 的预期数量、
   circuit role、syndrome 是否完整、解码器及 DEM 拼接/分解方式；未知信息明确写未知。
2. 在固定环境使用公开 `emlint.check(stim.DetectorErrorModel(text), checks=..., profile=..., context=...)`
   或 `emlint check`。文件输入优先用 `pathlib.Path`，避免字符串被误当文件路径。
   按真实任务选择检查与 profile，不替用户假定 `complete_syndrome=true` 或单一连通解码图。
3. 保留 `emlint.format_json(report)` 的完整报告：检查名、status、severity、反例、profile、
   disabled_checks、applied_overrides、unknown_instructions 和 is_vacuous。报告所用上下文另存，
   因为上游报告不包含完整 context。不要只保存 `all_passed()` 或退出码。
4. CLI 默认退出码 0 表示无 error/warning/inconclusive，1 为 error，2 为 warning 或 inconclusive，
   3 为输入无法分析；`--severity error` 会过滤 warning，必须记录筛选。退出 0 也可能有 skipped 或
   vacuous，不能写为完整审计。输入错误应保留异常/诊断，不补造报告。
5. 对发现逐项说明适用条件和反例。不得为了通过 lint 自动删机制、合并概率、修改噪声、禁用检查或
   降低严重性；只在用户授权且模型含义明确时修正，并保留前后模型和原有采样/解码检查。
6. 对 repeat 展开与全局图分析设置宿主进程的时间/内存预算，超限报告未完成。不能静默截断或抽样后
   宣称完整检查；Skill 不提供额外的资源管理器，也不保证大 DEM 的性能。

## 解释规则

- findings 只描述输入 DEM 在所选规则下的结构。`error` 不自动意味着物理模型错误；有意的零概率机制、
  多个独立图、无噪声参考或未被噪声作用的 observable 都需结合任务解释。
- `duplicates`、`correctability`、概率和图结构告警不自动要求修复。退化码、合法分解和拼接可能产生告警。
  不从单机制诊断推断多故障可纠正性，不把边界平衡下界当成码距证明。
- `skipped`、`inconclusive`、`is_vacuous` 与未知指令必须可见。`all_passed()` 可以与未得出结论并存。
  不完整报告不等于完整模型已检查；没有发现也不证明原始电路符合意图或解码器成功。
- 0.2.4 源码注册十项检查并保留 `^` 分解提示；部分上游文档仍为旧描述。保留提示不代表已验证分解，
  使用时以固定源码与真实接口结果为准，不默认引入 experimental distance/multifault 检查。
- 这是 L0 原生 SDK 工作流；没有独立 Validator 或 Acceptance 接入，`scientificValidation=not_evaluated`。
  不以 lint、工程回归或有限样例证明阈值、真实硬件表现或科学验收。

## 示例与来源

[可编辑示例](references/native-example.py)使用小型可直接判断的 DEM 并保留完整报告；
在新的任务输出目录运行，以免覆盖已有结果。示例与[工程验证记录](../../../docs/integrations/evidence/emlint-2026-10-29.json)
只覆盖所列输入和平台，不代表全部上游 API。

- [固定上游 v0.2.4](https://github.com/MathysRennela/emlint/tree/b124d2ba9e98f3676e6b385a5720c21ea7180a39)，Apache-2.0；保留上游 LICENSE 与 NOTICE。
- [公开检查与 profile](https://github.com/MathysRennela/emlint/blob/b124d2ba9e98f3676e6b385a5720c21ea7180a39/emlint/__init__.py)。
- [状态与报告语义](https://github.com/MathysRennela/emlint/blob/b124d2ba9e98f3676e6b385a5720c21ea7180a39/emlint/report.py)。
- [检查目录](https://github.com/MathysRennela/emlint/blob/b124d2ba9e98f3676e6b385a5720c21ea7180a39/docs/checks.md)。

每周升级时复核 emlint/Stim 兼容性、退出码与状态、profile、repeat 和平台行为，不自动跟随 main。
