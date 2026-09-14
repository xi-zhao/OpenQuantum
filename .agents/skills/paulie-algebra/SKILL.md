---
name: paulie-algebra
description: 用固定 PauLie 分析 Pauli 生成元的动力学 Lie 代数、闭包与维数，并用独立稠密矩阵对易闭包校核。
---

# PauLie 量子电路代数

当用户需要研究 Pauli 门生成元的代数闭包、对易结构或理想独立控制下的 su(2^n) 生成条件时，调用 Harness 注册的 `paulie_local.analyze_paulie_algebra`。

- `generators` 为 1–4 量子位、最多 16 个不同且非恒等的 I/X/Y/Z 字符串。每个字符串必须恰好含 numQubits 个字符；不接受 Pauli 项之和或系数绑定的 Hamiltonian。
- 明确假设每个 iP 都有独立实控制系数。计算的是实 Lie 线性空间维数，不是 Pauli 二进制生成秩；例如 XI、IX、XX 两两对易，实线性维数为 3。
- Tool 使用 PauLie 的对易和 Pauli 乘积操作生成闭包，核对上游分类维数，再与独立反厄米矩阵对易闭包的维数及 span 比较；不一致时失败。
- classification 保留上游同构命名，如 so(3) 与 su(2)、so(6) 与 su(4)。当前独立验证的是表示空间与维数，不是完整抽象代数分类证明。
- `generatesFullSpecialUnitary` 只对应上述独立理想控制假设，不自动证明有限深 ansatz 的表达能力、可训练性、脉冲可达性或真实硬件可控性。
- 当前 L1，`scientificValidation=not_evaluated`；首次调用可安装锁定依赖并写本地缓存。版本和案例见[接入说明](../../../docs/integrations/UNITARY_NEXT_TOOLS.md)。
