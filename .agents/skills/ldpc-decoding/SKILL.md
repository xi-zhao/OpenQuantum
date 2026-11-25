---
name: ldpc-decoding
description: 二元校验矩阵的 BP+LSD 解码，独立复核 syndrome 一致性。
---

# LSD 纠错解码

<!-- BEGIN NATIVE SDK ACCESS -->
## 原生 SDK 路径

本能力同时支持 **LDPC 的原生公开 API**。用户需要 自定义校验矩阵、错误模型、BP/OSD/LSD 译码器与批处理 时，由 Agent 在固定依赖环境中编写和运行任务代码，不限于下文便捷 Tool 的预设模型。

使用 `node scripts/sdk-access.mjs inspect ldpc-decoding` 定位环境，按[完整 SDK 工作流](../quantum-sdk-workbench/references/workflow.md)执行。模块导航：`ldpc`；导航不是 API 白名单。

下文关于模型、门集、输入与预算的限制描述便捷 Tool 的合同；原生 SDK 另受上游版本、可选依赖、宿主资源与用户授权约束。已禁用或被拒绝的动作不能借代码路径绕过。执行状态和科研验收分别报告。
<!-- END NATIVE SDK ACCESS -->


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
`scientificValidation=observations_available`，比较数据不构成中央科学验收。失败时说明真实原因，不补造数据。

来源与接入范围见 [论文能力说明](../../../docs/integrations/PAPER_BACKED_TOOLS.md)。

## 依赖准备

运行前执行 `node scripts/setup-paper-tools.mjs ldpc-decoding`。缺失、旧锁和已安装环境的处理见[共同准备说明](../../../docs/integrations/LOCAL_ENVIRONMENTS.md)；Tool 不自动安装或升级依赖。

## L2 独立数值 observations

独立 JS Validator 检查 H 与 syndrome 的二元合法性和维度，逐样本重算 `H e_hat mod 2`、
残余 syndrome、Hamming 权重、BP 收敛标记的一致性及全部计数/比率。独立 Python 脚本只读原始请求，
不导入 Tool bridge，以固定 `product_sum`、`serial`、`lsd_cs` 选项重放 BP+LSD。
BP 不收敛仍可由 LSD 得到满足校验的修正；两种状态分别报告。零 syndrome 直接给零修正、收敛与零迭代，
防止前一个样本留下的上游标记污染统计。

可选 `trueErrors` 每行与输入 syndrome 对应，`logicalObservables` 为 n 列二元奇偶向量（提供后必须同时给 trueErrors）。
只有这些输入齐全才计算 `L*(e_hat+e_true) mod 2` 的逻辑奇偶翻转率；不验证所给向量是否构成某量子码的逻辑算符。
没有这些输入时逻辑比率为 null、检查为 `not_checked`。syndrome 匹配率与真实错误完全恢复率也分别报告。

`acceptanceProfiles: []`、`reproductionProfiles: []`；`provenance.complete=not_checked`，不派生科学 Acceptance。
固定案例和复跑入口见 [eval 说明](evals/README.md)；上游属性语义见
[BP+LSD 文档](https://software.roffe.eu/ldpc/ldpc/bplsd_decoder.html)。

## 可回放科学验收

执行期只生成独立 observations，`provenance.complete=not_checked`。DSH 完整调用含 workspace-write：宿主 Materializer 经 ctx.fs 原子写入并重读证据，中央 Builder 按 `ldpc-syndrome-replay-audit@1.0.0` 派生验收并保存可读报告。仅核对给定 H 的逐样本校验与固定 serial BP+LSD 重放，不证明量子码距或硬件容错阈值。 缺少穷举或独立重放保留 conditional，独立检查发现错误则 failed。Codex 继续只提供执行期 observations。
