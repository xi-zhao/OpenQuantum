# OpenQuantum 当前交接

升级核验日期：2026-09-10；原模型验收交接记录日期：2026-09-05。此页只记录工作交接；架构以[文档总入口](docs/README.md)为准，执行事实以 Harness Session event log 为准，科学状态以 Acceptance Report 为准。

## 本轮升级

- Harness `0.1.5-rc.1`、Desktop `2.0.7` 固定源码、量子学习通上游修复、CC Connect 与两项量子数值库已升级。
- 范围、固定版本、验证和恢复说明见[2026-09-10 升级记录](docs/releases/2026-09-10-upstream-update.md)。
- 真实外部模型、真机硬件和发布验收不由本次本地升级替代；原模型验收里程碑仍保留。

## FatQat 接入（2026-09-11）

- 新增 `fatqat-workbench` Skill 与默认开启的 `fatqat_local` MCP 连接，提供电路/硬件约束和脉冲动力学两个 Tool。
- 量子组件设置页同步适配 DSH 当前的 `remote.credentials` 接口，修复打开连接目录时的凭据读取报错。
- 固定版本、验证命令与边界见 [FatQat 接入说明](docs/integrations/FATQAT.md)。独立的真实模型验收里程碑保持不变。
- 2026-09-11 主线合并前，在独立工作目录通过完整 `npm run check`，并补齐 FatQat 的目录数量与合同测试清单；此次未运行外部模型或真实硬件探针。

## 论文方法接入（2026-09-12）

- 新增 SQD、TJM、LSD、RandomMeas、Flow-VQE 和 TeNPy 六个 L1 能力、六个本地 MCP Tool 和对应 Skill；默认开启，GARI 仍为候补。
- 已运行固定依赖的真实数值回归，以及本地模型协议替身驱动的真实 Harness 六工具端到端检查。后者不替代外部模型自主任务验收。
- 上游版本、安装命令、物理边界和证据位置见[论文方法计算接入](docs/integrations/PAPER_BACKED_TOOLS.md)。运行中的 OpenQuantum 需重启加载新增 Preset 连接。
- 2026-09-12 主线合并前，在独立工作目录通过完整 `npm run check`；资源脚本的格式阻断已由 `bfe8055` 修复。合并检查日志保存在原工作目录的 `.openquantum/merge-paper-tools-evidence/`。

## Quantum-Practices 与 PDE 原型（2026-09-12）

- 默认 Preset 新增原生只读 `quantum_practices` Tool，检索固定 MIT 上游的 60 份算法参考；
  当前 Harness 的注册、真实调用、失败返回和会话重读已由本地模型协议替身验证，未运行外部模型自主验收。
- [接入说明](docs/integrations/QUANTUM_PRACTICES.md)记录版本、许可、输入边界与证据；运行中的 Host 需重启后加载。
- [一维热方程独立实验](experiments/schrodingerization-heat1d/README.md)使用开源数值库验证薛定谔化精度与成本，
  尚未成为产品计算 Tool；没有引入 UnitaryLab 闭源模拟器或 Agent。
- 2026-09-13 主线合并前，在独立工作目录通过完整 `npm run check` 与 4 项热方程数值测试；
  补齐新增原生 Tool 的合同测试清单。本次验证没有调用外部模型或真实硬件。

## Mitiq 误差缓解接入（2026-09-14）

- 新增 `mitiq-error-mitigation` Skill 和默认开启的 `mitiq_local` 连接，以一个有界 Tool 提供 ZNE、REM、PEC、CDR 本地实验。
- 固定 Mitiq 1.1.0 与独立 Python 3.12 环境；采样比较包含校准/训练成本，保留有限样本下的变差结果。
- 四种方法已运行真实数值检查，并由本地模型协议替身驱动真实 Harness 调用及 Session 结果重读；未验证外部模型或 QPU。
- 完整 `npm run check`、独立 Python 科学检查和安装器幂等复查通过；[版本化验证摘要](docs/integrations/evidence/mitiq-2026-09-14.json)保留输入、数值、源码与日志摘要。
- 范围、验证命令、GPL 许可和证据目录见 [Mitiq 接入说明](docs/integrations/MITIQ.md)。当前为 L1、`scientificValidation=not_evaluated`；运行中的 Host 需重启加载。

## 原交接基线（历史）

- 写入本页前的本地 HEAD：`e4e3e4dbc697`，分支 `main`；后续接手先重新查询 Git，不把本页当作实时分支状态。
- 已核实提交与文件：Skill/Tool 正交、完整副作用声明和 MCP 合同补审已进入本地提交；最新提交补充了 Skill 与 MCP 服务目录。详细范围见[日期化审计](docs/architecture/ARCHITECTURE_AUDIT.md)。
- 原有 `agent.cordis.yml` 未提交改动属于已有工作；本页不覆盖它，也不把配置存在等同于服务在线可用。

## Unitary 生态接入（2026-09-14）

