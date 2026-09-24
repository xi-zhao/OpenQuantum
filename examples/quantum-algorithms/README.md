# 开源量子算法工作流示例

这里给 66 份 quantum-skills 指南提供本地使用路径：49 个可运行算法示例覆盖
unitarylab_algorithms 的全部 39 个算法模块，以及指南独有的本征求解、梯度和 qLDPC 工作流。
另外 17 份指南负责分类、后端选择和开源迁移。完整对应关系见
[覆盖表](../../docs/integrations/UNITARYLAB_OPEN_COVERAGE.md)。

Agent 加载对应的原生 Skill，通过已有 Harness `bash` / `pwsh` Tool 执行这些代码。
这里没有新的服务、Tool Provider 或运行时。示例可以直接运行，也可以作为用户任务代码的起点；
它们是明确输入和方法的开源实现，不是原库所有 Python 参数及闭源后端功能的兼容层。
执行依赖和 L1 检查集中登记在 `quantum-algorithms` 能力包；其余 65 个 Skill 是复用这些执行工具的
L0 指令与工作流，不重复登记同一个通用 Tool 的合同。

## 一次准备，按任务运行

在 OpenQuantum 仓库根目录准备 Python 3.12 和锁定依赖：

```bash
npm run capability:algorithms:setup
```

需要已有 `uv`；setup 使用 `uv sync --locked`，会下载依赖并创建此目录下忽略的 `.venv`。
计算脚本直接调用该环境，不联网、安装依赖或创建隐藏结果目录。安装、任务文件与报告写入仍由
Harness 通用代码执行 Tool 的权限控制；这类通用 Tool 保守登记为 `external-write`，不伪装成只读。

macOS / Linux：

```bash
examples/quantum-algorithms/.venv/bin/python examples/quantum-algorithms/run.py --list
examples/quantum-algorithms/.venv/bin/python examples/quantum-algorithms/run.py --describe hhl
examples/quantum-algorithms/.venv/bin/python examples/quantum-algorithms/run.py --algorithm hhl
```

Windows PowerShell：

本次数值运行在 macOS CPU 验证。固定 PySCF 2.14.0 的官方预构建包提供 macOS/Linux，
完整依赖环境在 Windows 上建议使用 WSL 并按 Linux 步骤准备；以下给出已有可用原生环境时的路径格式，
不代表已完成原生 Windows 的全部 SDK 验证。

```powershell
& examples/quantum-algorithms/.venv/Scripts/python.exe examples/quantum-algorithms/run.py --algorithm hhl
```

默认参数是可复跑的教学算例。计算自己的数据时，把参数存为 JSON，再指定 `--input`。
例如 `input.json`：

```json
{
  "a": [[1.5, 0.5], [0.5, 1.5]],
  "b": [3, 0],
  "phase_bits": 6
}
```

```bash
examples/quantum-algorithms/.venv/bin/python examples/quantum-algorithms/run.py --algorithm hhl --input input.json --output hhl-result.json
```

省略 `--output` 时只向标准输出打印 JSON。指定输出文件时会写入该文件，父目录须已存在；
使用任务独有文件名保留旧结果。参数拼写错误、未知算法、无效矩阵或不支持的方法明确失败，
不会改跑其他算法。算法返回的未收敛、需重试或样本不足状态必须一并解释。

## 参数与结果

- `--describe <algorithm>` 返回精确参数签名；方法细节和限制在各原生 Skill 与
  [coverage.json](coverage.json) 的 `scope` 字段。不存在的参数不被静默忽略。
- 复数元素使用 `{"real": 0.0, "imag": 1.0}`；向量、矩阵采用普通嵌套 JSON 数组。
  态制备输入会正规化；线性求解保留 RHS 范数，`reconstructedSolution` 对应原始 `b`。
- 示例统一使用 Qiskit 显示位序 `q[n-1]...q[0]`，Pauli 最左字符对应 `q[n-1]`。
  原有 `simulate_hamiltonian` Tool 使用 q0 最左的另一合同；示例调用该实现时显式转换。
- 输入规模、迭代次数、精度参数由调用方选择，没有按开发机设定的量子位上限。
  稠密态矢量、矩阵和 oracle 的存储与编译成本可能指数增长。MPS Ising 使用张量网络；
  分子 DMRG 示例的 Hamiltonian 预处理仍是稠密的，应指定实际可承受的活性空间。
- 稠密 Hamiltonian 对照是附加检查，Trotter/qDrift 示例沿用既有自动参考阈值；
  显式控制参考与电路模式时使用既有 `simulate_hamiltonian` 合同。
- 数值误差、变分收敛、截断、成功概率与硬件效率是不同结果。模拟器完整振幅读取不是硬件读出方案。
  每次输出固定 `scientificValidation=not_evaluated`，不伪造 central Acceptance。

## 开源替换的主要差异

| 工作流 | 本地实际实现与边界 |
| --- | --- |
| Cartan | 实对称 Hamiltonian 的 SO(N) 谱分解；Schur 替换未开放的 Cartan-Lax 优化器 |
| QSP / QSVT | PennyLane 的实际相位综合和 block encoding，Qiskit LCU / 后选择；报告实际多项式误差 |
| Taylor | Taylor 多项式展开成 Pauli LCU，输出后选择概率；不宣称硬件资源优势 |
| 分子 DMRG | PySCF 积分 + quimb 双站点 DMRG；返回的态可继续通过 MPS/Isometry 制备，未复制闭源 CVD 优化器 |
| CVQNN | 保留两模有限 Fock 光学层，NumPy/SciPy 优化；需随 Fock cutoff 检查截断 |
| Ising | quimb MPS、矩形开放网格、二阶 Strang；与原 TensorNet 实现的性能没有等价主张 |
| PDE | 常系数 1D/2D 热方程与周期平流，显式薛定谔化电路；没有名为 block 实为经典回退的分支 |
| 梯度 / QFI | 直接调用各自的 Qiskit Algorithms 实现，保留有限差分、参数移位、反向、LCU 与 SPSA 的区别 |

## 核验

```bash
npm run capability:algorithms:catalog
npm run capability:algorithms:test
npm run capability:algorithms:live
```

live 检查实际执行 49 个入口，以解析结果、独立矩阵构造或独立求解器核对数值，包含复杂初态、
RHS 范数、有符号 HHL、QSVT 阶数收敛、PDE 网格收敛、DMRG/FCI 和 MPS/dense Strang 对照。
随后在真实 Harness 中检查全部 66 个 Skill 的发现，并经通用 shell Tool 运行、接收错误和重读事件。
模型使用本地协议替身，不调用外部模型或硬件。原始证据写入忽略的 `.openquantum/`。

来源、固定版本、许可证和适配说明见 [NOTICE](NOTICE)。
