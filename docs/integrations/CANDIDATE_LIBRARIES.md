# 候选库接入（2026-09-20）

本轮给 OpenQuantum 增加四个完整计算动作与一个直接上游 MCP 入口。它们由 Skill 指导，
经现有 Harness MCP Client 注册为 Tool；没有另建运行时。合并基线 `e92bf0b`（v0.5.1）已有 Graphix/PyZX/Symmer/PauLie
适配；合并保留这些能力，不计为本轮新增成果。[计划与去重决策](CANDIDATE_INTEGRATION_PLAN.md)。

| 能力 | 固定来源 | 默认策略 | 执行入口 |
| --- | --- | --- | --- |
| 门切割与期望值重建 | QCut 2.2.0；Qiskit 2.5.1；cutting addon 0.10.0 | 开启 | `qcut_local` → `knit_qcut_circuit` |
| 线路优化 | compactq 0.2.1；Qiskit 2.5.1 | 开启 | `compact_local` → `optimize_compact_circuit` |
| VQD 激发态 | OpenQARP 0.1.0 | 开启 | `openqarp_local` → `solve_openqarp_vqd` |
| angle 核与 QSVM | cqlib-qml `b3aeb784cf50150f7bb39c86a3a16e397d52ea50` 五文件适配；Rust cqlib `1d0a2c49ac32712d995f46147dfc5e3c4f4ac8e6`（1.4.0b1） | 按需启用 | `cqlib_kernel_local` → `fit_cqlib_angle_kernel` |
| 第二家量子 MCP | flagquantum-mcp-server 0.3.0；flagquantum 0.2.0 | 按需启用 | `flagquantum`，17 个原生上游 Tool |

所有依赖在各能力的 `uv.lock` 固定。四个适配 Tool 始终返回 `scientificValidation=not_evaluated`；
FlagQuantum 原生结果的 `status=success` / `accuracy.metric=not_measured` 也不等于科学 Acceptance。
默认开启是配置策略，不表示已重启当前运行中的 Host。可选项在量子组件设置中心启用后重启 Harness。

## 安装与运行

需要 Node 24+、uv 和 Python 3.12。cqlib 可选能力首次从固定源码编译，需要 Rust ≥1.89 与本机编译工具；
Rust cache 位于 `.openquantum/cargo-cache`。FlagQuantum 的 PyTorch 依赖较大，因此默认关闭。

```bash
npm run capability:candidates:setup
npm run capability:candidates:test
npm run capability:candidates:live
# 开发回归额外使用已有 QEC 固定环境
UV_PROJECT_ENVIRONMENT="$PWD/.openquantum/python-envs/qec-memory-experiment" uv sync --frozen --project .agents/skills/qec-memory-experiment --python 3.12 --no-dev
npm run benchmark:candidate-regressions
```

也可只准备所需环境，如 `node scripts/setup-paper-tools.mjs qcut-knitting compact-optimization`。
首次依赖物化会下载并写入本地磁盘；完整调用的最大副作用均按 `workspace-write` 登记。
计算子进程只接收明确允许的运行环境，不转发模型或硬件凭据。四个适配复用已有 worker 的取消、
并发互斥、超时、输出大小和失败协议。`execution` 省略时继承部署配置，worker 默认无时间/输出上限，线程数保留用户环境或后端默认值；逐次可覆盖。没有人为 qubit/数据规模上限。
大任务仍受实际内存、上游算法和 Harness 工具超时限制，需同步调整连接超时。新增连接沿用主线 `2147483647` ms 的默认调用超时，可在设置中心调整。FlagQuantum 保留原生 Tool schema，不接受 `execution`；数值线程/设备继承部署环境。

示例请求见 [固定回归输入](../../tests/fixtures/candidate-tools.mjs)，可直接用于相应 Tool。
Harness 测试使用本地模型协议替身驱动真实 Tool，临时测试 home 启用两个可选入口；不改产品默认值或模型路由。

## 科学合同与已知上游问题

**QCut。** 输入为 unitary 结构化门列表，最左 Pauli 字符是 q0。自动切割先用 Qiskit level 0 归一到
对称 CZ，再禁用 consolidation/joint cuts；这避开固定上游 finder 排序操作数导致反向 CX 错误的问题。
显式切割使用原始门索引和目标顺序。没有双比特门或没有选出 cut 时明确报错。首版只开放 gate cutting、
exact QPD 和本地 Aer，不开放 wire cutting、sampled expansion 或硬件任务。含中间测量的子实验由 Aer 执行。
分别报告 γ²、生成电路、实际完成电路和实际 shots；有限 shots 的重建值可超出 [-1,1]，不裁剪。

**Compact。** 输入不开放已复现 verifier 错误的 ECR/iSWAP。上游 tier 只作诊断；独立完整 Qiskit
unitary 比较保持线序、忽略全局相位，不符即拒绝候选。输出归一到标准 OpenQASM 2 的 u3/cx 后重新解析，
参考同时检查实际交付文本。原生双比特门数与共同 u/cx 基底 CX 数分列，CP 替代两个 CX 不写成硬件成本减半。
`skip` 或 auto 未运行参考时，也跳过上游昂贵诊断，优化结果明确为未独立检查的候选。

**OpenQARP。** 仅 VQD；复数 RY/RZ + 线性 CX ansatz，q0 为最低有效位、最左 Pauli 字符。
penalty 严格高于 `2*sum(abs(nonidentity coefficients))`。独立 NumPy 门运算与 matrix-free Pauli action
重算能量、残差方差和重叠；精确谱是可选参考。结果保持 deflation 顺序，保存每态 optimizer.success/message，
不排序掩盖重复态，也不把 optimizer success 写成正确激发态。

