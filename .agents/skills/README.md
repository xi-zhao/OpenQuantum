# OpenQuantum Skills

这个目录是 DeepSeek Harness 的项目 Skill 根。含有 `SKILL.md` 的一级子目录是可发现的 Skill，
该文件的 frontmatter 与正文是指令权威。面向使用者的[完整 Skill 与 MCP 服务目录](../../README.md#已集成的量子工具与能力)见项目首页。

## 运行规则

- Harness 只根据 `SKILL.md` frontmatter 和正文发现、加载 Skill；
- `references/`、`scripts/`、`inputs/`、`artifacts/`、`validators/` 和 `evals/` 是可选的共置科研资源；
- `mcp/` 即使位于 Skill 目录下，MCP Server 也必须由 OpenQuantum Agent Preset 中独立声明的 Harness MCP Client 连接；
- Validator 必须由 Tool、Materializer 或 CI 显式调用；若从 Harness hook 起步，hook 由可信 Host Plugin 拥有；
- 共置是为了让一条科研纵切保持 locality，不表示 Skill 拥有 MCP Server、Tool 或 Validator 生命周期。

## 当前 Skill

以下 11 个 Skill 随源码分发；它们与 MCP Server 不是一一对应关系，知识型 Skill 可以不绑定专用 Tool，
工作流也可以使用多个服务或进程内原生 Tool。连接默认配置与凭据条件见[项目首页](../../README.md#mcp-服务目录)。

| Skill | 作用 | 依赖的执行模块 |
| --- | --- | --- |
| `platform-diagnostics` | UI、Harness、Skill 和 Model 四个职责面的平台诊断 | Harness Tool、诊断 Validator 与 eval evidence |
| `quantum-sdk-advisor` | 量子软件栈选型 | 无强制 Tool Provider |
| `qiskit-circuit-workbench` | QASM/QPY 电路分析和转译工作流 | Qiskit MCP Server + Harness MCP Client |
| `fieldqkit-hardware` | 国内量子云后端发现和凭据缺口解释 | FieldQKit 本地 MCP Server + Harness MCP Client；云端只读，首次发现可写本地 Python 环境 |
| `qpanda-qubo` | 有界 QUBO 编译、经典复核与可选本地 QAOA | QPanda 本地 MCP Server + Harness MCP Client |
| `quantum-circuit-verification` | 有界 OpenQASM 2 电路等价性验证 | MQT QCEC 本地 MCP Server + Harness MCP Client |
| `qec-memory-experiment` | 有界 surface-code memory 采样与 MWPM 解码 | Stim/PyMatching 本地 MCP Server + Harness MCP Client |
| `tyxonq-workbench` | TyxonQ 小规模电路与噪声仿真工作流 | TyxonQ 本地 MCP Server + Harness MCP Client；默认关闭 |
| `qmclaw-workbench` | QMClaw 超导量子比特测控与单比特调校工作流 | 原生 Tool Provider；13 类有界合成数据模拟，不启动 MCP Server |
| `quantum-information-audit` | 有界密度矩阵和 negativity 审计 | toqito MCP-exposed Tool + Validator + L3 物化/验收链 |
| `quantum-ground-state` | 窄作用域二量子位基态工作流 | 原生 Tool Provider + Validator + L3 物化/验收链；完整调用包含工作区证据写入 |

可选的上游 `pyqpanda3` Skill 需要通过 `npm run skill:qpanda:setup` 单独安装，不计入上述内置清单；
安装 Skill 不会自动启用本源量子云任务服务。安装来源与边界见[可选上游 Skill](../../README.md#可选上游-skill-与开发证据)。

新增或修改 Skill 前先读[文档与架构入口](../../docs/README.md)和[贡献指南](../../CONTRIBUTING.md)。
发行版当前 Skill 清单与 L0–L3 证据等级以 [`.agents/capability-packages.yml`](../capability-packages.yml) 为机器权威。
