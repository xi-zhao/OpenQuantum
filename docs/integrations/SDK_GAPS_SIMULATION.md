# 光子学与本地模拟 SDK 补充（2026-09-28）

本组提供 4 个 L1 能力、4 个 Skill、4 个独立 Python MCP Server，每个 Server 只开放一个确定动作。
所有结果保留输入摘要和锁文件摘要，`scientificValidation=not_evaluated`。SDK 计算与缓存登记为 workspace-write；
显式准备才下载依赖，调用中不安装、自动登录或创建云任务。适配层不附带 SDK 源码或二进制。

| SDK / 能力 | 固定依赖与 Python | 执行动作与范围 | 启用策略 |
| --- | --- | --- | --- |
| [Xanadu MrMustard](https://github.com/XanaduAI/MrMustard) / [mrmustard-optics](../../.agents/skills/mrmustard-optics/SKILL.md) | mrmustard 0.7.3、TensorFlow 2.15.0；Python 3.11 | `simulate_mrmustard_optics`：真空经 D/S/R/BS/S2/LOSS 后的高斯相空间矩和截断 Fock 概率 | 按需；上游于 2026-07-29 归档，固定兼容接口 |
| [Quandela MerLin](https://github.com/merlinquantum/merlin) / [merlin-learning](../../.agents/skills/merlin-learning/SKILL.md) | merlinquantum 0.4.1、perceval-quandela 1.2.1；Python 3.12 | `evaluate_merlin_layer`：CPU float64、无损 Fock 输入、分束器/参数化相移、批量概率与指定输出概率的相移梯度 | 默认开启；MIT 主包 |
| [QPerfect MIMIQ Exaqt](https://docs.qperfect.io/exaqt-python/) / [mimiq-simulation](../../.agents/skills/mimiq-simulation/SKILL.md) | mimiq-exaqt 0.3.0、mimiqcircuits 0.28.0；Python 3.12 | `simulate_mimiq_circuit`：本地 ExaqtSV 复振幅、概率、种子采样；不是 MIMIQ 云端服务或 TensorWeaver | 按需；发布 wheel 未附明确许可证元数据或许可证文件，不作开源/可再分发声明 |
| [Bull myQLM](https://myqlm.github.io/) / [myqlm-simulation](../../.agents/skills/myqlm-simulation/SKILL.md) | myqlm 1.13.7；Python 3.12 | `simulate_myqlm_circuit`：显式 PyLinalg，无噪声门电路完整振幅、概率；不访问 Qaptiva/QPU 工厂 | 按需；供应方 myQLM EULA |

## 输入与数值语义

MrMustard 的真空协方差为 I（hbar=2），顺序是 x0,…,xN−1,p0,…,pN−1；位移 alpha=x+iy。
每模式 cutoff 定义占据数 0…cutoff−1，概率不重新归一化，返回 retainedProbability。
相空间矩独立于该截断。输出规模为 cutoff^numModes；混态的内部密度矩阵可能更大。
MrMustard BS 的角度采用 cos(theta)/sin(theta)，与 MerLin 的半角约定不同。

MerLin 强制选择 `MeasurementStrategy.probs(ComputationSpace.FOCK)`。上游默认 `UNBUNCHED` 会丢弃聚束态并归一化，
不适用于这里承诺的完整 Fock 输出。MerLin BS 使用 Perceval Rx 约定 cos(theta/2) 与 i sin(theta/2)，PS 角度按出现顺序
与每批 phase 行对应，保留完整 basis，梯度只对应目标 Fock 概率。SLOS 后端要求至少一个输入光子；这是真实后端约束。
任意两个模式的分束器通过 SDK 矩阵嵌入处理，不把连续端口 API 限制误报为物理线路限制。
Perceval 固定到 1.2.1：实测 1.3.0 移除 MerLin 0.4.1 仍引用的 `perceval.runtime.session`，会导致 import 失败。

MIMIQ 和 myQLM 均接受 H/S/T/X/Y/Z/CX/CZ/RX/RY/RZ，初态为全零。输出最左 bit 是 qubit 0，
适配层显式转换 Exaqt 的小端索引；myQLM 的 CZ 使用 Z.ctrl() 构造。旋转角均以弧度表示。
MIMIQ shots=0 不采样；大于 0 时用供应方 Exaqt RNG。myQLM 设置 nbshots=0、amp_threshold=0，直接返回完整模拟结果。

不以测试算例给模式、量子位、光子、shots、cutoff 或批次数加人工上限。JSON 安全整数、物理定义、结构和后端限制独立检查；
浮点溢出、超时、内存不足、依赖缺失或不匹配明确失败。部署预算使用 `execution`。

## 显式准备与平台

```sh
node scripts/setup-paper-tools.mjs mrmustard-optics merlin-learning mimiq-simulation myqlm-simulation
```

各目录提供完整 `uv.lock`。MrMustard 的 Python 3.11 与其余 Python 3.12 隔离；本组实际准备和数值验证平台为 macOS arm64。
[Exaqt 0.3.0 的官方分发](https://pypi.org/project/mimiq-exaqt/0.3.0/)仅含 macOS arm64、Linux x86_64 glibc 2.34+、
Windows x86_64 wheel，锁文件与 setup 平台检查保留这个边界，其他主机没有兼容实现时不伪造备用结果。
myQLM 的依赖含平台 wheel；未在其他 OS 上实测，不能从锁文件推导跨平台运行通过。

MrMustard 0.7.3 已对 Apple Silicon 排除独立 tensorflow-io-gcs-filesystem，但 TensorFlow 2.15 的传递元数据又引入该项，
其固定候选没有 arm64 macOS wheel。pyproject 的显式 override 把同一平台排除条件应用于传递依赖；本地光学动作不使用
GCS 文件系统，保留实际 TensorFlow/macOS 运算库，独立数值测试覆盖此环境，不修改已安装 SDK 源码。

本组 Tool 不接收地址、代码、路径或凭据，所有计算不需要账户。myQLM 与 Exaqt 按需安装与启用，供应方许可由用户确认。

## 开发期验证

```sh
node --test tests/sdk-gaps-simulation-contracts.test.mjs
OPENQUANTUM_REAL_SDK_GAPS_SIMULATION=1 node --test tests/sdk-gaps-simulation-live.test.mjs
```

合同测试实际启动 MCP，检查声明、schema、错误、输入与锁摘要、环境隔离、工作进程取消与恢复；协议夹具不作为数值证据。
真实 SDK 测试禁止 Python socket 连接，分别使用：

- MrMustard：真空、相干态 Poisson 分布、截断质量、压缩态偶光子分布、旋转、分束器、双模压缩和衰减的解析矩/概率。
- MerLin：独立单粒子矩阵和玻色永久式，对照单/双光子、多模式、非相邻/反向端口、HOM 聚束、批量概率；
  以独立参照的有限差分检查 autograd，并用 12 个不等相移检查参数顺序。
- MIMIQ / myQLM：独立稠密门矩阵覆盖全部输入门、位序和相位；MIMIQ 另外验证采样种子复现、次数和预期支持集。

真实 MCP 调用检查示例、默认输入、返回 schema、输入重读与 L1 标识，证据写入忽略的 `.openquantum/sdk-gaps-evidence/simulation/`。
这些是本地适配验证，没有运行云端、GPU、物理器件或最终科学验收。
