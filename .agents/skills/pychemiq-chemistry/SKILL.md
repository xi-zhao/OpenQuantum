---
name: pychemiq-chemistry
description: 用本源 pyChemiQ 把结构化费米产生湮灭算符经 Jordan-Wigner 变换映射为复系数 Pauli 算符。
---

# pyChemiQ 费米算符映射

Agent 经 Harness 调用 `pychemiq_local` 的 `map_pychemiq_fermions`，为电子结构模型映射和反对易关系核对提供 pyChemiQ 后端。

输入 `numModes` 和 `terms`。每项包含复 `coefficient={real,imaginary}`，以及有序 `operators` 列表，其中每个元素为 `{mode,action}`，`action` 是 `create` 或 `annihilate`。列表表示从左到右的算符乘积，**最右算符最先作用**；空列表表示恒等项。模式从 0 编号，未使用的模式保留为恒等 Pauli 因子。

输出 Jordan-Wigner 映射后的复系数 Pauli 项，最左字符代表 mode/qubit 0；重复项用稳定求和相加，只删除精确零项。为避免 SDK 默认 `1e-6` 截断，适配先由真实 SDK 映射单位产生/湮灭算符，再用 SDK 的零阈值 Pauli 运算逐步合成，最后乘原始复系数；长乘积每步合并重复项。非零系数低于浮点表示范围或聚合溢出时明确失败，不返回假的零算符。该动作不要求输入厄米或守粒子数，不会替用户自动加厄米共轭。分析分子 Hamiltonian 时应在输入中明确包含全部所需项。

这是 pyChemiQ 的算符变换切片，不包括分子积分计算、活性空间选择、VQE、核坐标优化、云端或硬件。固定 [pyChemiQ 1.1.4](https://github.com/OriginQ/pyChemiQ)（上游包元数据标示 Apache），Python 3.10。该版本仅发布指定平台与 Python ABI 的原生 wheel；其他平台需等待上游支持，不能用替代算法冒充 SDK。

先显式运行 `node scripts/setup-paper-tools.mjs pychemiq-chemistry`。计算不安装依赖、不使用凭据、不访问服务；SDK 可能写本地缓存，最大副作用是 workspace-write。输入规模由调用方选择，部署资源设置用 `execution`。

当前 L1，`scientificValidation=not_evaluated`。独立占据数基矩阵、协议和 Harness 测试属于开发证据，不代表中央科学验收通过。
