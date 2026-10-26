# scalable 分支有效增量迁移

日期：2026-10-26。任务分支 `c/migrate-scalable-increments` 基于 `origin/main` 的
[`f87df719`](https://github.com/xi-zhao/OpenQuantum/commit/f87df719fbdb1b6a6057da0630413c66cd0042eb)。
旧分支 `c/scalable-quantum-bridges` 保留在 `642fa237`，历史提交与原学习资料保留。
本次交付源码与 PR，不发布、部署或替换本机应用。

## 迁移原则

沿用已确认的共享科研插件 → Harness 适配 → 品牌/UI 架构，保留主线的 Desktop 2.0.0、
配套 Harness、模型目录和默认选择。共享科学代码不依赖 DSH、Cordis 或宿主 Session。
按需执行仍分为发现、显式准备、执行；计算过程中不隐式安装依赖。

九个独有提交并不代表九项主线缺失功能。共同祖先为 `3f43b6eb`；旧分支后续提交中的宿主升级、
四库整体接入和多数安全依赖已被主线实现或替代，因此按功能适配，不整批 cherry-pick。

## 九个提交的处置

| 旧提交 | 处置与依据 |
| --- | --- |
| [`e67a11ca`](https://github.com/xi-zhao/OpenQuantum/commit/e67a11ca) 官方 Harness/Desktop 迁移 | 保留主线现行宿主、原生 V0 会话、点分 RPC、project-root 解析及打包方式；把仍有价值的重启后原生工具结果回读测试适配到当前接口。旧版迁移目标与当前确认基线不同，不迁入新版宿主接口、模型配置或整套客户端补丁。 |
| [`d1ce82a4`](https://github.com/xi-zhao/OpenQuantum/commit/d1ce82a4) 跨卷 Desktop cache | 原修复针对后来的 pnpm Desktop 构建；当前固定 Desktop 2.0.0 使用 Yarn。沿用主线构建与第三方来源记录，不引入失效的 pnpm store 迁移。 |
| [`e073ad66`](https://github.com/xi-zhao/OpenQuantum/commit/e073ad66) 课堂别名存储与测试隔离 | 迁入课堂 data 源/目标指向同一实际目录时的保留规则及回归，保留主线已隔离的 Harness workspace；新增/迁入的集成测试也使用独立临时工作区。 |
| [`8f9b278b`](https://github.com/xi-zhao/OpenQuantum/commit/8f9b278b) 四个量子工具 | 四库主体、显式准备、主计算规模与 Graphix 0.4.1 升级沿用主线。迁入合法空 Graphix pattern 的合同修复、真实恒等电路回归和集成测试隔离，不改变数值算法或阈值。 |
| [`3c237688`](https://github.com/xi-zhao/OpenQuantum/commit/3c237688) QCEC 验收与报告 | 迁入共享请求合同、独立 Qiskit 参考、Validator、Profile、科学 schema/eval 和可读报告；接入主线既有 Materializer/central Builder。QI 可读报告共用此链，不另加旧分支的 receipt Host Plugin。同提交的模型探针结果/参数校验和错误脱敏也迁入；依赖当前未使用的新版 `dsh-http-proxy` 的回归不迁。 |
| [`28e903bc`](https://github.com/xi-zhao/OpenQuantum/commit/28e903bc) 原生状态与模型选择 | 保留主线已经适配当前宿主的 runtime 状态与模型选择；迁入端到端探针显式 `--reasoning`，按当前 `session.models.current` 保留匹配模型的已有选择，不改变模型路由、默认模型或 Provider。 |
| [`ab4b7eae`](https://github.com/xi-zhao/OpenQuantum/commit/ab4b7eae) 课堂恢复与 Desktop 适配 | 按固定 OpenMAIC 版本迁入冷启动/实例就绪、断连恢复、公式重渲染/数学导出、题数与类型校验、模板资源重定位及安全错误分类；课堂工作区统一已有 KaTeX 0.18.7。保留主线 Host 鉴权、PPTX 导入和流错误处理。新版 Desktop cookie/客户端补丁不适用于当前宿主。 |
| [`4895d5c1`](https://github.com/xi-zhao/OpenQuantum/commit/4895d5c1) 安全依赖与代理回归 | 根依赖和发行锁已由主线覆盖相同或更高版本，保持主线锁；保留可迁移的代理行为回归，不回退依赖。 |
| [`642fa237`](https://github.com/xi-zhao/OpenQuantum/commit/642fa237) 课堂关闭等待与验证记录 | 迁入等待课堂子进程退出的修复及回归。旧分支验证数据仅供追溯，本轮重新验证，不作为当前分支通过证据。 |

## QCEC 的科学语义与宿主边界

- MQT QCEC 3.10.0、Qiskit 2.5.2 及其锁文件沿用主线。参考程序通过 `preparedPythonLaunch` 检查
  准备收据和锁摘要，不在执行期下载或更新环境。QCEC 后端 `timeoutSeconds=0`，仍受宿主资源策略控制。
- 主计算规模由调用方选择；`unitary-classification-audit-v1` 单独覆盖每份输入最多 16 量子位、
  65536 UTF-8 字节、512 条语句。所有输入先经独立 Qiskit 解析和有限酉门语义检查（包含自定义门体），
  完全相同的合法输入再使用 source-identity 证明；不同输入的独立完整酉矩阵检查最多 8 量子位。
  超出验收范围仍可计算，保留 observations；参考不可用时不宣称复核通过。
- 正例容差 `1e-9`、否定 margin `1e-8`。严格等价、全局相位、不等价分别保留；一般相位、概率性与
  无信息分类保持 `conditional`。`not_equivalent` 的 Acceptance `passed` 表示不等价分类经复核。
- DSH Host Plugin 绑定真实 `tool/call` 参数，在原生 `tool/result` 落账后使用实际序号物化，
  经有效会话沙箱写入、重读、核对证据，再通过原生 surface replacement 回填验收展示。
  不预测尚未发生的结果事件；同一 provider call ID 在后续事件复用时写入不同目录。
  只读会话、取消、输入来源不符或写入失败时，不生成最终验收展示。
- QI/QCEC 的 `readable-report.md` 从重读证据生成，附结构化报告链接与摘要；模型最终说明中断也不影响
  已完成交付。大矩阵报告只显示有界的元素/谱预览，完整输入和谱保留在结构化证据中，避免报告长度限制
  主计算或原有验收。完整结果仍以 Result Package、Acceptance Report 与 Result Commit 为准。
- Codex 复用共享计算，尚未接通 DSH 自动会话物化/验收链。未校验的 provenance 继续为 `not_checked`。
  本轮不将 DSH 验证结果外推为各宿主验收能力相同。

## 验证记录

本节只记录本轮迁移基线上的实测，未记录的检查不由旧分支结果推定。

- QGS/QI/QCEC 基础回归 28 项通过，QCEC Validator 边界 eval 10 项通过；真实沙箱用例验证
  `read-only` 不写文件，切回 `workspace-write` 后可物化。后续 QI 4 项定向回归通过，覆盖 64×64
  完整输入保留、报告长度与原矩阵/部分转置区分。
- 真实 MQT/Qiskit 覆盖冗余门、删门、全局相位、线序、自定义门、多寄存器、9 量子位条件验收与
  16 量子位身份；独立参考同时验证禁止任意 include 和稠密预算。
- 当前真实 Harness 验证报告先于模型最终说明落盘、Result Commit 绑定原生事件、重启后只读取原报告，
  不重新计算。模型使用本地协议 fixture，无外部模型请求。
- 四库合同 6 项、真实计算 5 项、真实 Harness 2 项通过：Graphix 0.4.1 的空 pattern 在零态、plus 态和
  仅生成模式均通过；PyZX 完整酉矩阵、Symmer 谱/扇区、PauLie Lie closure 与独立参考一致。普通 Harness
  和 scale 模式均保存 4 项成功结果与 1 项预期输入错误；scale 覆盖 65 量子位 PyZX/Symmer/PauLie 与
  11 量子位 Graphix 仅生成，明确 `reference=not_run`。环境均从主线固定锁准备，Symmer 来源提交核验一致。
- 非科学链组合回归 81 项：80 通过、1 条件跳过（当前固定 Harness 没有 undici 包）。其中课堂固定源码
  隔离重放及 Chromium 回归 17 项通过，涵盖公式重渲染/测量、PowerPoint 数学和字体、测验、模板重定位
  与 Pro 断连。主线 PPTX 持久化、流错误、视觉能力和代理安全回归保留并通过；原生参考检索在固定
  Harness 重启后的成功/错误结果回读通过。全部使用本地 fixture，没有外部模型请求。
- 独立审阅发现的 QASM 注释隐藏与非法参数身份快捷路径已修复并独立复核；新增真实反例覆盖测量、
  隐藏寄存器、非有限参数及自定义门体。MQT 对 `rx(1/0)` 的等价判定保留原始事实，科学验收降为
  `conditional`，不再由相同文本直接给出 `passed`。原数值阈值和稠密范围保持不变。
- 事件交错修复使用真实原生结果与 surface replacement；QGS 探针也分开读取当前验收展示与原始来源事件，
  真实 Harness / 本地模型 fixture 通过；原生事件交错、终结后值/正文变化、取消和只读撤回均有回归。
  课堂启动、恢复、进程清理及模型筛选修复后定向回归 44/44，Chromium 草稿保留 1/1 通过。
  Windows 根退出清理仅有分支模拟，不据此宣称 Windows 实机后代回收完成。
- 全仓 `npm run check` 的 release、lint、locale、能力声明、SDK 导航/清单和全部测试阶段通过：
  主测试 1151 项（831 通过、320 条件跳过、0 失败），科学合同 119/119、QGS 36/36、
  能力合同 222 项（221 通过、1 条件跳过）、benchmark 5/5，诊断 eval 4/4。
  末步 `harness:config` 因默认 Home 保留 V3 历史而按设计拒绝；随后指定独立 V0 Home 运行该步通过。
  旧会话未迁移或覆盖，不能将首次完整命令的非零退出写成整条命令通过。
- 验证时以进程级 Git excludes 临时排除学习资料路径，避免其约一万条未跟踪路径撑满打包的 Git 输出缓冲；
  不改持久 Git 配置、不移动资料、不改打包源码。CC Connect 复用主线固定版本，显式准备原锁定二进制后
  真实管理服务通过。CI、发布与本机安装分别报告，不由本地测试推定。

大缓存、独立 Python 环境与本轮数值证据保存在 Elements 的 `OpenQuantum/2026-10-26--scalable-migration`
任务目录，不纳入 Git；原 `outputs/01a08166-quantum-learning-resources/` 学习资料保持原位。
