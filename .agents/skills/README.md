# OpenQuantum Skills

这个目录是 DeepSeek Harness 的项目 Skill 根。每个一级子目录代表一个可发现的 Skill，权威入口是其中的
`SKILL.md`。

## 运行规则

- Harness 只根据 `SKILL.md` frontmatter 和正文发现、加载 Skill；
- `references/`、`scripts/`、`schemas/`、`validators/` 和 `evals/` 是可选的共置科研资源；
- `mcp/` 即使位于 Skill 目录下，也必须在 OpenQuantum Agent preset 中独立注册；
- Validator 必须由 Tool、可信插件或测试显式调用；
- 共置是为了让一条科研纵切保持 locality，不表示 Skill 拥有 MCP 或 Validator 生命周期。

## 当前 Skill

| Skill | 作用 | 依赖的执行模块 |
| --- | --- | --- |
| `quantum-ground-state` | 窄作用域二量子位基态工作流 | 本地 MCP、独立 Validator、科学结果合同 |
| `qiskit-circuit-workbench` | QASM/QPY 电路分析和转译工作流 | Qiskit Circuits 与 Qiskit Docs MCP |
| `fieldqkit-hardware` | 国内量子云后端发现和凭据缺口解释 | 独立注册的 FieldQKit MCP，默认只读 |
| `tyxonq-workbench` | TyxonQ 小规模电路与噪声仿真工作流 | 独立注册的 TyxonQ Local MCP，默认关闭 |
| `quantum-sdk-advisor` | 量子软件栈选型 | 无强制 MCP |
| `platform-diagnostics` | UI、Harness、Skill 和 Model 四层诊断 | 诊断 eval 与 Validator |

新增或修改 Skill 前阅读 [贡献指南](../../CONTRIBUTING.md) 和
[仓库地图](../../docs/REPOSITORY_GUIDE.md)。
