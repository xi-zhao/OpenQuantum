# 量子依赖升级回归

这些检查是开发证据，不注册 Tool 或 Scientific Validator，也不产生科学 Acceptance。
2026-09-22 的版本、结论和证据摘要见[升级记录](../../docs/releases/2026-09-22-quantum-upstream-update.md)。

## 发行版固定环境

```bash
node scripts/setup-paper-tools.mjs compact-optimization qcut-knitting clifft-sampling graphix-mbqc
npm run test:upstream-updates:live
OPENQUANTUM_REAL_CANDIDATE_TOOLS=1 node --test --test-name-pattern='real (QCut|Compact)' tests/candidate-tools-live.test.mjs
OPENQUANTUM_REAL_UNITARY_TOOLS=1 node --test --test-name-pattern='real Clifft' tests/unitary-tools-live.test.mjs
OPENQUANTUM_REAL_UNITARY_NEXT=1 node --test --test-name-pattern='real Graphix' tests/unitary-next-live.test.mjs
.openquantum/python-envs/compact-optimization/bin/python benchmarks/candidate-libraries/compiler_regressions.py
```

- `compiler_regressions.py`：14 项。Qiskit Clifford+T 目标缺少 sx/sxdg 时的四级转译回归；Compact 三种目标在 16/24/48 门上的完整 unitary 与 QASM 重读检查；9 qubit 的 auto 参考范围。
- `clifft_regressions.py`：2 项。LOSS/LEAKAGE 续执行后旁观量子位的奇数次翻转概率，与独立解析二项模型比较；验证串行/并行同 seed 逐行一致。
- `tests/upstream-updates-live.test.mjs` 另检查 Graphix 11 qubit 仅生成、跳过参考、四量子位复杂相位及 12 个采样分支。
- 原候选编译回归继续覆盖 CleitonForge 输入、全局相位、隐藏 CZ 负例和 ECR/iSWAP 上游误判；这两个门仍不进入 Compact Tool 输入。

Qiskit 最小电路依据 [PR #16735](https://github.com/Qiskit/qiskit/pull/16735)；Clifft 回归机制依据
[PR #484](https://github.com/unitaryfoundation/clifft/pull/484)。两者上游采用 Apache-2.0。
本目录使用其公开 API 与可复现输入，不复制库实现。Clifford+T 任意角合成采用 Qiskit 的数值等价容差；
Clifft 采用固定 shots 与六倍标准误差界，不将有限抽样写成精确通道证明。

## 隔离开发版探针

`probes/*/pyproject.toml` 和 `uv.lock` 是开发专用固定依赖，不被 Agent Preset 或安装器加载。
FlagQuantum SDK 固定到完整 commit，版本字符串仍为 0.2.0，不能仅凭版本字符串区分稳定 wheel 与此源码。
运行会下载并写入独立环境。以下为 macOS/Linux 的复跑命令：

```bash
UV_PROJECT_ENVIRONMENT="$PWD/.openquantum/upstream-update-probes/stim" uv sync --frozen --no-dev --project benchmarks/upstream-updates/probes/stim --python 3.12
.openquantum/upstream-update-probes/stim/bin/python benchmarks/upstream-updates/stim_probe.py
.openquantum/upstream-update-probes/stim/bin/python benchmarks/candidate-libraries/qec_burst_regression.py

UV_PROJECT_ENVIRONMENT="$PWD/.openquantum/upstream-update-probes/flagquantum" uv sync --frozen --no-dev --project benchmarks/upstream-updates/probes/flagquantum --python 3.12
.openquantum/upstream-update-probes/flagquantum/bin/python benchmarks/upstream-updates/flagquantum_probe.py
node benchmarks/upstream-updates/flagquantum_mcp.mjs .openquantum/upstream-update-probes/flagquantum
```

Stim 探针将不完整 tag 送入短超时子进程，失败时终止子进程，避免旧解析器占用无界时间或内存。
FlagQuantum 检查 10 项 SDK 合同与 4 项 MCP 场景；17 个 schema 全量对比，但执行调用仅覆盖分析、
Bell 仿真和格式错误。1 字节预算拒绝证明该限制传入实际收缩路径，不是对原生收缩峰值内存的测量。
两个开发版的通过均不修改发行版稳定锁，不证明云硬件、训练、全部编译/路由方法或外部模型任务可用。
