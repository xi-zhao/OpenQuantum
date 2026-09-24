# 扩展治理清单（2026-09-24）

本清单以主线基线 `9254ab2f73830d6f635433fd1ab21c7e017f8059` 为起点，覆盖仓库默认 Preset 的 **101 个 Skill、37 个 MCP 连接和 220 个可配置注册的 Tool 名称**。B1 调整在本清单所在提交中落地，B2/B3 为待实施建议。用户自行添加的 Skill、MCP 与其他 Preset 不在这个固定分母内。

目标是把接入已有能力、维护本地算法和平台验收分开：适配只承担来源、协议、依赖、输入输出与失败语义；算法增强有独立问题和数值验证；Harness 连通检查按实际改动范围执行，最终科学 Acceptance 仍走原合同。

## 统计与判断依据

- 101 份原生 Skill 文件全部保留。B1 后 **88 项可由模型自动选择，13 项仅供用户显式调用**。其中开源算法适配仍是 66 项：49 个计算方法、13 个分类导航、1 个总入口、2 个 SDK 指南、1 个迁移指南。
- MCP 声明包含 26 个默认连接（30 Tool）、2 个可由离线开关关闭的默认连接（10 Tool）、9 个默认关闭的按需连接（156 Tool），合计 37 / 196。默认开启是配置策略，不能证明服务启动、依赖就绪或云凭据有效。
- 注册名称总集合是 **196 MCP + 18 Harness 通用 + 6 平台原生 = 220**。6 个平台原生中，5 个是量子动作，1 个是教学生成。bash / pwsh 按平台互斥，单一平台的配置上界是 219，实际还取决于连接启用和启动结果。
- 额外审阅了包中存在的 `web_fetch`；当前 Preset 明确 `fetch: false`，故它不计入上述 220。不要把依赖包导出的 Tool 当作当前已注册 Tool。
- 本地 Harness 实测观察到 **53 个注册 Tool**：macOS，Qiskit 两个连接使用离线开关关闭，9 个按需连接未启用。只调用了本次相关的 Skill 和 shell 动作；这不是 220 个 Tool 全部运行成功的证明。

权威输入是 [能力合同](../../.agents/capability-packages.yml)、[Agent Preset](../../runtime/openquantum/agent-presets/openquantum/agent.cordis.yml)、各 Skill/Server 源码、锁定 Harness `0.1.5-rc.1` 的 Tool Provider，以及本次 Harness 模型请求中的实际 Tool 名单。此文是日期化审计清单，不替代这些配置，也不新增运行时注册表。

## 分批范围与兼容要求

| 批次 | 修改与理由 | 兼容影响 | 通过标准 | 状态 |
| --- | --- | --- | --- | --- |
| B1 入口 | 13 个分类 Skill 改为原生手动调用；总入口与分类页直接指向方法；检索结果说明调用策略 | 原文件、名称、来源映射、用户 /skill 调用均保留。自动模型调用这 13 项会被明确拒绝；49 个计算方法继续自动可选 | 实际 Harness 的用户目录、模型目录、原生 skill Tool、用户显式调用、HHL/QSVT 执行和 Session 重读 | 已实施 |
| B1 公共测试 | 四套重复 MCP 协议测试共用一个 helper，覆盖 18 个计算动作；保留四组独立物理/输入边界测试 | 不改 Tool schema、server、bridge、数值代码或部署配置；Clifft 的第二个 QEC 动作仍由互操作专用测试覆盖 | 声明名称、schema、副作用、来源摘要、非法输入/输出、worker 错误、取消恢复、凭据隔离与线程继承/覆盖 | 已实施 |
| B2 环境 | 19 个共享 Python 桥接及 7 个专用桥接的依赖准备迁到显式 setup；复用现有准备机制；Julia/C 驱动保留自身边界 | 首次计算改为返回准备提示。原环境必须核验版本/锁后复用；不删除环境，不自动改成 read-only | 空环境、已安装环境、旧锁、离线执行、失败后恢复、取消和现有数值回归；逐个业务动作复核副作用 | 待实施 |
| B2 示例依赖 | 7 个必装依赖拆为标准依赖组；runner 按方法延迟导入并只报告实际依赖 | 原完整安装命令和 49 个 --algorithm 名称保留；小方法不再因缺少无关化学库而失败 | 干净最小环境运行非化学示例、完整环境全例、缺选装依赖的明确错误；重新核验各平台安装范围 | 待实施 |
| B2 诊断 | 更新诊断 Skill 的旧 RPC 名，区分本地连通检查与获准的外部模型验收 | 保留报告 schema；不因有密钥而自动发模型请求 | 当前 RPC 合同与选择性诊断报告回归 | 待实施 |
| B3 交叉入口 | 集中 Trotter/qDrift、Qiskit 后端、VQD、NumPy 本征求解的选择或共用说明；区分 3 个大型 opt-in 服务的专业用途 | 保留旧名称和原完整连接；科学实现是否可合并必须另有输入、位序、算法及误差等价证据 | 旧入口回归、提示路由覆盖、原会话兼容；涉及数值替换时独立比较 | 待实施 |

加载更新后的源码并重启 Host 后使用新目录。已有任务如果仍尝试自动加载分类 Skill，会收到不可供模型调用的错误；应改选 `quantum-algorithms` 或实际方法。用户显式调用与已有历史事件内容保留，未改写会话日志。

“保留”表示现有责任边界成立；“简化”表示减少不必要的选择或维护步骤；“合并”表示合并重复说明/实现且保留旧入口；“迁移”表示把职责移到适当位置。下面的动作列是建议，不代表所有建议都已实施。

### 公共机制的具体证据

21 个本地科学 Server 已经复用 [serveScienceTool](../../src/lib/bounded-science-mcp.mjs)，每个入口最多 10 行；按能力保留 Python/Julia 环境可以隔离依赖。继续合并全部服务进一个环境并不是这次治理目标。B1 合并的是 [公共协议测试 helper](../../tests/helpers/science-protocol.mjs)；原四个测试入口继续保留，领域断言仍位于各自测试文件。

共享服务中 Hamiltonian 已直接使用经过锁摘要校验的准备环境；RandomMeas 使用 Julia；其余 19 个 Python 服务仍经 `uv run --frozen` 执行。另 7 个专用桥接也有首次准备路径，其中部分未使用 `--frozen`；迁移前需核实其锁策略、凭据、缓存与工作区写入。不能只统一标注或复制 Hamiltonian 开关就宣称迁移完成。

[算法 runner](../../examples/quantum-algorithms/run.py)目前加载所有模块，且每次结果都查询全部 7 个包的版本；[依赖文件](../../examples/quantum-algorithms/pyproject.toml)也将它们列为必装。B2 应同时处理依赖分组、延迟导入和来源记录，不只是把安装命令改短。Cartan、CVQNN、薛定谔化等本地算法示例保留其已披露差异；后续算法开发不能再次作为“接入上游 Skill”的隐含完成条件。

## 全量 Skill 清单（101）

