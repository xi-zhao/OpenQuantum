# PPVM 原生 SDK

PPVM 补充近 Clifford 观测量、广义稳定子 tableau，以及丢失/泄漏电路建模。它通过既有 SDK 工作台和 `ppvm-simulation` Skill 使用完整原生 Python API；没有新增专用 Tool、MCP Server 或执行循环。DSH 和 Codex 共用这一份程序与依赖声明。

## 版本与准备

上游：[QuEraComputing/ppvm](https://github.com/QuEraComputing/ppvm)，Apache-2.0。
本次固定 [v0.3.0](https://github.com/QuEraComputing/ppvm/releases/tag/v0.3.0) 对应完整提交 `3cc883fd93b2475cb10c892a8a31adcc09a7579c`。发行名称 `bloqade-ppvm`，导入名 `ppvm`；版本权威是 [pyproject.toml](../../.agents/skills/ppvm-simulation/pyproject.toml) 和 [uv.lock](../../.agents/skills/ppvm-simulation/uv.lock)。本次核对时 PyPI 只有 0.2.0，因此固定 Git 源码的 Python 子项目，不用未发布 main。

```sh
node scripts/sdk-access.mjs inspect ppvm-simulation
node scripts/setup-sdk.mjs ppvm-simulation
node scripts/sdk-access.mjs inspect ppvm-simulation
```

发现只读，准备显式下载并编译，执行不安装。Python 固定 3.12；源码构建还需要支持 edition 2024 的 Rust 工具链、编译器和足够磁盘空间。沿用现有环境目录和缓存策略，不安装到用户全局 Python。然后使用 inspect 返回的解释器，在独立任务目录运行[可编辑示例](../../.agents/skills/ppvm-simulation/references/native-example.py)或用户程序。示例独占创建 `result.json`，避免覆盖旧结果；参数与两个 qubit 不是 API 限制。

## 如何选择

| 用户任务 | PPVM 路径 | 对照与限制 |
| --- | --- | --- |
| 带噪电路的少数 Pauli 观测量 | `PauliSum`、`LossyPauliSum` | 与小规模密度矩阵比较；整条门/噪声链倒序，角度不变；审查截断误差 |
| 非 Clifford 电路与测量 | `GeneralizedTableau` | 按物理时间正序；Python 绑定 1–2048 qubit，非 Clifford 系数增长决定实际成本 |
| 丢失、泄漏与重置语义 | tableau 的 loss/leakage/reset API | `reset_state` 保留丢失/泄漏，`reset` 恢复计算子空间；模型需要实验依据 |
| Stim 格式及 PPVM 扩展采样 | `StimProgram`、`sample_stim` | 先核实指令支持；保留 ZERO/ONE/LOST 原始记录，不直接把 LOST 转成 bool |

普通 Clifford 采样仍可优先 Stim；已有 Tsim/Clifft 支持的噪声与采样任务先比较。monoprop 提供另一种算符传播路径；方法相近不是价值证据，PPVM 的增量主要是可明确检查的丢失/泄漏及广义 tableau 语义。Rust 实现本身不证明提速，也不替代现有库。

## 必须保留的科学边界

- `correlated_loss_channel(a,b,[p0,p1,p2])` 中 `p1` 是失去指定一方的概率，恰好失去一方为 `2*p1`；约束为 `p0,p1>=0`、`p0+2*p1<=1`、`0<=p2<=1`。
- v0.3.0 的非对称丢失会按态给出丢失概率，但**不作用存活分支反作用**。这是一种轨迹近似，不是完整非对称量子通道。见固定版[实现说明](https://github.com/QuEraComputing/ppvm/blob/3cc883fd93b2475cb10c892a8a31adcc09a7579c/ppvm-python/src/ppvm/generalized_tableau.py)。
- 泄漏是上游模型的有效标记及操作语义，不代表多能级器件物理已校准；不把丢失、泄漏、Pauli 噪声混同。
- 保存种子、线程数、截断参数和规模；相同种子的复现不代表不同轨迹独立。复制 tableau 可能复制随机状态，应使用明确 seed 的 `fork`。
- 完整原生 SDK 中的 Bloqade 编译、Lindbladian、对称性和其他路径可以按需探索；本次回归没有逐项认证它们。

## 验证入口

`tests/ppvm-sdk.test.mjs` 检查只读发现、固定源码与显式准备合同。准备后运行既有 `tests/sdk-ecosystem-live.test.mjs` 的 PPVM 项，保存用户程序、版本、锁摘要及输出。`tests/fixtures/ppvm-validation.py` 使用独立密度矩阵、解析预期与离散事件检查旋转/噪声顺序、非 Clifford、丢失、泄漏、重置、采样与失败路径。

数值回归在 GitHub macOS 隔离环境执行，计算阶段禁止网络；[CI 工作流](../../.github/workflows/ppvm-sdk.yml)保存原始结果。开发容差和统计区间不注册为科研 Acceptance Profile；`scientificValidation=not_evaluated`。没有真实器件、性能优势、大规模收敛或已安装宿主界面验收声明。
