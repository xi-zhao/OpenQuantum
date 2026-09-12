---
name: randomized-measurements
description: 由局部 Haar 随机测量估计小系统子区纯度，并与解析值比较。
---

# RandomMeas 随机测量

Agent 经 Harness 调用 random_meas_local 提供的 `estimate_randomized_purity`。本 Skill 负责选择和解释，不启动计算进程。

2–6 qubits 的 product/GHZ 合成态；subsystem 从 0 编号，最多 4 sites。settings×shotsPerSetting≤16384。偏差校正后的有限样本估计可超出 [0,1]，不能截断。settingStandardError 来自独立随机设置，不是严格置信界；首版未导入实验测量数据。需要 Julia 1.12.7 和已准备的依赖。

输入示例：

```json
{
  "numQubits": 3,
  "state": "ghz",
  "subsystem": [
    0
  ],
  "settings": 32,
  "shotsPerSetting": 64
}
```

调用前确认用户问题落在上述范围内；参数含糊且会改变物理结果时先澄清。接口不接受代码、路径、凭据或真实硬件任务。
单次计算上限 180 秒，每个连接一次只运行一个动作；超时/取消会结束整个计算进程组。
首次使用可能准备固定依赖或缓存，因此最大副作用为 workspace-write。工具未注册或连接已禁用时，检查设置中心；不要用通用执行工具绕过禁用。
依赖尚未准备时按仓库文档运行 `npm run capability:paper-tools:setup`；不要自行改版本或扩大输入边界来绕过失败。

所有结果保留完整输入、输入摘要、上游版本和依赖锁摘要。报告实际数值、物理假设、误差与限制；
`scientificValidation=not_evaluated`，比较数据不构成中央科学验收。失败时说明真实原因，不补造数据。

来源与接入范围见 [论文能力说明](../../../docs/integrations/PAPER_BACKED_TOOLS.md)。
