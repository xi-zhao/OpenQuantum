# 量子生态扩展：2026-10-14 源码候选

本轮增加 26 个原生 SDK 或源码入口：19 个 Python、6 个 Julia、1 个 C++。同时迁移既有 TensorCircuit 能力到 TensorCircuit-NG，另建 MQT Bench v2 语料。当前 SDK 清单为 111 个环境入口；它们不代表 111 个独立上游库。

这些能力复用宿主代码工具和 `quantum-sdk-workbench`，以原生公开 API 执行用户程序。没有增加科学 Tool 或 MCP 服务数量。库按需显式准备，模型、算法、参数和输出格式由研究任务决定；示例是可编辑程序，不是功能白名单。Scientific Validator 与最终 Acceptance 的范围未扩大。

按用户要求剔除 QuCumber：其发行长期停滞且依赖旧 PyTorch 运行栈。PECOS 使用当前维护的 0.11.0.dev0；不接入旧 0.2 稳定版。Tesseract 使用明确固定的开发版。TQEC、STAQ 和 Qsyn 固定源码 SHA；Qsyn 的构建依赖也固定完整 SHA。

## 固定接入清单

| SDK / Skill | 固定直接依赖或源码 | 上游许可证 | 原生任务对象 |
| --- | --- | --- | --- |
| [`arc-rydberg`](../../.agents/skills/arc-rydberg/SKILL.md) | ARC-Alkali-Rydberg-Calculator==3.10.2 | BSD-3-Clause | 原子、能级、跃迁矩阵元、寿命、Stark 图与相互作用 |
| [`catalyst-compilation`](../../.agents/skills/catalyst-compilation/SKILL.md) | pennylane-catalyst==0.15.0 | Apache-2.0 | qjit、混合程序、QNode、控制流、编译配置与梯度 |
| [`jaxquantum-modeling`](../../.agents/skills/jaxquantum-modeling/SKILL.md) | jaxquantum==0.3.0 | Apache-2.0 | JAX 算符、器件与 bosonic 模型、动力学、扫描与梯度 |
| [`josephson-circuits`](../../.agents/skills/josephson-circuits/SKILL.md) | JosephsonCircuits 0.5.4 | MIT | Josephson 元件、电路、频域谐波平衡、散射与噪声 |
| [`monoprop-propagation`](../../.agents/skills/monoprop-propagation/SKILL.md) | monoprop[qiskit]==0.9.2 | Apache-2.0 | Pauli/Majorana 算符、门生成元、传播、梯度与截断 |
| [`mqt-debugger`](../../.agents/skills/mqt-debugger/SKILL.md) | mqt-debugger[check]==1.3.0 | MIT | OpenQASM 程序、单步仿真、断言、影响范围与错误诊断 |
| [`mqt-qecc`](../../.agents/skills/mqt-qecc/SKILL.md) | mqt-qecc==2.0.0 | MIT | CSS 码、容错态制备、色码与模拟信息解码 |
| [`openjij-optimization`](../../.agents/skills/openjij-optimization/SKILL.md) | openjij==0.12.2 | Apache-2.0 | Ising/QUBO、SA/SQA sampler、退火 schedule 与 SampleSet |
| [`paulistrings-dynamics`](../../.agents/skills/paulistrings-dynamics/SKILL.md) | PauliStrings 1.10.1 | MIT | Pauli 字符串、Hamiltonian、算符传播与多体算法 |
| [`pecos-qec`](../../.agents/skills/pecos-qec/SKILL.md) | quantum-pecos[stim,visualization]==0.11.0.dev0 | Apache-2.0 | 混合程序、量子后端、噪声、syndrome 与纠错协议 |
| [`piquasso-photonics`](../../.agents/skills/piquasso-photonics/SKILL.md) | piquasso==8.0.1 | Apache-2.0 | Gaussian/Fock 态、光子程序、信道与测量 |
| [`pygsti-characterization`](../../.agents/skills/pygsti-characterization/SKILL.md) | pygsti[reports]==0.10.2 | Apache-2.0 | Circuit、Model、DataSet、GST/RB/RPE 与拟合报告 |
| [`qdk-chemistry`](../../.agents/skills/qdk-chemistry/SKILL.md) | qdk-chemistry[openfermion-extras,qiskit-extras,plugins]==2.2.1 | MIT | 分子结构、电子结构、活性空间、量子算法、后端与结果 |
| [`qiskit-machine-learning`](../../.agents/skills/qiskit-machine-learning/SKILL.md) | qiskit-machine-learning[torch,sparse]==0.9.1 | Apache-2.0 | 量子核、QSVC/QSVR、QNN、梯度、训练与推断 |
| [`qlasskit-oracles`](../../.agents/skills/qlasskit-oracles/SKILL.md) | qlasskit==0.1.39, qiskit==2.5.2 | Apache-2.0 | 受支持 Python 子集、布尔表达式、量子 oracle 与多框架导出 |
| [`qsim-simulation`](../../.agents/skills/qsim-simulation/SKILL.md) | qsimcirq==0.22.1 | Apache-2.0 | Cirq 电路、QSimOptions、态矢量、采样与目标后端 |
| [`qsyn-compilation`](../../.agents/skills/qsyn-compilation/SKILL.md) | b77187c87f0b; CMake dependency lock | Apache-2.0 | C++ 库、线路综合、ZX/张量变换、优化、验证与 CLI |
| [`quantumclifford-julia`](../../.agents/skills/quantumclifford-julia/SKILL.md) | QuantumClifford 0.11.8 | MIT | Pauli/稳定子、图态、Clifford 操作、测量与 Pauli frame |
| [`quantumcontrol-julia`](../../.agents/skills/quantumcontrol-julia/SKILL.md) | GRAPE 1.1.0, Krotov 0.7.2, QuantumControl 0.11.4, QuantumPropagators 0.9.0 | MIT code; documentation per-file | 动力学、控制目标、脉冲、GRAPE/Krotov 与优化 |
| [`quantumsavory-network`](../../.agents/skills/quantumsavory-network/SKILL.md) | QuantumSavory 0.8.0 | MIT | 量子寄存器、器件状态、链路、网络协议与离散事件模拟 |
| [`squlearn-learning`](../../.agents/skills/squlearn-learning/SKILL.md) | squlearn==0.11.2 | Apache-2.0 | 编码线路、observable、executor、量子核与 sklearn estimator |
| [`staq-compilation`](../../.agents/skills/staq-compilation/SKILL.md) | pystaq @ git+https://github.com/softwareQinc/staq.git@a2acd39e60ed0e5f1978fa530df7e1e0c7cedf7a | MIT | OpenQASM AST、综合、线路变换、优化与映射 |
| [`tesseract-decoding`](../../.agents/skills/tesseract-decoding/SKILL.md) | tesseract-decoder==0.1.1.dev20261013012529 | Apache-2.0 | Stim DEM、syndrome、搜索式解码器与统计 |
| [`tqec-compilation`](../../.agents/skills/tqec-compilation/SKILL.md) | tqec @ https://github.com/tqec/tqec/archive/2c4b8cf9d3f8f520571093c60d752af0ad46a745.tar.gz | Apache-2.0 | BlockGraph、逻辑计算块、相关面与 Stim 线路生成 |
| [`tsim-sampling`](../../.agents/skills/tsim-sampling/SKILL.md) | bloqade-tsim==0.1.5 | Apache-2.0 | Clifford/非 Clifford 线路、噪声、detector 与 observable 采样 |
| [`yao-circuits`](../../.agents/skills/yao-circuits/SKILL.md) | Yao 0.9.3 | Apache-2.0 primary text; component review remains | 量子寄存器、block、电路、算符、参数与梯度 |