| Skill / 文件 | 建议 | 理由与职责 | 兼容影响 | 批次 / 状态 |
| --- | --- | --- | --- | --- |
| [clifft-sampling](../../.agents/skills/clifft-sampling/SKILL.md) | 保留 | Clifford+T 带噪采样与 Stim 记录采样有共同后端；两个动作已共用一个连接 | 原名称、工作流及已有执行边界不变 | 维持现状 |
| [compact-optimization](../../.agents/skills/compact-optimization/SKILL.md) | 保留 | Compact 重写与独立等价对照不同于 PyZX 的 ZX 方法，不按“都是优化”合并算法 | 原名称、工作流及已有执行边界不变 | 维持现状 |
| [cqlib-kernel](../../.agents/skills/cqlib-kernel/SKILL.md) | 保留 | 角度核与 QSVM 有独立数据合同，保留按需启用 | 原名称、工作流及已有执行边界不变 | 维持现状 |
| [deltakit-qec](../../.agents/skills/deltakit-qec/SKILL.md) | 保留 | 矩形码和 ToyNoise 工作流有独立物理假设，不与 Stim memory 静默互换 | 原名称、工作流及已有执行边界不变 | 维持现状 |
| [dynamiqs-dynamics](../../.agents/skills/dynamiqs-dynamics/SKILL.md) | 保留 | 耗散单量子位、批量与梯度不同于非马尔可夫 TEMPO 或多体轨迹 | 原名称、工作流及已有执行边界不变 | 维持现状 |
| [fatqat-workbench](../../.agents/skills/fatqat-workbench/SKILL.md) | 保留 | 原生门约束及脉冲动力学具有不同输入；保留同连接的两个主动作 | 原名称、工作流及已有执行边界不变 | 维持现状 |
| [fieldqkit-hardware](../../.agents/skills/fieldqkit-hardware/SKILL.md) | 简化 | 与硬件总入口交叉；把国产后端发现、凭据缺口和选型条件集中说明 | 保留原 Skill 与凭据名称，不增加提交任务权限 | B3 待实施 |
| [flagquantum-workbench](../../.agents/skills/flagquantum-workbench/SKILL.md) | 简化 | 工作台涉及 17 个上游动作；按电路分析、编译和训练说明选择，避免要求逐项调用 | 保留 opt-in 与原接口；专业工具集调整需兼容原会话 | B3 待实施 |
| [flow-vqe](../../.agents/skills/flow-vqe/SKILL.md) | 保留 | 论文的 flow 参数训练不同于普通 VQE 的经典参数优化 | 原名称、工作流及已有执行边界不变 | 维持现状 |
| [graphix-mbqc](../../.agents/skills/graphix-mbqc/SKILL.md) | 保留 | 自适应测量与输出纠正属于 MBQC；不复用门模型模拟的结果解释 | 原名称、工作流及已有执行边界不变 | 维持现状 |
| [hamiltonian-simulation](../../.agents/skills/hamiltonian-simulation/SKILL.md) | 合并 | 与 quantum-trotter / quantum-qdrift 统一方法选择和位序说明，复用现有固定计算合同 | 保留三种名称及两种输入位序；不直接互换参数 | B3 待实施 |
| [ldpc-decoding](../../.agents/skills/ldpc-decoding/SKILL.md) | 保留 | BP+LSD syndrome 解码是动作；quantum-qldpc 的构码不能替代解码 | 原名称、工作流及已有执行边界不变 | 维持现状 |
| [mitiq-error-mitigation](../../.agents/skills/mitiq-error-mitigation/SKILL.md) | 保留 | 四类误差缓解已经在一个主动作中，采样预算和误差解释仍需要 Skill | 原名称、工作流及已有执行边界不变 | 维持现状 |
| [openqarp-excited-states](../../.agents/skills/openqarp-excited-states/SKILL.md) | 合并 | 与 quantum-vqd 统一 VQD 方法选择；先比较 ansatz、惩罚及结果合同 | 仅合并选择规则；数值实现和原命令在等价证据前保留 | B3 待实施 |
| [oqupy-dynamics](../../.agents/skills/oqupy-dynamics/SKILL.md) | 保留 | Ohmic spin-boson 的非马尔可夫记忆不能由 Markov Lindblad 模拟替代 | 原名称、工作流及已有执行边界不变 | 维持现状 |
| [paulie-algebra](../../.agents/skills/paulie-algebra/SKILL.md) | 保留 | 动力学 Lie 闭包与 Hamiltonian tapering 的目标不同 | 原名称、工作流及已有执行边界不变 | 维持现状 |
| [platform-diagnostics](../../.agents/skills/platform-diagnostics/SKILL.md) | 简化 | 工作流仍含 session.list / llm.models / skill.list 旧式 RPC 名；将探针更新到当前 Harness，并按任务范围选择检查 | 保留诊断报告 schema；已有凭据不等于获准做外部模型验收 | B2 待实施 |
| [pyzx-optimization](../../.agents/skills/pyzx-optimization/SKILL.md) | 保留 | ZX 重写与提取有独立正确性边界，不替换 Compact 或厂商转译 | 原名称、工作流及已有执行边界不变 | 维持现状 |
| [qbraid-conversion](../../.agents/skills/qbraid-conversion/SKILL.md) | 保留 | Qiskit/Cirq 结构化转换含位序与酉矩阵核对，不等同于 QPY/QASM 格式转换 | 原名称、工作流及已有执行边界不变 | 维持现状 |
| [qcut-knitting](../../.agents/skills/qcut-knitting/SKILL.md) | 保留 | 门切割及期望重建有独立采样成本合同 | 原名称、工作流及已有执行边界不变 | 维持现状 |
| [qdmi-device](../../.agents/skills/qdmi-device/SKILL.md) | 保留 | C 驱动设备查询需要 ABI 与进程隔离；示例元数据不能当成真机测量 | 原名称、工作流及已有执行边界不变 | 维持现状 |
| [qec-memory-experiment](../../.agents/skills/qec-memory-experiment/SKILL.md) | 保留 | Stim / PyMatching 的 X/Z memory 与区间估计保留；不与 Deltakit 噪声设定混用 | 原名称、工作流及已有执行边界不变 | 维持现状 |
| [qiskit-circuit-workbench](../../.agents/skills/qiskit-circuit-workbench/SKILL.md) | 合并 | 与 quantum-guide-simulators-qiskit 集中后端准备和迁移说明，保留本入口的 QASM/QPY 审查步骤 | Skill 名称、Qiskit / Docs 连接及格式转换 Tool 不变 | B3 待实施 |
| [qmclaw-workbench](../../.agents/skills/qmclaw-workbench/SKILL.md) | 保留 | 13 类合成测控实验有 SI 参数与模拟边界；不同于真实设备调校 | 原名称、工作流及已有执行边界不变 | 维持现状 |
| [qpanda-qubo](../../.agents/skills/qpanda-qubo/SKILL.md) | 保留 | 命名约束建模和已给矩阵的求解各有独立用户输入，不将两个主动作硬合并 | 原名称、工作流及已有执行边界不变 | 维持现状 |
| [quantum-advection](../../.agents/skills/quantum-advection/SKILL.md) | 保留 | 周期常速平流的显式薛定谔化示例；后续算法增强独立于 SDK 接入验收 | 原名称、工作流及已有执行边界不变 | 维持现状 |
| [quantum-algorithms](../../.agents/skills/quantum-algorithms/SKILL.md) | 简化 | 一个总入口直接检索方法，不再逐级加载 13 个分类 Skill | quantum-algorithms 及既有 shell 执行合同不变 | B1 已实施 |
| [quantum-amplitude-amplification](../../.agents/skills/quantum-amplitude-amplification/SKILL.md) | 保留 | 振幅放大基础积木；后续算法增强独立于 SDK 接入验收 | 原名称、工作流及已有执行边界不变 | 维持现状 |
| [quantum-amplitude-estimation](../../.agents/skills/quantum-amplitude-estimation/SKILL.md) | 保留 | 振幅估计及概率读出；后续算法增强独立于 SDK 接入验收 | 原名称、工作流及已有执行边界不变 | 维持现状 |
| [quantum-aqc](../../.agents/skills/quantum-aqc/SKILL.md) | 保留 | 绝热路径与步长收敛的本地算法示例；后续算法增强独立于 SDK 接入验收 | 原名称、工作流及已有执行边界不变 | 维持现状 |
| [quantum-cartan](../../.agents/skills/quantum-cartan/SKILL.md) | 保留 | 当前是 SO(N) 谱分解替代示例；作为本地算法维护，不宣称原 Cartan-Lax 优化器适配；后续算法增强独立于 SDK 接入验收 | 原名称、工作流及已有执行边界不变 | 维持现状 |
| [quantum-circuit-verification](../../.agents/skills/quantum-circuit-verification/SKILL.md) | 保留 | MQT QCEC 的证明/概率结果分类不能由普通模拟保真度替代 | 原名称、工作流及已有执行边界不变 | 维持现状 |
| [quantum-cvqnn](../../.agents/skills/quantum-cvqnn/SKILL.md) | 保留 | 有限 Fock 截断和有限差分替代示例；不宣称原 autograd 训练器兼容；后续算法增强独立于 SDK 接入验收 | 原名称、工作流及已有执行边界不变 | 维持现状 |
| [quantum-discrete-log](../../.agents/skills/quantum-discrete-log/SKILL.md) | 保留 | 离散对数的群 oracle 与同余恢复；后续算法增强独立于 SDK 接入验收 | 原名称、工作流及已有执行边界不变 | 维持现状 |
| [quantum-fermi-hubbard-vqe](../../.agents/skills/quantum-fermi-hubbard-vqe/SKILL.md) | 保留 | Hubbard 全 Fock 空间 VQE；粒子数未受约束；后续算法增强独立于 SDK 接入验收 | 原名称、工作流及已有执行边界不变 | 维持现状 |
| [quantum-finite-difference](../../.agents/skills/quantum-finite-difference/SKILL.md) | 保留 | 中心有限差分与显式 epsilon；后续算法增强独立于 SDK 接入验收 | 原名称、工作流及已有执行边界不变 | 维持现状 |
| [quantum-glued-trees](../../.agents/skills/quantum-glued-trees/SKILL.md) | 保留 | 连续时间图行走示例，保留稠密编译成本；后续算法增强独立于 SDK 接入验收 | 原名称、工作流及已有执行边界不变 | 维持现状 |
| [quantum-ground-state](../../.agents/skills/quantum-ground-state/SKILL.md) | 保留 | 固定二量子位扇区的 L3 验收链不同于通用 VQE 示例，保留独立合同 | 原名称、工作流及已有执行边界不变 | 维持现状 |
| [quantum-grover](../../.agents/skills/quantum-grover/SKILL.md) | 保留 | 搜索 oracle 与振幅放大的完整教学工作流；后续算法增强独立于 SDK 接入验收 | 原名称、工作流及已有执行边界不变 | 维持现状 |
| [quantum-guide-algorithms](../../.agents/skills/quantum-guide-algorithms/SKILL.md) | 简化 | algorithms 只做分类导航；自动选择改为直达方法 | 原名称、文件、来源映射和用户 /skill 调用保留；模型直接调用分类 Skill 明确拒绝 | B1 已实施 |
| [quantum-guide-algorithms-cryptography](../../.agents/skills/quantum-guide-algorithms-cryptography/SKILL.md) | 简化 | algorithms/cryptography 只做分类导航；自动选择改为直达方法 | 原名称、文件、来源映射和用户 /skill 调用保留；模型直接调用分类 Skill 明确拒绝 | B1 已实施 |
| [quantum-guide-algorithms-eigensolvers](../../.agents/skills/quantum-guide-algorithms-eigensolvers/SKILL.md) | 简化 | algorithms/eigensolvers 只做分类导航；自动选择改为直达方法 | 原名称、文件、来源映射和用户 /skill 调用保留；模型直接调用分类 Skill 明确拒绝 | B1 已实施 |
| [quantum-guide-algorithms-gradients](../../.agents/skills/quantum-guide-algorithms-gradients/SKILL.md) | 简化 | algorithms/gradients 只做分类导航；自动选择改为直达方法 | 原名称、文件、来源映射和用户 /skill 调用保留；模型直接调用分类 Skill 明确拒绝 | B1 已实施 |
| [quantum-guide-algorithms-hamiltonian-simulation](../../.agents/skills/quantum-guide-algorithms-hamiltonian-simulation/SKILL.md) | 简化 | algorithms/hamiltonian-simulation 只做分类导航；自动选择改为直达方法 | 原名称、文件、来源映射和用户 /skill 调用保留；模型直接调用分类 Skill 明确拒绝 | B1 已实施 |
| [quantum-guide-algorithms-linear-systems](../../.agents/skills/quantum-guide-algorithms-linear-systems/SKILL.md) | 简化 | algorithms/linear-systems 只做分类导航；自动选择改为直达方法 | 原名称、文件、来源映射和用户 /skill 调用保留；模型直接调用分类 Skill 明确拒绝 | B1 已实施 |
| [quantum-guide-algorithms-primitives](../../.agents/skills/quantum-guide-algorithms-primitives/SKILL.md) | 简化 | algorithms/primitives 只做分类导航；自动选择改为直达方法 | 原名称、文件、来源映射和用户 /skill 调用保留；模型直接调用分类 Skill 明确拒绝 | B1 已实施 |
| [quantum-guide-algorithms-quantum-chemistry](../../.agents/skills/quantum-guide-algorithms-quantum-chemistry/SKILL.md) | 简化 | algorithms/quantum-chemistry 只做分类导航；自动选择改为直达方法 | 原名称、文件、来源映射和用户 /skill 调用保留；模型直接调用分类 Skill 明确拒绝 | B1 已实施 |
| [quantum-guide-algorithms-quantum-machine-learning](../../.agents/skills/quantum-guide-algorithms-quantum-machine-learning/SKILL.md) | 简化 | algorithms/quantum-machine-learning 只做分类导航；自动选择改为直达方法 | 原名称、文件、来源映射和用户 /skill 调用保留；模型直接调用分类 Skill 明确拒绝 | B1 已实施 |
| [quantum-guide-algorithms-schrodingerization](../../.agents/skills/quantum-guide-algorithms-schrodingerization/SKILL.md) | 简化 | algorithms/schrodingerization 只做分类导航；自动选择改为直达方法 | 原名称、文件、来源映射和用户 /skill 调用保留；模型直接调用分类 Skill 明确拒绝 | B1 已实施 |
| [quantum-guide-algorithms-search](../../.agents/skills/quantum-guide-algorithms-search/SKILL.md) | 简化 | algorithms/search 只做分类导航；自动选择改为直达方法 | 原名称、文件、来源映射和用户 /skill 调用保留；模型直接调用分类 Skill 明确拒绝 | B1 已实施 |
| [quantum-guide-algorithms-state-preparation](../../.agents/skills/quantum-guide-algorithms-state-preparation/SKILL.md) | 简化 | algorithms/state-preparation 只做分类导航；自动选择改为直达方法 | 原名称、文件、来源映射和用户 /skill 调用保留；模型直接调用分类 Skill 明确拒绝 | B1 已实施 |
| [quantum-guide-simulators](../../.agents/skills/quantum-guide-simulators/SKILL.md) | 简化 | simulators 只做分类导航；自动选择改为直达方法 | 原名称、文件、来源映射和用户 /skill 调用保留；模型直接调用分类 Skill 明确拒绝 | B1 已实施 |
| [quantum-guide-simulators-pennylane](../../.agents/skills/quantum-guide-simulators-pennylane/SKILL.md) | 保留 | PennyLane 的可微电路与态制备后端说明仍有独立价值 | 原名称、工作流及已有执行边界不变 | 维持现状 |
| [quantum-guide-simulators-qiskit](../../.agents/skills/quantum-guide-simulators-qiskit/SKILL.md) | 合并 | 与 qiskit-circuit-workbench 共用 Qiskit 准备及迁移说明 | 原名称继续可用；算法示例与工作台 Tool 两条执行路径保留 | B3 待实施 |
| [quantum-guide-simulators-unitarylab](../../.agents/skills/quantum-guide-simulators-unitarylab/SKILL.md) | 保留 | 闭源 API 向开源 SDK 的迁移说明不同于普通模拟器导航 | 原名称、工作流及已有执行边界不变 | 维持现状 |
| [quantum-hadamard-test](../../.agents/skills/quantum-hadamard-test/SKILL.md) | 保留 | 受控幺正的期望值估计；后续算法增强独立于 SDK 接入验收 | 原名称、工作流及已有执行边界不变 | 维持现状 |
| [quantum-hadamard-transform](../../.agents/skills/quantum-hadamard-transform/SKILL.md) | 保留 | Hadamard 变换基础积木；后续算法增强独立于 SDK 接入验收 | 原名称、工作流及已有执行边界不变 | 维持现状 |
| [quantum-hamiltonian-qsp](../../.agents/skills/quantum-hamiltonian-qsp/SKILL.md) | 保留 | 偶奇多项式 LCU、block encoding 与后选择的本地教学实现；后续算法增强独立于 SDK 接入验收 | 原名称、工作流及已有执行边界不变 | 维持现状 |
| [quantum-heat-1d](../../.agents/skills/quantum-heat-1d/SKILL.md) | 保留 | 一维热方程的边界与辅助 Fourier 网格；后续算法增强独立于 SDK 接入验收 | 原名称、工作流及已有执行边界不变 | 维持现状 |
| [quantum-heat-2d](../../.agents/skills/quantum-heat-2d/SKILL.md) | 保留 | 二维网格的空间/辅助网格收敛；后续算法增强独立于 SDK 接入验收 | 原名称、工作流及已有执行边界不变 | 维持现状 |
| [quantum-hhl](../../.agents/skills/quantum-hhl/SKILL.md) | 保留 | QPE、倒数旋转和后选择的本地算法示例；后续算法增强独立于 SDK 接入验收 | 原名称、工作流及已有执行边界不变 | 维持现状 |
| [quantum-hidden-shift](../../.agents/skills/quantum-hidden-shift/SKILL.md) | 保留 | 指定 bent 函数族的 oracle 恢复；后续算法增强独立于 SDK 接入验收 | 原名称、工作流及已有执行边界不变 | 维持现状 |
| [quantum-information-audit](../../.agents/skills/quantum-information-audit/SKILL.md) | 保留 | 密度矩阵审计带独立 Validator 与 L3 证据链，不由随机测量估计替代 | 原名称、工作流及已有执行边界不变 | 维持现状 |
| [quantum-ising](../../.agents/skills/quantum-ising/SKILL.md) | 保留 | 二维 Ising 的 quimb MPS 演化，不与 TeNPy 基态求解混用；后续算法增强独立于 SDK 接入验收 | 原名称、工作流及已有执行边界不变 | 维持现状 |
| [quantum-lcu](../../.agents/skills/quantum-lcu/SKILL.md) | 保留 | 线性组合幺正与辅助位后选择；后续算法增强独立于 SDK 接入验收 | 原名称、工作流及已有执行边界不变 | 维持现状 |
| [quantum-linear-combination](../../.agents/skills/quantum-linear-combination/SKILL.md) | 保留 | 线性组合导数电路；后续算法增强独立于 SDK 接入验收 | 原名称、工作流及已有执行边界不变 | 维持现状 |
| [quantum-molecular-dmrg](../../.agents/skills/quantum-molecular-dmrg/SKILL.md) | 保留 | PySCF 积分和 quimb DMRG；保留稠密预处理与 CVD 替代边界；后续算法增强独立于 SDK 接入验收 | 原名称、工作流及已有执行边界不变 | 维持现状 |
| [quantum-mottonen](../../.agents/skills/quantum-mottonen/SKILL.md) | 保留 | Möttönen 均匀受控旋转制备；后续算法增强独立于 SDK 接入验收 | 原名称、工作流及已有执行边界不变 | 维持现状 |
| [quantum-mps](../../.agents/skills/quantum-mps/SKILL.md) | 保留 | SVD 截断、右规范化与 MPSPrep；后续算法增强独立于 SDK 接入验收 | 原名称、工作流及已有执行边界不变 | 维持现状 |
| [quantum-multiplexer](../../.agents/skills/quantum-multiplexer/SKILL.md) | 保留 | StatePreparation/Isometry 均匀受控合成；后续算法增强独立于 SDK 接入验收 | 原名称、工作流及已有执行边界不变 | 维持现状 |
| [quantum-numpy-eigensolver](../../.agents/skills/quantum-numpy-eigensolver/SKILL.md) | 合并 | Hermitian 稠密本征对与残差；可承接最小本征对的共享实现 | 保留两个 Skill 和 CLI 入口；不同返回形状由兼容层保持 | B3 待实施 |
| [quantum-numpy-minimum-eigensolver](../../.agents/skills/quantum-numpy-minimum-eigensolver/SKILL.md) | 合并 | 最小本征对是 numpy_eigensolver 的 k=1 情形；合并内部经典求解与残差逻辑 | 保留两个 Skill 和 CLI 入口；不同返回形状由兼容层保持 | B3 待实施 |
| [quantum-parameter-shift](../../.agents/skills/quantum-parameter-shift/SKILL.md) | 保留 | 适用门生成元的参数移位；后续算法增强独立于 SDK 接入验收 | 原名称、工作流及已有执行边界不变 | 维持现状 |
| [quantum-pauli](../../.agents/skills/quantum-pauli/SKILL.md) | 保留 | Pauli 旋转变分态制备及未收敛状态；后续算法增强独立于 SDK 接入验收 | 原名称、工作流及已有执行边界不变 | 维持现状 |
| [quantum-qaoa](../../.agents/skills/quantum-qaoa/SKILL.md) | 保留 | 无权 MaxCut 示例；不能替代通用 QUBO 建模合同；后续算法增强独立于 SDK 接入验收 | 原名称、工作流及已有执行边界不变 | 维持现状 |
| [quantum-qcbm](../../.agents/skills/quantum-qcbm/SKILL.md) | 保留 | Born 概率分布拟合；后续算法增强独立于 SDK 接入验收 | 原名称、工作流及已有执行边界不变 | 维持现状 |
| [quantum-qdrift](../../.agents/skills/quantum-qdrift/SKILL.md) | 合并 | 已有 Hamiltonian Tool 及共享实现；集中随机公式与位序解释 | 保留原 --algorithm 值及 Qiskit 位序；固定 Tool 的 q0 最左合同不变 | B3 待实施 |
| [quantum-qfi](../../.agents/skills/quantum-qfi/SKILL.md) | 保留 | 纯态 QFI/ReverseQGT，不等同于测量 Fisher 信息；后续算法增强独立于 SDK 接入验收 | 原名称、工作流及已有执行边界不变 | 维持现状 |
| [quantum-qft](../../.agents/skills/quantum-qft/SKILL.md) | 保留 | 量子 Fourier 变换基础积木；后续算法增强独立于 SDK 接入验收 | 原名称、工作流及已有执行边界不变 | 维持现状 |
| [quantum-qldpc](../../.agents/skills/quantum-qldpc/SKILL.md) | 保留 | HGP CSS 构码与 syndrome；解码继续交给 ldpc-decoding；后续算法增强独立于 SDK 接入验收 | 原名称、工作流及已有执行边界不变 | 维持现状 |
| [quantum-qpe](../../.agents/skills/quantum-qpe/SKILL.md) | 保留 | 本征相位估计基础积木；后续算法增强独立于 SDK 接入验收 | 原名称、工作流及已有执行边界不变 | 维持现状 |
| [quantum-qsp](../../.agents/skills/quantum-qsp/SKILL.md) | 保留 | QSP/QSVT 相位综合与截断检查；后续算法增强独立于 SDK 接入验收 | 原名称、工作流及已有执行边界不变 | 维持现状 |
| [quantum-qsvt-qlsa](../../.agents/skills/quantum-qsvt-qlsa/SKILL.md) | 保留 | 基于 PennyLane QSVT 的有界倒数多项式示例；后续算法增强独立于 SDK 接入验收 | 原名称、工作流及已有执行边界不变 | 维持现状 |
| [quantum-reverse](../../.agents/skills/quantum-reverse/SKILL.md) | 保留 | 反向态矢量导数；后续算法增强独立于 SDK 接入验收 | 原名称、工作流及已有执行边界不变 | 维持现状 |
| [quantum-sdk-advisor](../../.agents/skills/quantum-sdk-advisor/SKILL.md) | 保留 | 跨 SDK 的许可证、资源和选型判断有独立价值，继续复用通用 Tool | 原名称、工作流及已有执行边界不变 | 维持现状 |
| [quantum-shor](../../.agents/skills/quantum-shor/SKILL.md) | 保留 | 可逆模乘、相位估计及因子验证；后续算法增强独立于 SDK 接入验收 | 原名称、工作流及已有执行边界不变 | 维持现状 |
| [quantum-simon](../../.agents/skills/quantum-simon/SKILL.md) | 保留 | 二对一 oracle 与 GF(2) 样本恢复；后续算法增强独立于 SDK 接入验收 | 原名称、工作流及已有执行边界不变 | 维持现状 |
| [quantum-spsa](../../.agents/skills/quantum-spsa/SKILL.md) | 保留 | 带种子和批量的随机梯度；后续算法增强独立于 SDK 接入验收 | 原名称、工作流及已有执行边界不变 | 维持现状 |
| [quantum-superposition](../../.agents/skills/quantum-superposition/SKILL.md) | 保留 | 计算基叠加与辅助位清零；后续算法增强独立于 SDK 接入验收 | 原名称、工作流及已有执行边界不变 | 维持现状 |
| [quantum-taylor](../../.agents/skills/quantum-taylor/SKILL.md) | 保留 | Taylor Pauli LCU 的 PREPARE/SELECT 电路示例；后续算法增强独立于 SDK 接入验收 | 原名称、工作流及已有执行边界不变 | 维持现状 |
| [quantum-trotter](../../.agents/skills/quantum-trotter/SKILL.md) | 合并 | 已有 Hamiltonian Tool 及共享实现；集中确定性乘积公式与位序解释 | 保留原 --algorithm 值及 Qiskit 位序；固定 Tool 的 q0 最左合同不变 | B3 待实施 |
| [quantum-vqc](../../.agents/skills/quantum-vqc/SKILL.md) | 保留 | 参数电路分类与训练集指标；后续算法增强独立于 SDK 接入验收 | 原名称、工作流及已有执行边界不变 | 维持现状 |
| [quantum-vqd](../../.agents/skills/quantum-vqd/SKILL.md) | 合并 | 与 OpenQARP VQD 的选型入口交叉；比较 ansatz、惩罚和输出后统一选择规则 | 原示例和 OpenQARP 入口保留；不在未验证时替换数值后端 | B3 待实施 |
| [quantum-vqe](../../.agents/skills/quantum-vqe/SKILL.md) | 保留 | 通用实 Pauli VQE 示例；不继承 quantum-ground-state 的 L3 验收；后续算法增强独立于 SDK 接入验收 | 原名称、工作流及已有执行边界不变 | 维持现状 |
| [quantum-vqls](../../.agents/skills/quantum-vqls/SKILL.md) | 保留 | 变分线性求解的残差目标与优化终止解释；后续算法增强独立于 SDK 接入验收 | 原名称、工作流及已有执行边界不变 | 维持现状 |
| [randomized-measurements](../../.agents/skills/randomized-measurements/SKILL.md) | 保留 | 局部 Haar 测量的统计纯度估计与直接密度矩阵计算不同 | 原名称、工作流及已有执行边界不变 | 维持现状 |
| [sqd-chemistry](../../.agents/skills/sqd-chemistry/SKILL.md) | 保留 | 频数驱动的活性空间对角化不同于分子 DMRG，保留输入数据与冻结核边界 | 原名称、工作流及已有执行边界不变 | 维持现状 |
| [symmer-tapering](../../.agents/skills/symmer-tapering/SKILL.md) | 保留 | 显式对称性扇区选择及谱对照不可由 Lie 闭包分析替代 | 原名称、工作流及已有执行边界不变 | 维持现状 |
| [tenpy-ground-state](../../.agents/skills/tenpy-ground-state/SKILL.md) | 保留 | 自旋链 DMRG 与分子积分/MPO 路径不同，保留各自物理输入 | 原名称、工作流及已有执行边界不变 | 维持现状 |
| [tjm-dynamics](../../.agents/skills/tjm-dynamics/SKILL.md) | 保留 | 多体开放链轨迹及可选密度矩阵参考具有独立规模与统计边界 | 原名称、工作流及已有执行边界不变 | 维持现状 |
| [tyxonq-workbench](../../.agents/skills/tyxonq-workbench/SKILL.md) | 保留 | 保留 TyxonQ 语义及噪声输入；与 Qiskit 同能运行电路不构成互换合同 | 原名称、工作流及已有执行边界不变 | 维持现状 |

