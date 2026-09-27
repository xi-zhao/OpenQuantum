---
name: ocean-optimization
description: 用 D-Wave Ocean dimod 构建 QUBO/Ising 模型、转换系数，并用经典精确枚举或模拟退火采样。
---

# Ocean QUBO 与 Ising 本地采样

Agent 经 Harness 调用 `ocean_local` 提供的 `sample_ocean_model`。本 Skill 负责模型选择和结果解释，Tool 在独立 Python 环境执行真实上游 SDK。

输入 `linear[i]`、`quadratic=[{i,j,bias}]` 与 `offset`；双变量项禁止重复或 i=j。能量为 `offset + sum(linear[i]*v_i) + sum(bias*v_i*v_j)`。

`vartype=BINARY` 使用 0/1，`SPIN` 使用 -1/+1；两者按 `s=2*x-1` 转换。输出 `binaryModel` 和 `spinModel` 均包含完整 offset，不可在比较能量时丢弃常数项。

`method=exact` 使用 dimod.ExactSolver，穷举 2^N 配置。`method=simulated_annealing` 使用 dwave.samplers.SimulatedAnnealingSampler；调用方选择 `numReads`、`numSweeps` 和 32 位有符号非负 `seed`。这些参数仅影响模拟退火，结果按样本聚合；`numOccurrences` 总和等于 numReads。

两种方法均是本地经典 CPU 计算。模拟退火找到的 `minimumEnergyFound` 不是最优性证书，`exhaustive=false` 时不得宣称全局最优。本接入没有 Leap、云混合求解器或量子退火硬件。

计算规模由调用方选择，后端数值表示限制仍适用。资源限制用 `execution` 设置，与模型参数分开。先运行 `node scripts/setup-paper-tools.mjs ocean-optimization` 显式准备固定依赖；计算调用不安装依赖或联网，数值库可能写本地缓存。

固定上游版本：dimod 0.12.22 + dwave-samplers 1.8.0；来源与许可见[上游仓库](https://github.com/dwavesystems/dimod)（Apache-2.0）。本地数值和协议检查属于开发证据；当前 L1，`scientificValidation=not_evaluated`，成功执行不等于最终科学 Acceptance。
