# 论文方法的本地计算接入

2026-09-12。六项以 L1 能力接入同一个 OpenQuantum Harness：每项包含实验选择 Skill 和一个有界计算 Tool。
研究价值来自方法与可复核实现，发表期刊本身不保证某个软件版本或算例正确。

| 能力 / 论文 | 固定实现 | 本次开放的 Tool 与科学范围 |
| --- | --- | --- |
| [SQD，Science Advances 2025](https://doi.org/10.1126/sciadv.adu9991) | [qiskit-addon-sqd 0.13.1](https://github.com/Qiskit/qiskit-addon-sqd)，Apache-2.0 | `sqd_local.run_sqd_chemistry`：H₂/STO-3G 的采样子空间对角化、配置恢复与同基组 FCI 参照；支持四位输入 counts。 |
| [TJM，Nature Communications 2025](https://doi.org/10.1038/s41467-025-66846-x) | [MQT YAQS 0.6.0](https://github.com/munich-quantum-toolkit/yaqs)，MIT | `tjm_local.simulate_tjm_dynamics`：2–6 qubits 的开放 Ising 链、局域振幅衰减、张量跳跃轨迹，与密度矩阵 Lindblad 演化比较。 |
| [LSD，Nature Communications 2025](https://doi.org/10.1038/s41467-025-63214-7) | [ldpc 2.4.1](https://github.com/quantumgizmos/ldpc)，MIT | `ldpc_local.decode_ldpc_syndromes`：≤64×128 二元校验矩阵、≤32 个 syndrome 的串行 BP+LSD 解码和独立 GF(2) 残差检查。 |
| [RandomMeas，Quantum 2026](https://doi.org/10.22331/q-2026-04-28-2086) | [RandomMeas.jl 0.3.1](https://github.com/bvermersch/RandomMeas.jl/tree/89c492bfb05508e5babe9c8c2c40697995be9e42)，Apache-2.0 | `random_meas_local.estimate_randomized_purity`：2–6 qubits 的 product/GHZ 态、局域 Haar 测量、≤4 sites 子区纯度及有限样本误差。 |
| [Flow-VQE，npj Quantum Information 2025](https://doi.org/10.1038/s41534-025-01159-x) | [Flow-VQE f7642afa](https://github.com/olsson-group/Flow-VQE/tree/f7642afa330e5108ea5738d42fe80b551363733c)，MIT | `flow_vqe_local.train_flow_vqe`：实际调用论文的单上下文 flow 训练函数，适配 2–4 qubit Pauli Hamiltonian 与小型 RY/CNOT ansatz，比较等评估预算随机搜索。 |
| [TeNPy，SciPost Physics Codebases 2024](https://doi.org/10.21468/SciPostPhysCodeb.41) | [physics-tenpy 1.1.1](https://github.com/tenpy/tenpy)，Apache-2.0 | `tenpy_local.solve_tenpy_chain`：3–10 sites 自旋 1/2 XYZ 开放链的 two-site DMRG、磁化、纠缠熵和精确对角化参照。 |

TeNPy 的基础设施价值独立于首篇论文年份；本次使用当前固定版本。已有 FatQat/QuTiP、Stim/PyMatching、QCEC 等能力保留：
YAQS 增加张量轨迹算法，LSD 增加一般二元校验矩阵的解码，TeNPy 增加 DMRG，并未重复创建通用电路或表面码接口。
GARI 仍是候补，没有注册为本次能力。

## 安装与调用

需要 Node.js 24+、uv 和 Julia **1.12.7**。Python 工作环境固定为 3.12，各能力使用自己的 `uv.lock`；
Julia 使用该能力目录中的 `Project.toml`、`Manifest.toml` 和固定 Git revision。首次准备可能需要数分钟及约数 GB 缓存空间。

```sh
npm run capability:paper-tools:setup
# 也可只准备指定能力：
npm run capability:paper-tools:setup -- sqd-chemistry tenpy-ground-state
```

安装器不改变全局 Python/Julia 项目，不更新锁文件。Python 环境在忽略目录 `.openquantum/python-envs/<capability>`；
Julia 包和编译缓存使用标准用户 depot。首次 Python Tool 调用也可由 uv 懒加载；Julia 应先完成上述准备。
没有将整个上游代码仓库或大型训练数据默认下载到用户工作区。

六个连接在 Preset 中默认开启，设置中心分别显示上述中文名称；新建会话即可发现对应 Skill 和 Tool。
已运行的 OpenQuantum 需要重启以加载新的 Preset。用户可以在 MCP Server 连接设置中禁用单项；Skill 不绕过禁用状态。
例如可以请求“用 SQD 计算 0.735 Å 的 H₂，并报告与 FCI 的差异”或“用 TeNPy 算四站点 Heisenberg 链基态”。
具体数值输入见各 [Skill](../../.agents/skills/) 的 `SKILL.md` 和 Tool schema。

## 计算约定与限制

- **SQD**：能量包含核排斥项，单位 Hartree；键长 Å；两个空间轨道，alpha/beta 各一电子。
  位序 `beta1 beta0 alpha1 alpha0`，保留前导零；总 counts≤4096，HF 构型总是包含。
  缺少 counts 时显式使用合成均匀样本，不能作为量子优势证据。有限样本可能只覆盖 HF 子空间而高于 FCI。
- **TJM**：`H=-JΣZZ-gΣX`，`hbar=1`，初态全零，局域跳跃 `sqrt(gamma)|0><1|`。
  时间与速率采用同一单位；严格包含 0 与请求终点，返回 `steps+1` 点，`steps×trajectories≤4096`。
  轨迹标准误不包含步长、MPS 截断或模型偏差，零经验标准误不代表没有抽样不确定性。
- **LSD**：独立同概率 bit flip 模型；拒绝零校验行和在 GF(2) 上不可解的 syndrome，避免上游 C++ 异常。
  syndrome 一致性不等于逻辑纠错成功；需要代码逻辑算符、实际错误与固定统计协议才能评价逻辑错误率。
- **RandomMeas**：下标从 0 开始，`settings×shotsPerSetting≤16384`。返回上游的有限 shots 偏差修正纯度估计，
  保留可能超出 `[0,1]` 的值；跨独立设置的标准误不是严格置信区间。当前只模拟已知 product/GHZ 态，未导入实验数据。
- **Flow-VQE**：Pauli 最左字符对应 q0；实振幅 RY/CNOT ansatz 可能无法表达一般 Hamiltonian 的基态。
  每种搜索最多 512 次目标评估，随机基线为 `[-π,π]` 均匀参数。上游训练用 float32，重算能量用 float64；
  这是单 Hamiltonian 上的训练，不包含论文分子数据、预训练权重、跨分子泛化或优化加速结论。临时训练文件自动回收。
- **TeNPy**：`S=Pauli/2`，`H=Σ(Jx SxSx+Jy SySy+Jz SzSz)-Σ(hx Sx+hz Sz)`。
  当前 two-site sweep 需要至少三站点；上限 10 sites、64 bond dimension、20 sweeps。
  能量差用于判断本次小系统结果，有限 sweep/bond 的执行结束不保证收敛。

## 架构与证据

每个 MCP Server 仅封装跨语言、隔离依赖的计算边界，由 Harness MCP Client 注册 Tool；Skill 不执行程序。
`src/lib/bounded-science-mcp.mjs` 复用已有 `runLocalJsonProcess`，不另建 Registry、Session、任务队列或 Runtime。
每个连接最多一个计算，单次 180 秒，输入/输出都有有界 schema，整个子进程组支持取消和超时，输出总量≤2 MiB。
Tool 不接受路径、任意程序、凭据或云任务。子进程仅继承运行环境白名单，不继承模型 API Key。
首次准备依赖、编译缓存和 Flow-VQE 临时 checkpoint 都按最大副作用声明为 `workspace-write`。

结果保留完整归一化输入、输入 SHA-256、依赖锁 SHA-256、固定来源及物理范围。
六项均为 L1，统一返回 `scientificValidation=not_evaluated`；没有添加 Acceptance Profile，数值比较不冒充中央科学验收。

Flow-VQE 没有可直接安装的包。本仓库保留四个**未修改**的固定上游文件：训练函数、其工具函数、分子配置和 MIT License；
[provenance.json](../../.agents/skills/flow-vqe/upstream/provenance.json) 记录原路径、revision 与逐文件 SHA-256。
只导入训练函数依赖的模块，不执行上游 CLI、下载数据、读取模型 pickle 或重写上游 Agent 工作流。
Python 环境仅安装这一调用路径所需的 Torch 2.6.0、Zuko 1.4.0、NumPy 1.26.4 及其锁定传递依赖。

```sh
npm run capability:paper-tools:test
npm run capability:paper-tools:live
npm run check
```

合同测试从能力清单读取 Tool 名称与副作用，覆盖未知参数、超出范围、伪造来源、非法输出、取消、繁忙和环境隔离；其中的 worker 是协议替身。
显式 live 测试调用真实固定依赖，覆盖 SQD/FCI 与受限样本、TJM/Lindblad 与时间网格、LSD/GF(2)、Flow-VQE/Pauli 精确值和种子、
TeNPy/解析自旋链与场符号、RandomMeas/解析纯度。Harness 测试用本地模型协议替身驱动六个**真实**计算，检查每条 Session tool/result。
这验证工具调用链，不表示已验证真实外部模型能自主选择工具或完成论文规模复现。
带时间戳的本地数值结果、测试日志和 Harness event log 保存在 `.openquantum/paper-tools-evidence/`。

本次独立领域审阅覆盖六种算法、上游来源与物理约定，并发现和复验了 SQD 前导零、TJM 多一步时间网格、LSD 不可解 syndrome 三个边界修复。
实际验证环境为 macOS arm64、Python 3.12、Julia 1.12.7；其他平台尚未运行数值验收。

2026-09-12 的实际检查：7 项新合同测试、6 项真实数值测试、六工具 Harness 端到端测试、完整 `test:p1`、
能力 conformance、Harness 配置展开及安装器幂等检查通过。
首次全仓 `npm run check` 曾被 `outputs/01a08166-quantum-learning-resources/library/library.js:23` 的
`no-irregular-whitespace` 错误阻断。随后 `bfe8055` 将该字符改为等价转义并单独纳入版本库；
主线合并前在独立工作目录通过完整 `npm run check`，无需排除该资源文件。
