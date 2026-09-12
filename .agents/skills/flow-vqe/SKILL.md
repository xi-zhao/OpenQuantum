---
name: flow-vqe
description: 调用论文的 flow 训练算法，对小量子 Hamiltonian 学习低能量参数。
---

# Flow-VQE 参数学习

Agent 经 Harness 调用 flow_vqe_local 提供的 `train_flow_vqe`。本 Skill 负责选择和解释，不启动计算进程。

2–4 qubits；Pauli 最左字符是 q0，系数为同一能量单位。使用本地 RY/CNOT 实振幅 ansatz；每种方法最多 512 次训练/搜索能量评估。返回 exactGroundEnergy、重算能量和等预算均匀随机基线。首版为单 Hamiltonian，未接论文分子数据、预训练模型或跨分子泛化；不得宣称一定优于随机搜索或全局最优。

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
单次计算上限 180 秒，每个连接一次只运行一个动作；超时/取消会结束整个计算进程组。
首次使用可能准备固定依赖或缓存，因此最大副作用为 workspace-write。工具未注册或连接已禁用时，检查设置中心；不要用通用执行工具绕过禁用。
依赖尚未准备时按仓库文档运行 `npm run capability:paper-tools:setup`；不要自行改版本或扩大输入边界来绕过失败。

所有结果保留完整输入、输入摘要、上游版本和依赖锁摘要。报告实际数值、物理假设、误差与限制；
`scientificValidation=not_evaluated`，比较数据不构成中央科学验收。失败时说明真实原因，不补造数据。

来源与接入范围见 [论文能力说明](../../../docs/integrations/PAPER_BACKED_TOOLS.md)。
