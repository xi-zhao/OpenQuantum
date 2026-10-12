# Pasqal 实验工作流与 Cloud SDK

源码通过 `pasqal-experiments` 原生 Skill 提供完整七阶段实验流程，`pulser-dynamics` 固定环境同时提供
Pulser 1.9.1 和 `pasqal-cloud==0.24.0`。保留现有 `simulate_pulser_rydberg`；新的研究流程使用宿主
代码 Tool 编写和运行原生 SDK 程序。便捷脚本不限定库的公开 API，不引入第二个 Runtime 或任意代码执行 MCP。

```mermaid
flowchart LR
  A[问题与方法] --> B[spec 与 Pulser 程序]
  B --> C[理想与含噪仿真]
  C --> D[可审阅云计划]
  D --> E[Cloud EMU 或 QPU 批次]
  E --> F[原始结果与状态]
  C --> F
  F --> G[观测量 误差 图形]
```

`application-to-idea`、`idea-to-spec`、`spec-to-sequence`、`validate-emu`、`noise-emulate`、
`qpu-submit`、`harvest-and-analyze` 都包含在[工作流](../../.agents/skills/pasqal-experiments/references/workflow.md)。
[命令合同](../../.agents/skills/pasqal-experiments/references/execution.md)给出具体执行与恢复步骤。

## 使用

```sh
node scripts/sdk-access.mjs inspect pulser-dynamics
node scripts/setup-sdk.mjs pulser-dynamics
```

第一条只定位环境，第二条才显式安装依赖。使用返回的 Python 解释器执行
`.agents/skills/pasqal-experiments/scripts/experiment.py --help`。
完整 Cloud API 可通过 `PasqalCloudClient`、`PasqalCloudConnection`、`OVHConnection` 和原生 backend 访问。
复杂校准、参数化/映射寄存器、多维扫描、批次、job 和 workload 可在宿主保存的程序中组合；
这些代码同样遵循用户授权与云服务成本边界。

Desktop 自动发现源 Skill，复用原生 bash/pwsh。Codex 构建会打包相同源码、资源和依赖锁，
通过 `pulser-dynamics` 定位环境后，从其同级 `pasqal-experiments` 目录读取工作流并执行脚本。
本次不增加 MCP 连接、模型配置或默认云访问，也不更改已安装的产品。

## 提交与数据

`prepare` 在本地构建所有扫描点，保存 spec、具体序列、设备快照、项目/region、总 shots、
依赖锁和程序摘要。Cloud 计划要求项目设备快照；QPU 要求具体 Device 和已解决的待决问题。
已有源码示例保留全部研究规模，但这些例子不是已批准的硬件输入。

辅助脚本只接受单文件研究模块，观测量、辅助函数与研究常量必须属于该文件；准备和分析前拒绝本地/相对导入及
动态代码加载。实际执行从已校验的源码编译，避免旧字节码缓存。支持的数值库与原生 SDK 多文件路径见[命令合同](../../.agents/skills/pasqal-experiments/references/execution.md)。
这项来源检查不替代宿主的代码审阅或沙箱。

本地求解、分析和新云提交在执行前核对计划中的包版本与依赖锁摘要，包含 NumPy、SciPy 和 QuTiP。
不一致时须恢复原环境或重新准备并审阅计划；已有云任务仍可恢复、采集和取消，保留原计划与数据。
旧计划缺少新增版本字段时也须重新准备，不能把旧计划视为已通过新的环境核对。

云辅助器通过官方 SDK 调用 API，认证只引用宿主保护的 `PASQAL_AUTH_TOKEN` 或
`PASQAL_USERNAME`/`PASQAL_PASSWORD` 环境。它不读取明文凭据文件，不输出错误响应中的秘密。
提交前绑定计划摘要和用户授权；上游 SDK 的写重试由固定版本的单次 HTTP 适配器替代。

收据和永久请求索引在 POST 前落盘，batch ID 在获取 jobs 前保存。同一 request 换收据路径仍拒绝再次提交。
所有同批追加/关闭/取消/恢复共用批次锁；未知追加先恢复，才能继续追加。已映射的旧收据可在后续追加后继续恢复。
索引持续保存最新映射和控制记录，支持收据丢失后重建；追加在创建请求索引前先保存恢复材料。
明确未发送的中断请求恢复为 `not_submitted`，不会把后来请求的同形 jobs 认作自己的结果。
丢失响应通过 request tag 和原生分页查询找到候选，再核对项目、序列与 shots；找不到不能推断远端没有提交。
索引是防重复提交工件，Harness Session 执行状态仍以 event log 为准。

本地和远端输出先保留原始结果，再执行观测量函数。兼容传统 counts 与 Pulser `serialised_results`；
后者核对实际 atom_order。缺失/失败/取消、位序不符、无最终 bitstrings 和无效观测量都保留状态。
比较基线时计入两组独立采样的 bootstrap 标准差；读出修正仅处理逐原子密度，不截断值或改写原始 counts。

## 验证与边界

复跑入口：

```sh
OPENQUANTUM_REAL_PASQAL=1 node --test --test-concurrency=1 tests/pasqal-experiments.test.mjs tests/harness-pasqal.test.mjs
OPENQUANTUM_REAL_SDK_DEVICES=1 node --test --test-name-pattern=pulser-dynamics tests/sdk-devices-live.test.mjs
node --test tests/sdk-access.test.mjs tests/sdk-devices-contracts.test.mjs tests/codex-plugin-package.test.mjs
npm run plugin:build
```

测试使用真实 Pulser 和 Cloud SDK；Python 测试禁止真实 socket 连接，云生命周期由 HTTP 响应夹具驱动。
Harness 使用本地模型协议夹具，检查实际 Skill/Tool 发现、执行、失败输入和 Session 结果重读。
数值证据覆盖单原子理想 Rabi、含噪 Bloch 解与既有多原子 Pulser 回归；不推断整个 SDK 或硬件已科学验收。
打包资源保留的 25、49、56 原子研究示例均按原规模完成本地序列构建；没有做全规模数值求解。
56 原子环使用显式 MockDevice，AnalogDevice 的 38 µm 半径上限会明确拒绝该几何，不自动缩小系统。

初次验证结果和源文件摘要见[验证记录](evidence/pasqal-2026-10-12.json)；
2026-10-13 的来源/环境绑定修复、目录检查、完整质量门与独立审查见[修复验证](evidence/pasqal-review-2026-10-13.json)。
真实 Pasqal 账户、Cloud EMU 服务、QPU、外部模型、其他操作系统和论文全规模复现未在本轮验证。
本地 QutipEmulator 沿用 Pulser 1.9.1 的已固定接口；上游已弃用，升级应另做接口迁移验证。
全部工作流保持 L1 / `scientificValidation=not_evaluated`，模型一致性不是最终科学 Acceptance。

来源固定在 [Pasqal agent-marketplace 2b0353d](https://github.com/pasqal-io/agent-marketplace/tree/2b0353d83e65ce4cc44c9bfa7e7dfe2549201bb1)，
保留 Apache-2.0 许可证、方法参考和三个研究示例。[许可说明](../../.agents/skills/pasqal-experiments/NOTICE.md)
明确本地 emu-mps 与 CEA/GENCI 站点集成不在默认安装范围。
