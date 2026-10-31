---
name: slowquant-response
description: 使用 SlowQuant 的酉波函数和量子线性响应，研究分子激发能、跃迁性质与吸收谱。
---

# SlowQuant 分子响应与谱学

<!-- BEGIN NATIVE SDK ACCESS -->
## 原生 SDK 路径

本能力使用 **SlowQuant 的原生公开 API**。用户需要 自定义分子、活性空间、酉波函数与量子线性响应，计算激发能、跃迁性质和吸收谱 时，由 Agent 在固定依赖环境中编写和运行任务代码。

使用 `node scripts/sdk-access.mjs inspect slowquant-response` 定位环境，按[完整 SDK 工作流](../quantum-sdk-workbench/references/workflow.md)执行。模块导航：`slowquant.SlowQuant`、`slowquant.unitary_coupled_cluster.ucc_wavefunction`、`slowquant.unitary_coupled_cluster.ups_wavefunction`、`slowquant.unitary_coupled_cluster.linear_response`、`slowquant.qiskit_interface.interface`；导航不是 API 白名单。

固定完整源码，经显式准备与摘要校验后使用；不通过 pip 安装同名包。

不同响应形式、轨道与活性空间近似须分别解释；数值回归不代表最终科学验收。

Qiskit 入口与真实硬件验证分开报告；云端任务需另行授权。

原生程序导入库前，按环境定位器的 `bootstrap` 执行启动兼容处理：校验固定完整源码后加入模块搜索路径；保留全部上游公开 API，不替换响应方程或数值算法。这不限制公开 API，也不替换数值算法。

本入口复用宿主文件与代码工具，没有新增通用执行 Tool。原生 SDK 受上游版本、可选依赖、宿主资源与用户授权约束。已禁用或被拒绝的动作不能借代码路径绕过。执行状态和科研验收分别报告。
<!-- END NATIVE SDK ACCESS -->


适用于用户需要比较活性空间、轨道优化、UCC/UPS 波函数及不同 qLR 形式对分子谱学结果的影响。
用户可自定义分子/基组、电子与自旋、积分来源、活性空间、ansatz、激发阶数、优化方法及输出；
规模由所选方法、后端、内存和用户预算决定。例子的 H₂ 与两种响应形式只是核验样本。
普通 HF/积分或已有 VQE/VQD/SQD 任务优先复用相应能力，不因为库可用而替换用户的方法。

## 准备与使用

1. 先运行 `node scripts/sdk-access.mjs inspect slowquant-response`，读取目录、完整源码 SHA、锁与准备状态。
   经授权后显式运行 `node scripts/setup-sdk.mjs slowquant-response`，准备隔离依赖及固定源码。
   不运行 `pip install slowquant`，不自动升级上游或修改既有环境。
2. 在用户工作区保存程序，使用 `inspect` 给出的解释器和 `-B`，先调用返回的 `bootstrap.prepare_sdk`。
   设置 `NUMBA_CACHE_DIR` 到任务缓存目录，保留源码树的摘要；源码被修改或缺失时先报告，不能绕过校验。
   改写后的上游源码属于另行记录的研究环境，不再作为本固定快照的通过证据。
3. 从上游公开类构造 `WaveFunctionUCC`/`WaveFunctionUPS` 与所选 `LinearResponse`，调用激发能、
   跃迁偶极和振子强度接口。源码完整可查，模块导航不是函数白名单；可选硬件和云操作仍需单独授权。
4. [可编辑示例](references/native-example.py)演示 PySCF 积分、UCCSD 与 naive/projected 响应，接受
   `--atom`、`--basis`、`--active-electrons`、`--active-orbitals`、`--excitations`、`--method` 等参数。
   在干净结果目录运行；复制示例到其他位置时设置 `OPENQUANTUM_ROOT` 为插件/仓库目录。
5. 保存完整输入、固定来源/依赖版本、stdout/stderr、收敛与响应诊断、结果文件及独立参考。
   执行不会隐式安装依赖，Skill 不启动进程或持有凭据；实际执行由宿主代码 Tool 完成。

## 方法选择与解释

- 区分 naive、projected、self-consistent、state-transfer 等响应形式，记录是否包含轨道响应、
  冻结轨道、活性空间和激发截断。不同近似方法不能统一解释为精确多体谱。
- 记录几何单位、电子数/自旋、轨道与积分约定、基态优化方法/容差、激发阶数和响应形式。
  基态未收敛或响应矩阵不稳定时保留失败；不得换模型、排序或放宽容差制造一致性。
- 保留 Hessian/metric、范数、广义本征残差、虚部与上游警告。上游会对部分本征量取实部，
  返回实数或正常退出本身不证明稳定性。简并态按对应子空间或合并强度比较。
- 振子强度需核对跃迁偶极、单位、规范与态选择。数值参考使用独立解析结果、FCI 或可追溯样例；
  不能再次调用同一 SlowQuant 方法充当独立答案，也不要求截断响应在所有模型上等于 FCI。
- 区分 state-vector、本地 shot 模拟和真实硬件。噪声、误差缓解、后选择与测量缓存各有假设。
  Qiskit 源码路径可访问，但只按实际执行证据描述支持程度，不把导入或本地计算推广成硬件验收。

## 验证与来源

本能力为 L0 原生 SDK/Skill 路径，不增加 Tool、MCP Server、Validator 或 Acceptance Profile。
工程与数值检查见[接入记录](../../../docs/integrations/SLOWQUANT.md)；最终科学验收仍为
`scientificValidation=not_evaluated`。DSH/Codex 共享能力定义与指南，准备状态及资源由各宿主隔离管理。

上游固定为 [SlowQuant b0d12b2](https://github.com/erikkjellgren/SlowQuant/tree/b0d12b2e7e680141e50f3de0c9ba029d9574bbca)，
许可证 [BSD-3-Clause](https://github.com/erikkjellgren/SlowQuant/blob/b0d12b2e7e680141e50f3de0c9ba029d9574bbca/LICENSE)。
保留上游版权、许可与免责声明；依赖许可证另按固定环境核查。
[方法论文](https://arxiv.org/abs/2312.13937)给出多种 qLR 形式的研究背景，不是本集成的验收凭证。
