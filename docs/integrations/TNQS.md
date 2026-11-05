# TensorNetworkQuantumSimulator.jl

`tnqs-dynamics` 提供固定的完整 Julia SDK：用户可创建图、张量网络态、门、电路、动力学和配分函数，
选择 BP、boundary MPS、有限平面 CTMRG 及采样接口。其增量是保留非方格图几何，
并非 OpenQuantum 首次具备张量网络、BP 或 CTMRG，也不是已证明的性能优势。

## 使用入口

```sh
node scripts/sdk-access.mjs inspect tnqs-dynamics
node scripts/setup-sdk.mjs tnqs-dynamics
julia --startup-file=no --project=.agents/skills/tnqs-dynamics /absolute/task/program.jl
```

按 `inspect` 返回的路径运行，复制[原生示例](../../.agents/skills/tnqs-dynamics/references/native-example.jl)
到任务目录后可自行修改图、门、参数和结果。示例不是 API 白名单或计算规模上限。
使用 Julia 1.12.7；可由 `OPENQUANTUM_JULIA` 指定已安装解释器，
`OPENQUANTUM_JULIA_DEPOT_PATH` 指定独立 depot。准备可以联网写入依赖，执行不隐式安装。
Project 和 Manifest 共同固定源码与传递依赖；不得在执行阶段自行 `Pkg.update`。

DSH/Codex 复用相同 Skill、SDK 清单和宿主代码工具；没有新 Tool、MCP Server、Runtime 或 Validator。
默认 CPU 环境不安装 Qiskit.jl、Python juliacall、GPU/MPI 后端，使用这些可选路径前另行准备并核验。

## 数值语义与边界

- 一般图可用于张量网络表示，不等于一般图都可用于 CTMRG。CTMRG 需要连通的有效平面嵌入、
  不同顶点位置和无交叉边；默认使用 SVD projector。实验性 `:eig` 不保证适用每种图。
- 分别记录状态维数、环境维数、SVD 截断、时间步、精度和收敛轨迹。有环图 BP 收敛不是精确性证明；
  增大 CTMRG 环境维数不是通用单调误差界。角点伪逆的正则化也可能产生误差下限。
- v0.5.0 的旋转角使用 Qiskit 约定，`freenergy=-ln Z`。示例明确顶点 1 为最高有效位。
  QASM 导入不自动证明测量、反馈和任意动态电路语义正确。
- `sample_certified` 的 `poverq` 对应实际规约/缩放后的采样态；它可能包含非单位范数。
  必须同时保留参考态、范数、概率、权重、seed 和样本预算，不能由函数名推导严格证书。

## 验证入口

[`tnqs-sdk.yml`](../../.github/workflows/tnqs-sdk.yml) 在远端 macOS 隔离环境显式准备依赖，
并以操作系统拒绝网络的方式运行原生用户程序和
[小系统检查](../../tests/fixtures/tnqs-validation.jl)。固定随机种子与执行前声明的容差，检查：

- 正张量树/三角环相对于独立逐指标枚举；三角 Ising 相对于全自旋枚举与解析配分函数。
- 两比特 ComplexF64 电路的完整幅度、范数和非对角观测量，相对于独立稠密 Pauli 指数矩阵。
- 非方格环上 bond dimension 1/2/3 与环境维数 1/2/8/16 的误差，保存实际轨迹，不强制单调。
- 积态和四比特 GHZ 各 512 次采样的支持集、概率与相对实际采样态的权重；频率容差预设 0.1。
- 缺少位置、重合位置、交叉边及不支持的 projector 明确失败。
- 固定源码加载、完整锁、SDK 发现、DSH Skill 发现及 Codex 分发投影。

这些是有界工程/数值回归，不能替代大系统收敛研究、论文结果复现、Windows/Linux 数值运行或用户科研验收。
本入口始终保留 `scientificValidation=not_evaluated`。实际执行记录随本 PR 的版本化证据交付。

## 来源与维护

- [上游 v0.5.0](https://github.com/JoeyT1994/TensorNetworkQuantumSimulator.jl/tree/c37fba6eac78649f7bf146888e04df3f1deebb92)，
  完整 SHA `c37fba6eac78649f7bf146888e04df3f1deebb92` 固定在 Project/Manifest 中。
- [MIT 许可](https://github.com/JoeyT1994/TensorNetworkQuantumSimulator.jl/blob/c37fba6eac78649f7bf146888e04df3f1deebb92/LICENSE)，
  Joseph Tindall 2025。准备时的完整发行源码保留许可；传递依赖保留各自版权与许可，不复制上游论文素材。
- [候选规格与替代方案](../ecosystem/proposals/tensor-network-quantum-simulator.md)。
  周期同步同时检查图/门约定、截断、采样归一化和 Julia 锁，不只修改版本号。
