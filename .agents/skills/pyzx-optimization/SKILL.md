---
name: pyzx-optimization
description: 用固定 PyZX 对小规模 Clifford+T 电路做 ZX 重写和电路提取，比较门数并独立核对完整酉矩阵等价性。
---

# PyZX 电路优化

当用户需要减少 Clifford+T 电路的门开销、研究 ZX 重写或比较等价实现时，调用 Harness 注册的 `pyzx_local.optimize_pyzx_circuit`。

- 提交 `numQubits` 和结构化 `gates`：支持 H、S、T、X、Y、Z、CX、CZ，1–6 量子位、最多 64 门。CX 的 targets 为控制位、目标位；不接受动态电路、测量或任意 QASM 输入。
- 先明确比较目标是 T-count、双量子位门数还是总门数；三项可能此消彼长。报告 before/after 的实际值，不承诺每项都会改善。
- Tool 返回输入和优化后的 OpenQASM 2，并独立构造完整酉矩阵，忽略整体相位比较。提取保留量子位排列；不等价时调用失败。
- Y 在输入 QASM 中展开为 X 后接 Z，整体相位不影响此处合同；before 统计的是展开后的 PyZX 电路。QASM 可继续交给已有 QCEC 工具检查；本能力不做硬件映射。
- 该有界接口没有验证上游的大规模优化性能。当前 L1，`scientificValidation=not_evaluated`；首次调用可能安装锁定依赖并写本地缓存。

版本、准备命令、数值检查和限制见[接入说明](../../../docs/integrations/UNITARY_NEXT_TOOLS.md)。
