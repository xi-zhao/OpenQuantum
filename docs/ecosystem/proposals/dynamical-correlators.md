# 用 DynamicalCorrelators.jl 计算有限温度 Hubbard 链的自旋谱

调研日期为 2026-11-23（北京时间）。
同日接入复核决定**保留观察**。在提案指定的平衡态 Hubbard 链上，仓内已锁定的 TeNPy 用一个热态检查点就能跨进程追加所有扰动源。[同题实测](#integration-evidence)
OpenQuantum 基线为 `4b06e3ce0f1fa62f6a294c7c538c9e9e2c0f8c92`。
上游采用 MIT 许可，固定 `v0.15.0` 和提交 `3488f641877fcf6e5685009f73da7b2f0ee4f959`。
Julia General 登记的源码树 `a4044d9eeef312de5fae802aef98114706593b68` 与该标签一致。
版本发布于 11 月 5 日，本次窗口内的两次提交更新了 HPC 教程，其中一次纠正了示例使用的 Hubbard 模型。
[正式发行](https://github.com/Quantum-Many-Body/DynamicalCorrelators.jl/releases/tag/v0.15.0) · [Julia General 版本记录](https://github.com/JuliaRegistries/General/blob/8f563d2cd079c1e7921411c52b065f8037b8854f/D/DynamicalCorrelators/Versions.toml) · [窗口内的文档修正](https://github.com/Quantum-Many-Body/DynamicalCorrelators.jl/commit/5d5d6af5d53411fd804679bbf04546c1f6d10e4e)

## 研究问题与现有路径

研究者想知道一维 Hubbard 链在给定温度下，某个格点的自旋扰动如何传播，以及哪些频率携带谱权重。
输入是哈密顿量、系综、温度、源算符与采样网格，输出是复关联矩阵 $C_{ij}(t)=\langle S_i^-(t)S_j^+(0)\rangle_\beta$ 和由它投影的有限时间谱。
有限温度自旋结构因子有独立的物理应用，Barthel 等对 XX、XXX 链的研究给出了实例。
该论文支持任务需求，软件精度另由接入实验核对。
[独立研究](https://arxiv.org/abs/0901.2342) · [产品定位](../../../README.md#科研能力) · [路线图第 1 条](../../roadmap/VISION.md#平台基础)

仓内的 `solve_tenpy_chain` 给出自旋链基态能量、局域磁化与纠缠熵。
已接入的 TeNPy 1.1.1 原生接口更广，已有纯化、双态实时演化和 `SpectralSimulationEvolveBraKet`。
它是本提案的同题基线。
该模拟的默认循环在每一轮分别推进 bra 和 ket。若后续更换扰动位置，希望直接读回同一条热态轨迹，就要处理轨迹与各个源的对齐和测量。
[现有 Tool 合同](../../../.agents/skills/tenpy-ground-state/mcp/contracts.mjs) · [仓内 TeNPy 版本](../../../.agents/skills/tenpy-ground-state/pyproject.toml) · [TeNPy 纯化实现](https://github.com/tenpy/tenpy/blob/f08212bc972e0a08d123209288a0941379119963/tenpy/algorithms/purification.py#L85-L153) · [双态演化](https://github.com/tenpy/tenpy/blob/f08212bc972e0a08d123209288a0941379119963/tenpy/simulations/time_evolution.py#L385-L452) · [谱接口](https://github.com/tenpy/tenpy/blob/f08212bc972e0a08d123209288a0941379119963/tenpy/simulations/time_evolution.py#L503-L549)

提案要检验的增量是**跨多个扰动位置复用热态轨迹**。
上游 `evolve_mps` 接受 `save_id=eachindex(times)`，可显式保存每个时刻的热态。
`dcorrelator(rho_path,H,op,ids;times)` 可以在后一次调用中读取同一文件，为各源单独演化受扰态，一次收集所有测点，以初始纯化态的范数平方作归一化。
由此可以给已归档的同一热态追加新的源位置。
立项时的价值假设是打通计算步骤，端到端时间、磁盘成本和可达规模当时均无实测。
当前已有带锁 Julia 环境的接入方式，也有完整的同题基线，可以直接检验这项增量。
[轨迹写入](https://github.com/Quantum-Many-Body/DynamicalCorrelators.jl/blob/3488f641877fcf6e5685009f73da7b2f0ee4f959/src/observables/dcorrelator.jl#L18-L56) · [多源读取与结果维度](https://github.com/Quantum-Many-Body/DynamicalCorrelators.jl/blob/3488f641877fcf6e5685009f73da7b2f0ee4f959/src/observables/dcorrelator.jl#L635-L712) · [现有 Julia SDK 实例](../../../.agents/skills/tnqs-dynamics/Project.toml)

## 接入方式与持续成本

立项时拟复用共享 [SDK 工作台](../../../.agents/skills/quantum-sdk-workbench/SKILL.md)，提供一个固定 Julia 环境、一份领域 Skill 和可编辑的本地示例。
两个宿主沿用已有准备和代码执行入口。
调用者需要注明模型、系综、时间与展宽单位、源和测点编号、张量截断以及轨迹所在的任务目录。
谱的相位、归一化和误差由同一份示例说明。
公共接口以原生 SDK 为限。
[扩展选择](../../architecture/EXTENSION_MODEL.md#6-新需求放在哪里)

上游兼容 Julia 1.11–1.12，自带的 Manifest 使用 1.12.5。仓内已有 Julia 1.12.7，可在独立环境检验。
主要维护面是 MPSKit 0.14、TensorKit 0.17、JLD2 轨迹读写及数值约定。
绘图依赖 CairoMakie 为可选项。
上游 CI 配置覆盖 Linux x64 的 Julia 1.12。立项时尚未验证 macOS 上的准备与运行。
每次验证使用独立目录，记录轨迹字节数。文件的复用范围限同一模型、温度、网格和锁定环境。
[依赖与兼容范围](https://github.com/Quantum-Many-Body/DynamicalCorrelators.jl/blob/3488f641877fcf6e5685009f73da7b2f0ee4f959/Project.toml) · [上游锁文件](https://github.com/Quantum-Many-Body/DynamicalCorrelators.jl/blob/3488f641877fcf6e5685009f73da7b2f0ee4f959/Manifest.toml#L1-L5) · [CI 配置](https://github.com/Quantum-Many-Body/DynamicalCorrelators.jl/blob/3488f641877fcf6e5685009f73da7b2f0ee4f959/.github/workflows/CI.yml) · [许可证](https://github.com/Quantum-Many-Body/DynamicalCorrelators.jl/blob/3488f641877fcf6e5685009f73da7b2f0ee4f959/LICENSE)

## 可否决的接入实验

1. 用四站点、开边界的自旋 $1/2$ 费米 Hubbard 链，跃迁为 1、排斥 $U=2$、化学势 $\mu=1$，取 $\hbar=k_B=a=1$。
   在全部 $4^4=256$ 个 Fock 态上独立构造哈密顿量与 $S^\pm$，取巨正则迹。
   固定上游的 `U1Irrep × U1Irrep` 自旋升算符通道，同题 TeNPy 输入采用相同的跃迁符号、格点顺序和系综。
   [模型定义](https://github.com/Quantum-Many-Body/DynamicalCorrelators.jl/blob/3488f641877fcf6e5685009f73da7b2f0ee4f959/src/models/hamiltonians.jl#L6-L18) · [自旋通道](https://github.com/Quantum-Many-Body/DynamicalCorrelators.jl/blob/3488f641877fcf6e5685009f73da7b2f0ee4f959/src/operators/fermions.jl#L133-L148)
2. 先检验热态。
   无限温时每个站点 $C_{ii}(0)=1/4$。在 $\beta=1$ 时，比较 $Z(\beta)/Z(0)$ 与全部独立本征值的 Boltzmann 和除以 256 所得的比值。
   固定版教程的“冷却”示例传入实数时间，源码把时间步乘以 $-i$，而上游配分函数测试传入 `-im * bs`。
   接入须用虚时间准备到 $\beta/2$，再用实时间传播。
   保留误用实时间时的负对照，核对它能被热态检查检出。
   上游分别测试了零温动力学与有限温配分函数，二者仍未覆盖这里的有限温复关联矩阵。
   [教程](https://github.com/Quantum-Many-Body/DynamicalCorrelators.jl/blob/3488f641877fcf6e5685009f73da7b2f0ee4f959/docs/src/tutorials/finite_temperature.md#L73-L99) · [演化因子](https://github.com/Quantum-Many-Body/DynamicalCorrelators.jl/blob/3488f641877fcf6e5685009f73da7b2f0ee4f959/src/finiteengine/timeevolution.jl#L39-L49) · [上游测试](https://github.com/Quantum-Many-Body/DynamicalCorrelators.jl/blob/3488f641877fcf6e5685009f73da7b2f0ee4f959/test/DynamicalCorrelators.jl#L809-L874)
3. 在单进程 CPU 上取实时间网格 `0:0.05:4`，保存一次热态实时轨迹。
   先算一个源位置，再在新调用中用同一文件补齐其余源。
   检查文件摘要、源与测点顺序，以及每个时刻的复数值。
   独立参考用稠密本征态作 Lehmann 求和，权重为 $e^{-\beta E_m}/Z$，相位为 $e^{i(E_m-E_n)t}$。
   固定版本返回 `-im * C`，落盘的 `pro_k` 保存乘因子之前的值。
   统一约定后检查全部矩阵元，再将完整矩阵投影到 $q=\pi$，明确 $1/L$、频率正负号、展宽和时间窗，使用同一离散变换比较两份谱。
   缺少指定时刻的轨迹应给出可见失败。
   [返回值与磁盘格式](https://github.com/Quantum-Many-Body/DynamicalCorrelators.jl/blob/3488f641877fcf6e5685009f73da7b2f0ee4f959/src/observables/dcorrelator.jl#L586-L632) · [空间变换约定](https://github.com/Quantum-Many-Body/DynamicalCorrelators.jl/blob/3488f641877fcf6e5685009f73da7b2f0ee4f959/src/observables/fourier.jl#L104-L137)
4. TeNPy 用同一组源、时间点和同等数值精度完成任务。减半时间步、增大保留维数，记录复数最大绝对误差、截断与收敛、峰值内存、总磁盘、首次准备时间和追加源耗时。比较两边都需手写或重复执行的步骤。若有限温结果不能收敛到独立参考、追加源仍需重做热态，或 TeNPy 的现成接口已能同样复用轨迹且准备成本更低，就停止新增环境，保留同题结果。

<a id="integration-evidence"></a>

## 两个库在同一条链上的实测

热平衡给了这道题一个更省存储的做法。令 $X=e^{-\beta H/2}$、$U=e^{-iHt}$。在纯化表示中，同时演化物理腿和辅助腿相当于 $X\mapsto UXU^\dagger=X$。未受扰动的 bra 可以固定，只需演化每个源的受扰 ket。TeNPy 1.1.1 已实现这个辅助腿操作。论文给出方法，以下数值来自本次 OpenQuantum 隔离实测。[Karrasch 等的原始工作](https://arxiv.org/abs/1303.3942) · [TeNPy 纯化约定](https://github.com/tenpy/tenpy/blob/f08212bc972e0a08d123209288a0941379119963/tenpy/networks/purification_mps.py#L83-L109) · [反向门实现](https://github.com/tenpy/tenpy/blob/f08212bc972e0a08d123209288a0941379119963/tenpy/algorithms/disentangler.py#L106-L136)

固定上文四站点模型和 $\beta=1$。独立参考用占据数基底和费米符号构造全部 256 维矩阵，经对角化作 Lehmann 求和。各方案均在 Apple M4 单进程、单线程上计算全部源和测点。在 81 个时刻逐项比较 1,296 个复数，再将 $q=\pi$ 的关联函数按 $2\operatorname{Re}\int_0^4 e^{(i\omega-0.25)t}C_q(t)\,dt$ 作梯形积分。空间投影含 $1/4$，频率从 $-6$ 到 $6$，步长 0.05。

| 方法 | 虚时间步 / 实时间步 | 键维上限 | 关联矩阵最大绝对误差 | 241 个谱值最大绝对误差 | 追加源所用归档的文件大小 |
| --- | --- | ---: | ---: | ---: | ---: |
| TeNPy，二阶实时 TEBD | 0.05 / 0.05 | 128 | 9.25 × 10⁻⁵ | 1.92 × 10⁻⁴ | 402,488 B，1 态，HDF5 |
| TeNPy，二阶实时 TEBD | 0.025 / 0.025 | 256 | 2.33 × 10⁻⁵ | 4.72 × 10⁻⁵ | 446,336 B，1 态，HDF5 |
| TeNPy，四阶实时 TEBD | 0.001 / 0.025 | 256 | 8.39 × 10⁻⁹ | 4.01 × 10⁻⁸ | 113,312 B，1 态，原生序列化 |
| DynamicalCorrelators 0.15.0，双站点 TDVP | 0.025 / 0.05 | 256 | 7.13 × 10⁻⁸ | 8.59 × 10⁻⁸ | 13,696,810 B，81 态，JLD2 |
| DynamicalCorrelators 0.15.0，双站点 TDVP | 0.0125 / 0.025 | 384 | 1.77 × 10⁻⁸ | 2.14 × 10⁻⁸ | 27,215,530 B，161 态，JLD2 |

Julia 从 `identityMPS(H)` 出发，冷却和实时间演化都令 `n` 覆盖整个网格，使用 `myTDVP2(; trunc=truncrank(D))`。表中细网格按各方案共有的 81 个时刻比较。另取其全部 161 个时刻与同网格的精确解比较，2,576 个关联值、241 个谱值的最大绝对误差分别为 1.77 × 10⁻⁸、2.14 × 10⁻⁸。TeNPy 的 `svd_min=1e-14`。二阶组把步长减半并增大键维后，四个源中的最大累计丢弃权重从 9.78 × 10⁻⁷ 降至该实现报告的 0。四阶组的受扰态最大键维为 130。

**可复用的实际入口。** 运行 `node scripts/setup-sdk.mjs tenpy-ground-state`。四阶组只用了仓库锁定的包，先算一个源，再用新进程补齐三个源后，热态文件的 SHA-256 一致。Python 源编号为 0–3，Julia 为 1–4。[仓内环境](../../../.agents/skills/tenpy-ground-state/pyproject.toml) · [TeNPy 序列化入口](https://github.com/tenpy/tenpy/blob/f08212bc972e0a08d123209288a0941379119963/tenpy/tools/hdf5_io.py#L147-L214)

<details>
<summary>用现有 TeNPy SDK 复跑一个源，再追加另一个源</summary>

将下例存为 `spin.py`，在自己的空任务目录内，用已准备的 SDK Python 运行 `spin.py prepare`，再分别运行 `spin.py 0` 和 `spin.py 1`。只读回自己刚生成的 `equilibrium.pkl`。结果数组按测点、时刻排列。

```python
import sys
import numpy as np
from tenpy.algorithms.purification import PurificationTEBD
from tenpy.models.hubbard import FermiHubbardChain
from tenpy.networks.mps import MPSEnvironment
from tenpy.networks.purification_mps import PurificationMPS
from tenpy.tools.hdf5_io import load, save

model = FermiHubbardChain(dict(L=4, bc_MPS="finite", t=1., U=2., mu=1.,
                               cons_N="N", cons_Sz="Sz"))
trunc = dict(chi_max=256, svd_min=1e-14)
if sys.argv[1] == "prepare":
    thermal = PurificationMPS.from_infiniteT(model.lat.mps_sites(), unit_cell_width=4)
    PurificationTEBD(thermal, model, dict(dt=.001, trunc_params=trunc)).run_imaginary(.5)
    save(thermal, "equilibrium.pkl")
else:
    source = int(sys.argv[1])
    thermal = load("equilibrium.pkl")
    ket = thermal.copy()
    ket.apply_local_op(source, "Sp")
    options = dict(dt=.025, N_steps=2, order=4, trunc_params=trunc, disentangle="backwards")
    evolution = PurificationTEBD(ket, model, options)
    values = [MPSEnvironment(thermal, ket).expectation_value("Sm")]
    for step in range(80):
        evolution.run()
        values.append(MPSEnvironment(thermal, ket).expectation_value("Sm"))
    np.save(f"source-{source}.npy", np.asarray(values).T)
```

</details>

**热态和失败对照。** 独立参考 $Z(1)/256=40.7771945989$。Julia 用虚时间冷却，步长减半前后分别得到 40.7771940543、40.7771945305。照固定版教程传实时间得到 1.00000000001。无限温时 Julia 的等时矩阵与 $I/4$ 的最大差为 5.55 × 10⁻¹⁷。TeNPy 保持纯化态归一，利用真空能量为零，从 $1/(256p_{\mathrm{vac}})$ 得到四阶实时组所用热态的比值 40.7771977683。保持 bra 固定但关闭辅助腿反向演化时，第 2 个源在 $t=1$ 的最大绝对误差从 1.44 × 10⁻⁵ 增至 0.119（二阶细网格）。Julia 的同一归档在两次公开调用后摘要一致，返回值乘以 $i$ 后与落盘的末帧逐项一致。向三帧文件索取第四帧触发了缺键错误。

**计算成本与决策。** TeNPy 四阶组的建态、首源、追加其余三源分别为 8.40、11.51、30.63 秒，含各进程启动和文件读写，峰值 RSS 约 135 MiB。Julia 1.12.7 的 81 帧组冷却、写轨迹、算首源、追加三源分别为 76.38、23.34、12.37、35.20 秒。整个 Julia 进程含冷启动编译、热态与失败对照以及短网格，耗时 457 秒，峰值 RSS 约 3.57 GiB。两组计时覆盖的工作不同。按文件长度合计，TeNPy 四阶组的目录为 136,180 B，Julia 两组分别为 13,789,237 B 和 27,390,782 B，含各自的结果与对照摘要。可复用热态的大小单列在表中，供判断追加源的成本。

两份实现都算出了有限温自旋谱。在这个时间无关的平衡态模型中，已有 SDK 能以相近精度跨进程追加源，且只需准备和保存一个热态。按提案第 4 项停止新增 Julia 环境，保留 Draft 和同题结果。若出现必须复用非平衡参考轨迹的具体任务，可另验该任务的准备成本、准确度与维护收益。当前结果限四站点 CPU 数值对照，宿主交互和产品科学验收均未评估。
