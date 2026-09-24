---
name: qcut-knitting
description: 用固定 QCut 执行门切割与期望值重建，解释输入语义、独立数值对照、成本与科学边界。
---

# QCut

确认 unitary 门列表、零起始门索引、Pauli（最左字符是 q0）、采样预算。调用 `knit_qcut_circuit`：automatic 先归一到对称 CZ，explicit 按原始二比特门索引切割且保留操作数顺序。只支持门切割，暂不开放 wire cutting、联合旋转合并或 sampled QPD。

比较未切割期望值；保留有限 shots 下超出 [-1,1] 的重建值。分别报告 gamma² 理论开销、生成电路、实际完成电路与实际 shots，不能把 `shots` 单电路值当总成本。`referenceMode=auto|required|skip` 控制可选指数规模参考。没有参考时明确未检查，不推断量子优势。

资源由用户选择，通过 `execution.timeoutMs`、`maxOutputBytes`、`threads` 控制进程；依赖须显式准备；计算仍可能写 SDK 缓存，保留 workspace-write。不要把执行成功或参考相符写成最终科学验收。安装、来源与示例见 [候选库接入说明](../../../docs/integrations/CANDIDATE_LIBRARIES.md)。

## 依赖准备

运行前执行 `node scripts/setup-paper-tools.mjs qcut-knitting`。缺失、旧锁和已安装环境的处理见[共同准备说明](../../../docs/integrations/LOCAL_ENVIRONMENTS.md)；Tool 不自动安装或升级依赖。