QCut/Compact/OpenQARP 使用 `referenceMode=auto|required|skip`。auto 分别在 ≤16/8/10 qubits 运行指数参考；
这是参考选择，不限制主任务规模。required 请求更大参考；skip 返回明确原因与 null 参考字段。

**cqlib-qml。** PyPI cqlib 1.3.11 缺少 QML 使用的新版 API；新 SDK 又将 McGate 更名为 MCGate，
且 VQC 所需 Operation 不再公开。因此本轮保存五个 Apache-2.0 核方法源文件，加入两处明确名称 alias，
缩小包导出，保留 LICENSE、修改标记、原始/适配后 SHA 与 patch。没有将 ValueOperation 冒充 Operation。
只开放 classical AngleEncoder：实际是 RY(2x)，核的独立公式为 `prod(cos(x-y)^2)`。
返回 Gram 不含 jitter；QSVM 训练对角加入上游 `1e-8`。训练/测试数组明确分开，无隐式全数据预处理；
同时给解析核分类与同输入 RBF 基线。不开放有符号振幅、共享参数 parameter-shift、VQC 或 swap test。
这个 product-state 核可经典解析，不构成量子优势。

## FlagQuantum 逐 Tool 副作用审阅

[上游服务](https://github.com/FlagQuantum/mcp-servers)的固定 0.3.0 wheel 实际 `tools/list` 保存为
[合同快照](../../.agents/skills/flagquantum-workbench/mcp/upstream-tools.json)，live 测试逐字段核对。
以下 17 项 Tool 均是本地 SDK 动作，没有硬件提交或账户管理；上游标记 `readOnlyHint=true`。
OQ 启动器通过 frozen uv 物化隔离环境，因此本地安装/缓存写入属于完整执行最大影响，**全部保守登记 workspace-write**。

- 电路与格式：`analyze_circuit_tool`、`serialize_circuit_tool`、`deserialize_circuit_tool`、`emit_openqasm_tool`、`emit_qcis_tool`。
- 编译与拓扑：`optimize_circuit_tool`、`route_circuit_tool`、`compare_topologies_tool`、`describe_layers_tool`、`describe_topology_tool`。
- 本地执行：`plan_execution_tool`、`simulate_circuit_tool`、`train_parameters_tool`。
- 参数与展示：`describe_gate_set_tool`、`inspect_parameters_tool`、`bind_parameters_tool`、`draw_circuit_tool`。

原生服务输入为 FlagQuantum IR JSON 或 QIR 门列表，不读取 OpenQASM 文本。失败通常返回
`status=error` 而非 MCP `isError=true`，Skill 明确检查两层错误。17 项合同均核对；本轮真实数值验证覆盖
Bell 仿真、结构分析与错误输入，不声称逐项验证全部编译、路由或训练算法。

## 开发证据与明确未接入的部分

[开发回归](../../benchmarks/candidate-libraries/README.md)吸收 CleitonForge 的三个许可 bug-zoo 输入，
以及 qec-burst-scaling 的原始噪声构建器/统计模块。它们不进入用户请求运行链、不注册 Validator。
源版本、LICENSE 和 SHA 均随文件保存。

量子库上游动态需按实际依赖核对：本仓库仍固定 Stim 1.16.0、PyMatching 2.4.0，QCEC 及其 MQT core
以既有锁为准；本轮没有引入 PECOS、cuda-quantum、PennyLane/Catalyst 或 pyquil，也未因其 breaking change
批量升级不使用的依赖。Stim 的 tag/注释 DEM→PyMatching 已测；**1.16.0 的未闭合 tag EOF 解析可卡住**，
回归将此输入放入短超时子进程并如实记录已知缺陷。当前 QEC Tool 不接受用户 DEM 文本，因此未新增该输入面。

GreenPeas 留待 NVIDIA CUDA 任务；rqm-compiler、tensorcircuit-ng 和 luoshu 留待明确工作负载；
Graphix 等主线既有能力保留，不重复计为本轮新增。Dense-Evolution 的 BSL、polypus 的 EUPL/独立数据权利、stresscf 的缺失许可，
以及硬件 CAD quantum-rf-pdk 均不进入本轮分发。
quantum-workflows / MORSE-FT / closed-quantum-process-memory-paper 只借鉴来源映射和输入/依赖/输出摘要，
不复制其他运行时。zero-gaze / RNTS / quantum-link-research 只列方法参考，不算运行能力。

原始 MCP 输出、Session 事件和测试日志在 `.openquantum/candidate-tools-evidence/`；可共享的固定分母、数值和
来源校验清单可用 `node scripts/summarize-candidate-evidence.mjs` 重建，见 [版本化证据](evidence/candidates-2026-09-20.json)。外部模型自主任务、真实 QPU、push 与发布均不在本次验证范围。

## 与 v0.5.1 主线合并的验证

以 `e92bf0b` 为主线基线，保留桌面、更新、本地化与既有四项 Unitary 能力。合并后的 macOS 全仓
`npm run check` 通过；新增数值输入 15/15、FlagQuantum 协议及实际调用、开发回归 10/10 和 5/5 通过。
Harness 首次与全仓检查并行时出现 HTTP 请求超时；单独复测完成五项成功调用及一次预期输入拒绝，
会话事件已重新读回。两次日志均保留，未把首次失败写成通过；复测仅使用本地模型协议替身。

本次合并保留 26 个默认开启、8 个按需开启的 MCP 连接。worker 的缺省 `execution`、线程继承与
连接超时均对齐主线资源策略，相关合同测试验证了环境继承和逐次覆盖。源码合并不等于 Host 已重新加载。