## 准备与使用

从源码或发行能力包根目录运行：

```sh
node scripts/sdk-access.mjs inspect mqt-qecc
node scripts/setup-sdk.mjs mqt-qecc
```

`inspect` 只读目录和文件记录，返回安装与运行的 argv 模板；不安装、不 import、不执行程序。Codex 缓存 Skill 使用其随包 `scripts/sdk-access.mjs` 定位外置 runtime。新增 Skill 随 Desktop 原生 Skill Provider 和 Codex Skill 投影分发。

Python 按条目固定解释器；Julia 固定 1.12.7 和独立 Project/Manifest。C++ 使用 CMake、C++20、BLAS/LAPACK 与锁定依赖源。源码缓存检查 origin、HEAD、跟踪文件、子模块和符号链接；用户修改不会被 reset 或覆盖。原生二进制成功构建后才写就绪记录，记录锁摘要、二进制摘要、平台和架构。

大型环境可外置，通过 `OPENQUANTUM_PYTHON_ENV_ROOT`、`OPENQUANTUM_SDK_SOURCE_ROOT`、`OPENQUANTUM_NATIVE_SDK_ROOT`、`OPENQUANTUM_CARGO_HOME` 和 `OPENQUANTUM_JULIA_DEPOT_PATH` 指定本轮缓存位置。运行时继承所选 Julia depot；其他 SDK 仍使用各自隔离解释器。

