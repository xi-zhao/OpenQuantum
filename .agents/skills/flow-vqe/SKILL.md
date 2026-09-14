---
name: flow-vqe
description: 调用论文的 flow 训练算法，对 Pauli Hamiltonian 学习低能量参数。
---

# Flow-VQE 参数学习

Agent 经 Harness 调用 flow_vqe_local 提供的 `train_flow_vqe`。本 Skill 负责选择和解释，不启动计算进程。

调用固定上游的 flow 训练函数，使用无矩阵 RY/CNOT 实振幅 ansatz，为 Pauli Hamiltonian 学习低能量参数，并比较等评估次数的均匀随机搜索。Pauli 最左字符是 q0，系数采用同一能量单位。系统规模、层数、项数和训练次数由用户指定；状态向量使用 uint64 位索引并遵守 NumPy 数组可表示范围。实振幅 ansatz 不一定表达任意 Hamiltonian 的基态；这是单 Hamiltonian 训练，不包含论文数据集、预训练权重或跨分子泛化。

referenceMode 默认 auto，自动为适合直接比较的算例运行精确参考；required 显式运行参考，skip 跳过。未运行时 reference.status=not_run，参考值和差异为 null。默认参考选择范围不限制功能或主计算规模。

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
execution 指定工作进程 timeoutMs、maxOutputBytes 与 threads；默认 180000 ms、2 MiB、1 线程。timeoutMs=0 关闭工作进程定时器。Harness MCP 连接的请求超时在设置中心单独配置；长任务需相应调整。每个连接一次运行一个动作，取消会结束计算进程组。
首次使用可能准备固定依赖或缓存，因此最大副作用为 workspace-write。工具未注册或连接已禁用时，检查设置中心；不要用通用执行工具绕过禁用。
依赖尚未准备时按仓库文档运行 `npm run capability:paper-tools:setup`；保持固定依赖版本，依据返回错误调整输入或执行配置。

所有结果保留完整输入、输入摘要、上游版本和依赖锁摘要。报告实际数值、物理假设、误差与限制；
`scientificValidation=not_evaluated`，比较数据不构成中央科学验收。失败时说明真实原因，不补造数据。

执行配置见[计算工具使用说明](../../../docs/integrations/SCALABLE_BRIDGES.md)。来源与接入范围见 [论文能力说明](../../../docs/integrations/PAPER_BACKED_TOOLS.md)。
