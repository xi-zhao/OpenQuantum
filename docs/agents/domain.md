# Domain Docs

这些规则供工程技能探索和维护 OpenQuantum 时使用。采用 **single-context**，沿用仓库现有的文档入口与架构合同。

## Before exploring, read these

1. 首次进行架构或实现任务时，先读 [文档与架构入口](../README.md)，再按 [AGENTS.md](../../AGENTS.md) 选择相关合同；不要遍历全部文档。
2. 根目录 `GLOSSARY.md` 存在时，读取与任务相关的术语。若以后出现 `GLOSSARY-MAP.md`，按其中导航读取相关上下文。
3. `docs/adr/` 存在时，只读取影响当前任务的决策记录。

术语表或 ADR 尚不存在时，静默继续，不因缺失阻塞任务，也不为初始化创建空文件。`domain-modeling` 可在相关任务真正确认术语或决策时按需建立这些文档。

## File structure

```text
/
├── AGENTS.md
├── GLOSSARY.md          # 按需建立的项目术语表
└── docs/
    ├── README.md        # 现有文档总入口
    ├── architecture/    # 现有架构合同
    ├── agents/          # 工程技能使用约定
    └── adr/            # 按需建立的决策记录
```

## Use the glossary's vocabulary

描述领域对象、工单、方案或测试时，沿用项目已定义的名称。术语表用于补充索引，不替代 `AGENTS.md`、`docs/README.md` 与相关架构合同。

新概念不在术语表中时，先确认是否已有同义对象；确有缺口时，在当前任务中明确其含义，再由相关领域建模工作补充。

## Flag ADR conflicts

提议与现有 ADR 或架构合同冲突时，明确指出冲突文件、受影响规则和重新讨论的理由；不要静默覆盖，也不要因新增术语表自动重写既有架构。
