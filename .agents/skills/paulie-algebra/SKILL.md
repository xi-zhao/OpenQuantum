---
name: paulie-algebra
description: 用固定 PauLie 分析 Pauli 生成元的动力学 Lie 代数、闭包与维数，可选显式闭包与独立稠密矩阵对照。
---

# PauLie 量子电路代数

当用户需要研究 Pauli 门生成元的代数闭包、对易结构或理想独立控制下的 su(2^n) 生成条件时，调用 Harness 注册的 `paulie_local.analyze_paulie_algebra`。

- `generators` 为 不同且非恒等的 I/X/Y/Z 字符串。每个字符串必须恰好含 numQubits 个字符；不接受 Pauli 项之和或系数绑定的 Hamiltonian。
- 明确假设每个 iP 都有独立实控制系数。计算的是实 Lie 线性空间维数，不是 Pauli 二进制生成秩；例如 XI、IX、XX 两两对易，实线性维数为 3。
- 主动作先返回上游分类与精确维数；`closureMode=full` 枚举显式 Pauli 闭包，skip 不枚举，auto 仅在维数不超过 4096 时枚举。独立矩阵参考由 referenceMode 单独选择；`spanResidualTarget` 明确残差覆盖 closure 或 generators。超出 JavaScript 精确整数范围的维数返回十进制字符串。
- classification 保留上游同构命名，如 so(3) 与 su(2)、so(6) 与 su(4)。当前独立验证的是表示空间与维数，不是完整抽象代数分类证明。
- `generatesFullSpecialUnitary` 只对应上述独立理想控制假设，不自动证明有限深 ansatz 的表达能力、可训练性、脉冲可达性或真实硬件可控性。
- 当前 L1，`scientificValidation=not_evaluated`；依赖须显式准备；计算可能写本地缓存。版本和案例见[接入说明](../../../docs/integrations/UNITARY_NEXT_TOOLS.md)。

独立参考使用 `referenceMode=auto|required|skip`：auto 按默认阈值选择参考，required 使用调用方资源尝试所请求规模，skip 跳过。未执行时 `reference.status=not_run`，参考值和差异为 null；尝试后失败会返回错误。

量子位数、控制生成元和显式闭包的执行方式由调用方选择，适配器不额外设置人工规模上限。具体资源配置见[本地计算说明](../../../docs/integrations/SCALABLE_BRIDGES.md)。

## 依赖准备

运行前执行 `node scripts/setup-paper-tools.mjs paulie-algebra`。缺失、旧锁和已安装环境的处理见[共同准备说明](../../../docs/integrations/LOCAL_ENVIRONMENTS.md)；Tool 不自动安装或升级依赖。
