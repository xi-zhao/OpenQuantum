# OpenQuantum 当前交接

升级核验日期：2026-09-10；原模型验收交接记录日期：2026-09-05。此页只记录工作交接；架构以[文档总入口](docs/README.md)为准，执行事实以 Harness Session event log 为准，科学状态以 Acceptance Report 为准。

## 本轮升级

- Harness `0.1.5-rc.1`、Desktop `2.0.7` 固定源码、量子学习通上游修复、CC Connect 与两项量子数值库已升级。
- 范围、固定版本、验证和恢复说明见[2026-09-10 升级记录](docs/releases/2026-09-10-upstream-update.md)。
- 真实外部模型、真机硬件和发布验收不由本次本地升级替代；原模型验收里程碑仍保留。

## 原交接基线（历史）

- 写入本页前的本地 HEAD：`e4e3e4dbc697`，分支 `main`；后续接手先重新查询 Git，不把本页当作实时分支状态。
- 已核实提交与文件：Skill/Tool 正交、完整副作用声明和 MCP 合同补审已进入本地提交；最新提交补充了 Skill 与 MCP 服务目录。详细范围见[日期化审计](docs/architecture/ARCHITECTURE_AUDIT.md)。
- 原有 `agent.cordis.yml` 未提交改动属于已有工作；本页不覆盖它，也不把配置存在等同于服务在线可用。

## 下一唯一里程碑

收口当前模型接入验收：对原执行任务已经选定的模型逐项归档“文本生成、Tool Calling、科研主动作、证据完整性”的结果与未验证项。该任务仍由原执行会话负责；本页不启动第二份验收。

## 验收与证据

- 静态边界检查入口是 `npm run check`；在线验收必须另有目标 Provider、模型版本、时间和 Session 证据，不能用静态通过替代。
- 科研成功由 central Acceptance Builder 推导；检查 [Scientific Result 协议相关测试](tests/scientific-result-materialization.test.mjs)及[架构审计](docs/architecture/ARCHITECTURE_AUDIT.md)所指证据。
- 本次仅核对 Git、文档和本页链接；未重新运行全仓检查、模型调用或硬件调用。

## 待核实与动作边界

- 最新在线验收的固定模型清单、预算、执行中状态和报告位置尚未在本页核实；由原执行任务补入脱敏报告链接后才能标记完成。
- 允许：读取证据、更新此页、在已有授权范围内维护本地实现和相关检查。
- 此页不授予新的模型请求、安装、硬件、发布或 push 权限；跨 ChatGPT/Codex 接手时携带仓库、分支、证据链接和原授权范围，不携带密钥。
