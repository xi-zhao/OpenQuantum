# Bloqade Analog 中性原子动力学

用户可以定义二维原子阵列和随时间变化的全局驱动、失谐、相位，使用 QuEra Bloqade Analog 的 Python emulator 计算 Rydberg 动力学。结果包含各原子的激发占据、末态复振幅与位串概率，适用于比较阵列几何和脉冲形状的影响。

## 入口与准备

- Skill：`bloqade-analog`。
- Tool：`simulate_bloqade_analog`；本地 MCP Server：`bloqade_local`。
- Agent Preset 中的 Harness MCP Client 默认加载该连接；依赖准备与连接配置分别完成。

```bash
npm run capability:bloqade:setup
```

固定 Python 3.12、`bloqade-analog==0.16.9`、`numpy==2.4.2`，完整传递依赖及包摘要保存在 [uv.lock](../../.agents/skills/bloqade-analog/uv.lock)。NumPy 2.5.3 与本版 Bloqade 的 beartype 类型注解不兼容，会在导入阶段报 `ScalarT invalid`；2.4.2 与[上游 v0.16.9 锁](https://github.com/QuEraComputing/bloqade-analog/blob/v0.16.9/uv.lock)一致。重跑 setup 按锁同步环境，并写入共享准备机制使用的锁摘要。

上游声明 Apache-2.0，采用官方发行包而不复制上游源码。上游依赖含 Braket SDK 和 juliacall；本接口只使用 Python emulator，不调用 AWS/QuEra 服务、不导入 Julia 执行后端，不需要云凭据。计算缺少准备环境或锁过期时返回准备命令；不会在计算阶段自动安装。完整调用保守声明为 `workspace-write`，因为数值库可能写本地缓存。

升级后，在使用本分支源码的工作台重启 Harness、创建新会话加载新连接。

## 输入与输出

```json
{
  "atomPositionsUm": [[0, 0], [8, 1], [1, 9.5]],
  "durationsUs": [0.13, 0.27, 0.31],
  "rabiRadPerUs": [0, 6, 4, 0],
  "detuningRadPerUs": [-2, 1, 3, -1],
  "phaseRad": [0, 0.4, -0.3, 0.8],
  "timeSteps": 20,
  "atol": 1e-9,
  "rtol": 1e-9
}
```

每个波形数组包含各段端点的值，长度等于 `durationsUs.length + 1`。振幅、失谐和相位分别在同一组时间段内线性插值。坐标为 µm，时间为 µs，角频率为 rad/µs，相位为 rad。传入 MHz 数值前须乘 2π。

可以在工作台请求：“用 Bloqade Analog 比较两个相距 5 µm 的原子在全局驱动下的 Rydberg 激发。初态全 ground，Ω=2 rad/µs，Δ=0，相位为零，演化 1 µs，返回逐原子占据和四个位串的概率，并检查概率归一性。”

`rydbergPopulations[t][i]` 对应输入第 i 个原子；`finalOutcomes` 按位串排序，左端为原子 0，0 表示 ground，1 表示 Rydberg。振幅为 `[real, imag]`，概率为模平方，未裁剪或重新归一化。它们是数值纯态结果，不是 finite-shot counts。`timesUs` 包含均匀网格和每个脉冲分段边界；最终时间采用编译后的十进制持续时间，避免 0.1+0.2 的浮点超界。`maxNormError` 是全时间网格上最大的概率和偏离 1 的绝对值。

原子数、段数和输出网格由用户指定。完整态向量使用 2^N 空间；后端仅能表示可寻址的数组，超出时明确失败。时间和输出预算通过共享 `execution` 设置，见[本地计算资源](SCALABLE_BRIDGES.md)。这不是大规模性能保证。

## 物理模型与范围

从全 ground 态出发，采用

```text
H/ℏ = Σ_i Ω(t)/2 [e^(iφ(t)) |g><r| + e^(-iφ(t)) |r><g|]
      − Δ(t) Σ_i n_i + Σ_(i<j) C6 / r_ij^6 n_i n_j
C6 = 2π × 862690 rad·µm^6/µs
```

固定 C6 对应上游的 87Rb 70S1/2 模型。静止原子、全局控制、两能级与旋波近似；不含运动、耗散、实测校准或局域寻址。`blockade_radius=0` 保留完整空间中的有限双激发概率，不把近邻状态硬删除。

当前接入 Bloqade Analog 的本地 Python 计算。Bloqade 数字电路、Julia 后端与真机任务不在本接口范围。SDK 数值与解析或独立稠密参考一致，仍不等于硬件正确性、性能优势或最终科学 Acceptance；返回始终为 `scientificValidation=not_evaluated`。

[官方模型](https://github.com/QuEraComputing/bloqade-analog/blob/v0.16.9/docs/home/background.md) · [固定常数](https://github.com/QuEraComputing/bloqade-analog/blob/v0.16.9/src/bloqade/analog/constants.py) · [Python 演化接口](https://github.com/QuEraComputing/bloqade-analog/blob/v0.16.9/src/bloqade/analog/ir/routine/bloqade.py)

## 验证入口

```bash
npm run capability:bloqade:test
npm run capability:bloqade:live
```

离线合同检查覆盖声明/实际工具清单、严格输入、来源摘要、错误、取消后恢复和进程凭据隔离。显式 live 检查使用已准备环境，包含单原子解析解、相位斜率与失谐组合、双原子有限相互作用矩阵指数、二维非对称阵列的独立稠密时变演化、时间网格和容差细化。

Harness 端到端测试使用本地模型协议替身，验证真实 Skill 发现、Tool 执行、预期错误及 Session 结果重读；不代表外部模型自主任务验收。原始数值输出保存在 `.openquantum/bloqade-evidence/`，版本化摘要见 [验证记录](evidence/bloqade-2026-09-27.json)。
