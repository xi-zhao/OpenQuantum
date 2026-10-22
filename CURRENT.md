# OpenQuantum 当前交接

核验日期：2026-10-22。此页只记录交接状态；架构以[文档总入口](docs/README.md)为准，执行事实以 Harness
Session event log 为准，科学状态以 Acceptance Report 为准。2026-09 至 2026-10-16 的日期化记录已迁至
[交接历史](docs/handoff/HISTORY.md)，内容未删改。接手时先重新查询 Git、PR 与 CI，不把本页当作实时状态。

## 当前基线

- 公开发行：Desktop [v0.8.4](https://github.com/xi-zhao/OpenQuantum/releases/tag/v0.8.4) 与 Codex
  [codex-v0.8.4](https://github.com/xi-zhao/OpenQuantum/releases/tag/codex-v0.8.4)；Harness 固定
  `0.1.5-rc.1`，原版 DSH Desktop `2.0.7`。
- 能力声明（`.agents/capability-packages.yml`）：L0=92、L1=96、L2=1、L3=2。只有基态求解与量子信息审计具备完整科学验收流程；
  其余能力的结果为 `scientificValidation=not_evaluated`，多数只用本地模型协议替身验证过 Harness 调用。
- 2026-10-22 依赖安全更新：MCP SDK `1.32.1`、sanitize-html `2.18.1` 及锁文件内传递依赖补丁；根锁文件审计余
  2 项 low（`@openmaic/generation` 内置 KaTeX 0.16，需上游升级）。全仓 `npm run check` 通过。

## 未合并的 Harness 0.2 迁移线

- 本机主工作区分支 `c/scalable-quantum-bridges` 有 3 个未推送提交（`e67a11ca`、`d1ce82a4`、`e073ad66`），
  把 Runtime 与 Desktop 迁到官方 Harness `0.2.0-rc.2`；2026-10-08 至 10-09 的课堂、运行中恢复、Pro 建课与
  安装生命周期验收都绑定这条线，见本机分支上的 `CURRENT.md`。
- 该线基于 2026-09-15 的 `3f43b6eb`，落后 `main` 186 个提交；与 `main` 合并有 27 个文件冲突，集中在
  `package.json`、Cordis patch、Agent Preset Tool、Web 扩展和 Desktop 脚本。npm 上已有 `0.2.1-rc.2`。
- 主工作区另有约 168 项未提交改动（电路校验、PyZX/Graphix/Symmer/PauLie、课堂、发布记录），归属未整理。

## 下一唯一里程碑

把 Harness 迁移落到 `main`：先决定目标版本（`0.2.0-rc.2` 或 `0.2.1-rc.2`），在 `main` 的新任务分支上按迁移线
重做适配而不是直接合并旧分支，再在新主线上重跑全仓检查和迁移线已有的桌面实测。完成前 `main` 保持 `0.1.5-rc.1`。

## 已知缺口

- 科学验收：建议优先把 2–3 个高频能力（如电路等价性、QEC 存储实验）推进到 L2/L3，而不是继续扩充 SDK 数量。
- 在线模型：当前公开发行没有新的外部模型 ready 证据；发布前需重跑目标 Provider 的文本生成与 Tool Calling 探针。
- 仓库体积：主页、小红书配图与实验 `.npz` 结果单个约 1–2 MB，未迁出。

## 动作边界

- 此页不授予模型请求、安装、硬件、发布、push 或删除权限；跨会话接手时携带仓库、分支、证据链接和原授权范围，不携带密钥。
