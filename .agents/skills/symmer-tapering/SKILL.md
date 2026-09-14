---
name: symmer-tapering
description: 用固定 Symmer 将实 Pauli Hamiltonian 投影到显式指定的对称性扇区，降比特，可选同一扇区的独立完整能谱比较。
---

# Symmer 对称性降比特

用户已有 Hamiltonian 和要研究的对称性扇区时，调用 Harness 注册的 `symmer_local.taper_symmer_hamiltonian`。本能力使用 Symmer 的 S3Projection 稳定子投影原语；不自动选择基态扇区。

- `terms` 用 `{pauli, coefficient}` 表示 实 Pauli Hamiltonian；量子位数和项数由输入决定。字符串从左到右为 q0、q1……；重复项先合并。
- `symmetries` 用 `{pauli, sector}` 指定正号 Pauli 算符及其 ±1 本征值。至少一个生成元，允许全部量子位投影为标量（reducedQubits=0，Pauli 字符串为空）；生成元必须两两对易、GF(2) 独立，并与每个非零 Hamiltonian 项对易。
- 如果用户未指定扇区，先说明对称性选择并取得具体输入，不能将 Tool 的示例默认扇区当成用户模型的全局基态扇区。必要时分别运行多个允许扇区比较最低能量。
- 返回 reducedTerms 和 sectorDimension，可选 reducedSpectrum 和 referenceSectorSpectrum。独立参考取投影算符 range 内的正交基，在该子空间对 Hamiltonian 对角化；不能把全维 PHP 的零本征值混入扇区能谱。
- 降维 Pauli 轴是 Symmer 变换后的坐标，不能直接视作删去某些物理量子位。保谱仅限指定扇区，最低值不自动等于全系统基态。
- 不开放 contextual-subspace VQE、自动对称性发现或多项式加速主张。当前 L1，`scientificValidation=not_evaluated`；首次调用可安装固定依赖并写本地缓存。

版本与验证见[接入说明](../../../docs/integrations/UNITARY_NEXT_TOOLS.md)。

独立参考使用 `referenceMode=auto|required|skip`：auto 按默认阈值选择参考，required 使用调用方资源尝试所请求规模，skip 跳过。未执行时 `reference.status=not_run`，参考值和差异为 null；尝试后失败会返回错误。

Hamiltonian 量子位数、Pauli 项数及独立对称性由调用方选择，适配器不额外设置人工规模上限。具体资源配置见[本地计算说明](../../../docs/integrations/SCALABLE_BRIDGES.md)。