## 全量 MCP 连接清单（37）

外部 MCP 的合同和开关见能力合同及 Preset。本次开源适配范围不扩展到云提交、CUDA 后端或硬件实验，也不因此删除以前已经存在的按需连接。

| 连接 / 源码 | 归属 / 数量 / 配置策略 | 建议 | 理由与职责 | 兼容影响 | 批次 / 状态 |
| --- | --- | --- | --- | --- | --- |
| [hamiltonian_local](../../.agents/skills/hamiltonian-simulation/mcp/server.mjs) | hamiltonian-simulation；1 Tool；默认 | 保留 | 已有显式 setup 与只读计算分离；Python 边界和稳定科学输入支持保留 MCP | 连接与计算合同不变 | 维持现状 |
| `qiskit_ibm_runtime` | qiskit-ibm-runtime；20 Tool；按需；默认关闭 | 保留 | IBM 账号、后端与云作业 由已有上游 MCP 提供，保持供应商/协议边界；复用上游而非重写 | 连接名、凭据隔离、默认开关与公开 Tool 合同不变 | 维持现状 |
| `qiskit_ibm_transpiler` | qiskit-ibm-transpiler；7 Tool；按需；默认关闭 | 保留 | IBM AI 编译服务 由已有上游 MCP 提供，保持供应商/协议边界；复用上游而非重写 | 连接名、凭据隔离、默认开关与公开 Tool 合同不变 | 维持现状 |
| `qiskit_gym` | qiskit-gym；37 Tool；按需；默认关闭 | 简化 | 37 个动作维持上游实现；按专业用途选择暴露范围，避免启用一个后端就要求理解全部工作流 | 保留关闭默认值与原完整连接；新增选择策略需兼容旧配置和会话 | B3 待实施 |
| `qpanda_runtime` | qpanda-runtime；19 Tool；按需；默认关闭 | 保留 | 本源云任务与绑定 由已有上游 MCP 提供，保持供应商/协议边界；复用上游而非重写 | 连接名、凭据隔离、默认开关与公开 Tool 合同不变 | 维持现状 |
| `quantum_hardware` | quantum-hardware；53 Tool；按需；默认关闭 | 简化 | 53 个动作维持上游实现；按专业用途选择暴露范围，避免启用一个后端就要求理解全部工作流 | 保留关闭默认值与原完整连接；新增选择策略需兼容旧配置和会话 | B3 待实施 |
| `qiskit` | qiskit-circuit-workbench；7 Tool；默认；离线开关可关 | 保留 | QASM/QPY 电路审查与转译 由已有上游 MCP 提供，保持供应商/协议边界；复用上游而非重写 | 连接名、凭据隔离、默认开关与公开 Tool 合同不变 | 维持现状 |
| `qiskit_docs` | qiskit-circuit-workbench；3 Tool；默认；离线开关可关 | 保留 | SDK 文档与错误检索 由已有上游 MCP 提供，保持供应商/协议边界；复用上游而非重写 | 连接名、凭据隔离、默认开关与公开 Tool 合同不变 | 维持现状 |
| [fieldqkit](../../.agents/skills/fieldqkit-hardware/mcp/server.mjs) | fieldqkit-hardware；2 Tool；默认 | 迁移 | 国产后端发现及凭据状态 的首次依赖准备与业务执行分离；逐一审计专用桥接，不强套共享输出合同 | 保留连接、凭据及业务合同；setup/锁与错误语义需兼容旧环境 | B2 待实施 |
| [qpanda_qubo](../../.agents/skills/qpanda-qubo/mcp/server.mjs) | qpanda-qubo；2 Tool；默认 | 迁移 | 约束建模及 QUBO 求解 的首次依赖准备与业务执行分离；逐一审计专用桥接，不强套共享输出合同 | 保留连接、凭据及业务合同；setup/锁与错误语义需兼容旧环境 | B2 待实施 |
| [qcec_local](../../.agents/skills/quantum-circuit-verification/mcp/server.mjs) | quantum-circuit-verification；1 Tool；默认 | 迁移 | QCEC 电路等价性 的首次依赖准备与业务执行分离；逐一审计专用桥接，不强套共享输出合同 | 保留连接、凭据及业务合同；setup/锁与错误语义需兼容旧环境 | B2 待实施 |
| [qec_local](../../.agents/skills/qec-memory-experiment/mcp/server.mjs) | qec-memory-experiment；1 Tool；默认 | 迁移 | Stim/PyMatching memory 的首次依赖准备与业务执行分离；逐一审计专用桥接，不强套共享输出合同 | 保留连接、凭据及业务合同；setup/锁与错误语义需兼容旧环境 | B2 待实施 |
| [fatqat_local](../../.agents/skills/fatqat-workbench/mcp/server.mjs) | fatqat-workbench；2 Tool；默认 | 迁移 | 门模型及脉冲模拟 的首次依赖准备与业务执行分离；逐一审计专用桥接，不强套共享输出合同 | 保留连接、凭据及业务合同；setup/锁与错误语义需兼容旧环境 | B2 待实施 |
| [tyxonq_local](../../.agents/skills/tyxonq-workbench/mcp/server.mjs) | tyxonq-workbench；1 Tool；按需；默认关闭 | 迁移 | TyxonQ 电路与噪声模拟 的首次依赖准备与业务执行分离；逐一审计专用桥接，不强套共享输出合同 | 保留连接、凭据及业务合同；setup/锁与错误语义需兼容旧环境 | B2 待实施 |
| [toqito_audit](../../.agents/skills/quantum-information-audit/mcp/server.mjs) | quantum-information-audit；1 Tool；默认 | 迁移 | 密度矩阵审计 的首次依赖准备与业务执行分离；逐一审计专用桥接，不强套共享输出合同 | 保留连接、凭据及业务合同；setup/锁与错误语义需兼容旧环境 | B2 待实施 |
| [mitiq_local](../../.agents/skills/mitiq-error-mitigation/mcp/server.mjs) | mitiq-error-mitigation；1 Tool；默认 | 迁移 | 误差缓解 的 Python 进程隔离保留；uv run 环境准备迁至显式 setup，共用已存在的准备机制 | 连接名、Tool 名与 schema 保留；旧环境需核验锁和补写准备标记，缺依赖返回 setup 提示 | B2 待实施 |
| [sqd_local](../../.agents/skills/sqd-chemistry/mcp/server.mjs) | sqd-chemistry；1 Tool；默认 | 迁移 | 采样子空间对角化 的 Python 进程隔离保留；uv run 环境准备迁至显式 setup，共用已存在的准备机制 | 连接名、Tool 名与 schema 保留；旧环境需核验锁和补写准备标记，缺依赖返回 setup 提示 | B2 待实施 |
| [tjm_local](../../.agents/skills/tjm-dynamics/mcp/server.mjs) | tjm-dynamics；1 Tool；默认 | 迁移 | 张量跳跃轨迹 的 Python 进程隔离保留；uv run 环境准备迁至显式 setup，共用已存在的准备机制 | 连接名、Tool 名与 schema 保留；旧环境需核验锁和补写准备标记，缺依赖返回 setup 提示 | B2 待实施 |
| [ldpc_local](../../.agents/skills/ldpc-decoding/mcp/server.mjs) | ldpc-decoding；1 Tool；默认 | 迁移 | BP+LSD 解码 的 Python 进程隔离保留；uv run 环境准备迁至显式 setup，共用已存在的准备机制 | 连接名、Tool 名与 schema 保留；旧环境需核验锁和补写准备标记，缺依赖返回 setup 提示 | B2 待实施 |
| [flow_vqe_local](../../.agents/skills/flow-vqe/mcp/server.mjs) | flow-vqe；1 Tool；默认 | 迁移 | flow 参数训练 的 Python 进程隔离保留；uv run 环境准备迁至显式 setup，共用已存在的准备机制 | 连接名、Tool 名与 schema 保留；旧环境需核验锁和补写准备标记，缺依赖返回 setup 提示 | B2 待实施 |
| [tenpy_local](../../.agents/skills/tenpy-ground-state/mcp/server.mjs) | tenpy-ground-state；1 Tool；默认 | 迁移 | 自旋链 DMRG 的 Python 进程隔离保留；uv run 环境准备迁至显式 setup，共用已存在的准备机制 | 连接名、Tool 名与 schema 保留；旧环境需核验锁和补写准备标记，缺依赖返回 setup 提示 | B2 待实施 |
| [random_meas_local](../../.agents/skills/randomized-measurements/mcp/server.mjs) | randomized-measurements；1 Tool；默认 | 保留 | Julia 与 Python 依赖不可直接拼接；公共协议测试可合并，语言准备仍独立 | 连接、Manifest 与结果合同不变；维持当前副作用声明 | B1 合并测试；运行时保留 |
| [dynamiqs_local](../../.agents/skills/dynamiqs-dynamics/mcp/server.mjs) | dynamiqs-dynamics；1 Tool；默认 | 迁移 | Lindblad 演化及梯度 的 Python 进程隔离保留；uv run 环境准备迁至显式 setup，共用已存在的准备机制 | 连接名、Tool 名与 schema 保留；旧环境需核验锁和补写准备标记，缺依赖返回 setup 提示 | B2 待实施 |
| [clifft_local](../../.agents/skills/clifft-sampling/mcp/server.mjs) | clifft-sampling；2 Tool；默认 | 迁移 | Clifford+T 采样与 Stim 记录 的 Python 进程隔离保留；uv run 环境准备迁至显式 setup，共用已存在的准备机制 | 连接名、Tool 名与 schema 保留；旧环境需核验锁和补写准备标记，缺依赖返回 setup 提示 | B2 待实施 |
| [oqupy_local](../../.agents/skills/oqupy-dynamics/mcp/server.mjs) | oqupy-dynamics；1 Tool；默认 | 迁移 | 非马尔可夫 TEMPO 的 Python 进程隔离保留；uv run 环境准备迁至显式 setup，共用已存在的准备机制 | 连接名、Tool 名与 schema 保留；旧环境需核验锁和补写准备标记，缺依赖返回 setup 提示 | B2 待实施 |
| [deltakit_local](../../.agents/skills/deltakit-qec/mcp/server.mjs) | deltakit-qec；1 Tool；默认 | 迁移 | 矩形码存储实验 的 Python 进程隔离保留；uv run 环境准备迁至显式 setup，共用已存在的准备机制 | 连接名、Tool 名与 schema 保留；旧环境需核验锁和补写准备标记，缺依赖返回 setup 提示 | B2 待实施 |
| [pyzx_local](../../.agents/skills/pyzx-optimization/mcp/server.mjs) | pyzx-optimization；1 Tool；默认 | 迁移 | ZX 电路优化 的 Python 进程隔离保留；uv run 环境准备迁至显式 setup，共用已存在的准备机制 | 连接名、Tool 名与 schema 保留；旧环境需核验锁和补写准备标记，缺依赖返回 setup 提示 | B2 待实施 |
| [graphix_local](../../.agents/skills/graphix-mbqc/mcp/server.mjs) | graphix-mbqc；1 Tool；默认 | 迁移 | MBQC 模式与模拟 的 Python 进程隔离保留；uv run 环境准备迁至显式 setup，共用已存在的准备机制 | 连接名、Tool 名与 schema 保留；旧环境需核验锁和补写准备标记，缺依赖返回 setup 提示 | B2 待实施 |
| [symmer_local](../../.agents/skills/symmer-tapering/mcp/server.mjs) | symmer-tapering；1 Tool；默认 | 迁移 | 指定扇区 tapering 的 Python 进程隔离保留；uv run 环境准备迁至显式 setup，共用已存在的准备机制 | 连接名、Tool 名与 schema 保留；旧环境需核验锁和补写准备标记，缺依赖返回 setup 提示 | B2 待实施 |
| [paulie_local](../../.agents/skills/paulie-algebra/mcp/server.mjs) | paulie-algebra；1 Tool；默认 | 迁移 | 动力学 Lie 代数 的 Python 进程隔离保留；uv run 环境准备迁至显式 setup，共用已存在的准备机制 | 连接名、Tool 名与 schema 保留；旧环境需核验锁和补写准备标记，缺依赖返回 setup 提示 | B2 待实施 |
| [qcut_local](../../.agents/skills/qcut-knitting/mcp/server.mjs) | qcut-knitting；1 Tool；默认 | 迁移 | 门切割与重建 的 Python 进程隔离保留；uv run 环境准备迁至显式 setup，共用已存在的准备机制 | 连接名、Tool 名与 schema 保留；旧环境需核验锁和补写准备标记，缺依赖返回 setup 提示 | B2 待实施 |
| [compact_local](../../.agents/skills/compact-optimization/mcp/server.mjs) | compact-optimization；1 Tool；默认 | 迁移 | Compact 电路优化 的 Python 进程隔离保留；uv run 环境准备迁至显式 setup，共用已存在的准备机制 | 连接名、Tool 名与 schema 保留；旧环境需核验锁和补写准备标记，缺依赖返回 setup 提示 | B2 待实施 |
| [openqarp_local](../../.agents/skills/openqarp-excited-states/mcp/server.mjs) | openqarp-excited-states；1 Tool；默认 | 迁移 | OpenQARP VQD 的 Python 进程隔离保留；uv run 环境准备迁至显式 setup，共用已存在的准备机制 | 连接名、Tool 名与 schema 保留；旧环境需核验锁和补写准备标记，缺依赖返回 setup 提示 | B2 待实施 |
| [cqlib_kernel_local](../../.agents/skills/cqlib-kernel/mcp/server.mjs) | cqlib-kernel；1 Tool；按需；默认关闭 | 迁移 | 角度核与 QSVM 的 Python 进程隔离保留；uv run 环境准备迁至显式 setup，共用已存在的准备机制 | 连接名、Tool 名与 schema 保留；旧环境需核验锁和补写准备标记，缺依赖返回 setup 提示 | B2 待实施 |
| [flagquantum](../../.agents/skills/flagquantum-workbench/mcp/server.mjs) | flagquantum-workbench；17 Tool；按需；默认关闭 | 简化 | 17 个动作维持上游实现；按专业用途选择暴露范围，避免启用一个后端就要求理解全部工作流 | 保留关闭默认值与原完整连接；新增选择策略需兼容旧配置和会话 | B3 待实施 |
| [qbraid_local](../../.agents/skills/qbraid-conversion/mcp/server.mjs) | qbraid-conversion；1 Tool；默认 | 迁移 | Qiskit/Cirq 转换 的 Python 进程隔离保留；uv run 环境准备迁至显式 setup，共用已存在的准备机制 | 连接名、Tool 名与 schema 保留；旧环境需核验锁和补写准备标记，缺依赖返回 setup 提示 | B2 待实施 |
| [qdmi_local](../../.agents/skills/qdmi-device/mcp/server.mjs) | qdmi-device；1 Tool；按需；默认关闭 | 保留 | 已显式准备 C 驱动并保持只读；不能因使用同一 Harness 合并进 Python 环境 | 驱动路径、ABI 与关闭默认值不变 | 维持现状 |

