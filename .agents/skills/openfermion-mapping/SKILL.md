---
name: openfermion-mapping
description: 用 Google OpenFermion 将有序费米产生湮灭算符乘积映射成 Jordan-Wigner 或 Bravyi-Kitaev Pauli 展开。
---

# OpenFermion 算符映射

Agent 经 Harness 调用 `openfermion_local` 提供的 `map_openfermion_operator`。用途是二次量子化算符到量子位算符的表示转换；已有化学求解能力不由本 Skill 替代。

输入 `numModes`、`mapping` 和 `terms`。每个 term 包含复系数 `coefficient: {real, imag}` 与有序 `operators: [{mode, action}]`，action 是 `create` 或 `annihilate`。乘积按给定顺序书写，最右算符先作用在 ket 上。空 operators 表示常数项；重复项由上游合并。

`mapping` 选择 `jordan_wigner` 或 `bravyi_kitaev`。输出每条 Pauli 字符串最左边表示 qubit 0。Jordan-Wigner 使用占据编码；Bravyi-Kitaev 使用奇偶校验变换后的编码，不能直接用未经基底变换的矩阵元素逐项比较两个表示。

返回 Pauli 项、系数 L1 范数及 `hermiticityResidualL1`（A-A† 的 Pauli 系数 L1 范数）。`hermitian` 仅在返回的浮点系数残差恰为 0 时为 true，不借助隐含容差给出科学验收。允许非 Hermitian 输入，便于产生、湮灭及响应算符处理。

工具不求电子结构、分子积分或能谱，不创建稠密矩阵，也不查询 PubChem 等数据库。固定 [OpenFermion 1.8.1](https://github.com/quantumlib/OpenFermion)（Apache-2.0）。

先运行 `node scripts/setup-paper-tools.mjs openfermion-mapping` 显式准备固定依赖。计算 Tool 不安装依赖、不连接外部服务；SDK 可能写本地缓存，因此最大副作用登记为 workspace-write。部署时间、输出大小与线程设置使用 `execution`，与方法规模分开。

当前为 L1，`scientificValidation=not_evaluated`。本地数值、协议与 Harness 测试是开发证据；执行成功不等于 central Acceptance Builder 已推导科学验收。
