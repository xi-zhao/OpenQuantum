---
name: symmer-tapering
description: 用固定 Symmer 将实 Pauli Hamiltonian 投影到显式指定的对称性扇区，降比特，可选同一扇区的独立完整能谱比较。
---

# Symmer 对称性降比特

<!-- BEGIN NATIVE SDK ACCESS -->
## 原生 SDK 路径

本能力同时支持 **Symmer 的原生公开 API**。用户需要 PauliwordOp、投影、对称性、tapering 与子空间方法 时，由 Agent 在固定依赖环境中编写和运行任务代码，不限于下文便捷 Tool 的预设模型。

使用 `node scripts/sdk-access.mjs inspect symmer-tapering` 定位环境，按[完整 SDK 工作流](../quantum-sdk-workbench/references/workflow.md)执行。模块导航：`symmer`；导航不是 API 白名单。

下文关于模型、门集、输入与预算的限制描述便捷 Tool 的合同；原生 SDK 另受上游版本、可选依赖、宿主资源与用户授权约束。已禁用或被拒绝的动作不能借代码路径绕过。执行状态和科研验收分别报告。
<!-- END NATIVE SDK ACCESS -->


用户已有 Hamiltonian 和要研究的对称性扇区时，调用 Harness 注册的 `symmer_local.taper_symmer_hamiltonian`。本能力使用 Symmer 的 S3Projection 稳定子投影原语；不自动选择基态扇区。

- `terms` 用 `{pauli, coefficient}` 表示 实 Pauli Hamiltonian；量子位数和项数由输入决定。字符串从左到右为 q0、q1……；重复项先合并。
- `symmetries` 用 `{pauli, sector}` 指定正号 Pauli 算符及其 ±1 本征值。至少一个生成元，允许全部量子位投影为标量（reducedQubits=0，Pauli 字符串为空）；生成元必须两两对易、GF(2) 独立，并与每个非零 Hamiltonian 项对易。
- 如果用户未指定扇区，先说明对称性选择并取得具体输入，不能将 Tool 的示例默认扇区当成用户模型的全局基态扇区。必要时分别运行多个允许扇区比较最低能量。
- 返回 reducedTerms 和 sectorDimension，可选 reducedSpectrum 和 referenceSectorSpectrum。独立参考取投影算符 range 内的正交基，在该子空间对 Hamiltonian 对角化；不能把全维 PHP 的零本征值混入扇区能谱。
- 降维 Pauli 轴是 Symmer 变换后的坐标，不能直接视作删去某些物理量子位。保谱仅限指定扇区，最低值不自动等于全系统基态。
- 不开放 contextual-subspace VQE、自动对称性发现或多项式加速主张。当前 L3（DSH 侧支持物化证据与可回放中央验收；Codex 侧保留 `scientificValidation=observations_available` 独立观察）；依赖须显式准备；计算可能写本地缓存。

版本与验证见[接入说明](../../../docs/integrations/UNITARY_NEXT_TOOLS.md)。

独立参考使用 `referenceMode=auto|required|skip`：auto 按默认阈值选择参考，required 使用调用方资源尝试所请求规模，skip 跳过。未执行时 `reference.status=not_run`，参考值和差异为 null；尝试后失败会返回错误。

Hamiltonian 量子位数、Pauli 项数及独立对称性由调用方选择，适配器不额外设置人工规模上限。具体资源配置见[本地计算说明](../../../docs/integrations/SCALABLE_BRIDGES.md)。

## 依赖准备

运行前执行 `node scripts/setup-paper-tools.mjs symmer-tapering`。缺失、旧锁和已安装环境的处理见[共同准备说明](../../../docs/integrations/LOCAL_ENVIRONMENTS.md)；Tool 不自动安装或升级依赖。

## 独立科学观察与可回放科学验收（L3）

执行期独立验证器只产 observations，不自行推导科学验收；`provenance.complete=not_checked`，`reproductionProfiles: []`。独立辛 GF(2) 检查生成元对易、秩、Hamiltonian 对易和 n−k 降比特结构；≤6 qubits、≤256 项且启用参考时，用单独 NumPy 程序构造目标扇区投影，逐一对比完整能谱。超出参考范围或缺环境时相应观察为 not_checked，不限制主 Tool 的计算规模。

DSH 完整调用含 `workspace-write`：宿主 Materializer 经 `ctx.fs` 原子写入并重读输入与结果字节，并在 `full` 沙箱约束下运行独立扇区能谱参考；中央 Builder 按 `symmer-sector-spectrum-audit@1.0.0` 派生科学验收并保存可读报告。缺少独立能谱对照、超出稠密规模或沙箱不可用时保留 `conditional`，任何独立检查发现矛盾则 `failed`。Codex 继续只提供执行期 observations。
