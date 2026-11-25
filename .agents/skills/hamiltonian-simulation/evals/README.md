# Hamiltonian 验证证据

本目录是开发证据，当前能力等级为 L3，已绑定版本化 Acceptance Profile、Result Package 与 Harness
Materializer。计算期 Validator 只给 observations，`provenance.complete=not_checked`；物化阶段重读
证据并复核来源后，只有 central Acceptance Builder 推导最终状态。没有 Reproduction Profile，
本目录不宣称任意科研任务已通过验收；此前 L2 证据保留为历史记录。

## 独立性与边界

Tool 仍用固定 Qiskit 2.5.2 构造电路、NumPy 2.5.3 / SciPy 1.18.1 计算态矢量及稠密对照。
`validators/reference.py` **只读取原始请求**，不导入 Tool bridge、Qiskit 或 Tool 返回值：按位翻转和
复相位构建 Pauli 矩阵，用 Hermitian 谱分解得到 `exp(-iHt)`，用 `cos(a) I - i sin(a) P` 构造独立
产品公式。同时重建 h/s/sdg/rz/cx 门、角度、wire、深度和恒等项全局相位；没有执行用户提供的 QASM。
JS Validator 仅解析这一明确门集，并逐项比较。左侧 Pauli 字符和态矢量最高位均为 q0。

独立参考仍使用 NumPy 的线性代数和 PCG64；这些检查不独立证明数值库、PRNG 或任意平台上的浮点
实现正确。参考遵循 `referenceMode=auto|required|skip`：auto 在不超过 6 qubits 时运行稠密部分，required
尝试请求规模，skip 不分配稠密矩阵；参考规模不限制主电路计算。即使跳过稠密对照，仍核对请求、门序列、
资源、采样预算与 seed。返回态矢量时总是重算范数；电路模式不填充虚构的态或保真度。

范数平方采用绝对容差 `1e-10`，沿用输入归一化边界；跨实现态幅、保真度和酉误差采用
`1e-10 + 1e-8 * |reference|`，用于浮点一致性，不能解释成物理误差目标或 Acceptance 阈值。

## Trotter 加密与误差界

参考在 N、2N、4N 个时间片计算完整酉谱范数误差。对于 order=p，记 `b=lambda*|t|/N`，`a=Cp*|t|/N`；
`C1=C2=lambda`，更高偶数阶依次乘 `4r + |1-4r|`，其中 `r=1/(4-4^(1/(p-1)))`。
产品公式与精确指数的 Taylor 系数至 p 阶相等，各自余项由 `exp(x)*x^(p+1)/(p+1)!` 控制，
N 个酉时间片的 telescoping 给出保守谱范数上界：

`B = min(2, N * (exp(a)*a^(p+1) + exp(b)*b^(p+1)) / (p+1)!)`。

JS 独立重算该界，并检查三种预算的误差与主 Tool 误差。经验阶数为 `log2(error(N)/error(2N))`；
只有两个连续比值均在 `p ± 0.5` 且三项误差都高于 `1e-10` 时报告观察到的阶数。
对易、零时间、舍入平台或尚未进入渐近区时，此项为 `not_checked`，不把经验收敛当普遍定理。
实时测试另外运行三种预算的实际 Tool，逐一与独立参考的误差比较，覆盖 p=1、2、4。

qDrift 检查的是确切采样次数、按非恒等实系数绝对值加权的 PCG64 序列及 seed 重放，限定同一 NumPy
版本、机器和逐次 choice 调用约定。它不保证单条随机轨迹的误差单调下降，也不把单次酉误差当作
平均通道的 diamond-distance 界；这一差别见 [Campbell 原论文](https://eprints.whiterose.ac.uk/id/eprint/150026/1/1811.08017.pdf)
的随机电路讨论与附录 B。当前没有对平均通道误差作科学验收。

## 固定案例与失败路径

7 份 fixture 来自 2026-11-25 macOS arm64 上两个独立 Python 进程的实际计算：Trotter 1/2/4、
qDrift、恒等相位、零时间、30-qubit 电路模式。共 29 个固定 eval，覆盖非法 Pauli、非实系数、
未归一化输入/输出、伪造范数/保真度/误差、错误步数/旋转数/门数/深度/门角、抽样预算与 seed 摘要、
参考请求和上界篡改，以及缺少参考/不兼容 NumPy。

fixture 摘要绑定 `cases.json`，case 摘要绑定 suite，suite 与 evidence 摘要绑定 manifest。
离线 fixture 不能冒充新一次 SDK 执行；实时测试额外覆盖完整替换 time/seed 后仍自洽的伪造结果、
复初态、重复项抵消、Python 非法输入和缺少依赖。未进行外部独立领域审稿或硬件验收。

## 重跑

```sh
node .agents/skills/hamiltonian-simulation/evals/run-evals.mjs
npm run capability:hamiltonian:test
node scripts/setup-paper-tools.mjs hamiltonian-simulation
OPENQUANTUM_REAL_HAMILTONIAN=1 node --test --test-concurrency=1 .agents/skills/hamiltonian-simulation/test/live.test.mjs tests/hamiltonian-live.test.mjs tests/harness-hamiltonian.test.mjs
```

环境位置使用 `OPENQUANTUM_PYTHON_ENV_ROOT`；依赖只由显式准备命令安装。实时 MCP 测试使用完整 OS
文件写入沙箱，Harness 用本地协议夹具，不调用真实模型、量子云或硬件。

将 Tool 的 structuredContent（含 input 与 result）保存为 result.json 后：

```sh
node .agents/skills/hamiltonian-simulation/validators/validate-result.mjs result.json
node .agents/skills/hamiltonian-simulation/validators/validate-result.mjs result.json --reference
```

默认不信任文件内携带的 reference，只检查可重算的请求/范数/预算/QASM 资源；`--reference` 才运行
独立 Python。检查失败退出 1，要求参考却缺少环境时明确 `not_checked` 并退出 2，不隐式安装。
Python 脚本本身缺 NumPy 时也退出 2。当前命令、计数和文件摘要见 `evidence-2026-11-25.json`。

## Phase 5 L3 增量

计算期固定 eval 继续检查 observations，`provenance.complete=not_checked`。当前 L3 合同另由
`tests/numerical-scientific-materialization.test.mjs` 和 `tests/harness-numerical-acceptance.test.mjs`
覆盖版本化 Profile、真实字节拒绝篡改、可读报告与 Session 重启回放。新增源码证据为
[evidence-phase5.json](evidence-phase5.json)；此前 L2 记录保留为历史，不代替新的验证。

Harness 宿主重跑独立参考时，使用与科学 MCP 相同的仅临时目录可写、`enforcement === "full"`
进程隔离；参考进程不能写安装目录或运行环境。沙箱缺失或隔离不完整时不启动参考，相关观察为未知，
不能生成 `passed` 的中央结果；取消时不发布 Acceptance。共享 Validator 仅接收进程执行函数，不依赖 Harness。
