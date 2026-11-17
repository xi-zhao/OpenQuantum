# PyZX 0.10.8：升级前正确性对照

调研与验证日期：2026-11-08（Asia/Shanghai）。基线：
`0da563fa87c6592a8923d2eb98eea80f484d2151`。

**状态：2026-11-10 已在本 PR 接入生产依赖 0.10.8；尚未合并或部署。**
后续实施与本机验证见 [升级记录](2026-11-10-pyzx-production-upgrade.md)。
下文保留 11 月 8 日隔离诊断的历史事实；#79 不再阻塞这个独立正确性修复。

## 为什么值得升级

[官方 v0.10.8 发布](https://github.com/zxcalc/pyzx/releases/tag/v0.10.8)修复了
`basic_optimization` 在 CNOT 对重映射后把 XPhase 作用于错误量子位，以及
`Circuit.adjoint` 对 U3 等门返回错误伴随的缺陷。两者属于已公开 SDK 能力，
会影响优化结果或等价性检查，不是单纯的新功能。

目标稳定 tag 的完整提交为
[`d9691d0b2aaaab92f11ed0b2cabe2bcc36f8cc14`](https://github.com/zxcalc/pyzx/tree/d9691d0b2aaaab92f11ed0b2cabe2bcc36f8cc14)；
[发行包](https://pypi.org/project/pyzx/0.10.8/)已在独立环境安装，使用 Apache-2.0。
Python 最低版本升为 3.11，仓库现有 PyZX 环境使用 3.12。

## 实测结果与边界

两版均使用 Python 3.12.13、NumPy 2.5.3、macOS arm64；仅 PyZX 及其必要依赖锁差异。
独立参考复用仓库的 `circuit_unitary`；U3 使用解析 2×2 矩阵的共轭转置。
比较忽略整体相位，沿用现有 bridge 的 1e-8 工程容差，未修改科学阈值。

| 检查 | 0.10.6 最大矩阵偏差 | 0.10.8 最大矩阵偏差 |
| --- | ---: | ---: |
| CNOT(1,0)、CNOT(0,1)、XPhase(1,π/2) 优化 | 0.70710678，失败 | 5.56e-16，通过 |
| U3(π/3,π/5,π/7) 的 adjoint | 1.0，失败 | 4.00e-16，通过 |
| 现有 bridge 的公开计算管线，同输入 H-S-H 表达 | 5.56e-16，通过 | 5.56e-16，通过 |

输入矩阵本身的两个独立校准在两版均通过。旧版探针退出码 1，新版退出码 0。
完整观测见[旧版 JSON](evidence/2026-11-08-pyzx-old.json)与
[新版 JSON](evidence/2026-11-08-pyzx-new.json)；包含锁、探针及参考文件摘要。

这是两个明确 SDK 反例及一个公开管线小例。尚未执行新版 MCP 握手、版本守卫、
全部 Tool 输入、宿主注册、全部 SDK API、其他平台或科学 Acceptance。
`scientificAcceptance=not_evaluated`。不能据此宣称所有旧版便捷 Tool 调用失败，
或宣称新版已经接入、发布、部署。

## 复跑

[探针](../../benchmarks/upstream-updates/pyzx_regressions.py)使用公开 API；
[开发环境](../../benchmarks/upstream-updates/probes/pyzx/pyproject.toml)及
[冻结锁](../../benchmarks/upstream-updates/probes/pyzx/uv.lock)不由产品安装器加载。
先选择独立外置盘目录作为 `OQ_CHECK_DIR`，保持用户使用中的环境不变：

```bash
export OQ_CHECK_DIR="/path/to/isolated/external-disk-directory"
mkdir -p "$OQ_CHECK_DIR/tmp"
export UV_CACHE_DIR="$OQ_CHECK_DIR/uv-cache"
export UV_PYTHON_INSTALL_DIR="$OQ_CHECK_DIR/python-install"
export TMPDIR="$OQ_CHECK_DIR/tmp"
export UV_LINK_MODE=copy

# 旧版必须从旧提交的冻结 manifest/lock 准备，当前产品已为 0.10.8。
git worktree add --detach "$OQ_CHECK_DIR/old-source" 7a23b15fbc37d21321ea2b7486cba5c1f533e62f
UV_PROJECT_ENVIRONMENT="$OQ_CHECK_DIR/old/pyzx-optimization" uv sync --frozen --no-dev --project "$OQ_CHECK_DIR/old-source/.agents/skills/pyzx-optimization" --python 3.12
"$OQ_CHECK_DIR/old/pyzx-optimization/bin/python" benchmarks/upstream-updates/pyzx_regressions.py
# 历史生产 pin 为 0.10.6：上行预期退出 1，JSON 中两个 SDK 反例失败。

UV_PROJECT_ENVIRONMENT="$OQ_CHECK_DIR/new" uv sync --frozen --no-dev --project benchmarks/upstream-updates/probes/pyzx --python 3.12
"$OQ_CHECK_DIR/new/bin/python" benchmarks/upstream-updates/pyzx_regressions.py
# 目标 0.10.8：预期退出 0。
```

## 11 月 8 日迁移计划（历史，实施见后续记录）

PR 正文是本次需求规格；本文件保存版本化诊断证据。最小迁移继续使用原有 SDK、
`optimize_pyzx_circuit` 和两宿主适配，不增加公开接口、转发层或运行时。

1. 等 #79 完成共享清单修改，重新从最新 main 核对其他在办 PR。
2. 同步原 PyZX manifest/lock、bridge 版本守卫、Tool source.version 与 SDK 生成清单；
   保持输入 schema、位序、可选参考和错误语义。
3. 核对 0.10.7/0.10.8 移除的旧提取、Quantomatic JSON、d3 和 gadget API，以及新的
   flow 默认值。仓库本身本次定向搜索未使用这些接口；自定义 SDK 程序仍可能受影响。
4. 运行现有 `tests/unitary-next-contracts.test.mjs`、
   `tests/harness-unitary-next.test.mjs` 与启用真实环境的
   `tests/unitary-next-live.test.mjs` 中 `real PyZX` 入口；
   补齐 Codex 清单、失败输入、required/skip 参考及生成清单检查。上述检查本轮未运行。
5. 对最终提交重新完成 Standards/Spec 自审和适用 CI，方可把 Draft 转为待审。
   生产升级前没有需要回退的 pin；升级后以同一 PR 的完整 pin/守卫/清单变更为回退单元，
   回退会重新带回本报告记录的旧版 SDK 缺陷。
