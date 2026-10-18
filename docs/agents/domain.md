# Domain Docs

这些规则供工程技能探索和维护 OpenQuantum 时使用。采用 **single-context**，沿用仓库现有的文档入口与架构合同。

## Before exploring, read these

1. 首次进行架构或实现任务时，先读 [文档与架构入口](../README.md)，再按 [AGENTS.md](../../AGENTS.md) 选择相关合同；不要遍历全部文档。
2. 读取根目录 [CONTEXT.md](../../CONTEXT.md) 中与任务相关的术语；它是本仓库唯一的产品与科研术语表。
3. ADR 沿用 `docs/architecture/ADR-*.md`。从文档总入口识别其有效或历史状态，只读取影响当前任务的决策记录。

工程技能模板中的 `GLOSSARY.md` 与 `docs/adr/` 分别映射到 `CONTEXT.md` 与 `docs/architecture/ADR-*.md`。`domain-modeling` 在相关任务确认术语或决策后维护这两处，不另建术语定义或平行 ADR 目录。若为技能兼容新增 `GLOSSARY.md` 或其他导航文件，只能链接现有权威来源。

## File structure

```text
/
├── AGENTS.md
├── CONTEXT.md           # 现有唯一术语表
└── docs/
    ├── README.md        # 现有文档总入口
    ├── architecture/    # 现有架构合同及 ADR-*.md 决策记录
    └── agents/          # 工程技能使用约定
```

## Use the glossary's vocabulary

描述领域对象、工单、方案或测试时，沿用 `CONTEXT.md` 中已定义的名称。术语定义统一维护在该文件；实现职责与架构边界仍按 `AGENTS.md`、`docs/README.md` 与相关合同判断。

新概念不在术语表中时，先确认是否已有同义对象；确有缺口时，在当前任务中明确其含义，再补充到 `CONTEXT.md`。

## Flag ADR conflicts

提议与现有 ADR 或架构合同冲突时，明确指出冲突文件、受影响规则和重新讨论的理由；不要静默覆盖，也不要因术语调整自动重写既有架构。