## 全量 Tool 清单（220）

MCP Tool 按完整注册名列出；同一短名称在不同连接下不是同一个 Tool。副作用列沿用当前能力合同，不能把计划中的 setup 分离当作现有 read-only 事实。以下每项都在清单中保留原全名；除明确标为 B1 的变化外，简化/合并/迁移的兼容动作尚待对应批次实施。

### Harness 原生 Tool（18，跨平台并集）

| 注册名 | Provider | 建议 | 理由 | 兼容影响 |
| --- | --- | --- | --- | --- |
| `bash` | `@deepseek-ai/dsh-tool-bash` | 保留 | macOS/Linux 通用执行；Windows 不注册；使用 Harness 已有能力 | 原接口与 Harness 权限、作业和日志行为不变 |
| `pwsh` | `@deepseek-ai/dsh-tool-pwsh` | 保留 | Windows 通用执行；其他平台不注册；使用 Harness 已有能力 | 原接口与 Harness 权限、作业和日志行为不变 |
| `read` | `@deepseek-ai/dsh-tool-fs` | 保留 | 文件读取；使用 Harness 已有能力 | 原接口与 Harness 权限、作业和日志行为不变 |
| `write` | `@deepseek-ai/dsh-tool-fs` | 保留 | 文件写入；使用 Harness 已有能力 | 原接口与 Harness 权限、作业和日志行为不变 |
| `edit` | `@deepseek-ai/dsh-tool-fs` | 保留 | 定点编辑；使用 Harness 已有能力 | 原接口与 Harness 权限、作业和日志行为不变 |
| `read_image` | `@deepseek-ai/dsh-tool-fs` | 保留 | 图像读取；使用 Harness 已有能力 | 原接口与 Harness 权限、作业和日志行为不变 |
| `glob` | `@deepseek-ai/dsh-tool-fs-search` | 保留 | 路径检索；使用 Harness 已有能力 | 原接口与 Harness 权限、作业和日志行为不变 |
| `grep` | `@deepseek-ai/dsh-tool-fs-search` | 保留 | 内容检索；使用 Harness 已有能力 | 原接口与 Harness 权限、作业和日志行为不变 |
| `job_output` | `@deepseek-ai/dsh-tool-jobs` | 保留 | 读取作业输出；使用 Harness 已有能力 | 原接口与 Harness 权限、作业和日志行为不变 |
| `job_list` | `@deepseek-ai/dsh-tool-jobs` | 保留 | 查询作业；使用 Harness 已有能力 | 原接口与 Harness 权限、作业和日志行为不变 |
| `job_kill` | `@deepseek-ai/dsh-tool-jobs` | 保留 | 停止作业；使用 Harness 已有能力 | 原接口与 Harness 权限、作业和日志行为不变 |
| `skill` | `@deepseek-ai/dsh-tool-skill` | 保留 | 按原生调用策略加载 Skill；使用 Harness 已有能力 | B1 只采用既有原生调用标记；接口不变 |
| `get_goal` | `@deepseek-ai/dsh-tool-goal` | 保留 | 目标状态；使用 Harness 已有能力 | 原接口与 Harness 权限、作业和日志行为不变 |
| `create_goal` | `@deepseek-ai/dsh-tool-goal` | 保留 | 显式创建目标；使用 Harness 已有能力 | 原接口与 Harness 权限、作业和日志行为不变 |
| `update_goal` | `@deepseek-ai/dsh-tool-goal` | 保留 | 目标更新；使用 Harness 已有能力 | 原接口与 Harness 权限、作业和日志行为不变 |
| `ask_user_question` | `@deepseek-ai/dsh-tool-ask-user` | 保留 | 请求用户输入；使用 Harness 已有能力 | 原接口与 Harness 权限、作业和日志行为不变 |
| `todo_write` | `@deepseek-ai/dsh-tool-todo` | 保留 | 待办更新；使用 Harness 已有能力 | 原接口与 Harness 权限、作业和日志行为不变 |
| `web_search` | `@deepseek-ai/dsh-tool-web` | 保留 | 网络检索；使用 Harness 已有能力 | 原接口与 Harness 权限、作业和日志行为不变 |

当前关闭项：`web_fetch`（同属 `@deepseek-ai/dsh-tool-web`）。建议**保留关闭状态**；没有用户需求和 Provider 验证前不增加注册，亦不删除依赖包内实现。

### OpenQuantum 原生 Tool（6）

| 注册名 | 归属 / 当前副作用 | 建议 | 理由 | 兼容影响 |
| --- | --- | --- | --- | --- |
| `quantum_practices` | quantum-practices / read-only | 简化 | 单一只读参考检索；B1 让分类结果指向总入口，避免建议模型加载手动分类 | 原 name/action/id 与返回文本结构保持；分类条目的调用指引更新 |
| `generate_quantum_classroom` | quantum-learning / external-write | 保留 | 教学应用命令通过 Application Interface 执行，保持模型调用与应用写入边界 | 原调用、模型路由与 external-write 合同不变 |
| `list_qmclaw_experiments` | qmclaw-workbench / read-only | 保留 | 13 类实验参数、单位与默认值有结构化发现用途；不能在模拟前猜参数 | 查询名称、空输入与目录输出不变 |
| `simulate_qmclaw_experiment` | qmclaw-workbench / read-only | 保留 | 独立的本地合成数据动作；不包装成 MCP | 13 类实验输入和模拟输出不变 |
| `solve_and_validate_ground_state` | quantum-ground-state / workspace-write | 保留 | 固定扇区求解及 L3 物化/科学验收需要保留完整合同 | 名称、证据写入、Validator 和 central Acceptance 不变 |
| `metriq_benchmarks` | metriq-data / read-only | 保留 | 固定公开快照查询，进程内实现已足够 | 查询与来源快照合同不变 |

### hamiltonian_local（1）

默认；归属 `hamiltonian-simulation`。

| 完整注册名 | 当前副作用 | 建议 | 理由 | 兼容影响 / 批次 |
| --- | --- | --- | --- | --- |
| `mcp__hamiltonian_local__simulate_hamiltonian` | read-only | 保留 | 固定 Trotter/qDrift 计算 的既有动作；不新增代理 Tool 或重写其算法 | 全名、schema、结果及已有副作用不变 |

### qiskit_ibm_runtime（20）

按需；默认关闭；归属 `qiskit-ibm-runtime`。

