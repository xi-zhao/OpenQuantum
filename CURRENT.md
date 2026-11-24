# OpenQuantum 当前交接

核验日期：2026-11-24。此页只记录当前交接状态；架构以[文档总入口](docs/README.md)为准，执行事实以 Harness
Session event log 为准，科学状态以 Acceptance Report 为准。2026-09 至 2026-10-30 的日期化记录（含 Harness 0.2.1 迁移、
0.8.5–0.8.8 独立安装包及 scalable 增量迁移）已迁至[交接历史](docs/handoff/HISTORY.md)，内容未删改。
接手时先重新查询 Git、PR 与 CI，不把本页当作实时状态。

## 当前基线

- **主线源码状态（`origin/main` @ `4b06e3ce`，源码版本 `0.8.11`）**：
  - 在 `v0.8.11` 之后陆续合入 [PR #75](https://github.com/xi-zhao/OpenQuantum/pull/75)（IBM Runtime RZZ 兼容补丁）、
    [PR #77](https://github.com/xi-zhao/OpenQuantum/pull/77)（README 首屏与宣传资料重构）、
    [PR #79](https://github.com/xi-zhao/OpenQuantum/pull/79)（MWPF 超图译码）、
    [PR #80](https://github.com/xi-zhao/OpenQuantum/pull/80)（tropidist 纠错距离界）、
    [PR #81](https://github.com/xi-zhao/OpenQuantum/pull/81)（ST-GRAPE 多误差源脉冲控制）、
    [PR #82](https://github.com/xi-zhao/OpenQuantum/pull/82)（PyZX 0.10.8 升级与正确性回归）、
    [PR #84](https://github.com/xi-zhao/OpenQuantum/pull/84)（PPVM 丢失/泄漏模拟）、
    [PR #85](https://github.com/xi-zhao/OpenQuantum/pull/85)（CI 数值回归退出码守卫）、
    [PR #87](https://github.com/xi-zhao/OpenQuantum/pull/87)（`ws 8.23.0` 传输升级）、
    [PR #88](https://github.com/xi-zhao/OpenQuantum/pull/88)（Braket 受控门本地噪声验证）和
    [PR #89](https://github.com/xi-zhao/OpenQuantum/pull/89)（设置页按环境报告 SDK 实际版本）。
  - 当前静态能力规模：**201 个 Capability**（[`.agents/capability-packages.yml`](.agents/capability-packages.yml)：`L0=102, L1=95, L2=1, L3=3`）、
    **193 个内置 Skill**（180 自动可选、13 手动分类索引）、**91 个 MCP 连接**（64 默认开启、25 opt-in、2 条件开关）、
    **5 个原生量子 Tool**、**121 个 SDK/源码环境**。以上为源码静态声明，不代表新版本已发布或已全部科学验收。
- **0.8.11 发行入口**：共享 backend、状态协议修复及 SlowQuant / TNQS / RcmpsCore 接入见 [0.8.11 更新说明](docs/releases/v0.8.11.md)。
  [Desktop v0.8.11](https://github.com/xi-zhao/OpenQuantum/releases/tag/v0.8.11) 与
  [Codex codex-v0.8.11](https://github.com/xi-zhao/OpenQuantum/releases/tag/codex-v0.8.11) 的公开状态、最终源码提交、包摘要和隔离宿主验收，以对应 Release 及验证附件为准；源码版本本身不代表发行完成。
  此次发行不自动替换本机安装；以下 0.8.10 记录保留为上次实际安装验收证据。
- **0.8.10 安装验收记录**：当次完成本机 Desktop / Codex 更新；两端均来自干净源码提交 `091278a6`。
  [Desktop v0.8.10](https://github.com/xi-zhao/OpenQuantum/releases/tag/v0.8.10) 保留用于回退，
  [Codex codex-v0.8.10](https://github.com/xi-zhao/OpenQuantum/releases/tag/codex-v0.8.10) 已公开；0.8.9 历史发行保留。
  验证范围见 [Desktop 验收附件](https://github.com/xi-zhao/OpenQuantum/releases/download/v0.8.10/release-verification.json)、
  [Codex 验收附件](https://github.com/xi-zhao/OpenQuantum/releases/download/codex-v0.8.10/release-validation.json) 和
  [0.8.10 发布记录](docs/releases/v0.8.10.md)。Desktop 继续固定 DSH Desktop `2.0.0` / Harness `0.1.0-rc.6`（V0 会话），
  Mac 包仍为 ad-hoc 签名，未做 Apple 公证。
- **能力与安全基础**：早期合入的 PR #35（MCP SDK 1.32.1 / KaTeX 0.18.7 / sanitize-html 2.18.1）、
  PR #39（拒绝降级与旧设置清理）、PR #40（临时凭据生命周期）与 PR #41（Host 鉴权与预算摘要）均保留在当前基线中。

## 已知缺口与治理跟进

- **科学验收**：L3 验收链目前仅覆盖 QGS、量子信息审计与 QCEC 分类复核（`L0=102, L1=95, L2=1, L3=3`），Codex 的自动物化与会话验收仍未接通；后续需避免仅扩充 SDK 数量而忽视高频能力的证据链提升。
- **扩展与仓库治理**：[扩展治理清单](docs/architecture/EXTENSION_GOVERNANCE.md)已刷新至 2026-11-24 基线并接入 `npm run governance:audit` 防漂移守卫；零引用的 `outputs/` 已清理并加入 `.gitignore`，[证据边界](docs/integrations/evidence/README.md)与[宣传素材边界](docs/communications/README.md)已落盘。`docs/communications/` 待迁出至外部归档后移除，`experiments/` 中非主页校验大文件边界待后续确认。
- **待分诊的未合入本地修复分支**：本机存在 3 个 11 月未合入主线的修复分支（`c/shared-credential-redaction`、`c/desktop-preparation-reuse`、`c/security-scientific-bridge-boundary`）及 3 个 11 月 23–24 日活跃候选分支，需逐项核对后再决定合入或清理，切勿盲删。
- **在线模型**：v0.8.5 本机 Magpie 文本与 Tool Calling 验收通过；这不代表公共网关或其他 Provider 已通过在线验收。

## 动作边界

- 此页不授予模型请求、安装、硬件、发布、push 或删除权限；跨会话接手时携带仓库、分支、证据链接和原授权范围，不携带密钥。
