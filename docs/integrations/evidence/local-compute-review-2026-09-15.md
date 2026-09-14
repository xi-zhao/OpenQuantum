独立领域审阅完成，当前没有未关闭的阻断问题。主计算、可选参考、可选模拟/闭包与科学验收的区分符合本次目标；这份报告不授予中央科学验收，也不保证任意规模一定能够完成。

PyZX 可用于电路重写与门开销比较，Graphix 可生成 MBQC 模式并选择是否模拟，Symmer 返回指定扇区的降维 Hamiltonian，PauLie 返回独立控制假设下的代数分类和精确维数。四项均允许主计算超过自动稠密参考的阈值；required 尝试用户请求的参考，skip 用明确的状态和 null 指标表示未检查。

| 独立证据 | 结果 |
|---|---|
| PyZX / Graphix / Symmer / PauLie | 4 / 5 / 11 / 8 个独立输入，共 28/28；Graphix 实际核对 14 个抽样分支 |
| 路径守卫 | skip 不调用参考；required 的参考失败不隐藏；PauLie closureMode=skip 不内部枚举闭包 |
| 精确数值表示 | GF(2) 位宽、全部降为标量、1e-200 系数保留、4^27−1 精确字符串，以及 4933 位十进制整数往返 |
| QPanda | 13 变量 required 实际枚举 8192 项，78 可行项，解析最优值 3；65 变量 skip 只编译、参考字段 null |
| QGS | 自选 H=0.4 ZI−0.6 IZ+0.3 XX，能量 −sqrt(1.09)；257 点网格使用 301/512 次评估；513 点网格真实使用 512/512，资源合规但收敛检查失败 |
| Flow / execution | 1236 次 uint64 parity 独立比较；部署继承、显式0、线程覆盖、2.2MB输出、超时/输出预算/取消错误路径通过 |

QGS 的资源语义已版本化为 Profile 1.1.0，observed 同时保留计数、请求预算和 budgetFraction。原 1.0.0 文件与初始基线字节相同，新 Profile 的 manifest 摘要匹配。新观察不能被误读为“资源 pass 即科学收敛”：真实耗尽预算的案例正好证明两者独立。

老适配以本次差异和结构核对为主。TJM 单条噪声轨迹的标准误为 null/insufficient_trajectories；SQD 的活性轨道数小于64是 PySCF 的 int64 CI 表示要求；toqito 的独立 Jacobi 重算会对未收敛明确报错。固定物理模型仍限定接口功能，例如 QGS 两量子位固定权重一模型、Dynamiqs 单量子位，以及 QMClaw 单个独立量子位的合成实验。未把主 Agent 的18个 live 输入当作独立正确答案，也未重复其全部数值测试。

worker 默认不设时间/输出预算，但当前固定 Harness MCP Client 的21个本地连接使用单个 Node 定时器，默认2147483647毫秒，约24.855天。因此这里没有端到端无限等待的保证。用户资源、上游算法和数据表示要求继续决定实际可运行规模。

原始输入、输出和独立比较分别见 unitary-cases/、unitary-comparison.json、unitary-contract-checks.json、unitary-path-guard-*.json；后续针对性证据见 legacy-targeted-checks.json 与 flow-parity-boundaries.json。review-summary.json 记录完整覆盖边界和已关闭发现。final-source-hashes.json 记录 171 个相关文件的 SHA-256；四项数学 bridge、contracts 和依赖锁自最后数值复核后未变，后续共享 execution 接线单独核对。

PyZX 可选参考的文案建议已落实，当前没有未关闭的审阅备注。
