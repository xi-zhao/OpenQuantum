# 国内 SDK 补充接入

本批为四个 SDK 增加隔离 Python worker，经 MCP Server 和 Harness MCP Client 注册 Tool；Skill 说明模型、输入约定和结果解释。它们均为 L1，输出 `scientificValidation=not_evaluated`。凭据由用户设置；本批动作均为本地计算，不需要凭据或外部服务。

| 能力 | 固定 SDK / Python | Tool | 输入、方法与输出 | 默认状态 |
| --- | --- | --- | --- | --- |
| SimQN | qns 0.2.3 / 3.12 | `simulate_simqn_link` | 独立量子链路发送；SimQN 离散事件、随机丢失和 Werner 衰减；到达时间与保真度 | opt-in，GPL-3.0 |
| Qcover | Qcover 2.6.0 / 3.10 | `evaluate_qcover_qaoa` | Ising 图与给定 gamma/beta；Qcover p 邻域分解 + Qulacs；能量、ZZ 期望和子图规模 | 默认声明，本地环境需显式准备 |
| VQNet | pyvqnet 2.18.1 / 3.12 | `differentiate_vqnet_circuit` | 结构化电路和实 Pauli 和；CPU VQC 自动微分；期望、概率、每个旋转门梯度 | opt-in，发行二进制许可元数据需用户核对 |
| pyChemiQ | pychemiq 1.1.4 / 3.10 | `map_pychemiq_fermions` | 有序复系数费米算符；原生 Jordan-Wigner 映射；Pauli 项 | 默认声明，本地环境需显式准备 |

上游来源：[SimQN](https://github.com/QNLab-USTC/SimQN)、[Qcover](https://github.com/BAQIS-Quantum/Qcover)、[VQNet](https://vqnet20-tutorial.readthedocs.io/en/main/index.html)、[pyChemiQ](https://github.com/OriginQ/pyChemiQ)。顶层版本和完整依赖均写入各能力 `pyproject.toml` 与 `uv.lock`，Tool 输出携带输入、输入 SHA-256、依赖锁 SHA-256 和 SDK 来源。

## 准备与兼容性

```bash
node scripts/setup-paper-tools.mjs simqn-network qcover-optimization vqnet-learning pychemiq-chemistry
```

准备依赖是独立动作；计算 Tool 不会触发安装。缺失或过期环境明确报错。四个 Tool 均登记 workspace-write，保留 SDK 本地缓存的最大副作用；输入不接受代码、路径、URL 或密钥。

Qcover 的上游完整依赖保留，Qiskit 0.45.3、Aer 0.13.3、Cirq 1.3.0、Quimb 1.8.4、ProjectQ 0.8.0、NumPy 1.26.4、SciPy 1.12.0、NetworkX 2.8.8 使用兼容固定版本。ProjectQ 构建依赖固定 setuptools 68.2.2。隔离 worker 将旧 `collections.Callable` 拼写映射到 `collections.abc.Callable`，不改动上游安装文件。底层完整依赖的存在不等于暴露其云端功能。

VQNet 的 macOS ARM wheel 含构建机 libpython 绝对路径及无效的 `$ORIGIN` rpath。Worker 在读取请求之前，仅用 SDK 已安装目录和当前 Python 的 `LIBDIR` 派生动态库搜索路径并重启自身；不下载、不修改 wheel、不创建宿主链接。其 macOS 导入会设置 OMP 线程为 1，这可能覆盖部署线程偏好。`MeasureAll` 的字典系数在该版本内部转为 float32；适配层分别测量单位 Pauli，再用显式 float64 QTensor 系数在 VQNet 自动微分图内相加，避免权重精度损失。VQNet Python 源文件含 Apache-2.0 声明，但 wheel 没有完整许可元数据，因此保持 opt-in，不能把所有二进制组件概括为已完成统一许可审查。

pyChemiQ 1.1.4 的原生 wheel 支持 CPython 3.8/3.9/3.10，本集成固定 3.10。当前已有 macOS ARM64 的真实执行证据；不声明所有 OS/ABI 已验证。

## 方法边界

SimQN 首期是单条无限带宽、无排队量子链路；没有存储、中继、路由或 QKD 协商。Werner 衰减率单位每米，延迟单位秒；两者独立。时间由 `timeSlotsPerSecond` 向下量化，随机丢失用显式 seed。

Qcover 只评估给定参数的 QAOA 能量，不执行优化器或输出最优解。Hamiltonian 为 Z 场和 ZZ 边耦合之和，不含常数项。Qulacs 后端采用正指数旋转；大小与层数由调用方指定。

VQNet 对每个旋转门独立微分，不隐式共享参数、不训练模型。Pauli 与概率位序均为 qubit 0 在最左。pyChemiQ 保留输入算符乘法次序，不隐式补厄米共轭。其整体 JW 接口内部默认剪去约 `1e-6` 以下系数，即使输入算符阈值设为零也不能解决。适配改为真实 SDK 的单位 ladder 映射与零阈值 Pauli 乘法，每步稳定合并重复项，最后应用原始复系数；只删除精确零，浮点下溢/溢出显式失败。首期不做分子积分、活性空间或 VQE。

## 验证入口

```bash
node --test tests/sdk-gaps-domestic-contracts.test.mjs
OPENQUANTUM_REAL_SDK_GAPS_DOMESTIC=1 node --test tests/sdk-gaps-domestic-live.test.mjs
```

合同测试验证真实 MCP 工具发现、严格参数、凭据隔离、来源绑定、损坏输出、worker 失败和取消恢复；协议 fixtures 不作为科学证据。显式 live 测试运行真实 SDK，独立 Python 数值测试禁止网络连接，再通过真实 MCP 重跑示例与默认参数。

独立数值参照包括：Werner 解析衰减、到达时间、全丢失与固定 seed；QAOA 全 Hilbert 空间演化（含非均匀场、非邻接耦合、孤立节点、多层）；VQNet NumPy 密集电路、有限差分梯度、恒等与重复项抵消和位序；pyChemiQ 在费米占据数基上直接构造矩阵，检查复 hopping、反对易抵消和数算符，另核对微小系数、24 次重复数算符及大项抵消后的小残差。生成的本地证据保存在 `.openquantum/sdk-gaps-evidence/domestic/`，不进入运行时科学验收链。
