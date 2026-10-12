---
name: pasqal-experiments
description: 将中性原子研究问题转成实验规范与任意 Pulser 序列，运行理想和含噪扫描，经 Pasqal Cloud 提交、恢复和管理批次，保留原始采样并分析观测量。复用 Pulser 固定环境和完整 pasqal-cloud API。
---

# Pasqal 中性原子实验

使用本 Skill 完成从问题到实验数据的七个阶段。工作流复用 Pasqal agent-marketplace 的方法和接口契约，
按 OpenQuantum 的权限与科学证据规则适配。读取[工作流](references/workflow.md)、[命令与文件合同](references/execution.md)，按需读取上游方法资料。

## 环境与执行

- Desktop/源码：`node scripts/sdk-access.mjs inspect pulser-dynamics` 返回固定 Python 环境和 `project` 绝对目录。
  尚未准备时，单独执行返回的 `setup` 命令。环境保持 Pulser 1.9.1，增加 `pasqal-cloud==0.24.0`。
- 本 Skill 目录与返回的 `project` 是同级目录：`<project>/../pasqal-experiments/`。
  用其 `scripts/experiment.py --help` 查看辅助命令。Codex 用本 Skill 的 `scripts/sdk-access.mjs inspect pulser-dynamics`
  定位插件内环境，继续使用同一相对关系读取本地工作流和脚本；不依赖 GitHub 上尚未发布的文件。
- Agent 通过宿主现有代码 Tool 保存并运行任意原生程序。`pulser`、`pulser_simulation`、`pasqal_cloud`
  全部公开 API 可用，包括参数化序列、映射寄存器、各 backend、jobs、batches、workloads 和原生连接。
  辅助 CLI 的扫描合同不是 SDK 的能力上限；复杂扫描、校准、优化及非计数结果使用原生 API。
- 现有 `simulate_pulser_rydberg` 保持其本地便捷合同。Skill 不启动额外 Agent Runtime，也不新增任意代码执行 MCP。

## 七阶段与交付

| 阶段 | 需要形成的工件 |
| --- | --- |
| application-to-idea | 方法选择、经典基线、可测观测量、规模与局限的 idea note |
| idea-to-spec | 带单位、来源、几何、扫描、噪声模型、shots 与待决问题的 spec JSON |
| spec-to-sequence | `build_sequence(device=None, **params)` 与 `compute_observable(counts)` 的真实 Pulser 程序 |
| validate-emu | 理想本地扫描、解析/小系统对照、序列与原子顺序证据 |
| noise-emulate | 明确来源的噪声扫描；需要时转 Cloud EMU_MPS，保存模型及收敛条件 |
| qpu-submit | 经审阅的序列计划、项目、设备快照、总 shots、云提交收据与恢复记录 |
| harvest-and-analyze | 原始 counts/status、观测量及误差、基线比较、图形和失败/缺失点 |

真实 Cloud EMU 与 QPU 都是外部操作，可能计费。先形成 `prepare` 计划，说明项目、region、设备、
shots、开放批次及噪声配置，再按用户已有授权与宿主审批执行。`--approve-plan` 只绑定已审阅内容，
不代替授权。缺失凭据在认证入口配置，不能要求用户把秘密发到聊天。

提交后保留收据。超时、取消本地进程或未知响应不证明远端未提交；用 request tag/批次 ID 恢复，
不能删除收据后重发。关闭批次仍会执行已有 jobs；取消请求不保证停止已经完成或正在执行的 shots。

## 科学边界

- 不擅自缩小寄存器、改变几何或换设备。缩小后的实验单独保存 spec，并说明有限尺寸和边界条件改变。
- Pulser 时长为 ns、距离为 µm、Rabi/失谐为 rad/µs；MHz 转换是 `2*pi*MHz`。
- 保存实际 `register.qubit_ids`，按此顺序解释位串。需要几何顺序的观测量必须在 spec 中声明 `atom_ids` 并核对。
- 论文噪声、设备快照噪声和假设噪声分开命名。无噪声参数时不补造校准值；不能丢弃未知噪声字段后仍宣称复现原模型。
- 原始数据先落盘，再计算观测量。保留不完整、失败和不一致，不静默归一化、截断修正值或删除扫描点。
- 辅助分析是 L1 数值事实，`scientificValidation=not_evaluated`。bootstrap 与模型一致性不是科学 Acceptance；
  需要最终科学验收时另走既有 Validator、Profile、物化和 central Acceptance Builder。

许可、上游固定提交及未默认引入的本地 `emu-mps` 见 [NOTICE](NOTICE.md)。示例是可改写的研究起点，
不是已经完成的论文复现或已获准的 QPU 计划。
