# RcmpsCore.jl 连续场论

`rcmps-field-theory` 提供 RcmpsCore 0.2.1 的完整 Julia CPU SDK，用于无限体积、平移不变的
1+1 维单标量玻色场：RCMPS 变分优化、正常序观测量和同真空切空间激发。
它补充连续相对论基底与 Hamiltonian 规则；已有 TeNPy、quimb 和 MPS 工作流继续处理各自适用的格点任务。

## 使用入口

```sh
node scripts/sdk-access.mjs inspect rcmps-field-theory
node scripts/setup-sdk.mjs rcmps-field-theory
julia --startup-file=no --project=.agents/skills/rcmps-field-theory /absolute/task/program.jl
```

使用 `inspect` 返回的实际路径。复制[原生程序](../../.agents/skills/rcmps-field-theory/references/native-example.jl)
到任务目录后可修改模型、状态、参数和输出；示例大小不是 API 白名单或能力上限。
Julia 1.12.7、Project/Manifest、上游完整 SHA 与传递依赖共同固定。
`OPENQUANTUM_JULIA` 可指定已安装的解释器，`OPENQUANTUM_JULIA_DEPOT_PATH` 指定隔离 depot。
准备阶段可联网下载，执行不隐式安装或 `Pkg.update`。

DSH 与 Codex 复用相同 Skill、SDK 清单及宿主代码执行；没有新增 Tool、MCP Server 或 Runtime。
初次使用只准备选中的 CPU 环境，不启用独立的 Python/CUDA GPU 实现、账户或真实硬件。

## 模型与数值语义

- 参考正常序质量为 1；phi4 耦合是 `g :phi^4:`，没有 `1/4!`。ComplexF64 左规范
  `Q=-iK-R†R/2` 和唯一稳态是假设。构造器/retraction 同步矩阵与稳态，不能直接改矩阵后沿用旧环境。
- `fg_phi4` 不设置优化器的模型元数据。显式写入模型与耦合，修改质量的能量、优化和
  `ExcitationModel` 使用同一个 `massmod`；它的默认值与优化器默认值不同。
- `mass_gap(s)` / `transfer_gap(s)` 是传递 gap；`excitation_gap(s; model)` 或
  `mass_gap(s, model)` 才是同真空切空间内的 Hamiltonian 静止能隙。自由真空分别为 Inf 和 1。
- 背景优化、bond dimension、窗口、求积和 ODE 容差、本征残差分开控制。默认 bilinear 的
  values-only 激发不使用 `n_quad`；action/梯度路径会使用求积网格，不能只改一个被忽略的参数就声称验证了收敛。
- 负能级、未收敛与未接受结果原样保留。上游 `accepted` 是其数值一致性检查，不证明背景为基态，
  也不是 OpenQuantum Acceptance。独立动量排序在交叉处不保证分支对应。
- 仅覆盖同真空切空间，不包括 kink、一般多粒子谱、多场/费米场、高维、有限温度或实时场论。
  大 D 的内存、求积与激发装配成本随任务增长；本轮不宣称大 D、临界外推、论文精度或性能收益。

## 验证入口

[远端工作流](../../.github/workflows/rcmps-sdk.yml)显式准备固定环境，断网执行
[Julia 检查](../../tests/fixtures/rcmps-validation.jl)，再用
[独立 NumPy 稳态参考](../../tests/fixtures/rcmps-steady-reference.py)核对：

- 自由真空正/负/零动量 `sqrt(1+p²)`、传递 gap 与 Hamiltonian gap。
- D=1 相干态的正常序矩、实/虚顶角、phi4 与修改质量的能量；期望值来自解析式。
- D=2 非平凡状态的独立参数扰动方向导数，以及 NumPy 自建 Lindblad 矩阵的稳态、
  trace、Hermiticity、positivity、残差和零空间维数。
- 固定 seed 的短优化轨迹；相干试探态相互作用激发用 action 装配，分别变更窗口、求积点和 ODE 容差。
- 非方阵、非 Hermitian、非有限、非唯一稳态、非法模型/动量、强制不收敛，以及保存后重读。
- 固定包版本/源码路径、SDK 发现与显式准备、DSH Skill 发现及 Codex 分发投影。

短优化用于检查轨迹与停止语义，不要求其达到基态；相干试探态激发是解析回归，不称为真实相互作用质量谱。
工程、有限数值对照、CI 和科学验收分别记录，始终 `scientificValidation=not_evaluated`。
实际通过范围以同 PR 的版本化执行证据为准；未执行的平台或方法不由可调用 API 推断。

2026-11-05 的[隔离执行](https://github.com/xi-zhao/OpenQuantum/actions/runs/41955037827)通过上述
36 项 Julia 断言和独立 NumPy 检查，并通过既有 SDK 接口运行了复制出的原生程序。
[版本化回执与原始输出](evidence/rcmps-2026-11-05.json)保留来源、锁、程序和检查文件摘要：
NumPy 稳态差为 `7.87e-16`，物理残差 `1.48e-17`；方向导数误差 `2.52e-9`。
相干试探态 action/ODE 的四组窗口、求积及容差设置，相对解析能量的最大绝对误差为 `8.74e-11`。
三步 D=2 优化的能量从 `0.06824` 降到 `1.287e-5`，但梯度范数仍为 `0.007958`，
所以原样记录 `converged=false`。这些是 macOS arm64 CPU 上的有界数值回归，不是基态或质量谱的最终验收。

## 来源与维护

- [固定 tag 源码](https://github.com/AntoineTilloy/RcmpsCore.jl/tree/175b0aa41c2e4eee7d26f44a33d7d59ea641fbe1)：
  v0.2.1，完整 SHA `175b0aa41c2e4eee7d26f44a33d7d59ea641fbe1`。GitHub 无正式 release，沿用已审阅 tag，未追逐 main。
- [MIT 许可](https://github.com/AntoineTilloy/RcmpsCore.jl/blob/175b0aa41c2e4eee7d26f44a33d7d59ea641fbe1/LICENSE)：
  保留作者版权及许可；准备的上游完整源码与传递依赖保留各自许可，不复制论文素材。
- [候选规格、原论文和替代方法](../ecosystem/proposals/rcmps-core.md)。同步时同时检查
  Julia/间接依赖、模型约定、状态与梯度语义、激发范围及失败路径，不只改版本号。
