---
name: ldpc-decoding
description: 二元校验矩阵的 BP+LSD 解码，独立复核 syndrome 一致性。
---

# LSD 纠错解码

Agent 经 Harness 调用 ldpc_local 提供的 `decode_ldpc_syndromes`。本 Skill 负责选择和解释，不启动计算进程。

parityCheck 为 矩形二元矩阵，syndrome 数量由输入决定；每个 syndrome 长度等于校验数。假定独立同概率 bit flip。输出纠正向量、残余 syndrome 和是否满足校验；未给逻辑算符/真实错误，不能报告逻辑成功率或阈值。上游当前使用串行 LSD。

输入示例：

```json
{
  "parityCheck": [
    [
      1,
      1,
      0
    ],
    [
      0,
      1,
      1
    ]
  ],
  "syndromes": [
    [
      1,
      0
    ],
    [
      1,
      1
    ]
  ]
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

运行前执行 `node scripts/setup-paper-tools.mjs ldpc-decoding`。缺失、旧锁和已安装环境的处理见[共同准备说明](../../../docs/integrations/LOCAL_ENVIRONMENTS.md)；Tool 不自动安装或升级依赖。
