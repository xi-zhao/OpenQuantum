# OpenQuantum 任务示例与验证

[返回首页](../README.md) · [准备本地环境](integrations/LOCAL_ENVIRONMENTS.md) · [完整能力目录](CAPABILITIES.md)

先完成首页的[源码安装](../README.md#安装源码)。以下按固定本地案例、Agent 任务、算法程序和开发验证组织；每个案例保留其输入、依赖与结论范围。

[本地案例](#不需要模型密钥复算一个固定案例) · [Agent 任务](#让-agent-执行任务bell-态的制备与采样) · [算法示例](#直接运行开源算法示例) · [计算参数](#计算参数与运行方式) · [更多任务](#更多可复制的计算任务) · [结果与证据](#方法与结果可以继续复用) · [开发验证](#开发与验证)

## 不需要模型密钥：复算一个固定案例

以仓库内固定的[二量子位 Pauli Hamiltonian](../.agents/skills/quantum-ground-state/evals/fixtures/requests/protocol-fixture.json)为输入，原生 `solve_and_validate_ground_state` Tool 在指定粒子扇区内运行无噪声 VQE，再用独立闭式计算检查结果。完成[快速开始](../README.md#快速开始)的 `git clone` 与 `npm ci` 后，在仓库目录执行即可复算，无需模型密钥或量子云凭据：

```bash
npm run demo:quantum-ground-state
```

<table>
  <tr>
    <td align="center"><strong>-1.85727503 Ha</strong><br /><sub>VQE 能量</sub></td>
    <td align="center"><strong>-1.85727503 Ha</strong><br /><sub>独立精确参考</sub></td>
    <td align="center"><strong>4.44 × 10⁻¹⁶ Ha</strong><br /><sub>能量差</sub></td>
    <td align="center"><strong>15 项通过</strong><br /><sub>本地计算检查</sub></td>
  </tr>
</table>

以上数值来自 **2026-09-12 的本地复验**；[原始输出与运行记录](examples/quantum-ground-state-local-demo-2026-09-12.json)包含完整数值、检查状态、时间、源码提交、输入摘要和 Node.js 版本。

<details>
<summary><strong>这次运行检查了什么，以及还差什么</strong></summary>

该运行记录中，15 项本地计算检查通过，1 项会话来源检查未执行，尚未形成完整科学验收结论。能量差反映该数值案例与精确参考的一致程度；科学适用范围仍限于给定的 Hamiltonian 和粒子扇区。

完整科学验收还需要通过 Harness 执行任务、保存结果文件和会话来源，并生成可重读的验收报告。配置模型后的验证入口见[开发与验证](#开发与验证)。

</details>

<a id="发起任务并选择后端"></a>

## 让 Agent 执行任务：Bell 态的制备与采样

配置模型后，新建会话，发送下面的请求：

> 用 FatQat 从双量子位全零态出发，对 q0 施加 H，再以 q0 为控制位、q1 为目标位施加 CX。返回无噪声精确概率，并用 1024 次采样、seed=7 比较频数。

Agent 可以调用 FatQat 电路工具执行计算，工作台保留工具输入和返回结果。你可以查看精确概率与采样频数，再继续提出问题：

> 保持电路和 seed 不变，把采样量改为 8192 次，比较两次频率与精确概率的偏差。

这个电路的理想概率是 `00`、`11` 各 50%；有限采样的频率会波动。比较两次采样可以观察这种波动，单次增加采样量不保证每个频率都更接近理想值。

上方提供了可复制的请求与理论预期。运行前，先按[配置模型](../README.md#配置模型)接入支持 Tool Calling 的模型，否则 Agent 无法调用计算 Tool。FatQat 连接默认开启，首次运行前仍需执行 `node scripts/setup-paper-tools.mjs fatqat-workbench` 准备锁定依赖。接口详情与本地验证记录见 [FatQat 使用说明](integrations/FATQAT.md)。

## 直接运行开源算法示例

不需要模型密钥或量子云账户。基础方法先准备 NumPy、SciPy 和 Qiskit：

```bash
npm run capability:algorithms:setup -- --minimal
```

macOS / Linux 可直接查看方法、输入说明并运行默认 HHL 算例：

```bash
examples/quantum-algorithms/.venv/bin/python examples/quantum-algorithms/run.py --list
examples/quantum-algorithms/.venv/bin/python examples/quantum-algorithms/run.py --describe hhl
examples/quantum-algorithms/.venv/bin/python examples/quantum-algorithms/run.py --algorithm hhl
```

Windows PowerShell 使用对应解释器路径：

```powershell
& examples/quantum-algorithms/.venv/Scripts/python.exe examples/quantum-algorithms/run.py --algorithm hhl
```

需要 QSP/QSVT 等方法时，运行 `npm run capability:algorithms:setup -- --group pennylane`；其他组为 `gradients`、`tensor`、`chemistry`，补装会保留已安装的其他组。不带参数的 `npm run capability:algorithms:setup` 仍准备全部依赖。完整环境含 PySCF，Windows 建议使用 WSL；已完成的数值验证范围是 macOS CPU。

自己的参数通过 JSON 文件和 `--input` 传入，结果可用 `--output` 保存。也可以在配置模型后，让 Agent 使用 `quantum-algorithms` 或具体方法 Skill 执行。完整参数、位序、方法差异与依赖组见[算法示例说明](../examples/quantum-algorithms/README.md)。

## 计算参数与运行方式

在各工具支持的模型与输入范围内，你可以选择量子位数、电路长度、Hamiltonian 项数、采样量和迭代预算。可用参数与规模以具体工具接口为准，运行能力取决于所选算法、后端和计算资源；限定模型的参考案例不代表所有工具的适用范围。

主计算与精确对照分开：可以直接优化电路、生成 MBQC 模式、做对称性降维、分析 Lie 代数或运行张量算法。需要额外验证时，通过 `referenceMode` 选择自动、强制执行或跳过独立参考。完整参数、返回值和资源配置见[本地计算说明](integrations/SCALABLE_BRIDGES.md)。

本地核验的具体输入、版本和结果保留在各接入文档的验证记录中，便于复现。

## 更多可复制的计算任务

<details>
<summary><strong>电路、基态、噪声、动力学与基准查询示例</strong></summary>

先完成模型配置，再按所选能力准备固定依赖。以下本地计算无需量子云账户；使用 uv 的能力准备各自的固定 Python 环境，版本见相应说明，Dynamiqs 使用已安装的 JAX 后端。升级后重启工作台并新建会话。

| 能力 | 准备命令 |
| --- | --- |
| SQD 与 TeNPy | `npm run capability:paper-tools:setup -- sqd-chemistry tenpy-ground-state` |
| Trotter / qDrift | `npm run capability:hamiltonian:setup` |
| Mitiq 误差缓解 | `npm run capability:mitiq:setup` |
| Dynamiqs、Clifft、OQuPy、Deltakit | `npm run capability:unitary:setup` |
| Bloqade Analog | `npm run capability:bloqade:setup` |
| 国内外厂商 SDK：可微分、编译、优化、光子与设备模型 | `npm run capability:vendor-sdks:setup`；[17 项范围、许可与调用示例](integrations/VENDOR_SDKS.md) |
| 公司与机构 SDK：编译、仿真、化学与资源估算 | `npm run capability:sdk-expansion:setup` 准备 14 个默认连接环境；[20 项范围与可选入口](integrations/SDK_EXPANSION.md) |
| 网络、控制、光学与云 SDK | `npm run capability:sdk-gaps:setup` 准备 7 个默认连接环境；[15 项范围与可选入口](integrations/SDK_GAPS.md) |
| Clifft 记录采样与 qBraid 转换；QDMI 驱动查询 | `npm run capability:interop:setup`；QDMI 另运行 `npm run capability:qdmi:setup` 并启用连接，见[接入说明](integrations/QUANTUM_INTEROP.md) |
| Metriq 公开基准查询 | 已随源码提供，完成 `npm ci` 即可，无需 Python 或额外下载 |

| 想探索什么 | 示例请求 | 重点查看 |
| --- | --- | --- |
| 演化精度与资源 | 用 hamiltonian-simulation 从两量子位全零态出发，模拟 H = XX + 0.5 ZI 的无量纲演化 t=1；分别使用二阶 Trotter、4 步和 8 步，要求独立精确参考，返回末态并比较酉矩阵误差与电路资源。 | Pauli 字符从左到右为 q0、q1；步数与误差、资源的关系 |
| 电路互操作 | 用 qBraid 把三量子位电路 H(0)、CX(0,2) 从 Qiskit 转为 Cirq，保留空闲 q1，并检查完整酉矩阵在忽略整体相位后是否一致。 | 空闲量子位、位序、转换路径与实际参考状态 |
| T 门干涉 | 用 Clifft 从两量子位全零态出发执行 H(0)、T(0)、H(0)、CX(0,1)，无噪声、4096 shots、seed=7；比较位串频数与密度矩阵参考。 | 位串从左到右为 q0、q1；有限采样误差 |
| 分子基态 | 用 SQD 计算键长 0.735 Å 的 H₂/STO-3G，使用默认合成样本，报告总能量、同基组 FCI 参考和能量差，并标明样本来源。 | 样本覆盖与能量差；合成样本的结果不构成量子优势证据 |
| 多体基态 | 用 TeNPy 计算四站点、自旋 1/2 的开放 Heisenberg 链，Jx=Jy=Jz=1，hx=hz=0。报告 DMRG 能量、精确对角化参考、能量差与纠缠熵，并注明 S=Pauli/2。 | Hamiltonian 约定、参考结果与收敛情况 |
| 噪声缓解效果 | 用 Mitiq 对单量子位 H–RZ(0.7)–H 电路的 Z 期望值做 ZNE。门去极化概率 0.02，每个比较臂每次 8192 shots，重复 8 次、seed=7；比较原始与缓解后的误差和成本。 | 经验偏差、方差和 RMSE；缓解结果也可能变差 |
| 纠错码片 | 用 Deltakit 构建 5×3 码片的 Z 存储实验，3 轮、ToyNoise p=0.02、4096 shots、seed=718，返回含噪电路、逻辑失败数和 Wilson 区间。 | 数据量子位尺寸与实际总量子位数；固定采样分母 |
| 驱动灵敏度 | 用 Dynamiqs 从计算基态出发，比较驱动幅度 0.5 和 1，失谐 0、衰减率 0.1、时长 1、20 步；采用一致的无量纲单位，返回激发态人口与末态人口对驱动的梯度。 | 自动微分与独立有限差分是否一致 |
| 环境记忆 | 用 OQuPy 从 plus 态出发，tunneling=0、bias=0.4、alpha=0.1、cutoff=2、temperature=0、duration=0.5；分别用 steps=memorySteps=8 和 12，与零温纯退相干解析式比较。 | 两组网格保持相同物理记忆时长；此算例不代表整个参数域收敛 |
| 公开设备基准 | 查询 Metriq 中 provider 包含 origin 的记录，列出设备、测试时间、基准类型、原始参数和指标，并标明来源。 | 历史数据的基准定义与实验条件；不等同于当前设备性能 |

只准备所需 SDK 时，运行 `node scripts/setup-paper-tools.mjs <capability-id>`，能力 ID 见对应接入表。准备环境与启用连接分别完成；云服务的账户、密钥和权限由用户设置。各 SDK 的平台支持与许可不同，安装包验证不表示所有可选 SDK 都已在三个平台运行。

其余论文方法也可按需安装；RandomMeas 随机测量另需 Julia 1.12.7。[完整安装与输入范围](integrations/PAPER_BACKED_TOOLS.md#安装与调用)列出了各项准备条件。

这些能力已有本地数值或数据检查，以及真实 Harness 调用与会话重读的验证记录。端到端测试使用本地模型协议替身，尚未验证外部模型自主执行或真实 QPU。当前保持 L1，返回 `scientificValidation=not_evaluated`。模型约定、资源配置与验证记录见 [Mitiq 接入说明](integrations/MITIQ.md)和 [Unitary 生态接入说明](integrations/UNITARY_ECOSYSTEM.md)。

</details>

<a id="执行记录与科学验收"></a>

## 方法与结果可以继续复用

工作台保存任务的请求、工具调用和返回结果，便于查看过程并继续追问。你可以调整参数、选择其他已接入的后端，或把常用研究步骤写成 Skill，供后续任务按需读取。

在支持的能力中，计算结果附带精确参考、独立检查或统计误差信息。已接入完整科学验收的能力会连接输入、结果文件和会话来源；各宿主的接通范围分别核对。

<details>
<summary><strong>执行记录与科学验收的详细说明</strong></summary>

科研工作台记录任务请求、Skill 加载、工具调用、权限状态与返回结果，便于回溯执行过程。设置中的“已启用”仅表示配置策略；当前工具是否可调用、服务是否可达，仍需查看对应的运行证据。

系统将“运行完成”与“科学验收”状态分别呈现。具备完整科学验收流程的能力会串联输入、结果文件、独立检查与会话记录，生成列出通过、失败或尚未检查项目的验收报告；其他工具则按各自支持范围报告数值结果与检查状态。

![从计算结果、证据物化和独立检查，到结合规则与来源链的科学验收](images/openquantum-evidence-flow.png)

图中展示已接入完整科学验收的能力如何形成证据；[查看可编辑图源](architecture/openquantum-evidence-flow.html)。

科学验收支持范围按能力和宿主分别声明，不能由一次 Tool 成功返回推定。验证依据见[能力声明](../.agents/capability-packages.yml)、[架构审计](architecture/ARCHITECTURE_AUDIT.md)和[固定量子能力 Benchmark](../benchmarks/quantum-capabilities/README.md)。

[候选库接入与回归证据](integrations/CANDIDATE_LIBRARIES.md)说明新增五项入口、CleitonForge 编译回归样本及 qec-burst-scaling 局域爆发噪声实验；后两项属于开发证据。

</details>

## 开发与验证

<details>
<summary><strong>配置检查、数值回归与端到端验证</strong></summary>

```bash
# 检查 Harness 组合配置
npm run harness:config

# 运行完整离线质量检查
npm run check

# macOS/Linux：用固定依赖运行本地数值回归与 Harness 接线验证
npm run capability:mitiq:live
npm run capability:unitary:live
npm run capability:candidates:live
npm run capability:hamiltonian:live
npm run capability:interop:live
npm run capability:algorithms:live
npm run capability:bloqade:live
npm run capability:vendor-sdks:live
npm run capability:sdk-expansion:live
npm run capability:sdk-gaps:live
npm run benchmark:candidate-regressions

# 配置模型后运行真实 Agent 端到端测试
npm run e2e:quantum-harness -- --provider openquantum-public
```

```text
.agents/skills/          量子 Skill 与科学资源
examples/quantum-algorithms/  可修改的开源算法示例、输入说明与覆盖映射
runtime/openquantum/     Agent Preset、原生 Tool Provider、Harness MCP Client 声明和 Harness 界面扩展
src/settings/server/     设置中心的服务端配置边界
src/readiness/server/    当前 Harness Registry 的只读运行状态边界
scripts/                 启动、诊断和端到端测试
tests/                   平台集成测试
docs/                    架构、路线与生态文档
```

更完整的文档入口见 [docs/README.md](README.md)。

[固定量子能力 Benchmark](../benchmarks/quantum-capabilities/README.md)使用 [MQT Bench](https://github.com/munich-quantum-toolkit/bench) 的 3 个固定电路案例与 manifest 做开发回归，属于开发与 CI 证据，不是 Skill 或 MCP 服务。

源码升级的固定版本、兼容性和验证记录见 [2026-09-22 量子库更新](releases/2026-09-22-quantum-upstream-update.md)及 [2026-09-10 平台升级](releases/2026-09-10-upstream-update.md)。应用安装包的变化另见[v0.8.4 发布说明](releases/v0.8.4.md)。

2026-09-24 的[算法适配](integrations/UNITARYLAB_OPEN_ADAPTATION.md)、[本地互操作](integrations/QUANTUM_INTEROP.md)和[治理证据](integrations/evidence/extension-governance-2026-09-24.json)分别记录源码接入、实际 SDK 计算与 Harness 会话验证；这些记录不代表新安装包发布、外部模型或真实硬件验收。

</details>