Qsyn 本机使用 GCC 16.2.0 构建。Clang 22 / fmt 10.2.1 的构建尝试失败并保留日志；未修改上游数值算法或静默升级构建依赖。其他编译器与系统须独立验证。

## 既有入口迁移与语料

`tensorcircuit-differentiable` 的 Skill ID 和 Tool 名称保持稳定，distribution 改为 `tensorcircuit-ng==1.10.0`，import 名仍为 `tensorcircuit`。固定 JAX 0.7.1、NumPy 2.3.5 和 Qiskit 2.5.2；旧环境和历史证据保留。

[MQT Bench v2](../../benchmarks/quantum-capabilities/corpora/v2/README.md)固定 2.3.0，新增 21 例，覆盖七种算法、三种规模。生成器只输出候选，语料记录参数、全局相位与摘要。v1 的三例、2.2.3 和分母保持原样；性能比较必须注明版本。

## 验证边界

实际 API 检查由 `tests/sdk-ecosystem-live.test.mjs` 执行，各 Skill 的 `references/native-example.py` / `.jl` / `.qsyn` 是使用的程序。macOS 测试进程禁止网络，保存程序、输出、版本、日志和摘要；失败尝试保留。默认仓库检查不会自动安装或执行这些库。

```sh
OPENQUANTUM_ECOSYSTEM_CHECKS=1 node --test --test-concurrency=1 tests/sdk-ecosystem-live.test.mjs
```

可用 `OPENQUANTUM_SDK_IDS` 选定条目，用 `OPENQUANTUM_SDK_CHECK_OUTPUT` 保存证据。原生 Qsyn 检查还需要 `OPENQUANTUM_QASM_REFERENCE_PYTHON` 指向隔离的 Qiskit 解释器，核对优化前后完整酉矩阵的全局相位等价性。

[配套验证记录](evidence/sdk-ecosystem-2026-10-14.json)包含 26/26 个当前示例的通过记录；原始程序、结果、版本和日志已保存到仓库内的证据目录，可脱离本机忽略缓存核验。TensorCircuit 0.12.0 与 NG 1.10.0 的非零梯度、完整态矢与 Qiskit 转换对照在 `1e-10` 容差内一致；真实 Tool 的两项检查和七项独立数值用例通过。全仓 `npm run check`、55 项源码/打包回归与 5 项语料检查通过；独立审查提出的两个 P2 已修复，复核无未解决 P1/P2。小系统恒等式和输出语义检查不替代真实科研任务、硬件、GPU、完整优化收敛或跨平台验收；`scientificValidation=not_evaluated`。本轮经 [PR #22](https://github.com/xi-zhao/OpenQuantum/pull/22) 合并，统一版本 0.8.4 的 [Desktop](https://github.com/xi-zhao/OpenQuantum/releases/tag/v0.8.4)与 [Codex](https://github.com/xi-zhao/OpenQuantum/releases/tag/codex-v0.8.4)已公开，标签固定到 `589d44f722ab36441a14f98f1cac979f6b9ec8aa`。发布提交的 7/7 push 检查通过；附件、下载与更新清单的实际验证结果以各 Release 的 `release-validation.json` 为准。发行不替换用户安装。