| 完整注册名 | 当前副作用 | 建议 | 理由 | 兼容影响 / 批次 |
| --- | --- | --- | --- | --- |
| `mcp__qiskit_ibm_runtime__setup_ibm_quantum_account_tool` | external-write | 保留 | 账号/凭据属于本供应商连接；即使名称重复也不能合并账号存储或权限 | 保留连接限定名、凭据引用和副作用 |
| `mcp__qiskit_ibm_runtime__list_backends_tool` | read-only | 保留 | IBM 账号、后端与云作业 的既有动作；不新增代理 Tool 或重写其算法 | 全名、schema、结果及已有副作用不变 |
| `mcp__qiskit_ibm_runtime__least_busy_backend_tool` | read-only | 保留 | IBM 账号、后端与云作业 的既有动作；不新增代理 Tool 或重写其算法 | 全名、schema、结果及已有副作用不变 |
| `mcp__qiskit_ibm_runtime__get_backend_properties_tool` | read-only | 保留 | IBM 账号、后端与云作业 的既有动作；不新增代理 Tool 或重写其算法 | 全名、schema、结果及已有副作用不变 |
| `mcp__qiskit_ibm_runtime__get_backend_calibration_tool` | read-only | 保留 | IBM 账号、后端与云作业 的既有动作；不新增代理 Tool 或重写其算法 | 全名、schema、结果及已有副作用不变 |
| `mcp__qiskit_ibm_runtime__get_coupling_map_tool` | read-only | 保留 | IBM 账号、后端与云作业 的既有动作；不新增代理 Tool 或重写其算法 | 全名、schema、结果及已有副作用不变 |
| `mcp__qiskit_ibm_runtime__find_optimal_qubit_chains_tool` | read-only | 保留 | IBM 账号、后端与云作业 的既有动作；不新增代理 Tool 或重写其算法 | 全名、schema、结果及已有副作用不变 |
| `mcp__qiskit_ibm_runtime__find_optimal_qv_qubits_tool` | read-only | 保留 | IBM 账号、后端与云作业 的既有动作；不新增代理 Tool 或重写其算法 | 全名、schema、结果及已有副作用不变 |
| `mcp__qiskit_ibm_runtime__list_my_jobs_tool` | read-only | 保留 | IBM 账号、后端与云作业 的既有动作；不新增代理 Tool 或重写其算法 | 全名、schema、结果及已有副作用不变 |
| `mcp__qiskit_ibm_runtime__get_job_status_tool` | read-only | 保留 | IBM 账号、后端与云作业 的既有动作；不新增代理 Tool 或重写其算法 | 全名、schema、结果及已有副作用不变 |
| `mcp__qiskit_ibm_runtime__get_job_results_tool` | read-only | 保留 | IBM 账号、后端与云作业 的既有动作；不新增代理 Tool 或重写其算法 | 全名、schema、结果及已有副作用不变 |
| `mcp__qiskit_ibm_runtime__cancel_job_tool` | external-write | 保留 | IBM 账号、后端与云作业 的既有动作；不新增代理 Tool 或重写其算法 | 全名、schema、结果及已有副作用不变 |
| `mcp__qiskit_ibm_runtime__run_estimator_tool` | external-write | 保留 | IBM 账号、后端与云作业 的既有动作；不新增代理 Tool 或重写其算法 | 全名、schema、结果及已有副作用不变 |
| `mcp__qiskit_ibm_runtime__delete_saved_account_tool` | external-write | 保留 | 账号/凭据属于本供应商连接；即使名称重复也不能合并账号存储或权限 | 保留连接限定名、凭据引用和副作用 |
| `mcp__qiskit_ibm_runtime__list_saved_accounts_tool` | read-only | 保留 | 账号/凭据属于本供应商连接；即使名称重复也不能合并账号存储或权限 | 保留连接限定名、凭据引用和副作用 |
| `mcp__qiskit_ibm_runtime__active_account_info_tool` | read-only | 保留 | 账号/凭据属于本供应商连接；即使名称重复也不能合并账号存储或权限 | 保留连接限定名、凭据引用和副作用 |
| `mcp__qiskit_ibm_runtime__active_instance_info_tool` | read-only | 保留 | IBM 账号、后端与云作业 的既有动作；不新增代理 Tool 或重写其算法 | 全名、schema、结果及已有副作用不变 |
| `mcp__qiskit_ibm_runtime__available_instances_tool` | read-only | 保留 | IBM 账号、后端与云作业 的既有动作；不新增代理 Tool 或重写其算法 | 全名、schema、结果及已有副作用不变 |
| `mcp__qiskit_ibm_runtime__usage_info_tool` | read-only | 保留 | IBM 账号、后端与云作业 的既有动作；不新增代理 Tool 或重写其算法 | 全名、schema、结果及已有副作用不变 |
| `mcp__qiskit_ibm_runtime__run_sampler_tool` | external-write | 保留 | IBM 账号、后端与云作业 的既有动作；不新增代理 Tool 或重写其算法 | 全名、schema、结果及已有副作用不变 |

### qiskit_ibm_transpiler（7）

按需；默认关闭；归属 `qiskit-ibm-transpiler`。

| 完整注册名 | 当前副作用 | 建议 | 理由 | 兼容影响 / 批次 |
| --- | --- | --- | --- | --- |
| `mcp__qiskit_ibm_transpiler__setup_ibm_quantum_account_tool` | external-write | 保留 | 账号/凭据属于本供应商连接；即使名称重复也不能合并账号存储或权限 | 保留连接限定名、凭据引用和副作用 |
| `mcp__qiskit_ibm_transpiler__ai_routing_tool` | external-write | 保留 | IBM AI 编译服务 的既有动作；不新增代理 Tool 或重写其算法 | 全名、schema、结果及已有副作用不变 |
| `mcp__qiskit_ibm_transpiler__ai_linear_function_synthesis_tool` | external-write | 保留 | IBM AI 编译服务 的既有动作；不新增代理 Tool 或重写其算法 | 全名、schema、结果及已有副作用不变 |
| `mcp__qiskit_ibm_transpiler__ai_clifford_synthesis_tool` | external-write | 保留 | IBM AI 编译服务 的既有动作；不新增代理 Tool 或重写其算法 | 全名、schema、结果及已有副作用不变 |
| `mcp__qiskit_ibm_transpiler__ai_permutation_synthesis_tool` | external-write | 保留 | IBM AI 编译服务 的既有动作；不新增代理 Tool 或重写其算法 | 全名、schema、结果及已有副作用不变 |
| `mcp__qiskit_ibm_transpiler__ai_pauli_network_synthesis_tool` | external-write | 保留 | IBM AI 编译服务 的既有动作；不新增代理 Tool 或重写其算法 | 全名、schema、结果及已有副作用不变 |
| `mcp__qiskit_ibm_transpiler__hybrid_ai_transpile_tool` | external-write | 保留 | IBM AI 编译服务 的既有动作；不新增代理 Tool 或重写其算法 | 全名、schema、结果及已有副作用不变 |

### qiskit_gym（37）

按需；默认关闭；归属 `qiskit-gym`。

| 完整注册名 | 当前副作用 | 建议 | 理由 | 兼容影响 / 批次 |
| --- | --- | --- | --- | --- |
| `mcp__qiskit_gym__create_permutation_env_tool` | external-write | 简化 | 训练环境有明确专业用途；依赖上游动作，避免混入普通电路任务的选择范围 | B3 待实施；原全名、持久化对象和 opt-in 连接保留 |
| `mcp__qiskit_gym__create_linear_function_env_tool` | external-write | 简化 | 训练环境有明确专业用途；依赖上游动作，避免混入普通电路任务的选择范围 | B3 待实施；原全名、持久化对象和 opt-in 连接保留 |
| `mcp__qiskit_gym__create_clifford_env_tool` | external-write | 简化 | 训练环境有明确专业用途；依赖上游动作，避免混入普通电路任务的选择范围 | B3 待实施；原全名、持久化对象和 opt-in 连接保留 |
| `mcp__qiskit_gym__list_environments_tool` | read-only | 简化 | 训练环境有明确专业用途；依赖上游动作，避免混入普通电路任务的选择范围 | B3 待实施；原全名、持久化对象和 opt-in 连接保留 |
| `mcp__qiskit_gym__get_environment_info_tool` | read-only | 简化 | 训练环境有明确专业用途；依赖上游动作，避免混入普通电路任务的选择范围 | B3 待实施；原全名、持久化对象和 opt-in 连接保留 |
| `mcp__qiskit_gym__delete_environment_tool` | external-write | 简化 | 训练环境有明确专业用途；依赖上游动作，避免混入普通电路任务的选择范围 | B3 待实施；原全名、持久化对象和 opt-in 连接保留 |
| `mcp__qiskit_gym__start_training_tool` | external-write | 简化 | 训练生命周期有明确专业用途；依赖上游动作，避免混入普通电路任务的选择范围 | B3 待实施；原全名、持久化对象和 opt-in 连接保留 |
| `mcp__qiskit_gym__batch_train_environments_tool` | external-write | 简化 | 训练生命周期有明确专业用途；依赖上游动作，避免混入普通电路任务的选择范围 | B3 待实施；原全名、持久化对象和 opt-in 连接保留 |
| `mcp__qiskit_gym__get_training_status_tool` | read-only | 简化 | 训练生命周期有明确专业用途；依赖上游动作，避免混入普通电路任务的选择范围 | B3 待实施；原全名、持久化对象和 opt-in 连接保留 |
| `mcp__qiskit_gym__get_training_metrics_tool` | read-only | 简化 | 训练生命周期有明确专业用途；依赖上游动作，避免混入普通电路任务的选择范围 | B3 待实施；原全名、持久化对象和 opt-in 连接保留 |
| `mcp__qiskit_gym__wait_for_training_tool` | read-only | 简化 | 训练生命周期有明确专业用途；依赖上游动作，避免混入普通电路任务的选择范围 | B3 待实施；原全名、持久化对象和 opt-in 连接保留 |
| `mcp__qiskit_gym__stop_training_tool` | external-write | 简化 | 训练生命周期有明确专业用途；依赖上游动作，避免混入普通电路任务的选择范围 | B3 待实施；原全名、持久化对象和 opt-in 连接保留 |
| `mcp__qiskit_gym__list_training_sessions_tool` | read-only | 简化 | 训练生命周期有明确专业用途；依赖上游动作，避免混入普通电路任务的选择范围 | B3 待实施；原全名、持久化对象和 opt-in 连接保留 |
| `mcp__qiskit_gym__list_tensorboard_experiments_tool` | external-write | 简化 | 训练观测有明确专业用途；依赖上游动作，避免混入普通电路任务的选择范围 | B3 待实施；原全名、持久化对象和 opt-in 连接保留 |
| `mcp__qiskit_gym__get_tensorboard_metrics_tool` | external-write | 简化 | 训练观测有明确专业用途；依赖上游动作，避免混入普通电路任务的选择范围 | B3 待实施；原全名、持久化对象和 opt-in 连接保留 |
| `mcp__qiskit_gym__start_tensorboard_tool` | external-write | 简化 | 训练观测有明确专业用途；依赖上游动作，避免混入普通电路任务的选择范围 | B3 待实施；原全名、持久化对象和 opt-in 连接保留 |
| `mcp__qiskit_gym__stop_tensorboard_tool` | external-write | 简化 | 训练观测有明确专业用途；依赖上游动作，避免混入普通电路任务的选择范围 | B3 待实施；原全名、持久化对象和 opt-in 连接保留 |
| `mcp__qiskit_gym__get_tensorboard_status_tool` | read-only | 简化 | 训练观测有明确专业用途；依赖上游动作，避免混入普通电路任务的选择范围 | B3 待实施；原全名、持久化对象和 opt-in 连接保留 |
| `mcp__qiskit_gym__synthesize_permutation_tool` | external-write | 简化 | 电路综合/辅助数据有明确专业用途；依赖上游动作，避免混入普通电路任务的选择范围 | B3 待实施；原全名、持久化对象和 opt-in 连接保留 |
| `mcp__qiskit_gym__synthesize_linear_function_tool` | external-write | 简化 | 电路综合/辅助数据有明确专业用途；依赖上游动作，避免混入普通电路任务的选择范围 | B3 待实施；原全名、持久化对象和 opt-in 连接保留 |
| `mcp__qiskit_gym__synthesize_clifford_tool` | external-write | 简化 | 电路综合/辅助数据有明确专业用途；依赖上游动作，避免混入普通电路任务的选择范围 | B3 待实施；原全名、持久化对象和 opt-in 连接保留 |
| `mcp__qiskit_gym__save_model_tool` | external-write | 简化 | 模型管理有明确专业用途；依赖上游动作，避免混入普通电路任务的选择范围 | B3 待实施；原全名、持久化对象和 opt-in 连接保留 |
| `mcp__qiskit_gym__load_model_tool` | external-write | 简化 | 模型管理有明确专业用途；依赖上游动作，避免混入普通电路任务的选择范围 | B3 待实施；原全名、持久化对象和 opt-in 连接保留 |
| `mcp__qiskit_gym__list_saved_models_tool` | external-write | 简化 | 模型管理有明确专业用途；依赖上游动作，避免混入普通电路任务的选择范围 | B3 待实施；原全名、持久化对象和 opt-in 连接保留 |
| `mcp__qiskit_gym__list_loaded_models_tool` | read-only | 简化 | 模型管理有明确专业用途；依赖上游动作，避免混入普通电路任务的选择范围 | B3 待实施；原全名、持久化对象和 opt-in 连接保留 |
| `mcp__qiskit_gym__delete_model_tool` | external-write | 简化 | 模型管理有明确专业用途；依赖上游动作，避免混入普通电路任务的选择范围 | B3 待实施；原全名、持久化对象和 opt-in 连接保留 |
| `mcp__qiskit_gym__get_model_info_tool` | external-write | 简化 | 模型管理有明确专业用途；依赖上游动作，避免混入普通电路任务的选择范围 | B3 待实施；原全名、持久化对象和 opt-in 连接保留 |
| `mcp__qiskit_gym__create_coupling_map_tool` | read-only | 简化 | 电路综合/辅助数据有明确专业用途；依赖上游动作，避免混入普通电路任务的选择范围 | B3 待实施；原全名、持久化对象和 opt-in 连接保留 |
| `mcp__qiskit_gym__extract_subtopologies_tool` | read-only | 简化 | 电路综合/辅助数据有明确专业用途；依赖上游动作，避免混入普通电路任务的选择范围 | B3 待实施；原全名、持久化对象和 opt-in 连接保留 |
| `mcp__qiskit_gym__list_subtopology_shapes_tool` | read-only | 简化 | 电路综合/辅助数据有明确专业用途；依赖上游动作，避免混入普通电路任务的选择范围 | B3 待实施；原全名、持久化对象和 opt-in 连接保留 |
| `mcp__qiskit_gym__get_fake_backend_coupling_map_tool` | read-only | 简化 | 电路综合/辅助数据有明确专业用途；依赖上游动作，避免混入普通电路任务的选择范围 | B3 待实施；原全名、持久化对象和 opt-in 连接保留 |
| `mcp__qiskit_gym__list_available_fake_backends_tool` | read-only | 简化 | 电路综合/辅助数据有明确专业用途；依赖上游动作，避免混入普通电路任务的选择范围 | B3 待实施；原全名、持久化对象和 opt-in 连接保留 |
| `mcp__qiskit_gym__generate_random_permutation_tool` | read-only | 简化 | 电路综合/辅助数据有明确专业用途；依赖上游动作，避免混入普通电路任务的选择范围 | B3 待实施；原全名、持久化对象和 opt-in 连接保留 |
| `mcp__qiskit_gym__generate_random_linear_function_tool` | read-only | 简化 | 电路综合/辅助数据有明确专业用途；依赖上游动作，避免混入普通电路任务的选择范围 | B3 待实施；原全名、持久化对象和 opt-in 连接保留 |
| `mcp__qiskit_gym__generate_random_clifford_tool` | read-only | 简化 | 电路综合/辅助数据有明确专业用途；依赖上游动作，避免混入普通电路任务的选择范围 | B3 待实施；原全名、持久化对象和 opt-in 连接保留 |
| `mcp__qiskit_gym__convert_qpy_to_qasm3_tool` | read-only | 合并 | Qiskit 与 Gym 的同名格式转换入口交叉；优先路由 Qiskit，保留 Gym 兼容入口 | B3 待实施；两个限定全名、格式和输出合同均保留 |
| `mcp__qiskit_gym__convert_qasm3_to_qpy_tool` | read-only | 合并 | Qiskit 与 Gym 的同名格式转换入口交叉；优先路由 Qiskit，保留 Gym 兼容入口 | B3 待实施；两个限定全名、格式和输出合同均保留 |

