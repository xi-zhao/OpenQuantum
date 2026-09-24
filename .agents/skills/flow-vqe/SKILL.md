---
name: flow-vqe
description: 调用论文的 flow 训练算法，对 Pauli Hamiltonian 学习低能量参数。
---

# Flow-VQE 参数学习

Agent 经 Harness 调用 flow_vqe_local 提供的 `train_flow_vqe`。本 Skill 负责选择和解释，不启动计算进程。

至少 2 个量子位；Pauli 最左字符是 q0，系数为同一能量单位。主计算以无矩阵 RY/CNOT 实振幅 ansatz 训练 flow 参数，返回重算能量及等评估预算的均匀随机搜索基线。量子位、Pauli 项、层数和训练次数由输入决定。当前处理单个 Hamiltonian，不推导跨分子泛化或全局最优。

独立参考使用 `referenceMode=auto|required|skip`：auto 按默认阈值选择参考，required 使用调用方资源尝试所请求规模，skip 跳过。未执行时 `reference.status=not_run`，参考值和差异为 null；尝试后失败会返回错误。

输入示例：

```json
{
  "numQubits": 2,
  "terms": [
    {
      "pauli": "ZI",
      "coefficient": -1
    },
    {
      "pauli": "IX",
      "coefficient": -0.5
    }
  ],
  "epochs": 8,
  "batchSize": 8
}
```

调用前确认用户问题落在上述范围内；参数含糊且会改变物理结果时先澄清。接口不接受代码、路径、凭据或真实硬件任务。
计算 worker 默认不设置时间或输出大小上限；部署可配置资源预算，取消会终止本次计算进程组。连接层超时与硬件环境配置见[资源配置](../../../docs/integrations/SCALABLE_BRIDGES.md)。
计算前显式准备固定依赖；运行仍可能写 SDK 缓存，因此保留 workspace-write。工具未注册或连接已禁用时，检查设置中心；不要用通用执行工具绕过禁用。
依赖尚未准备时按仓库文档运行 `npm run capability:paper-tools:setup`；不要自行改版本或扩大输入边界来绕过失败。

所有结果保留完整输入、输入摘要、上游版本和依赖锁摘要。报告实际数值、物理假设、误差与限制；
`scientificValidation=not_evaluated`，比较数据不构成中央科学验收。失败时说明真实原因，不补造数据。

来源与接入范围见 [论文能力说明](../../../docs/integrations/PAPER_BACKED_TOOLS.md)。

## 依赖准备

运行前执行 `node scripts/setup-paper-tools.mjs flow-vqe`。缺失、旧锁和已安装环境的处理见[共同准备说明](../../../docs/integrations/LOCAL_ENVIRONMENTS.md)；Tool 不自动安装或升级依赖。
