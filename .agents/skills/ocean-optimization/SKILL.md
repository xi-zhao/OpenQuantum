---
name: ocean-optimization
description: 用 D-Wave Ocean dimod 构建 QUBO/Ising 模型、转换系数，并用经典精确枚举或模拟退火采样。
---

# Ocean QUBO 与 Ising 本地采样

<!-- BEGIN NATIVE SDK ACCESS -->
## 原生 SDK 路径

本能力同时支持 **D-Wave Ocean SDK 的原生公开 API**。用户需要 BQM、CQM、离散模型、变量、约束、sampler 与 SampleSet 时，由 Agent 在固定依赖环境中编写和运行任务代码，不限于下文便捷 Tool 的预设模型。

使用 `node scripts/sdk-access.mjs inspect ocean-optimization` 定位环境，按[完整 SDK 工作流](../quantum-sdk-workbench/references/workflow.md)执行。模块导航：`dimod`、`dwave.samplers`、`dwave.system`、`dwave.cloud`、`dwave.optimization`；导航不是 API 白名单。

完整 Ocean 元包已进入依赖锁；本地模型、采样器与云客户端共享原生 API。连接 Leap、提交收费或 QPU 作业仍需用户授权与凭据。

下文关于模型、门集、输入与预算的限制描述便捷 Tool 的合同；原生 SDK 另受上游版本、可选依赖、宿主资源与用户授权约束。已禁用或被拒绝的动作不能借代码路径绕过。执行状态和科研验收分别报告。
<!-- END NATIVE SDK ACCESS -->


Agent 经 Harness 调用 `ocean_local` 提供的 `sample_ocean_model`。本 Skill 负责模型选择和结果解释，Tool 在独立 Python 环境执行真实上游 SDK。

输入 `linear[i]`、`quadratic=[{i,j,bias}]` 与 `offset`；双变量项禁止重复或 i=j。能量为 `offset + sum(linear[i]*v_i) + sum(bias*v_i*v_j)`。

`vartype=BINARY` 使用 0/1，`SPIN` 使用 -1/+1；两者按 `s=2*x-1` 转换。输出 `binaryModel` 和 `spinModel` 均包含完整 offset，不可在比较能量时丢弃常数项。

`method=exact` 使用 dimod.ExactSolver，穷举 2^N 配置。`method=simulated_annealing` 使用 dwave.samplers.SimulatedAnnealingSampler；调用方选择 `numReads`、`numSweeps` 和 32 位有符号非负 `seed`。这些参数仅影响模拟退火，结果按样本聚合；`numOccurrences` 总和等于 numReads。

两种方法均是本地经典 CPU 计算。模拟退火找到的 `minimumEnergyFound` 不是最优性证书，`exhaustive=false` 时不得宣称全局最优。本接入没有 Leap、云混合求解器或量子退火硬件。

计算规模由调用方选择，后端数值表示限制仍适用。资源限制用 `execution` 设置，与模型参数分开。先运行 `node scripts/setup-paper-tools.mjs ocean-optimization` 显式准备固定依赖；计算调用不安装依赖或联网，数值库可能写本地缓存。

固定上游版本：dimod 0.12.22 + dwave-samplers 1.8.0；来源与许可见[上游仓库](https://github.com/dwavesystems/dimod)（Apache-2.0）。本地数值和协议检查属于开发证据；当前 L1，`scientificValidation=not_evaluated`，成功执行不等于最终科学 Acceptance。
