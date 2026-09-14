---
name: fatqat-workbench
description: 使用 FatQat 本地 Tool 做量子电路、超导或原子阵列原生门约束实验，以及 transmon 泄漏和里德堡原子链的脉冲动力学。用于量子学习通的动手实验、算法到物理实现的比较和教学参数扫描。
---

# FatQat 实验工作台

本 Skill 指导实验选择与解释。Agent 经 Harness 调用 `fatqat_local` 提供的两个 Tool；
Skill 不启动计算进程。固定上游 SHA、依赖锁摘要、完整输入和物理单位会随结果返回。

## 选择实验层次

- 理想线路、有限 shots、门后噪声：`simulate_fatqat_circuit`，`backend=general`。
- 检查原生门与 CZ 连接边：同一 Tool，`backend=superconducting`，显式给出 `couplings`。
- 检查原子配对：同一 Tool，`backend=atom_array`；所有站点初始已加载，CZ 前需要 Pair，之后可 Unpair。
- 观察驱动中的能级人口和泄漏：`simulate_fatqat_dynamics`，`model=transmon`。
- 观察全局驱动、失谐和原子间作用：同一 Tool，`model=rydberg`。

使用满足问题所需的物理层次；无需把所有问题依次跑完三层。具体 Tool 参数与代表性实验见
[实验输入示例](references/experiments.md)，只读当前任务需要的部分。

## 参数与解释

- 电路门角用弧度；量子位数、操作数和原子阵列站点数由输入决定。
- `shots=0` 返回测量前的精确概率；正数另返回带 seed 的测量频数。
  `probabilities` 始终来自测量前的态，不能解释为 `counts/shots`。位串和态数组都以 q0 为最高位。
- 三种门后噪声都是人工假设：每个幺正门后，对各操作数独立施加通道；加载与配对不加该噪声。
  比较时保持电路、seed、shots 相同，报告通道概率及作用位置。
- 硬件 profile 按输入检查原生门；本接口不自动编译或路由。通用 H/CX 电路应先选 general；
  硬件实验按原生门重写，或明确告诉用户当前输入不支持。不要静默更换后端。
- transmon 用固定的两个三能级合成参考模型；`durationNs` 为 ns、`amplitudeRadPerNs` 为 rad/ns。
  返回 9 维物理态，两个 site 都保留；每个 site 的 level 2 人口才是该 site 的泄漏。
  本接口从全基态出发，以各 site 旋转系中的共振 Rabi 包络恒定驱动 `target=0` 或 `1`，无静态 exchange 和附加噪声。
  泄漏只覆盖三能级截断中的 level 2，不包含更高能级；采样点中的峰值不保证是连续时间峰值。
- Rydberg 用 用户指定数量的固定链状二能级原子；时间 us、距离 µm、驱动与失谐 rad/us、C6 为 rad/us·µm⁶。
  全局驱动和失谐作用于所有 site，C6 可正可负；几何固定，初态全基态，无附加噪声。
  返回模型文档包含实际 C6。不要把门级 Pair 当成真实运输轨迹。
  Hamiltonian 约定为 `H/ℏ=(Ω/2)ΣX−ΔΣn+Σ(C6/r⁶)nᵢnⱼ`，其中 `n=|r⟩⟨r|`；正失谐对应负的激发态对角项。
  相互作用计算预算只限制两个及以上原子；单原子轨迹与 C6 和间距无关。
- 动力学时间序列包含 0 和终点，点数由 samples 指定，每点从同一初态演化到该时刻。
  图表适于展示，定量比较使用完整 `sitePopulations[时间][site][能级]` 和最终态数据。

## 完成与失败边界

首次计算可能由 uv 下载锁定依赖、准备本地 Python 环境和绘图库缓存，因此是 workspace-write；
实际仿真不使用外部模型、云端计算或真实硬件。计算 worker 默认不设置时间或输出大小上限；部署可配置资源预算，取消会终止本次计算进程组。连接层超时与硬件环境配置见[资源配置](../../../docs/integrations/SCALABLE_BRIDGES.md)。

Tool 不在 Registry 中时，检查“设置中心 → MCP Server 连接 → FatQat 量子实验”，启用后重启
OpenQuantum；不要用 Bash 绕过用户禁用的连接。保留不支持的门、错误参数、超时等失败原因，
调整参数需符合原问题；不能给失败的实验填入示例结果。

结果中的 `checks` 只检查数值结构与归一化，`scientificValidation=not_evaluated`。
报告实验假设、关键数值、单位、固定版本和未验证项；MCP 成功和图表都不能作为科研验收或真机性能证明。
任意 Python、用户文件路径、任意模型文档、自动编译、动态控制流、通用 qudit 门、三能级原子私有接口、
QPU 提交和完整课程 UI 不属于这两个 Tool 的能力。更广的科研请求保留这些边界，不把整个上游 SDK 宣称为已暴露。