### qpanda_runtime（19）

按需；默认关闭；归属 `qpanda-runtime`。

| 完整注册名 | 当前副作用 | 建议 | 理由 | 兼容影响 / 批次 |
| --- | --- | --- | --- | --- |
| `mcp__qpanda_runtime__setup_origin_quantum_account_tool` | external-write | 保留 | 账号/凭据属于本供应商连接；即使名称重复也不能合并账号存储或权限 | 保留连接限定名、凭据引用和副作用 |
| `mcp__qpanda_runtime__list_saved_accounts_tool` | read-only | 保留 | 账号/凭据属于本供应商连接；即使名称重复也不能合并账号存储或权限 | 保留连接限定名、凭据引用和副作用 |
| `mcp__qpanda_runtime__active_account_info_tool` | read-only | 保留 | 账号/凭据属于本供应商连接；即使名称重复也不能合并账号存储或权限 | 保留连接限定名、凭据引用和副作用 |
| `mcp__qpanda_runtime__list_qpu_devices_tool` | external-write | 保留 | 本源云任务与绑定 的既有动作；不新增代理 Tool 或重写其算法 | 全名、schema、结果及已有副作用不变 |
| `mcp__qpanda_runtime__get_qpu_properties_tool` | external-write | 保留 | 本源云任务与绑定 的既有动作；不新增代理 Tool 或重写其算法 | 全名、schema、结果及已有副作用不变 |
| `mcp__qpanda_runtime__sample_tool` | external-write | 保留 | 本源云任务与绑定 的既有动作；不新增代理 Tool 或重写其算法 | 全名、schema、结果及已有副作用不变 |
| `mcp__qpanda_runtime__estimate_tool` | external-write | 保留 | 本源云任务与绑定 的既有动作；不新增代理 Tool 或重写其算法 | 全名、schema、结果及已有副作用不变 |
| `mcp__qpanda_runtime__get_task_status_tool` | external-write | 保留 | 本源云任务与绑定 的既有动作；不新增代理 Tool 或重写其算法 | 全名、schema、结果及已有副作用不变 |
| `mcp__qpanda_runtime__get_task_results_tool` | external-write | 保留 | 本源云任务与绑定 的既有动作；不新增代理 Tool 或重写其算法 | 全名、schema、结果及已有副作用不变 |
| `mcp__qpanda_runtime__cancel_task_tool` | external-write | 保留 | 本源云任务与绑定 的既有动作；不新增代理 Tool 或重写其算法 | 全名、schema、结果及已有副作用不变 |
| `mcp__qpanda_runtime__list_my_tasks_tool` | read-only | 保留 | 本源云任务与绑定 的既有动作；不新增代理 Tool 或重写其算法 | 全名、schema、结果及已有副作用不变 |
| `mcp__qpanda_runtime__create_circuit_observable_binding_tool` | external-write | 保留 | 本源云任务与绑定 的既有动作；不新增代理 Tool 或重写其算法 | 全名、schema、结果及已有副作用不变 |
| `mcp__qpanda_runtime__add_product_rule_tool` | external-write | 保留 | 本源云任务与绑定 的既有动作；不新增代理 Tool 或重写其算法 | 全名、schema、结果及已有副作用不变 |
| `mcp__qpanda_runtime__add_zip_rule_tool` | external-write | 保留 | 本源云任务与绑定 的既有动作；不新增代理 Tool 或重写其算法 | 全名、schema、结果及已有副作用不变 |
| `mcp__qpanda_runtime__estimate_with_binding_tool` | external-write | 保留 | 本源云任务与绑定 的既有动作；不新增代理 Tool 或重写其算法 | 全名、schema、结果及已有副作用不变 |
| `mcp__qpanda_runtime__list_bindings_tool` | read-only | 保留 | 本源云任务与绑定 的既有动作；不新增代理 Tool 或重写其算法 | 全名、schema、结果及已有副作用不变 |
| `mcp__qpanda_runtime__delete_binding_tool` | external-write | 保留 | 本源云任务与绑定 的既有动作；不新增代理 Tool 或重写其算法 | 全名、schema、结果及已有副作用不变 |
| `mcp__qpanda_runtime__batch_sample_tool` | external-write | 保留 | 本源云任务与绑定 的既有动作；不新增代理 Tool 或重写其算法 | 全名、schema、结果及已有副作用不变 |
| `mcp__qpanda_runtime__batch_estimate_tool` | external-write | 保留 | 本源云任务与绑定 的既有动作；不新增代理 Tool 或重写其算法 | 全名、schema、结果及已有副作用不变 |

### quantum_hardware（53）

按需；默认关闭；归属 `quantum-hardware`。

| 完整注册名 | 当前副作用 | 建议 | 理由 | 兼容影响 / 批次 |
| --- | --- | --- | --- | --- |
| `mcp__quantum_hardware__list_devices` | workspace-write | 简化 | 放入相应硬件查询/分析工作流；已有上游状态不可由本地快照冒充 | B3 待实施；全名、参数与原完整 opt-in 连接保留 |
| `mcp__quantum_hardware__get_device_details` | workspace-write | 简化 | 放入相应硬件查询/分析工作流；已有上游状态不可由本地快照冒充 | B3 待实施；全名、参数与原完整 opt-in 连接保留 |
| `mcp__quantum_hardware__best_qubits` | read-only | 简化 | 放入相应硬件查询/分析工作流；已有上游状态不可由本地快照冒充 | B3 待实施；全名、参数与原完整 opt-in 连接保留 |
| `mcp__quantum_hardware__compare_devices` | workspace-write | 简化 | 放入相应硬件查询/分析工作流；已有上游状态不可由本地快照冒充 | B3 待实施；全名、参数与原完整 opt-in 连接保留 |
| `mcp__quantum_hardware__queue_status` | workspace-write | 简化 | 放入相应硬件查询/分析工作流；已有上游状态不可由本地快照冒充 | B3 待实施；全名、参数与原完整 opt-in 连接保留 |
| `mcp__quantum_hardware__device_history` | workspace-write | 简化 | 放入相应硬件查询/分析工作流；已有上游状态不可由本地快照冒充 | B3 待实施；全名、参数与原完整 opt-in 连接保留 |
| `mcp__quantum_hardware__device_profile` | workspace-write | 简化 | 放入相应硬件查询/分析工作流；已有上游状态不可由本地快照冒充 | B3 待实施；全名、参数与原完整 opt-in 连接保留 |
| `mcp__quantum_hardware__device_on_date` | workspace-write | 简化 | 放入相应硬件查询/分析工作流；已有上游状态不可由本地快照冒充 | B3 待实施；全名、参数与原完整 opt-in 连接保留 |
| `mcp__quantum_hardware__submit_job` | external-write | 简化 | 放入明确选择的硬件/实验工作流；调用仍由原上游拥有，按实际副作用授权 | B3 待实施；全名、参数与原完整 opt-in 连接保留 |
| `mcp__quantum_hardware__job_status` | read-only | 简化 | 放入相应硬件查询/分析工作流；已有上游状态不可由本地快照冒充 | B3 待实施；全名、参数与原完整 opt-in 连接保留 |
| `mcp__quantum_hardware__job_results` | workspace-write | 简化 | 放入相应硬件查询/分析工作流；已有上游状态不可由本地快照冒充 | B3 待实施；全名、参数与原完整 opt-in 连接保留 |
| `mcp__quantum_hardware__cancel_job` | external-write | 简化 | 放入明确选择的硬件/实验工作流；调用仍由原上游拥有，按实际副作用授权 | B3 待实施；全名、参数与原完整 opt-in 连接保留 |
| `mcp__quantum_hardware__list_jobs` | read-only | 简化 | 放入相应硬件查询/分析工作流；已有上游状态不可由本地快照冒充 | B3 待实施；全名、参数与原完整 opt-in 连接保留 |
| `mcp__quantum_hardware__run_grover` | external-write | 简化 | 放入明确选择的硬件/实验工作流；调用仍由原上游拥有，按实际副作用授权 | B3 待实施；全名、参数与原完整 opt-in 连接保留 |
| `mcp__quantum_hardware__run_vqe` | external-write | 简化 | 放入明确选择的硬件/实验工作流；调用仍由原上游拥有，按实际副作用授权 | B3 待实施；全名、参数与原完整 opt-in 连接保留 |
| `mcp__quantum_hardware__estimate_expectation` | external-write | 简化 | 放入相应硬件查询/分析工作流；已有上游状态不可由本地快照冒充 | B3 待实施；全名、参数与原完整 opt-in 连接保留 |
| `mcp__quantum_hardware__circuit_report` | read-only | 简化 | 放入相应硬件查询/分析工作流；已有上游状态不可由本地快照冒充 | B3 待实施；全名、参数与原完整 opt-in 连接保留 |
| `mcp__quantum_hardware__debug_circuit` | read-only | 简化 | 放入相应硬件查询/分析工作流；已有上游状态不可由本地快照冒充 | B3 待实施；全名、参数与原完整 opt-in 连接保留 |
| `mcp__quantum_hardware__ionq_devices` | read-only | 简化 | 放入相应硬件查询/分析工作流；已有上游状态不可由本地快照冒充 | B3 待实施；全名、参数与原完整 opt-in 连接保留 |
| `mcp__quantum_hardware__ionq_submit_job` | external-write | 简化 | 放入明确选择的硬件/实验工作流；调用仍由原上游拥有，按实际副作用授权 | B3 待实施；全名、参数与原完整 opt-in 连接保留 |
| `mcp__quantum_hardware__ionq_job_status` | read-only | 简化 | 放入相应硬件查询/分析工作流；已有上游状态不可由本地快照冒充 | B3 待实施；全名、参数与原完整 opt-in 连接保留 |
| `mcp__quantum_hardware__ionq_job_results` | read-only | 简化 | 放入相应硬件查询/分析工作流；已有上游状态不可由本地快照冒充 | B3 待实施；全名、参数与原完整 opt-in 连接保留 |
| `mcp__quantum_hardware__estimate_ionq_gates` | read-only | 简化 | 放入相应硬件查询/分析工作流；已有上游状态不可由本地快照冒充 | B3 待实施；全名、参数与原完整 opt-in 连接保留 |
| `mcp__quantum_hardware__estimate_ionq_cost` | read-only | 简化 | 放入相应硬件查询/分析工作流；已有上游状态不可由本地快照冒充 | B3 待实施；全名、参数与原完整 opt-in 连接保留 |
| `mcp__quantum_hardware__get_alerts` | workspace-write | 简化 | 放入相应硬件查询/分析工作流；已有上游状态不可由本地快照冒充 | B3 待实施；全名、参数与原完整 opt-in 连接保留 |
| `mcp__quantum_hardware__check_chip_identity` | workspace-write | 简化 | 放入相应硬件查询/分析工作流；已有上游状态不可由本地快照冒充 | B3 待实施；全名、参数与原完整 opt-in 连接保留 |
| `mcp__quantum_hardware__start_repro_experiment` | external-write | 简化 | 放入明确选择的硬件/实验工作流；调用仍由原上游拥有，按实际副作用授权 | B3 待实施；全名、参数与原完整 opt-in 连接保留 |
| `mcp__quantum_hardware__repro_score` | workspace-write | 简化 | 放入相应硬件查询/分析工作流；已有上游状态不可由本地快照冒充 | B3 待实施；全名、参数与原完整 opt-in 连接保留 |
| `mcp__quantum_hardware__job_analytics` | workspace-write | 简化 | 放入相应硬件查询/分析工作流；已有上游状态不可由本地快照冒充 | B3 待实施；全名、参数与原完整 opt-in 连接保留 |
| `mcp__quantum_hardware__estimate_runtime` | read-only | 简化 | 放入相应硬件查询/分析工作流；已有上游状态不可由本地快照冒充 | B3 待实施；全名、参数与原完整 opt-in 连接保留 |
| `mcp__quantum_hardware__route_job` | read-only | 简化 | 放入明确选择的硬件/实验工作流；调用仍由原上游拥有，按实际副作用授权 | B3 待实施；全名、参数与原完整 opt-in 连接保留 |
| `mcp__quantum_hardware__check_routing_overhead` | read-only | 简化 | 放入相应硬件查询/分析工作流；已有上游状态不可由本地快照冒充 | B3 待实施；全名、参数与原完整 opt-in 连接保留 |
| `mcp__quantum_hardware__encode_search_problem` | read-only | 简化 | 放入相应硬件查询/分析工作流；已有上游状态不可由本地快照冒充 | B3 待实施；全名、参数与原完整 opt-in 连接保留 |
| `mcp__quantum_hardware__estimate_hardware_gates` | read-only | 简化 | 放入相应硬件查询/分析工作流；已有上游状态不可由本地快照冒充 | B3 待实施；全名、参数与原完整 opt-in 连接保留 |
| `mcp__quantum_hardware__get_amplification` | read-only | 简化 | 放入相应硬件查询/分析工作流；已有上游状态不可由本地快照冒充 | B3 待实施；全名、参数与原完整 opt-in 连接保留 |
| `mcp__quantum_hardware__discover_collision_candidates` | read-only | 简化 | 放入相应硬件查询/分析工作流；已有上游状态不可由本地快照冒充 | B3 待实施；全名、参数与原完整 opt-in 连接保留 |
| `mcp__quantum_hardware__encode_collision_problem` | read-only | 简化 | 放入相应硬件查询/分析工作流；已有上游状态不可由本地快照冒充 | B3 待实施；全名、参数与原完整 opt-in 连接保留 |
| `mcp__quantum_hardware__run_search_experiment` | external-write | 简化 | 放入明确选择的硬件/实验工作流；调用仍由原上游拥有，按实际副作用授权 | B3 待实施；全名、参数与原完整 opt-in 连接保留 |
| `mcp__quantum_hardware__encode_4way_collision` | external-write | 简化 | 放入相应硬件查询/分析工作流；已有上游状态不可由本地快照冒充 | B3 待实施；全名、参数与原完整 opt-in 连接保留 |
| `mcp__quantum_hardware__equality_oracle_search` | external-write | 简化 | 放入相应硬件查询/分析工作流；已有上游状态不可由本地快照冒充 | B3 待实施；全名、参数与原完整 opt-in 连接保留 |
| `mcp__quantum_hardware__find_collision_candidates` | read-only | 简化 | 放入相应硬件查询/分析工作流；已有上游状态不可由本地快照冒充 | B3 待实施；全名、参数与原完整 opt-in 连接保留 |
| `mcp__quantum_hardware__sieve_singmaster_space` | read-only | 简化 | 放入相应硬件查询/分析工作流；已有上游状态不可由本地快照冒充 | B3 待实施；全名、参数与原完整 opt-in 连接保留 |
| `mcp__quantum_hardware__run_parallel_collision_search` | external-write | 简化 | 放入明确选择的硬件/实验工作流；调用仍由原上游拥有，按实际副作用授权 | B3 待实施；全名、参数与原完整 opt-in 连接保留 |
| `mcp__quantum_hardware__certify_ising_gate_optimality` | read-only | 简化 | 放入相应硬件查询/分析工作流；已有上游状态不可由本地快照冒充 | B3 待实施；全名、参数与原完整 opt-in 连接保留 |
| `mcp__quantum_hardware__verify_stabilizer_circuit` | read-only | 简化 | 放入相应硬件查询/分析工作流；已有上游状态不可由本地快照冒充 | B3 待实施；全名、参数与原完整 opt-in 连接保留 |
| `mcp__quantum_hardware__verify_stabilizer_hardware_result` | read-only | 简化 | 放入相应硬件查询/分析工作流；已有上游状态不可由本地快照冒充 | B3 待实施；全名、参数与原完整 opt-in 连接保留 |
| `mcp__quantum_hardware__analyze_molecule` | external-write | 简化 | 放入相应硬件查询/分析工作流；已有上游状态不可由本地快照冒充 | B3 待实施；全名、参数与原完整 opt-in 连接保留 |
| `mcp__quantum_hardware__plan_quantum_chemistry_run` | external-write | 简化 | 放入相应硬件查询/分析工作流；已有上游状态不可由本地快照冒充 | B3 待实施；全名、参数与原完整 opt-in 连接保留 |
| `mcp__quantum_hardware__recommend_error_mitigation` | read-only | 简化 | 放入相应硬件查询/分析工作流；已有上游状态不可由本地快照冒充 | B3 待实施；全名、参数与原完整 opt-in 连接保留 |
| `mcp__quantum_hardware__estimate_circuit_error_ceiling` | external-write | 简化 | 放入相应硬件查询/分析工作流；已有上游状态不可由本地快照冒充 | B3 待实施；全名、参数与原完整 opt-in 连接保留 |
| `mcp__quantum_hardware__build_forged_circuits` | external-write | 简化 | 放入明确选择的硬件/实验工作流；调用仍由原上游拥有，按实际副作用授权 | B3 待实施；全名、参数与原完整 opt-in 连接保留 |
| `mcp__quantum_hardware__run_forged_energy` | external-write | 简化 | 放入明确选择的硬件/实验工作流；调用仍由原上游拥有，按实际副作用授权 | B3 待实施；全名、参数与原完整 opt-in 连接保留 |
| `mcp__quantum_hardware__collect_forged_energy` | workspace-write | 简化 | 放入相应硬件查询/分析工作流；已有上游状态不可由本地快照冒充 | B3 待实施；全名、参数与原完整 opt-in 连接保留 |

