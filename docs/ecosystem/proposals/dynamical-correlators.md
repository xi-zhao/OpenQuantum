# 用 DynamicalCorrelators.jl 计算有限温度 Hubbard 链的自旋谱

调研日期为 2026-11-23（北京时间）。
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

候选的增量是**跨多个扰动位置复用热态轨迹**。
上游 `evolve_mps` 接受 `save_id=eachindex(times)`，可显式保存每个时刻的热态。
`dcorrelator(rho_path,H,op,ids;times)` 可以在后一次调用中读取同一文件，为各源单独演化受扰态，一次收集所有测点，以初始纯化态的范数平方作归一化。
由此可以给已归档的同一热态追加新的源位置。
这里主张的是打通计算步骤。节省的端到端时间、额外磁盘成本和可达规模均待测。
当前已有带锁 Julia 环境的接入方式，也有完整的同题基线，可以直接检验这项增量。
[轨迹写入](https://github.com/Quantum-Many-Body/DynamicalCorrelators.jl/blob/3488f641877fcf6e5685009f73da7b2f0ee4f959/src/observables/dcorrelator.jl#L18-L56) · [多源读取与结果维度](https://github.com/Quantum-Many-Body/DynamicalCorrelators.jl/blob/3488f641877fcf6e5685009f73da7b2f0ee4f959/src/observables/dcorrelator.jl#L635-L712) · [现有 Julia SDK 实例](../../../.agents/skills/tnqs-dynamics/Project.toml)

## 接入方式与持续成本

建议由候选接入任务复用共享 [SDK 工作台](../../../.agents/skills/quantum-sdk-workbench/SKILL.md)，提供一个固定 Julia 环境、一份领域 Skill 和可编辑的本地示例。
两个宿主沿用已有准备和代码执行入口。
调用者需要注明模型、系综、时间与展宽单位、源和测点编号、张量截断以及轨迹所在的任务目录。
谱的相位、归一化和误差由同一份示例说明。
公共接口以原生 SDK 为限。
[扩展选择](../../architecture/EXTENSION_MODEL.md#6-新需求放在哪里)

上游兼容 Julia 1.11–1.12，自带的 Manifest 使用 1.12.5。仓内已有 Julia 1.12.7，可在独立环境检验。
主要维护面是 MPSKit 0.14、TensorKit 0.17、JLD2 轨迹读写及数值约定。
绘图依赖 CairoMakie 为可选项。
上游 CI 配置覆盖 Linux x64 的 Julia 1.12。macOS 的准备与运行留待实测。
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

发现阶段核对了发行、源代码、仓内实现与论文。本提案的交付边界是候选 Draft。数值结果、宿主运行和科学验收均留给候选接入任务。
