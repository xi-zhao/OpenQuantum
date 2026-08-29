# OpenQuantum Skills

这个目录是 DeepSeek Harness 的项目 Skill 根。每个一级子目录代表一个可发现的 Skill，权威入口是其中的
`SKILL.md`。

## 运行规则

- Harness 只根据 `SKILL.md` frontmatter 和正文发现、加载 Skill；
- `references/`、`scripts/`、`inputs/`、`artifacts/`、`validators/` 和 `evals/` 是可选的共置科研资源；
- `mcp/` 即使位于 Skill 目录下，MCP Server 也必须由 OpenQuantum Agent Preset 中独立声明的 Harness MCP Client 连接；
- Validator 必须由 Tool、Materializer 或 CI 显式调用；若从 Harness hook 起步，hook 由可信 Host Plugin 拥有；
- 共置是为了让一条科研纵切保持 locality，不表示 Skill 拥有 MCP Server、Tool 或 Validator 生命周期。

## 当前 Skill

| Skill | 作用 | 依赖的执行模块 |
| --- | --- | --- |
| `platform-diagnostics` | UI、Harness、Skill 和 Model 四个职责面的平台诊断 | Harness Tool、诊断 Validator 与 eval evidence |
| `quantum-sdk-advisor` | 量子软件栈选型 | 无强制 Tool Provider |
| `qiskit-circuit-workbench` | QASM/QPY 电路分析和转译工作流 | Qiskit MCP Server + Harness MCP Client |
| `fieldqkit-hardware` | 国内量子云后端发现和凭据缺口解释 | FieldQKit 本地 MCP Server + Harness MCP Client；只读 |
| `qpanda-qubo` | 有界 QUBO 编译、经典复核与可选本地 QAOA | QPanda 本地 MCP Server + Harness MCP Client |
| `quantum-circuit-verification` | 有界 OpenQASM 2 电路等价性验证 | MQT QCEC 本地 MCP Server + Harness MCP Client |
| `qec-memory-experiment` | 有界 surface-code memory 采样与 MWPM 解码 | Stim/PyMatching 本地 MCP Server + Harness MCP Client |
| `tyxonq-workbench` | TyxonQ 小规模电路与噪声仿真工作流 | TyxonQ 本地 MCP Server + Harness MCP Client；默认关闭 |
| `quantum-information-audit` | 有界密度矩阵和 negativity 审计 | toqito MCP-exposed Tool + Validator + L3 物化/验收链 |
| `quantum-ground-state` | 窄作用域二量子位基态工作流 | 本地 MCP-exposed Tool + Validator + L3 物化/验收链 |

新增或修改 Skill 前先读[文档与架构入口](../../docs/README.md)和[贡献指南](../../CONTRIBUTING.md)。
发行版当前 Skill 清单与 L0–L3 证据等级以 [`.agents/capability-packages.yml`](../capability-packages.yml) 为机器权威。
