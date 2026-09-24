---
name: pyzx-optimization
description: 用固定 PyZX 对 Clifford+T 电路做 ZX 重写和电路提取，比较门数，并可选独立核对完整酉矩阵等价性。
---

# PyZX 电路优化

当用户需要减少 Clifford+T 电路的门开销、研究 ZX 重写或比较等价实现时，调用 Harness 注册的 `pyzx_local.optimize_pyzx_circuit`。

- 提交 `numQubits` 和结构化 `gates`：支持 H、S、T、X、Y、Z、CX、CZ，量子位数与门数由输入决定。CX 的 targets 为控制位、目标位；不接受动态电路、测量或任意 QASM 输入。
- 先明确比较目标是 T-count、双量子位门数还是总门数；三项可能此消彼长。报告 before/after 的实际值，不承诺每项都会改善。
- Tool 返回输入和优化后的 OpenQASM 2，可按 referenceMode 独立构造完整酉矩阵，忽略整体相位比较。提取保留量子位排列；实际执行参考且发现不等价时，调用失败。
- Y 在输入 QASM 中展开为 X 后接 Z，整体相位不影响此处合同；before 统计的是展开后的 PyZX 电路。QASM 可继续交给已有 QCEC 工具检查；本能力不做硬件映射。
- 当前 L1，`scientificValidation=not_evaluated`；依赖须显式准备；计算可能写本地缓存。

版本、准备命令、数值检查和限制见[接入说明](../../../docs/integrations/UNITARY_NEXT_TOOLS.md)。

独立参考使用 `referenceMode=auto|required|skip`：auto 按默认阈值选择参考，required 使用调用方资源尝试所请求规模，skip 跳过。未执行时 `reference.status=not_run`，参考值和差异为 null；尝试后失败会返回错误。

电路量子位数和门数由调用方选择，适配器不额外设置人工规模上限。具体资源配置见[本地计算说明](../../../docs/integrations/SCALABLE_BRIDGES.md)。

## 依赖准备

运行前执行 `node scripts/setup-paper-tools.mjs pyzx-optimization`。缺失、旧锁和已安装环境的处理见[共同准备说明](../../../docs/integrations/LOCAL_ENVIRONMENTS.md)；Tool 不自动安装或升级依赖。
