# SDK 集成与数值验证证据边界

本目录保存 OpenQuantum 固定版本 SDK 接入与数值回归的离线可核验证据。维护和新增证据须遵守以下边界：

## 1. 受哈希校验保护的历史证据（禁止删除或原地改动）

以下目录和报告被自动化测试以 `sha256` 与 `git ls-files` 强校验，属于历史冻结基线：

- `full-sdk-2026-10-12.bundle/`（973 个内容寻址 `.gz` 对象）及关联报告：受 [`tests/sdk-evidence-bundle.test.mjs`](../../../tests/sdk-evidence-bundle.test.mjs) 校验。
- `sdk-ecosystem-2026-10-14/`（226 个文件）与 2026-10-26 至 2026-11-22 的 10 份原生 SDK 收据目录（`chromobius`、`lean-physics`、`emlint`、`slowquant`、`tnqs`、`rcmps`、`ppvm`、`mwpf`、`tropidist`、`stgrape`）：受 [`tests/sdk-ecosystem-evidence.test.mjs`](../../../tests/sdk-ecosystem-evidence.test.mjs) 逐文件哈希校验。

不要手动清理、重排或重压缩上述历史目录；若未来需要变更归档格式，须作为独立专项同步更新对应验证脚本与测试。

## 2. 增量证据治理规则（自 2026-11-24 起）

为避免主仓文件数继续膨胀（目前本目录已占 `docs/` 总文件数近 89%），后续新增或升级 SDK 的工程证据遵循以下规则：

1. **主仓仅保留紧凑的摘要 JSON 与最小原始见证**（固定来源、依赖锁摘要、执行版本、关键数值误差与 `scientificValidation=not_evaluated` 声明），不再向主仓新增数百个散装对象目录。
2. **完整执行日志、大体积原始输出与跨平台运行过程产物**统一经 [`.github/workflows/sdk-checks.yml`](../../../.github/workflows/sdk-checks.yml) 上传为 GitHub Actions Artifact（或在对应 Release 附件归档），在摘要 JSON 中记录提交 SHA 与运行链接。
3. **开发工程证据不等于科学验收**：本目录所有收据仅证明对应版本、平台与小规模输入下的工程/数值回归，不替代 central Acceptance Builder 生成的 Acceptance Report。