### qiskit（7）

默认；离线开关可关；归属 `qiskit-circuit-workbench`。

| 完整注册名 | 当前副作用 | 建议 | 理由 | 兼容影响 / 批次 |
| --- | --- | --- | --- | --- |
| `mcp__qiskit__load_circuit_from_qasm_tool` | read-only | 保留 | QASM/QPY 电路审查与转译 的既有动作；不新增代理 Tool 或重写其算法 | 全名、schema、结果及已有副作用不变 |
| `mcp__qiskit__analyze_circuit_tool` | read-only | 保留 | QASM/QPY 电路审查与转译 的既有动作；不新增代理 Tool 或重写其算法 | 全名、schema、结果及已有副作用不变 |
| `mcp__qiskit__compare_optimization_levels_tool` | read-only | 保留 | QASM/QPY 电路审查与转译 的既有动作；不新增代理 Tool 或重写其算法 | 全名、schema、结果及已有副作用不变 |
| `mcp__qiskit__transpile_circuit_tool` | read-only | 保留 | QASM/QPY 电路审查与转译 的既有动作；不新增代理 Tool 或重写其算法 | 全名、schema、结果及已有副作用不变 |
| `mcp__qiskit__convert_qpy_to_qasm3_tool` | read-only | 合并 | Qiskit 与 Gym 的同名格式转换入口交叉；优先路由 Qiskit，保留 Gym 兼容入口 | B3 待实施；两个限定全名、格式和输出合同均保留 |
| `mcp__qiskit__convert_qasm3_to_qpy_tool` | read-only | 合并 | Qiskit 与 Gym 的同名格式转换入口交叉；优先路由 Qiskit，保留 Gym 兼容入口 | B3 待实施；两个限定全名、格式和输出合同均保留 |
| `mcp__qiskit__export_circuit_to_qasm_tool` | read-only | 保留 | QASM/QPY 电路审查与转译 的既有动作；不新增代理 Tool 或重写其算法 | 全名、schema、结果及已有副作用不变 |

### qiskit_docs（3）

默认；离线开关可关；归属 `qiskit-circuit-workbench`。

| 完整注册名 | 当前副作用 | 建议 | 理由 | 兼容影响 / 批次 |
| --- | --- | --- | --- | --- |
| `mcp__qiskit_docs__search_docs_tool` | read-only | 保留 | SDK 文档与错误检索 的既有动作；不新增代理 Tool 或重写其算法 | 全名、schema、结果及已有副作用不变 |
| `mcp__qiskit_docs__get_page_tool` | read-only | 保留 | SDK 文档与错误检索 的既有动作；不新增代理 Tool 或重写其算法 | 全名、schema、结果及已有副作用不变 |
| `mcp__qiskit_docs__lookup_error_code_tool` | read-only | 保留 | SDK 文档与错误检索 的既有动作；不新增代理 Tool 或重写其算法 | 全名、schema、结果及已有副作用不变 |

### fieldqkit（2）

默认；归属 `fieldqkit-hardware`。

| 完整注册名 | 当前副作用 | 建议 | 理由 | 兼容影响 / 批次 |
| --- | --- | --- | --- | --- |
| `mcp__fieldqkit__inspect_fieldqkit_setup` | read-only | 保留 | 无凭据值的本地准备状态用于决定是否查询后端；不为治理触发云请求 | 名称、schema 与只读状态查询不变 |
| `mcp__fieldqkit__discover_fieldqkit_backends` | workspace-write | 迁移 | 国产后端发现及凭据状态 的业务动作保留；仅将首次依赖准备移出本次调用 | B2 待实施；原 schema、结果与位序不变，新增可操作的未准备错误 |

### qpanda_qubo（2）

默认；归属 `qpanda-qubo`。

| 完整注册名 | 当前副作用 | 建议 | 理由 | 兼容影响 / 批次 |
| --- | --- | --- | --- | --- |
| `mcp__qpanda_qubo__solve_qpanda_qubo` | workspace-write | 迁移 | 约束建模及 QUBO 求解 的业务动作保留；仅将首次依赖准备移出本次调用 | B2 待实施；原 schema、结果与位序不变，新增可操作的未准备错误 |
| `mcp__qpanda_qubo__model_and_solve_qpanda_qubo` | workspace-write | 迁移 | 约束建模及 QUBO 求解 的业务动作保留；仅将首次依赖准备移出本次调用 | B2 待实施；原 schema、结果与位序不变，新增可操作的未准备错误 |

### qcec_local（1）

默认；归属 `quantum-circuit-verification`。

| 完整注册名 | 当前副作用 | 建议 | 理由 | 兼容影响 / 批次 |
| --- | --- | --- | --- | --- |
| `mcp__qcec_local__verify_circuit_equivalence` | workspace-write | 迁移 | QCEC 电路等价性 的业务动作保留；仅将首次依赖准备移出本次调用 | B2 待实施；原 schema、结果与位序不变，新增可操作的未准备错误 |

### qec_local（1）

默认；归属 `qec-memory-experiment`。

| 完整注册名 | 当前副作用 | 建议 | 理由 | 兼容影响 / 批次 |
| --- | --- | --- | --- | --- |
| `mcp__qec_local__run_qec_memory_experiment` | workspace-write | 迁移 | Stim/PyMatching memory 的业务动作保留；仅将首次依赖准备移出本次调用 | B2 待实施；原 schema、结果与位序不变，新增可操作的未准备错误 |

### fatqat_local（2）

默认；归属 `fatqat-workbench`。

| 完整注册名 | 当前副作用 | 建议 | 理由 | 兼容影响 / 批次 |
| --- | --- | --- | --- | --- |
| `mcp__fatqat_local__simulate_fatqat_circuit` | workspace-write | 迁移 | 门模型及脉冲模拟 的业务动作保留；仅将首次依赖准备移出本次调用 | B2 待实施；原 schema、结果与位序不变，新增可操作的未准备错误 |
| `mcp__fatqat_local__simulate_fatqat_dynamics` | workspace-write | 迁移 | 门模型及脉冲模拟 的业务动作保留；仅将首次依赖准备移出本次调用 | B2 待实施；原 schema、结果与位序不变，新增可操作的未准备错误 |

### tyxonq_local（1）

按需；默认关闭；归属 `tyxonq-workbench`。

| 完整注册名 | 当前副作用 | 建议 | 理由 | 兼容影响 / 批次 |
| --- | --- | --- | --- | --- |
| `mcp__tyxonq_local__simulate_tyxonq_circuit` | workspace-write | 迁移 | TyxonQ 电路与噪声模拟 的业务动作保留；仅将首次依赖准备移出本次调用 | B2 待实施；原 schema、结果与位序不变，新增可操作的未准备错误 |

### toqito_audit（1）

默认；归属 `quantum-information-audit`。

| 完整注册名 | 当前副作用 | 建议 | 理由 | 兼容影响 / 批次 |
| --- | --- | --- | --- | --- |
| `mcp__toqito_audit__audit_density_matrix` | workspace-write | 迁移 | 密度矩阵审计 的业务动作保留；仅将首次依赖准备移出本次调用 | B2 待实施；原 schema、结果与位序不变，新增可操作的未准备错误 |

### mitiq_local（1）

默认；归属 `mitiq-error-mitigation`。

| 完整注册名 | 当前副作用 | 建议 | 理由 | 兼容影响 / 批次 |
| --- | --- | --- | --- | --- |
| `mcp__mitiq_local__run_mitiq_experiment` | workspace-write | 迁移 | 误差缓解 的业务动作保留；仅将首次依赖准备移出本次调用 | B2 待实施；原 schema、结果与位序不变，新增可操作的未准备错误 |

### sqd_local（1）

默认；归属 `sqd-chemistry`。

| 完整注册名 | 当前副作用 | 建议 | 理由 | 兼容影响 / 批次 |
| --- | --- | --- | --- | --- |
| `mcp__sqd_local__run_sqd_chemistry` | workspace-write | 迁移 | 采样子空间对角化 的业务动作保留；仅将首次依赖准备移出本次调用 | B2 待实施；原 schema、结果与位序不变，新增可操作的未准备错误 |

### tjm_local（1）

默认；归属 `tjm-dynamics`。

| 完整注册名 | 当前副作用 | 建议 | 理由 | 兼容影响 / 批次 |
| --- | --- | --- | --- | --- |
| `mcp__tjm_local__simulate_tjm_dynamics` | workspace-write | 迁移 | 张量跳跃轨迹 的业务动作保留；仅将首次依赖准备移出本次调用 | B2 待实施；原 schema、结果与位序不变，新增可操作的未准备错误 |

### ldpc_local（1）

默认；归属 `ldpc-decoding`。

| 完整注册名 | 当前副作用 | 建议 | 理由 | 兼容影响 / 批次 |
| --- | --- | --- | --- | --- |
| `mcp__ldpc_local__decode_ldpc_syndromes` | workspace-write | 迁移 | BP+LSD 解码 的业务动作保留；仅将首次依赖准备移出本次调用 | B2 待实施；原 schema、结果与位序不变，新增可操作的未准备错误 |

### flow_vqe_local（1）

