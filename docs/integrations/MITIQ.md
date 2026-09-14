# Mitiq 本地误差缓解

接入固定 [Mitiq 1.1.0](https://github.com/unitaryfoundation/mitiq/tree/v1.1.0)，提供
`mitiq_local.run_mitiq_experiment` 与 `mitiq-error-mitigation` Skill。四种方法共用一个实验接口，
返回理想参考、原始/缓解估计、完整重复结果、经验偏差/方差/RMSE，以及实际电路和采样开销。

## 安装与使用

```sh
npm run capability:mitiq:setup
npm run capability:mitiq:test
npm run capability:mitiq:live
```

需要 Node.js 24+ 和 uv。依赖固定于能力目录的 `uv.lock`，安装到
`.openquantum/python-envs/mitiq-error-mitigation`，Python 3.12；不会修改全局解释器或其他能力环境。
当前锁包含 Mitiq 1.1.0、Cirq 1.6.1、NumPy 2.2.6、SciPy 1.17.1。
首次 Tool 调用也会由 uv 准备环境，因此完整调用声明为 `workspace-write`，可访问包源下载依赖。
数值计算不访问云 API、不接收路径/代码/凭据、不提交 QPU 任务。

默认 OpenQuantum Preset 开启 `mitiq_local`，设置中心显示“Mitiq 误差缓解”。运行中的 Host 需要重启加载
新增连接，用户仍可通过 MCP 连接设置关闭它。可请求：

> 用 Mitiq 比较一量子位 H–Rz(0.7)–H 电路的 Z 期望值，门去极化概率 0.02，
> 每个比较臂每次重复 8192 shots，重复 8 次；报告 ZNE 的误差和资源开销。

Tool 支持 1–4 qubits、最多 24 个 `H/X/Y/Z/S/RZ/CX/CZ` 门，RZ 角度单位为弧度。
targets 从 0 开始，Pauli 字符串最左字符对应 q0；默认电路是两量子位 H–Rz(0.7)–H–CX，observable 为 ZI。
不接收任意 QASM、动态电路或其他硬件后端。当前是 Mitiq 的有界 Cirq 接入，不代表其所有前端与方法均已开放。

## 实验与成本约定

`shotsBudget` 表示**每次重复、每个比较臂**的总 shots。整次调用为
`2 × replicates × shotsBudget`，最大 524288 个模拟 shots。
两臂使用独立随机流，每次重复重新采集全部训练、校准和目标数据；不把重复电路的第一次采样免费复用。

| 方法 | 实际调用与预算分配 | 物理假设 |
| --- | --- | --- |
| ZNE | `zne.construct_circuits` + `fold_global`，尺度 `[1,3,5]`；预算均分三个电路，`zne.combine_results` + Richardson 二阶外推 | 局域门去极化噪声可由折叠增加；外推误差与统计方差仍存在 |
| REM | 半数预算测量全零/全一校准设置，半数测量目标；`rem.generate_tensored_inverse_confusion_matrix` 后直接计算准概率期望 | 独立对称读出翻转，理想校准制备及终端测量基变换；不校正剩余门噪声 |
| PEC | 上游局域去极化 `OperationRepresentation`、`pec.construct_circuits` 和 `pec.combine_results`；预算分配给 `pecSamples` 个带符号样本 | 完全已知模拟噪声、理想补偿 Pauli；门标签区分原始操作与补偿操作，防止错误加噪 |
| CDR | `cdr.execute_with_cdr`，所有非 Clifford RZ 随机替换为 Clifford；预算均分目标和训练电路，训练标签用理想模拟 | 仅 Z 对角 observable；拒绝全 Clifford 目标、恒定 ideal labels、秩亏或严重病态训练 |

门噪声在每个原始门后对其作用 qubit 独立施加 Cirq `depolarize(p)`：
`(1-p)rho + p/3*(XrhoX+YrhoY+ZrhoZ)`。其 Bloch 收缩为 `1-4p/3`。
ZNE 的折叠门都计入噪声，PEC 补偿门按上述理想假设计；用户输入的 X/Y/Z 原始门照常加噪。
REM 读出噪声由 `readoutProbability` 设置，其他三种方法目前要求该值为 0。
终端测量基变换被视为理想，电路的 `gateCount/depth` 记录计算与缓解变体，不含测量和经典后处理。

PEC 的已知噪声模型来自用户参数，未测量真实噪声表征成本；增加每个样本的 shots 不能消除有限
`pecSamples` 带来的准概率 Monte Carlo 方差。结果保留每个样本的符号、线性系数与 shots。
REM 保留线性准概率估计，不调用高层接口的正分布投影和再采样；允许负准概率与超出 `[-1,1]` 的期望。
CDR 使用明确的经典训练标签，理想目标值只用于最终比较，不泄露给回归；训练退化时显式失败，不偷偷换 seed。

## 返回与科学边界

- 记录归一化输入及 SHA-256、依赖锁 SHA-256、上游版本、每个电路摘要、shots、门数、深度和方法细节。
- `variance` 为重复结果的经验总体方差；`meanStandardError` 使用样本方差除以重复数。
  bias、RMSE 都相对于小系统理想参考计算；这些是有限重复的统计估计，不是保证区间。
- 保留所有 seed 与变差结果；两臂 shots 相同不表示门数、深度、wall time 相同。
- 本能力为 L1，固定 `scientificValidation=not_evaluated`，没有接入 Acceptance Profile、Materializer 或中央科学验收。
  本地模拟结果不代表真实硬件效果、量子优势或外部模型自主选用能力。

## 验证

离线合同测试查询真实 MCP `tools/list`，按 policy 比较名称和副作用，覆盖输入边界、错误、来源篡改、
环境变量隔离、繁忙及取消恢复。真实数值检查通过 MCP 调用四种方法，重算预算、统计、输入/锁摘要，
检验固定 seed、零噪声下 ZNE 变差、REM 位序及 CDR 训练退化。
独立 Python 回归重建 PEC 噪声通道，并覆盖补偿门错误加噪、丢失标签及缺失 representation。

Harness 端到端测试使用本地模型协议替身调用真实 Mitiq，检查 Skill 发现、四方法执行和 Session 结果重读。
它不访问外部模型或 QPU。运行证据写入 `.openquantum/mitiq-evidence/`，数值结果与 Harness 会话分别保留。

本次实际通过完整 `npm run check`、四方法数值/预算回归、4 项独立 Python 科学检查和真实 Harness
会话重读；安装器再次执行确认锁不变。独立领域审阅未发现阻断性科学问题。
[版本化验证摘要](evidence/mitiq-2026-09-14.json)记录源码/锁摘要、固定输入、数值和本地日志摘要。
这些是 macOS 本地开发证据，外部模型与真实硬件仍未验证。

## 许可证与发行边界

Mitiq 为 GPLv3。能力目录 `.agents/skills/mitiq-error-mitigation/`（含调用它的 Python worker）明确采用
GPL-3.0-only，并携带完整 LICENSE 与 NOTICE；根目录的 MIT 声明不覆盖该目录。
依赖按锁从 PyPI 安装，上游源码不复制到仓库、不改写许可证。

独立进程用于隔离依赖和执行，不是免除 GPL 义务的结论。重新打包分发该能力及依赖时，需要保留版权与许可，
按实际组合方式履行相应源码提供等义务；本次本地接入不构成对所有未来发行形态的兼容性判断。
参见 [GNU FAQ](https://www.gnu.org/licenses/gpl-faq.html.en#MereAggregation) 和
[第三方声明](../../THIRD_PARTY_NOTICES.md)。
