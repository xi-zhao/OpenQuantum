# emlint：纠错 DEM 静态诊断接入提案

- 调研日期：2026-10-29（Asia/Shanghai）；OpenQuantum 基线 `7a111fae86905abaca32d3345c35d01f94dd23ec`。
- 上游：[MathysRennela/emlint](https://github.com/MathysRennela/emlint)。
- 固定候选：[v0.2.4](https://github.com/MathysRennela/emlint/tree/v0.2.4)，完整提交 `b124d2ba9e98f3676e6b385a5720c21ea7180a39`。
- 本 PR 只交付提案，保持 Draft；后续“候选接入”任务沿用同一分支和 PR 实施、验证及更新 README。用户可随时关闭或暂停。

## 用户任务与增量价值

用户修改 Stim 电路、拼接 DEM 或切换解码器前，需要知道哪些 detector 从未被误差触发、哪些逻辑翻转没有
syndrome、哪些机制具有重复签名，以及发现依赖什么模型假设。emlint 对 DEM 做结构检查并返回反例，
可作为耗时采样之前的诊断步骤；它不负责生成模型、修复模型或证明解码正确。

现有 [Stim/PyMatching](../../../.agents/skills/qec-memory-experiment/SKILL.md)、
[Chromobius](../../../.agents/skills/chromobius-decoding/SKILL.md) 和 Tesseract 分别提供模型/采样及解码路径；
当前 SDK、能力清单和锁文件没有 emlint。直接用 Stim 检查语法、模拟电路和比较解码输出仍然必要，
但与统一的 DEM 静态反例报告互补。避免在多个 QEC Skill 中分别手写同一套 lint 规则。

优先级为中等：它填补已有纠错工作流的诊断缺口，新增依赖面小。[0.2.4 变更记录](https://github.com/MathysRennela/emlint/blob/b124d2ba9e98f3676e6b385a5720c21ea7180a39/CHANGELOG.md)
包含连通性、逻辑 observable 下界平衡等新增检查及 repeat/空模型修正；PyPI 于 2026-10-27 发布，
属于本轮窗口内的实质更新。项目自称 preliminary/beta，不能因其声称“verifies”就把结果升级为科学保证。

## 固定来源与维护证据

[PyPI 0.2.4 元数据](https://pypi.org/pypi/emlint/0.2.4/json)中的纯 Python wheel 为 50,327 字节，
SHA-256 为 `210167b055c3f155628b5f86589f2a1a0f102ec983f055e327840eeceeec11e5`。
本轮只读比较 wheel 内 8 个包文件与固定 Git tree 的 blob 摘要，全部一致；没有安装或执行上游代码。
GitHub tag 指向上述提交，但 release 列表为空，不把 changelog 的 release 链接当成发布证明。

[固定提交 CI](https://github.com/MathysRennela/emlint/actions/runs/40518655716)通过 Python 3.10/3.12 测试和 CLI 检查。
[发布流水线](https://github.com/MathysRennela/emlint/actions/runs/40518968203)的构建、测试及 PyPI publish job 成功，
随后 `notify-bench` 触发外部基准任务失败；因此不能说整个发布流水线通过，也没有据此推定外部基准已运行。
上游有 [独立规格 oracle 和 repeat 等价测试](https://github.com/MathysRennela/emlint/blob/b124d2ba9e98f3676e6b385a5720c21ea7180a39/tests/test_check_oracles.py)。
这些是上游工程证据，不是 OpenQuantum 已验证；本轮未核实独立同行评审的方法论文或复现性能数据。

## 最小接入与设计取舍

沿用 [L0 贡献路径](../../../CONTRIBUTING.md)：增加一个 `emlint-dem-audit` Skill、独立 Python 3.12
SDK 环境、固定锁文件和小型可编辑示例。直接依赖拟为 `emlint==0.2.4` 与 `stim==1.16.0`；
Stim 版本复用现有 QEC 基线，兼容性须由接入任务实跑确认。发现只读，准备显式下载；执行不安装。
使用既有 `sdk-access` / `setup-sdk` 和宿主代码工具，DSH/Codex 共用同一份内容。

- **Module / Interface**：直接使用上游公开的 `emlint.check(dem, profile=..., context=...)` 与报告序列化，
  或公开 CLI；输入保留 DEM 来源和摘要，输出保留检查名、状态、严重性、反例、禁用项及上下文。
- **复用**：依赖锁定、准备、环境发现和宿主投影继续由现有 SDK Module 拥有，无需新增 Adapter。
- **删除测试**：再包一层只转发 `check` 的 Tool/MCP Server，删除后并不损失必要能力，因此不增加。
  Skill 的价值是选择上下文、解释告警及保存证据，不重写 lint 算法、不新增 Runtime 或科学验收器。
- 独立环境避免修改现有 PyMatching/Chromobius 锁；新增维护主要是一份锁、领域指南和真实接口回归。
  不默认安装 dev/benchmark/demo extras，不把 lint 设为所有 QEC 执行的强制前置门禁。

## 语义与科学边界

[固定实现](https://github.com/MathysRennela/emlint/blob/b124d2ba9e98f3676e6b385a5720c21ea7180a39/emlint/profiles.py)
区分上下文缺失与已声明不适用。Skill 应先记录 circuit role、syndrome 完整性、解码假设及 DEM 拼接来源；
不能为得到绿色结果擅自填 `complete_syndrome=true`、切换 profile、降低严重性或删掉告警。

1. `error` 是所选规则和适用条件下的发现，不自动等同于物理模型错误；例如零概率机制可以有意保留，
   多个独立解码图也可能有意组合，不能因为 lint 反例就删除机制、合并图或改噪声。
2. `duplicates`、`correctability`、高概率和拓扑告警需要解释具体假设；不证明码距、所有多故障可纠正性、
   解码器成功、阈值或真实硬件性能。电路语义与数值/采样检查仍走原有能力。
3. CLI 退出码 0/1/2/3 分别表示无阻断发现、error、warning 或 inconclusive、输入无法分析。
   根据[报告实现](https://github.com/MathysRennela/emlint/blob/b124d2ba9e98f3676e6b385a5720c21ea7180a39/emlint/report.py)，
   `all_passed()` 可能与未得出结论并存；必须同时显示 `status`、`is_vacuous`、跳过项和未知指令，
   不能仅以退出码 0 或 `all_passed()` 宣称完整审计。输入失败不能当作已分析的报告。
4. 上游部分文字仍写“七项检查”或“丢失 ^ 分解提示”，与当前
   [十项注册检查](https://github.com/MathysRennela/emlint/blob/b124d2ba9e98f3676e6b385a5720c21ea7180a39/emlint/checks.py)
   及[保留提示的 frontend](https://github.com/MathysRennela/emlint/blob/b124d2ba9e98f3676e6b385a5720c21ea7180a39/emlint/frontends.py)
   不一致。接入须以固定源码和真实测试核对；保留提示不等于验证了分解正确性。
5. repeat 跨域检查和全局图检查可能展开机制；用户预算控制耗时/内存，超限应明确中断，不能静默抽样或截断后报通过。
   L0 工作流不新增强制资源管理器，也不对大 DEM 作性能保证。

## 接入验收条件

以下是后续同 PR 必须产生的证据，本提案尚未运行这些检查。期望值来自小模型的直接推导，
不能以 emlint 的同一实现重算答案；优先走公开 Python Interface 和 CLI。

| 用例 | 应验证的结果 |
| --- | --- |
| `error(0.1) D0 L0` 与 `error(0.1) L0`，只选 detectability | 前者有 syndrome，后者返回无 syndrome 的逻辑翻转反例；不需要蒙特卡洛 |
| 两条相同 detector/observable 签名，只选 duplicates | 保留 warning、反例和原始机制；默认 CLI 退出 2，不自动合并概率 |
| 非法 DEM 与不存在的文件 | Python 异常/CLI 退出 3；不得包装成空白的“通过”报告 |
| 缺少 graphlike-decoder 所需 decoder 上下文 | 确定性检查为 inconclusive，并保留未完成状态；不能由 `all_passed()` 掩盖 |
| 零机制、无噪声模型和已声明不适用角色 | 披露 vacuous/skipped/检查范围；不要求有意无噪声模型产生逻辑翻转 |
| 小型 repeat + shift、重复 target 和 `^` 分解提示 | 与手工展开的绝对索引和 XOR 支持对照，保留来源；不把不同分解签名误说成同一物理故障 |
| 同一小型 Stim surface-code memory 的原始/分解 DEM | 保存 Stim 版本、生成参数、模型摘要、实际检查和告警；不以“所有告警为零”作为正确性条件 |
| 工程接入 | 锁定来源/许可、SDK 定位与显式准备、capability conformance、真实 Skill 发现及 Codex 投影通过 |

实施时同 PR 更新根 README、相关语言入口、Skill 总目录与 SDK 文档，清楚标出已支持的用法和证据范围。
使用当前单代理 code-review 方法分别自审 Standards/Spec，记录 `independent=false`；
任何必要检查或语义取舍未解决时保持 Draft。最终仍为 `scientificValidation=not_evaluated`。

## 许可与后续维护

[源码许可](https://github.com/MathysRennela/emlint/blob/b124d2ba9e98f3676e6b385a5720c21ea7180a39/LICENSE)为 Apache-2.0，
保留 [NOTICE](https://github.com/MathysRennela/emlint/blob/b124d2ba9e98f3676e6b385a5720c21ea7180a39/NOTICE)；
[运行依赖](https://github.com/MathysRennela/emlint/blob/b124d2ba9e98f3676e6b385a5720c21ea7180a39/pyproject.toml)
只有 Stim（Python 3.10 另需 tomli）。不需要账户、QPU、付费求解器或云端执行。
本轮 wheel 比对未验证 macOS/Windows/Linux 实际安装；未来准备仍受 Stim wheel 与宿主资源约束。

每周同步时一起核对 emlint/Stim 兼容性、profile 与 severity/status/exit 语义、repeat 行为及上游文档差异。
不自动跟随 main，不复制实验性 distance/multifault 算法。若为适配上游需要私有补丁或新的科学公共合同，
先在本 PR 说明具体问题和取舍；不把一项诊断能力发展为第二套 QEC 验证框架。
