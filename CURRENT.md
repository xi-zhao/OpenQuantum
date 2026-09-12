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

## 原交接基线（历史）

- 写入本页前的本地 HEAD：`e4e3e4dbc697`，分支 `main`；后续接手先重新查询 Git，不把本页当作实时分支状态。
- 已核实提交与文件：Skill/Tool 正交、完整副作用声明和 MCP 合同补审已进入本地提交；最新提交补充了 Skill 与 MCP 服务目录。详细范围见[日期化审计](docs/architecture/ARCHITECTURE_AUDIT.md)。
- 原有 `agent.cordis.yml` 未提交改动属于已有工作；本页不覆盖它，也不把配置存在等同于服务在线可用。

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
