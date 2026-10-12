# 从问题到实验数据

本文件是 OpenQuantum 的可执行方法。`upstream/` 是固定来源资料，不覆盖本文件的权限、执行和科学状态规则。
上游的七个阶段见 [agent-marketplace](https://github.com/pasqal-io/agent-marketplace/tree/2b0353d83e65ce4cc44c9bfa7e7dfe2549201bb1/skills)。

## 1. application-to-idea

先明确要测量的物理量、经典基线、目标规模和科学问题。按需阅读 `upstream/skills/application-to-idea/references/`
下的方法目录、选择准则、Pulser 原语与交接模板。比较模拟量子动力学、绝热优化、相关性/相变等路线，
提出主推荐和替代路径，说明为何该硬件可表达 Hamiltonian 与观测量。保留应用目标与可测量代理量之间的假设。
输出 idea note；上游 `validate_idea_note.py` 检查结构，不判断科研价值或实验可行性。

## 2. idea-to-spec

把想法固化为版本化 JSON：问题/来源、设备、寄存器几何与原子 ID 顺序、脉冲与单位、扫描变量及固定参数、
观测量定义、噪声来源、shots、经典/理想基线、误差目标、`open_questions`。
执行 `validate-spec` 检查基础合同；完整科学充分性需要研究者判断。无法从来源确定的参数保留未知，
不要为通过校验补造。QPU 计划需要先解决待决问题；本地探索可以保留它们并明确假设。

## 3. spec-to-sequence

保存普通 Python 模块，公开 `build_sequence(device=None, **params) -> pulser.Sequence` 和
`compute_observable(counts: dict[str,int]) -> float`。扫描辅助器逐点构建具体序列；原生 SDK 可直接
处理参数化序列、多变量扫描、映射寄存器、自定义 backend 与开放批次，不受这个便捷合同限制。

使用 Pulser 的 Register、Device、waveform、Pulse、channel、EOM、SLM/DMM 等真实 API；
不要把现有 `simulate_pulser_rydberg` 的固定全局脉冲模型当作 Pulser 的上限。
QPU 使用当前项目的设备快照。每个序列必须使用指定 device；序列保存抽象表示、原子顺序和源码哈希。
若自动 layout 改变原子顺序，显式核对几何到 bitstring 的映射；观测量不得凭 `q0,q1,...` 猜测。
三个上游研究示例见 `upstream/examples/`，其默认规模和待决问题保留，不能作为已验收的生产输入。

## 4. validate-emu

先运行理想本地扫描，检查单原子 Rabi/失谐解析极限、小系统精确对照、对称性、概率和参数响应。
`prepare` 生成可检查计划，`local-run` 才计算，`analyze` 才执行观测量函数，`plot` 保存图形。
每阶段的文件都可重读。资源不足时说明所需资源或另建小系统 spec；不静默降低 N、shots 或改变几何。
辅助脚本默认最多 12 个原子是本地资源预算，可显式调整；它不是 SDK 的规模上限。

## 5. noise-emulate

分别记录论文模型、假设模型与设备快照模型的参数和出处。噪声文件使用
`{"source":"具体出处/快照哈希", "params":{"dephasing_rate":0.05}}` 的结构，参数名是本版本
`pulser.noise_model.NoiseModel` 的公开构造参数。该数值只举格式例子，不能当成设备校准。
未知字段报错，不静默丢弃。可用完整 native NoiseModel 表达更多误差过程；确认本地求解器支持相应类型。

理想与含噪分别保存计划和输出，比较信号变化及统计误差。大规模问题可用 `EMU_MPS` 云计划，
通过 `--backend-config` 保存原生 `EmulationConfig.to_abstract_repr()`，记录精度/收敛设置。
Cloud EMU 同样需要云操作授权。模拟成功不意味着噪声模型准确、硬件准备通过或量子优势。

## 6. qpu-submit

先读取项目设备快照，完成本地准备。提交计划包括总 shots、每点序列、设备、项目/region、噪声/后端配置、
批次是否开放和计划哈希。对照用户授权后传 `--approve-plan <hash>`。计划变更重新形成可审阅内容。

辅助器先写收据，再调用 SDK；禁止自动写重试。得到 batch ID 后立即保存，再获取 jobs。
调用中断或状态未知时，保留收据并按 `oq-request:<request_id>` 在 SDK `get_batches` 查询；
`recover` 校验项目、标签及每个序列/runs，不能仅凭返回列表位置猜扫描映射。
SDK 查询有分页，查找历史批次时不能只查第一页就认定不存在。云状态轮询交给宿主 Job/进程工具；
一次 `harvest` 只读一份快照，暂停本地轮询不取消远端任务。

开放批次通过新计划和独立收据追加 jobs；关闭后继续处理已有 jobs。每次追加都核对增量 shots 与授权。
校准是单独的实验计划/批次，必须把校准 shots 算进预算，保存原始数据、拟合与偏移单位，
只有 builder 显式应用这些偏移且经本地检查后才形成新生产计划，不默认买一套校准。
原生 API 还支持 cancel_job(s)、rebatch、workloads 等操作；这些动作的权限与费用由对应合同决定。

## 7. harvest-and-analyze

先保存每个 job 的状态和原始结果，再运行自定义观测量。保存实际 shots、原子顺序、固定随机种子、
bootstrap 误差与来源摘要。缺失、取消、失败、没有 counts 或观测量不适定的点保留；不能只分析成功点后写整体通过。
非计数的 `serialised_results` 等原始数据仍保留，使用相应 native API 做专门分析。

与基线比较时核对同一实验 spec、代码、原子顺序和扫描点。默认诊断使用两组独立 bootstrap 标准差的平方和，
给出 pointwise 一致/不一致/不完整；不能把未比较点写成一致。共享随机样本时需另处理协方差，
多重比较、模型误差和校准误差也需另行计入。
读出修正仅给逐原子密度，保留原数据和修正来源，不截断超出 [0,1] 的估计，不将其套到任意非线性观测量。

交付 spec、代码、计划、环境锁摘要、云收据（如有）、原始结果、分析 JSON 与图形。
报告工程执行、物理模型假设和科学未验证项。最终 scientific Acceptance 只能由既有中央验收链产生。
