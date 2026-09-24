# Clifft、qBraid 与 QDMI 接入

本次补充三类本地动作：用 Clifft 采样带 T 门的纠错线路记录，用 qBraid 迁移 Qiskit/Cirq 酉电路，用 QDMI 查询已配置驱动的设备能力。它们通过已有 Harness MCP Client 注册；Skill 负责选择与解释，Tool 负责执行，不增加另一套运行时。

| 上游与固定版本 | Tool | 默认连接 | 完整调用副作用 |
| --- | --- | --- | --- |
| [Clifft 0.10.1](https://github.com/unitaryfoundation/clifft) | `clifft_local.sample_clifft_qec`，保留 `sample_clifft_circuit` | 开启 | workspace-write：显式准备依赖后，计算仍可能写缓存 |
| [qBraid 0.12.2](https://github.com/qBraid/qBraid/tree/v0.12.2) | `qbraid_local.convert_qbraid_circuit` | 开启 | workspace-write：显式准备依赖后，计算仍可能写缓存 |
| [QDMI 1.3.3](https://github.com/Munich-Quantum-Software-Stack/QDMI/tree/v1.3.3) | `qdmi_local.inspect_qdmi_devices` | 关闭，准备后手动开启 | read-only：仅运行预先准备的查询环境 |

三项均为 L1 执行能力。返回 `scientificValidation=not_evaluated`，未接入 Scientific Validator 或 central Acceptance Builder。单次数值对照、合同测试及 Session 执行成功分别保留其含义，不推导最终科学验收。

## 准备与启用

需要 Node.js 24+、uv 和 Python 3.12。Clifft 使用固定 CPU wheel；qBraid 环境固定 Qiskit 2.5.2、Cirq 1.6.1 和 ply 3.11，完整依赖由各能力的 `uv.lock` 固定。

~~~bash
npm ci
npm run capability:interop:setup
~~~

QDMI 示例另需 Git、CMake 和 C++ 编译器，目前安装器支持 macOS/Linux：

~~~bash
npm run capability:qdmi:setup
~~~

该命令下载、核对 QDMI v1.3.3 的提交 `18cfb67fd9042761d3005c2f8655751c1758f9c5`，在忽略目录 `.openquantum/qdmi/` 构建官方示例 client driver 与示例 device，保留上游许可证；同时准备标准库 Python 环境。它拒绝被修改的源码与覆盖已配置的厂商驱动。安装后在量子组件设置中启用 `qdmi_local`，新会话使用更新后的连接。

查询自身不会安装、编译或自动选择库。未准备环境时返回明确的 setup 错误。QDMI 示例不连接实际设备；本次没有接入 Clifft CUDA 或 qBraid 云 Provider。

## Clifft：Stim 文本到对齐的采样记录

`sample_clifft_circuit` 继续接收结构化门序列，提供最终 Z 测量频数与可选密度矩阵参考，原有合同不变。

新增 `sample_clifft_qec` 接收 `stimCircuit`、`shots`（默认 1024）、`seed`（默认 7），以及可选 `maxActiveWidth` 和 `execution`。例如：

~~~json
{
  "stimCircuit": "H 0\nT 0\nH 0\nM 0\nDETECTOR rec[-1]\nOBSERVABLE_INCLUDE(0) rec[-1]",
  "shots": 4096,
  "seed": 7
}
~~~

输入是交给 Clifft parser 的电路数据。当前指令白名单为：

~~~text
I X Y Z H S S_DAG T T_DAG CX CNOT CY CZ SWAP
R RX RY M MX MY MR MRX MRY
X_ERROR Y_ERROR Z_ERROR DEPOLARIZE1 DEPOLARIZE2 PAULI_CHANNEL_1 PAULI_CHANNEL_2
TICK QUBIT_COORDS SHIFT_COORDS DETECTOR OBSERVABLE_INCLUDE REPEAT
~~~

参数与目标是否合法继续由固定 Clifft parser 校验。已验证 `CX rec[-1] 1` 的测量记录反馈；不意味着所有门都支持记录控制，例如该后端拒绝 `CY rec[-1]`。不支持 loss、leakage、后选择、survivor/importance sampling 或期望值记录。

输出三个等长数组，各有 `shots` 行：

- `measurements`：每行位串按实际测量记录次序排列，包含中间测量及重复块，不能按量子位编号解释。
- `detectors`：每行按 detector 声明次序排列。
- `observables`：每行按 observable ID 排列；未声明的较小 ID 补零，同一 ID 多次声明按 XOR 合并。

Detector 和 observable 位均为引用测量记录的**原始奇偶值**。例如 `X 0; M 0; DETECTOR rec[-1]`（用换行分隔）在无噪声时返回 1；Tool 不减去理想参考样本，也不把该值称为逻辑错误。无 detector/observable 时对应每行为空字符串。输出还包括记录维度、实际 peak active width 和输入线路摘要。

接 PyMatching 前，调用方必须另行定义参考奇偶值、解码模型和权重；本接口不生成 DEM，不推断非 Clifford 电路的匹配兼容性。纯 Clifford 存储与 MWPM 逻辑错误率实验继续使用现有 `qec_local`。

主计算规模由输入和部署资源决定；`maxActiveWidth` 是显式成本预算。固定 shots 不等于任意成本：活跃宽度增长仍会增大稠密状态。种子重现限于相同后端、版本、线程与批处理设置。

## qBraid：有界门语义、固定双向转换路径

输入 `numQubits`、`gates`、`direction` 和可选 `referenceMode`、`execution`。例如：

~~~json
{
  "numQubits": 3,
  "gates": [
    {"gate": "X", "targets": [0]},
    {"gate": "RY", "targets": [2], "angle": 0.4},
    {"gate": "CX", "targets": [2, 0]}
  ],
  "direction": "qiskit-to-cirq",
  "referenceMode": "auto"
}
~~~

门集为 H、X、Y、Z、S、SDG、T、TDG、RX、RY、RZ、CX、CZ、SWAP；旋转角以弧度表示。双量子位 targets 按输入次序解释；CX 为控制位、目标位。禁止重复目标、越界编号、测量、噪声、重置、动态控制、任意 Python 和文件路径。

固定使用 qBraid 的 `qiskit → qasm2 → cirq` 或 `cirq → qasm2 → qiskit` 图，不自动搜索其他插件路径。输出实际路径、保持输入编号的 OpenQASM 2，以及对照状态。空闲量子位通过显式 identity 保留；导出规范化到 u3/cx，避免 Cirq 的 SWAP 扩展无法被默认 Qiskit parser 读取。此导出是转换结果的公共文本表示，不保留原始门分解。

`referenceMode=auto` 在 8 qubits 内比较完整酉矩阵，`required` 按请求规模尝试，`skip` 不运行矩阵对照。比较以 q0 为最低有效位并忽略整体相位，包含转换目标与重新解析的导出文本；偏差大于 1e-8 时拒绝返回成功。跳过时 `independentEquivalent` 和 `maxUnitaryDeviation` 为 null，不声称等价性已检查。完整矩阵成本随量子位数指数增长。

这不是任意 Qiskit/Cirq 程序导入器，不创建云任务。qBraid 上游名为 OpenQuantumProvider 的接口面向 openquantum.com，与本仓库的本地适配没有连接关系。

## QDMI：受控驱动、只读能力探测

Tool 接收查询预算，不接收库路径、token 或命令：

~~~json
{"maxDevices": 64, "maxPropertyBytes": 1048576, "execution": {"timeoutMs": 30000}}
~~~

查询 client ABI 中的设备名称/版本/QDMI 版本、量子位数、site indices、操作名称/元数/参数数和有向 coupling。QDMI `NOT_SUPPORTED (-9)` 保留为 null；不能解释成 0 或空集合。site index 必须受支持且不重复，coupling 必须完整引用已知 sites。错误大小、缺失字符串终止符、未知 site、空 handle、超预算和驱动摘要不匹配均返回错误。

每次查询独立建立、释放 session。默认执行期限 30 秒、输出预算 2 MiB，可由 `execution` 显式调整。worker 只保留最小进程环境，不转发宿主凭据；没有绑定 job 或 calibration API。任何返回都标记 `hardwareVerified=false` 与 `jobsSubmitted=0`。

维护者如需配置厂商驱动，先准备 Python 环境：

~~~bash
node scripts/setup-paper-tools.mjs qdmi-device
~~~

再在项目受控文件 `.openquantum/qdmi/driver.json` 配置已审阅的 **QDMI 1.3.3 client ABI** 库。不能直接填写仅实现 device ABI、带厂商前缀的设备库。文件结构如下，占位值必须替换为本机绝对路径和真实 SHA-256：

~~~json
{
  "interfaceVersion": "1.3.3",
  "driverKind": "configured",
  "driver": {"path": "/absolute/path/libdriver.so", "sha256": "<sha256>"},
  "deviceLibraries": [
    {"path": "/absolute/path/libdevice.so", "sha256": "<sha256>"}
  ],
  "configuration": {"path": "/absolute/path/qdmi.conf", "sha256": "<sha256>"},
  "exampleLifecycle": false,
  "emptyToken": false
}
~~~

不需要下游库或配置文件的驱动可以省略相应字段。`configuration` 设置为子进程的 `QDMI_CONF`；`exampleLifecycle` 仅在兼容官方示例的 `QDMI_driver_init/shutdown` 时启用，`emptyToken` 仅用于明确要求空 token 的只读 session。当前不支持需要其他认证参数的驱动。

本地原生库是受信任代码，SHA-256 固定文件身份并不隔离库的内部行为。登记时需要审阅 ABI、初始化、依赖库和配置的网络/写入行为，使该连接满足只读发现合同。任意厂商驱动和真实设备尚未验证。

## 验证与证据

~~~bash
npm run capability:interop:test
npm run capability:contracts:test
npm run capability:conformance
npm run capability:interop:live
npm run harness:config
~~~

前三项使用本地协议夹具检查合同、错误、取消/超时和能力声明，不需要厂商凭据。live 命令需先准备上述依赖与 QDMI 示例，调用真实固定库与真实 Harness；模型端使用本机协议夹具，未调用外部模型。Harness 测试在临时配置中启用 QDMI，检查 Skill 发现、Tool 成功与失败事件，并重读 Session 结果；产品默认开关保持不变。

2026-09-24 的验证覆盖 T 干涉解析概率、记录反馈与奇偶值、重复/重置、observable 空位，双向转换的非对称位序/空闲位/完整门集/SWAP，以及官方 QDMI 示例的 5 个 sites、4 个 operations 和 10 对有向 coupling。另由独立领域审阅者复核采样语义、C ABI 与转换位序，发现的 SWAP 导出问题已修复。

可重跑测试分别为 [合同](../../tests/interop-contracts.test.mjs)、[真实库](../../tests/interop-live.test.mjs) 和 [Harness](../../tests/harness-interop.test.mjs)。运行时详细 JSON 写入忽略目录 `.openquantum/interop-evidence/`，可提交的摘要、输入与结果摘要见 [验证记录](evidence/interop-2026-09-24.json)。这些证据不覆盖外部模型、云端提交、实际硬件、CUDA 或最终科学 Acceptance。

当前环境准备、旧环境复用与失败恢复统一见[本地计算环境准备](LOCAL_ENVIRONMENTS.md)。