- 新增 Dynamiqs、Clifft、OQuPy、Deltakit 四个 Skill 和四个默认开启的本地计算 Tool；Metriq 以原生只读 Tool 查询固定公开快照的 410 条去重记录。
- 四个 Python 3.12 锁定环境已实际安装，真实数值回归与独立领域审阅已完成；修复了 TEMPO 整步数取整和 Deltakit 等价电路目标顺序造成的重现性问题。
- 本地模型协议替身驱动真实 Harness，完成五项成功调用、一次预期查询失败及会话重读；完整 `npm run check` 已通过。此次没有运行外部模型或真实硬件，五项均为 L1、`scientificValidation=not_evaluated`。
- [接入说明](docs/integrations/UNITARY_ECOSYSTEM.md)包含版本、安装、使用示例和证据。运行中的 Harness 需重启后加载新增 Preset 行；原模型验收里程碑保持独立。

## 电路与代数能力（2026-09-14）

- 新增 PyZX 电路优化、Graphix 测量式计算、Symmer 对称性降比特和 PauLie 代数分析；各有独立 Skill 与默认开启的本地 MCP Tool，依赖固定在隔离 Python 3.12 环境。
- 26 个真实数值输入、MCP 合同与目录一致性、四次真实 Harness Tool 调用、一次预期错误及 Session 重读通过；Harness 使用本地模型协议替身，没有调用外部模型或真实硬件。
- 独立领域审阅另复核 50 个输入及 80 条 MBQC 采样分支；固定版本、范围、安装与证据见[电路与代数工具接入](docs/integrations/UNITARY_NEXT_TOOLS.md)。Graphix 已处理 NumPy 兼容性和旋转角单位转换。
- 当前四项均为 L1、`scientificValidation=not_evaluated`；全仓 `npm run check` 通过。运行中的 Harness 需重启加载新连接，原模型验收任务保持独立。

## 计算桥接扩展（2026-09-14）

- TeNPy、TJM、Flow-VQE、Clifft 的主计算已与小系统精确参考分开；SQD 新增分子、基组和活性空间输入，包含冻结核贡献。
- 五项统一提供 `referenceMode=auto|required|skip`，未运行参考时返回原因与 null 参考字段；保持 L1、`scientificValidation=not_evaluated`。
- 新旧实际数值回归与本地模型协议替身驱动的真实 Harness 五项调用、会话结果重读均已通过。算例与验证记录见[计算工具使用说明](docs/integrations/SCALABLE_BRIDGES.md)。
- 未调用外部模型或真实硬件；运行中的 Harness 需在后续重启后加载新合同，不替代原模型验收里程碑。

## 用户自行配置计算资源（2026-09-15）

- 全部 23 项本地计算适配（21 个 MCP 服务及 QMClaw、内置基态两项原生计算能力）按用户选择的规模和求解参数执行，移除人为规模与工作量上限，保留所提供的物理模型、输入结构和后端数据表示要求。
- 主计算、可选参考、Graphix 模拟和 PauLie 闭包分别配置；`required` 在所请求的规模尝试参考。15 项共享科学服务支持逐次 `execution`，其余本地 MCP 计算使用部署变量；worker 默认无时间或输出上限，连接超时可在设置中心修改。
- 内置基态的粗网格与评价预算由请求指定；资源检查规则升级为 Profile `1.1.0` 并返回使用比例，旧 `1.0.0` 文件保留用于历史溯源。
- README 按功能介绍能力；模型、输入输出与资源设置见[本地计算说明](docs/integrations/SCALABLE_BRIDGES.md)。本地算例与版本作为补充材料，见[核验记录](docs/integrations/evidence/local-compute-scale-2026-09-15.json)。
- 合并后全仓 `npm run check` 通过；另运行 18 个旧适配输入、7 个资源配置输入，以及真实 Harness 的四项调用、预期错误和会话重读。Harness 使用本地模型协议替身；未调用外部模型或真实硬件。本次资源调整不改变各能力的科学验收等级。

## 下一唯一里程碑

收口当前模型接入验收：对原执行任务已经选定的模型逐项归档“文本生成、Tool Calling、科研主动作、证据完整性”的结果与未验证项。该任务仍由原执行会话负责；本页不启动第二份验收。

## 验收与证据

- 静态边界检查入口是 `npm run check`；在线验收必须另有目标 Provider、模型版本、时间和 Session 证据，不能用静态通过替代。
- 科研成功由 central Acceptance Builder 推导；检查 [Scientific Result 协议相关测试](tests/scientific-result-materialization.test.mjs)及[架构审计](docs/architecture/ARCHITECTURE_AUDIT.md)所指证据。
- 原交接时仅核对 Git、文档和本页链接；该历史记录未包含全仓检查、模型调用或硬件调用。后续检查见上方日期化条目。

## 待核实与动作边界

- 最新在线验收的固定模型清单、预算、执行中状态和报告位置尚未在本页核实；由原执行任务补入脱敏报告链接后才能标记完成。
- 允许：读取证据、更新此页、在已有授权范围内维护本地实现和相关检查。
- 此页不授予新的模型请求、安装、硬件、发布或 push 权限；跨 ChatGPT/Codex 接手时携带仓库、分支、证据链接和原授权范围，不携带密钥。