默认；归属 `flow-vqe`。

| 完整注册名 | 当前副作用 | 建议 | 理由 | 兼容影响 / 批次 |
| --- | --- | --- | --- | --- |
| `mcp__flow_vqe_local__train_flow_vqe` | workspace-write | 迁移 | flow 参数训练 的业务动作保留；仅将首次依赖准备移出本次调用 | B2 待实施；原 schema、结果与位序不变，新增可操作的未准备错误 |

### tenpy_local（1）

默认；归属 `tenpy-ground-state`。

| 完整注册名 | 当前副作用 | 建议 | 理由 | 兼容影响 / 批次 |
| --- | --- | --- | --- | --- |
| `mcp__tenpy_local__solve_tenpy_chain` | workspace-write | 迁移 | 自旋链 DMRG 的业务动作保留；仅将首次依赖准备移出本次调用 | B2 待实施；原 schema、结果与位序不变，新增可操作的未准备错误 |

### random_meas_local（1）

默认；归属 `randomized-measurements`。

| 完整注册名 | 当前副作用 | 建议 | 理由 | 兼容影响 / 批次 |
| --- | --- | --- | --- | --- |
| `mcp__random_meas_local__estimate_randomized_purity` | workspace-write | 保留 | Julia 随机测量纯度估计 的既有动作；不新增代理 Tool 或重写其算法 | 全名、schema、结果及已有副作用不变 |

### dynamiqs_local（1）

默认；归属 `dynamiqs-dynamics`。

| 完整注册名 | 当前副作用 | 建议 | 理由 | 兼容影响 / 批次 |
| --- | --- | --- | --- | --- |
| `mcp__dynamiqs_local__simulate_dynamiqs_dynamics` | workspace-write | 迁移 | Lindblad 演化及梯度 的业务动作保留；仅将首次依赖准备移出本次调用 | B2 待实施；原 schema、结果与位序不变，新增可操作的未准备错误 |

### clifft_local（2）

默认；归属 `clifft-sampling`。

| 完整注册名 | 当前副作用 | 建议 | 理由 | 兼容影响 / 批次 |
| --- | --- | --- | --- | --- |
| `mcp__clifft_local__sample_clifft_circuit` | workspace-write | 迁移 | Clifford+T 采样与 Stim 记录 的业务动作保留；仅将首次依赖准备移出本次调用 | B2 待实施；原 schema、结果与位序不变，新增可操作的未准备错误 |
| `mcp__clifft_local__sample_clifft_qec` | workspace-write | 迁移 | Clifford+T 采样与 Stim 记录 的业务动作保留；仅将首次依赖准备移出本次调用 | B2 待实施；原 schema、结果与位序不变，新增可操作的未准备错误 |

### oqupy_local（1）

默认；归属 `oqupy-dynamics`。

| 完整注册名 | 当前副作用 | 建议 | 理由 | 兼容影响 / 批次 |
| --- | --- | --- | --- | --- |
| `mcp__oqupy_local__simulate_oqupy_spin_boson` | workspace-write | 迁移 | 非马尔可夫 TEMPO 的业务动作保留；仅将首次依赖准备移出本次调用 | B2 待实施；原 schema、结果与位序不变，新增可操作的未准备错误 |

### deltakit_local（1）

默认；归属 `deltakit-qec`。

| 完整注册名 | 当前副作用 | 建议 | 理由 | 兼容影响 / 批次 |
| --- | --- | --- | --- | --- |
| `mcp__deltakit_local__run_deltakit_memory` | workspace-write | 迁移 | 矩形码存储实验 的业务动作保留；仅将首次依赖准备移出本次调用 | B2 待实施；原 schema、结果与位序不变，新增可操作的未准备错误 |

### pyzx_local（1）

默认；归属 `pyzx-optimization`。

| 完整注册名 | 当前副作用 | 建议 | 理由 | 兼容影响 / 批次 |
| --- | --- | --- | --- | --- |
| `mcp__pyzx_local__optimize_pyzx_circuit` | workspace-write | 迁移 | ZX 电路优化 的业务动作保留；仅将首次依赖准备移出本次调用 | B2 待实施；原 schema、结果与位序不变，新增可操作的未准备错误 |

### graphix_local（1）

默认；归属 `graphix-mbqc`。

| 完整注册名 | 当前副作用 | 建议 | 理由 | 兼容影响 / 批次 |
| --- | --- | --- | --- | --- |
| `mcp__graphix_local__simulate_graphix_pattern` | workspace-write | 迁移 | MBQC 模式与模拟 的业务动作保留；仅将首次依赖准备移出本次调用 | B2 待实施；原 schema、结果与位序不变，新增可操作的未准备错误 |

### symmer_local（1）

默认；归属 `symmer-tapering`。

| 完整注册名 | 当前副作用 | 建议 | 理由 | 兼容影响 / 批次 |
| --- | --- | --- | --- | --- |
| `mcp__symmer_local__taper_symmer_hamiltonian` | workspace-write | 迁移 | 指定扇区 tapering 的业务动作保留；仅将首次依赖准备移出本次调用 | B2 待实施；原 schema、结果与位序不变，新增可操作的未准备错误 |

### paulie_local（1）

默认；归属 `paulie-algebra`。

| 完整注册名 | 当前副作用 | 建议 | 理由 | 兼容影响 / 批次 |
| --- | --- | --- | --- | --- |
| `mcp__paulie_local__analyze_paulie_algebra` | workspace-write | 迁移 | 动力学 Lie 代数 的业务动作保留；仅将首次依赖准备移出本次调用 | B2 待实施；原 schema、结果与位序不变，新增可操作的未准备错误 |

### qcut_local（1）

默认；归属 `qcut-knitting`。

| 完整注册名 | 当前副作用 | 建议 | 理由 | 兼容影响 / 批次 |
| --- | --- | --- | --- | --- |
| `mcp__qcut_local__knit_qcut_circuit` | workspace-write | 迁移 | 门切割与重建 的业务动作保留；仅将首次依赖准备移出本次调用 | B2 待实施；原 schema、结果与位序不变，新增可操作的未准备错误 |

### compact_local（1）

默认；归属 `compact-optimization`。

| 完整注册名 | 当前副作用 | 建议 | 理由 | 兼容影响 / 批次 |
| --- | --- | --- | --- | --- |
| `mcp__compact_local__optimize_compact_circuit` | workspace-write | 迁移 | Compact 电路优化 的业务动作保留；仅将首次依赖准备移出本次调用 | B2 待实施；原 schema、结果与位序不变，新增可操作的未准备错误 |

### openqarp_local（1）

默认；归属 `openqarp-excited-states`。

| 完整注册名 | 当前副作用 | 建议 | 理由 | 兼容影响 / 批次 |
| --- | --- | --- | --- | --- |
| `mcp__openqarp_local__solve_openqarp_vqd` | workspace-write | 迁移 | OpenQARP VQD 的业务动作保留；仅将首次依赖准备移出本次调用 | B2 待实施；原 schema、结果与位序不变，新增可操作的未准备错误 |

### cqlib_kernel_local（1）

按需；默认关闭；归属 `cqlib-kernel`。

| 完整注册名 | 当前副作用 | 建议 | 理由 | 兼容影响 / 批次 |
| --- | --- | --- | --- | --- |
| `mcp__cqlib_kernel_local__fit_cqlib_angle_kernel` | workspace-write | 迁移 | 角度核与 QSVM 的业务动作保留；仅将首次依赖准备移出本次调用 | B2 待实施；原 schema、结果与位序不变，新增可操作的未准备错误 |

### flagquantum（17）

按需；默认关闭；归属 `flagquantum-workbench`。

| 完整注册名 | 当前副作用 | 建议 | 理由 | 兼容影响 / 批次 |
| --- | --- | --- | --- | --- |
| `mcp__flagquantum__analyze_circuit_tool` | workspace-write | 简化 | 按 FlagQuantum 分析、编译、参数训练组织入口；后端专有语义不能按同名函数互换 | B3 待实施；原全名、结果与 opt-in 连接保留 |
| `mcp__flagquantum__serialize_circuit_tool` | workspace-write | 简化 | 按 FlagQuantum 分析、编译、参数训练组织入口；后端专有语义不能按同名函数互换 | B3 待实施；原全名、结果与 opt-in 连接保留 |
| `mcp__flagquantum__deserialize_circuit_tool` | workspace-write | 简化 | 按 FlagQuantum 分析、编译、参数训练组织入口；后端专有语义不能按同名函数互换 | B3 待实施；原全名、结果与 opt-in 连接保留 |
| `mcp__flagquantum__optimize_circuit_tool` | workspace-write | 简化 | 按 FlagQuantum 分析、编译、参数训练组织入口；后端专有语义不能按同名函数互换 | B3 待实施；原全名、结果与 opt-in 连接保留 |
| `mcp__flagquantum__route_circuit_tool` | workspace-write | 简化 | 按 FlagQuantum 分析、编译、参数训练组织入口；后端专有语义不能按同名函数互换 | B3 待实施；原全名、结果与 opt-in 连接保留 |
| `mcp__flagquantum__compare_topologies_tool` | workspace-write | 简化 | 按 FlagQuantum 分析、编译、参数训练组织入口；后端专有语义不能按同名函数互换 | B3 待实施；原全名、结果与 opt-in 连接保留 |
| `mcp__flagquantum__emit_openqasm_tool` | workspace-write | 简化 | 按 FlagQuantum 分析、编译、参数训练组织入口；后端专有语义不能按同名函数互换 | B3 待实施；原全名、结果与 opt-in 连接保留 |
| `mcp__flagquantum__emit_qcis_tool` | workspace-write | 简化 | 按 FlagQuantum 分析、编译、参数训练组织入口；后端专有语义不能按同名函数互换 | B3 待实施；原全名、结果与 opt-in 连接保留 |
| `mcp__flagquantum__plan_execution_tool` | workspace-write | 简化 | 按 FlagQuantum 分析、编译、参数训练组织入口；后端专有语义不能按同名函数互换 | B3 待实施；原全名、结果与 opt-in 连接保留 |
| `mcp__flagquantum__simulate_circuit_tool` | workspace-write | 简化 | 按 FlagQuantum 分析、编译、参数训练组织入口；后端专有语义不能按同名函数互换 | B3 待实施；原全名、结果与 opt-in 连接保留 |
| `mcp__flagquantum__train_parameters_tool` | workspace-write | 简化 | 按 FlagQuantum 分析、编译、参数训练组织入口；后端专有语义不能按同名函数互换 | B3 待实施；原全名、结果与 opt-in 连接保留 |
| `mcp__flagquantum__describe_gate_set_tool` | workspace-write | 简化 | 按 FlagQuantum 分析、编译、参数训练组织入口；后端专有语义不能按同名函数互换 | B3 待实施；原全名、结果与 opt-in 连接保留 |
| `mcp__flagquantum__inspect_parameters_tool` | workspace-write | 简化 | 按 FlagQuantum 分析、编译、参数训练组织入口；后端专有语义不能按同名函数互换 | B3 待实施；原全名、结果与 opt-in 连接保留 |
| `mcp__flagquantum__bind_parameters_tool` | workspace-write | 简化 | 按 FlagQuantum 分析、编译、参数训练组织入口；后端专有语义不能按同名函数互换 | B3 待实施；原全名、结果与 opt-in 连接保留 |
| `mcp__flagquantum__describe_layers_tool` | workspace-write | 简化 | 按 FlagQuantum 分析、编译、参数训练组织入口；后端专有语义不能按同名函数互换 | B3 待实施；原全名、结果与 opt-in 连接保留 |
| `mcp__flagquantum__describe_topology_tool` | workspace-write | 简化 | 按 FlagQuantum 分析、编译、参数训练组织入口；后端专有语义不能按同名函数互换 | B3 待实施；原全名、结果与 opt-in 连接保留 |
| `mcp__flagquantum__draw_circuit_tool` | workspace-write | 简化 | 按 FlagQuantum 分析、编译、参数训练组织入口；后端专有语义不能按同名函数互换 | B3 待实施；原全名、结果与 opt-in 连接保留 |

### qbraid_local（1）

默认；归属 `qbraid-conversion`。

| 完整注册名 | 当前副作用 | 建议 | 理由 | 兼容影响 / 批次 |
| --- | --- | --- | --- | --- |
| `mcp__qbraid_local__convert_qbraid_circuit` | workspace-write | 迁移 | Qiskit/Cirq 转换 的业务动作保留；仅将首次依赖准备移出本次调用 | B2 待实施；原 schema、结果与位序不变，新增可操作的未准备错误 |

### qdmi_local（1）

按需；默认关闭；归属 `qdmi-device`。

| 完整注册名 | 当前副作用 | 建议 | 理由 | 兼容影响 / 批次 |
| --- | --- | --- | --- | --- |
| `mcp__qdmi_local__inspect_qdmi_devices` | read-only | 保留 | C 驱动设备元数据查询 的既有动作；不新增代理 Tool 或重写其算法 | 全名、schema、结果及已有副作用不变 |

## 本批验证与未完成项

- 本次真实 Harness 由本地模型协议替身驱动；66 项适配 Skill 均在用户目录，13 项分类不在模型自动目录，用户显式分类调用仍注入指令，方法 Skill 正常加载，直接模型调用分类 Skill 返回预期错误。HHL/QSVT 数值执行、未知算法错误和 Session 结果重读通过。
- 共享协议测试覆盖实际 stdio MCP Server，但计算 worker 为协议夹具；不把它作为数值算法证据。B1 未修改 Python/Julia 数值源码，不重复进行无关的算法研究。
- 完整 `npm run check` 退出 0：lint、本地化、109 个能力声明一致性、平台与科学合同测试、诊断 eval 和 Harness 配置展开通过。主测试 276 项通过、73 项门控跳过；能力合同测试 105 项通过、1 项门控跳过。跳过项不计为已验证；本次额外运行的真实 SDK/Harness 检查见上一条。
- B2/B3 尚未实施；未改变 MCP 注册/开关、Tool schema、依赖锁、现有模型路由或科学验收阈值。未运行外部模型、云任务或真实硬件验收，未发布安装包。

清单完整性在本批检查中按文件集合与注册名称集合逐项比对，不为这份日期化快照新增运行时对象或永久 CI 门禁。以后新增能力继续修改原权威声明；需要新的治理结论时另作日期化记录。
