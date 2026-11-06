# MWPF 超图纠错译码接入提案

- 调研日期：2026-11-06（Asia/Shanghai）；OpenQuantum 基线 main
  `0da563fa87c6592a8923d2eb98eea80f484d2151`。
- 上游：[yuewuo/mwpf](https://github.com/yuewuo/mwpf)；候选发行包
  [mwpf 0.2.18](https://pypi.org/project/mwpf/0.2.18/)。
- 固定源码：[v0.2.18](https://github.com/yuewuo/mwpf/tree/v0.2.18)，完整提交
  `e50f72e2f389950db50bce075163a4e4022c9dcd`；annotated tag 对象
  `ecdd553c0da661d38318eff28052f67ba181f503`。
- 状态：本 PR 分支已实现固定 SDK、Skill、原生示例与本地验证，尚未合入 main。
  README 与在办 #77 的目录改动重叠，按顺序等待同步；在交付条件全部完成前保持 Draft。

## 用户任务与增量价值

目标是让用户提供加权超图、校验约束和 syndrome，求满足奇偶约束的低权重错误配置，并查看
可用的 primal/dual 权重界；也可从 Stim 电路或 detector error model（DEM）编译 Sinter decoder，
预测观测量翻转。用户可修改输入、solver 配置、预算和采样程序，验证小例子不限制完整原生 API 的可调用范围。

MWPF 支持包含三个及以上 detector 的 hyperedge。当前主线已有多种译码路线，但不是同一个接口或方法：

| 已有入口 | 主要范围 | MWPF 的不同价值 |
| --- | --- | --- |
| [qec-memory-experiment](../../../.agents/skills/qec-memory-experiment/SKILL.md) | Stim/PyMatching 的图状匹配与存储实验 | 原生表达多 detector hyperedge，不为套用图匹配而丢弃它 |
| [ldpc-decoding](../../../.agents/skills/ldpc-decoding/SKILL.md) | 校验矩阵上的 BP/OSD/LSD | 增加 primal-dual 超图求解及权重界的分析路径 |
| [chromobius-decoding](../../../.agents/skills/chromobius-decoding/SKILL.md) | 带颜色/基信息的色码近似译码 | 不把通用加权超图任务限定为该色码结构 |
| [tesseract-decoding](../../../.agents/skills/tesseract-decoding/SKILL.md) | 搜索式、预算受限的 DEM 译码 | 增加另一类优化方法和可检查的界，而非替换现有搜索器 |

优先级为中等：增量任务明确，已有 CPU Python wheel 与 Stim/Sinter 接口，可作为可选 SDK 供方法比较。
不改变默认译码器，也不因论文性能或 Stars 宣称其普遍优于现有方案。主线的 117 个 SDK 环境、
197 项 capability 声明和开放/关闭 PR 已去重，尚无 MWPF 接入。

此线索来自用户提供的 11-05 摘要及前轮观察项；本轮补查一手资料，不能称为主题搜索自行发现。
PyPI 0.2.18 于 2026-11-04 21:19 UTC 上传，落在本轮重叠检索窗口。
近期变化主要是发行包、ABI 和平台兼容维护，不是今日新提出的译码算法。GitHub Releases 列表仍停在较旧版本；
0.2.18 的发行依据是 PyPI、tag 和源码版本，不能将未发布 main 当成稳定版。

## 最小接入与维护边界

按[扩展模型](../../architecture/EXTENSION_MODEL.md)及[贡献规则](../../../CONTRIBUTING.md)，
首版采用 L0 Skill `mwpf-decoding`、固定 Python 3.12 SDK 环境和原创可编辑示例，复用现有
`sdk-access` / `setup-sdk`、能力目录和宿主通用代码执行入口。共享实现仅维护一份，DSH/Codex 分别投影。

- 使用 `mwpf[stim]==0.2.18`，在实现时锁定 Stim、Sinter、NumPy、frozendict、frozenlist 及实际传递依赖。
  [发行元数据](https://pypi.org/pypi/mwpf/0.2.18/json)声明 Python >=3.9，Stim/Sinter >=1.14.0；
  先核对当前项目常用的 Stim 1.16.0 与对应 Sinter 组合，不把宽松下限当作已测兼容矩阵。
- 最小公开执行接口直接沿用上游 `SolverInitializer`、`HyperEdge`、`SyndromePattern`、
  `solve` / `subgraph_range` 和 `SinterMWPFDecoder`。Skill 负责选择方法、解释预算/输出与失败边界。
  不增加仅转发参数的 Tool、MCP Server、宿主绑定或通用 Runtime。
- 示例和准备步骤使用同一个 SDK 环境；不另设版本权威、常驻服务或隐式安装。
  下载、解压与环境写入属于显式准备，执行阶段不安装。无需账户、真实 QPU 或付费服务。
- 首版不默认引入 BP 可选 `ldpc` 依赖、rational/fast 变体或 GPU 组件；如用户另用这些原生功能，
  应显式补齐其依赖并说明数值/CPU 条件，不能声称基础环境已覆盖。
- 实现时在同一 PR 更新根 README 的能力、入口和边界，并按现有约定同步数量/其他语言链接；
  本提案阶段不提前修改 README 为“已接入”。实施前重读其他在办 PR：当前 #77 修改 README，
  #75 修改部分 SDK 锁文件，须避免覆盖并发工作。

这个边界把超图求解、DEM 转换和译码复杂度留在上游深模块，OpenQuantum 只维护准备、导航及可复现例子。
另包一层同名执行服务并不能减少调用者需要理解的科学合同，因此不值得增加维护入口。

## 必须保留的失败语义

以下结论来自固定提交的[实际 Sinter 实现](https://github.com/yuewuo/mwpf/blob/e50f72e2f389950db50bce075163a4e4022c9dcd/src/python/mwpf/sinter_decoders.py)，不是运行结果：

1. `SinterMWPFDecoder` 默认 `panic_action=PanicAction.CATCH`。捕获译码异常后实际代码使用
   `random.getrandbits(num_obs)` 返回随机预测；枚举注释中的“全零”描述与实现不一致。
   OpenQuantum 的示例、比较和验证必须显式使用 `mwpf.PanicAction.RAISE`，将失败单独记录并停止该次计算，
   不能把随机替代预测计为有效译码结果。实现阶段须验证该配置确实贯穿编译后的 decoder。
2. [顶层导入](https://github.com/yuewuo/mwpf/blob/e50f72e2f389950db50bce075163a4e4022c9dcd/src/python/mwpf/__init__.py)
   会吞掉可选 Sinter 模块的导入异常。`import mwpf` 不足以证明功能就绪，必须检查所需符号和真实调用。
3. Sinter 包装的 `timeout` 字段没有被其 `config` 属性传给核心；不能据此保证整次任务的时限。
   使用既有宿主进程预算/取消机制，并实际测试终止与失败报告；核心局部预算和总墙钟时间分开记录。
4. Sinter 默认 `cluster_node_limit=50`，达到预算可能退回 Union-Find。显式记录 solver、预算、回退语义、
   primal/dual 值及差距；不能因成功返回就称为精确最优解。
5. heralded erasure 信息不能仅靠 DEM 保全；需要时按上游 `with_circuit(circuit)` 路径传入原始电路。
   首版未测的噪声类型明确标注，不通过隐式 DEM 分解、近似或猜测索引来“修好”输入。

## 科学适用边界

[方法论文](https://arxiv.org/abs/2508.04969)及[问题定义](https://github.com/yuewuo/mwpf/blob/e50f72e2f389950db50bce075163a4e4022c9dcd/tutorial/src/problem-definition.md)
说明该路线求解带奇偶约束的最小权重配置。一般超图问题为 NP-hard，低噪声实例的平均表现不保证最坏耗时或实时运行。

- 独立 Bernoulli 错误的常用权重是 `log((1-p)/p)`；示例须说明概率与独立性假设，
  使用非负权重时限定 `p <= 0.5`。相关物理噪声不能未经论证直接换成独立超边模型。
- 最可能错误配置与最可能逻辑 coset 不等价，退化性会影响逻辑错误率。可行 syndrome 解和低权重
  不是完整容错证明，也不自动给出最优逻辑译码。
- 普通 `mwpf` wheel 使用 float64 和 `loose_sanity_check`；浮点上下界相近不是形式化精确证明。
  独立小例子核对代数、可行性和目标值，数值容差应按所选精确输入说明，不新建通用科学验收阈值。
- 不复述论文性能为 OpenQuantum 实测结果，不宣称阈值、码距增益、实时性或硬件容错已验证。
  本接入不改变 Validator、Acceptance Profile 或 central Acceptance Builder；工程检查与科学验收分别记录。

## 实施验收条件

| 检查入口 | 可验证内容 | 明确不能推出的结论 |
| --- | --- | --- |
| 隔离 SDK 准备及真实原生调用 | 固定 wheel/锁文件可用、所需 Sinter 符号存在、环境不隐式下载 | 全平台安装、所有可选 solver 均可用 |
| 原生加权超图 API + 独立穷举 | syndrome 奇偶约束、解权重、上下界及预算语义 | 大码最优性、阈值或论文性能 |
| Sinter 编译/bit-packed 调用 + 独立小 DEM | detector 与 observable 位序、维度、错误传播和异常处理 | 任意电路/噪声模型适用 |
| 既有清单、Skill/宿主投影及 README 检查 | 接入发现/准备/使用说明一致，实际支持范围正确 | 两宿主已具相同科学验收与回放能力 |

具体实现顺序与最低证据：

1. 在隔离环境固定依赖和上游来源；从原生 solver、Sinter 编译及批量译码各执行真实调用。
   核对 macOS arm64、Linux x86_64、Windows x86_64 的发行物及可用测试证据；未实测的平台保留未验证状态。
2. 使用四顶点、五超边的小例子：按零起始顺序 `([0,1],100)`、`([1,2],100)`、`([2,3],100)`、
   `([0],100)`、`([0,1,2],60)`。独立枚举全部 `2^5` 个子集，覆盖全部 16 种 syndrome，
   与 solver 的可行性、目标值及界比较，允许同权解和返回顺序不同。
   对 syndrome `[0,1,3]`，由边 2 与 4 得到的独立参考权重为 160。
   上游 README 此例输出的索引有不一致，不照抄预期值，也不以同一 solver 自算参考答案。
3. 构造含三-detector hyperedge、至少两个 observable 位的小 DEM，用独立枚举明确错误配置与观测量映射。
   保留输入、固定样本/种子和中间结果，验证 little-endian bit-packed 输入输出；与其他解码器比较时用同一批样本，
   不悄悄把超图换成图。API fixture 仅用于回归，不标为完整存储实验。
4. 验证零 syndrome、solver 重用、非法索引/不支持输入与不可满足 syndrome。
   不可满足例可用两顶点、仅边 `[0,1]`、syndrome `[0]`；在有进程预算的环境中确认显式失败，
   不接受随机预测、假成功或无界等待。按项目现有入口检查预算耗尽/取消后仍保留真实失败记录。
5. 明确有限/无限 cluster 配置和可观察的回退行为；若上游未提供每次回退标记，
   报告配置与界的实际可见范围，不能凭空填“未回退”。未覆盖 heralded erasure、BP 及 rational 路径时据实标注。
6. 跑适用的 SDK、capability、Skill 发现、DSH/Codex 共享投影与文档链接检查。
   在同一 PR 的 README 差异中检验入口、功能和限制一致。新增或修复执行行为时按 TDD 先复现真实失败；
   纯声明/指南不制造镜像测试。按实现范围完成 Standards 与 Spec 自审及适用 CI，必要项失败则继续修复并保持 Draft。

## 许可、平台与长期成本

源码为 [MIT](https://github.com/yuewuo/mwpf/blob/e50f72e2f389950db50bce075163a4e4022c9dcd/LICENSE)。
仓库内 HiGHS、heapz、slp 相关许可也已核对为 MIT；这些抽查不是完整传递依赖许可审计。
实现时保存固定来源和许可证链，安装/再分发时保留各组件的版权与许可，不整库复制上游。

PyPI 0.2.18 当前有 macOS universal2、Linux x86_64 和 Windows x86_64/arm64 等 wheel；
wheel 列表是发行证据，不代表本机或 CI 已安装验证，也不代表 Stim 在 Windows arm64 上同样可用。
当前列表没有 Linux aarch64 wheel，不能悄悄退回大规模源码构建。
源码构建涉及 Rust、maturin 与 HiGHS 原生链，普通使用优先可验证的 wheel。

上游有原生 solver、corner case、panic、Sinter 及 HiGHS 的测试源码和跨平台打包工作流，
说明维护者有相应检查入口；本轮没有重新运行上游测试或证明其 CI 全绿。
长期主要成本是 wheel/平台兼容、Stim/Sinter 语义、浮点界及默认失败/预算策略的变化。
固定版本、少量独立 oracle 回归和直接复用原生接口，使这项可选能力的维护成本可控；
后续版本升级交给“上游同步”任务，不能只跟随 main 推送。

## 2026-11-06 接入进展

同一 PR 已增加 `mwpf-decoding` 原生 SDK/Skill 和可编辑程序；实际准备 Python 3.12.13、
MWPF 0.2.18、Stim/Sinter 1.16.0、NumPy 2.5.3，完整依赖见环境锁。

macOS arm64 本地断网验证通过：7 项数值/失败回归（16 个 syndrome × 4 种预算配置）、
8 个跨字节 observable 场景 × 3 种预算、1,024 shots 的原始样本与预测、用户自定义超图、
不可满足输入拒绝、进程终止和 Codex 环境检查。真实 SDK 工作台执行及逐文件摘要见
[版本化证据](../../integrations/evidence/mwpf-2026-11-06.json)。这些是局部工程与数值检查，科学验收仍未评估。

调试确认 `cluster_node_limit=0` 是有限预算，不能作为无限预算别名。对 syndrome `[0,3]`，
独立最优值为 300，零预算返回权重 360、界 `[180,360]`；省略该配置后得到 300。
示例分别保存请求配置、实际配置、权重和界，不通过放宽预期掩盖这个差异。

剩余交付项：README 能力说明/入口/数量与 #77 顺序衔接，完成固定提交的 Standards/Spec 自审和相关 CI。
现有 README 首屏与版式未更动；Linux/Windows 的真实安装和数值结果以本 PR 专用 CI 为准，不能从 wheel 列表推断。
