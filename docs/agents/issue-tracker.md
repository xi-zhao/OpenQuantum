# Issue tracker: GitHub

本仓库的工单和需求规格保存在 [xi-zhao/OpenQuantum 的 GitHub Issues](https://github.com/xi-zhao/OpenQuantum/issues)。使用 `gh` CLI；所有操作显式指定 `--repo xi-zhao/OpenQuantum`，API 路径也使用同一仓库。

## Conventions

- 创建工单：`gh issue create --repo xi-zhao/OpenQuantum --title "..." --body-file <file>`。
- 读取工单：`gh issue view <number> --repo xi-zhao/OpenQuantum --json number,title,body,labels,comments`。
- 列出工单：`gh issue list --repo xi-zhao/OpenQuantum --state open --json number,title,body,labels`；按任务增加 `--label` 或调整 `--state`。
- 添加评论：`gh issue comment <number> --repo xi-zhao/OpenQuantum --body-file <file>`。
- 增减标签：`gh issue edit <number> --repo xi-zhao/OpenQuantum --add-label "..."` 或 `--remove-label "..."`。
- 关闭工单：`gh issue close <number> --repo xi-zhao/OpenQuantum`；需要说明时先添加评论。

多行正文先写入本地文件，再用 `--body-file` 传入。GitHub 写入遵循本仓库的授权规则；本配置只确定操作位置，不自动发布工单、评论或 PR。

## Pull requests as a triage surface

**PRs as a request surface: no.**

GitHub 的工单与 PR 共用编号。遇到含义不明的 `#<number>` 时，先识别对象类型，再使用对应命令。

## When a skill says "publish to the issue tracker"

在当前请求已授权发布时，创建 GitHub Issue。尚未授权外部写入时，先准备本地可审阅草稿。

## When a skill says "fetch the relevant ticket"

按上面的读取命令获取工单；需要评论时保留 `comments` 字段。

## Wayfinding operations

`wayfinder` 以一张 map 工单组织子工单，map 正文保留 Notes、Decisions-so-far 与 Fog。

- map 使用 `wayfinder:map`；子工单按类型使用 `wayfinder:research`、`wayfinder:prototype`、`wayfinder:grilling` 或 `wayfinder:task`。这些标签只在对应任务需要且已有授权时创建。
- 父子关系使用 GitHub sub-issues：`gh api --method POST repos/xi-zhao/OpenQuantum/issues/<parent>/sub_issues -F sub_issue_id=<child-db-id>`。不可用时，在父工单维护任务列表，并在子工单顶部写 `Part of #<parent>`。
- 数据库 ID 使用 `gh api repos/xi-zhao/OpenQuantum/issues/<number> --jq .id` 获取；它不是工单编号，也不是 `node_id`。
- 阻塞关系优先使用 GitHub 原生依赖：`gh api --method POST repos/xi-zhao/OpenQuantum/issues/<child>/dependencies/blocked_by -F issue_id=<blocker-db-id>`。不可用时，在正文顶部写 `Blocked by: #<number>`。
- 选择下一项时，按 map 顺序检查开放子工单；排除存在未关闭阻塞项或已被认领的工单。`issue_dependencies_summary.blocked_by` 可用时作为开放阻塞项计数。
- 认领使用 `gh issue edit <number> --repo xi-zhao/OpenQuantum --add-assignee @me`；解决后记录结论、关闭工单，并在 map 中补充简述与链接。
