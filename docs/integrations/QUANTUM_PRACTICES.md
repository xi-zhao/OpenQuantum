# 量子算法参考检索

OpenQuantum 默认 Preset 注册原生只读 Tool `quantum_practices`，为算法解释、方法比较、假设核对和实验设计提供
66 份固定版本参考指南。它是 L1、Tool-only 能力；不会把这 66 份文档注册为活跃 Skill，也不执行其中的代码。

## 使用

重启 OpenQuantum 后可以直接提问，例如：

- “用 quantum_practices 查 HHL 的矩阵条件，并说明哪些条件需要验证。”
- “查一维热方程的薛定谔化方法，说明边界条件和辅助网格的作用。”
- “查参数位移梯度的适用条件。”

`list` 返回目录摘要，`search` 检索候选，`get` 按自然语言或已知 id 读取参考；默认 `brief`，需要完整内容时使用 `full`。
查询最多 256 字符，list/search 的 limit 为 1–20，返回总长度不超过 42,000 字符。未知 id、路径穿越、无匹配查询、
不支持的动作、无效参数和额外参数显式失败。中文映射仅补充常见算法名，搜索仍由固定上游检索器处理。

该 Tool 是可选的知识检索入口，不成为每个量子任务的前置步骤。返回文本明确标为外部参考；
安装建议、默认模拟器和上游 Skill 阅读链不覆盖用户意图、OpenQuantum 当前 Skill 或 Tool 合同。
文档中的脚本相对路径均属于上游资料目录，不能作为当前工作区路径执行；固定来源链接可用于查阅原文。

## 来源与接入方式

- 检索器来源：[unitarylab/quantum-practices](https://github.com/unitarylab/quantum-practices)，固定提交
  `572a24c9b5c9787caec98810351f5cb17c82250e`，版本 `0.1.0`；保留原始 `skill-store.js`、LICENSE 和 NOTICE。
- 资料来源：[unitarylab/quantum-skills](https://github.com/unitarylab/quantum-skills)，固定提交
  `c5436bb120812ad903ac776f58df89b803ced48c`；当前 66 份指南由本地脚本生成目录，保留内容原文与独立许可文件。
- [`source.json`](../../src/quantum-practices/upstream/source.json) 分别记录检索器、资料提交、66 份原文及生成文件的 SHA-256。
  返回的原文链接指向资料仓库的固定提交，而不是检索器仓库。
- [`src/quantum-practices/index.mjs`](../../src/quantum-practices/index.mjs) 只增加严格输入检查、中文查询映射和资料来源/执行边界。
- [`quantum-practices-tools.mjs`](../../runtime/openquantum/agent-presets/openquantum/quantum-practices-tools.mjs)
  在当前 Harness `0.1.5-rc.1` 中注册一个 Tool；不加载上游针对 RC.6 的 Provider，不增加 MCP Server。

完整调用是本地内存检索：不联网、不读写用户文件、不启动子进程、不读取凭据、不安装 Python 或模拟器。
Harness 自身保存调用事件，不等于该 Tool 物化科研结果；此能力没有 Scientific Validator 或 Acceptance Profile。

## 许可与更新

原始资料和检索器为 MIT，保留完整许可与原始 NOTICE；后者描述检索器当时的历史资料来源，
当前资料来源由 source.json 单独固定。本地 `package.json` 仅声明 ESM 格式。
模拟器 `unitarylab` 与 UnitaryLab Agent 是另外的闭源授权软件，不能从内容仓库的 MIT 许可推导其分发或服务使用权限。
本集成不包含这些依赖。[第三方声明](../../THIRD_PARTY_NOTICES.md)记录分发边界。

更新时显式选择完整 commit，审阅内容与检索器差异，替换对应原始文件、更新摘要并重跑下列检查。
不要只改 source.json 的摘要而跳过来源和许可核对。
资料目录使用 `node scripts/build-quantum-practices-catalog.mjs --source /path/to/pinned/quantum-skills` 重建；
脚本逐文档核对已审阅摘要，`--check` 离线核对生成一致性。

## 验证

```bash
npm run capability:quantum-practices:test
npm run capability:conformance
npm run capability:contracts:test
node --test tests/capability-package-audit.test.mjs tests/readme-capability-catalog.test.mjs tests/scientific-tool-effects.test.mjs
npm run harness:config
```

2026-09-12 的本地验证包含：固定文件摘要、60 份文档的 brief/full 上限、中英文检索、参数与失败路径，以及真实
Harness 注册、调用、结果回传和 Session event log 重读。Harness 测试使用本地模型协议替身，实际执行资料 Tool；
没有使用外部模型，也不证明模型自主选用此 Tool 的质量。[当次会话证据](evidence/quantum-practices-2026-09-12.json)
包含两个成功检索和一个非法路径失败结果。

一维热方程的计算方向另见[独立原型](../../experiments/schrodingerization-heat1d/README.md)，
不计入这项知识检索能力的计算或验收结果。

2026-09-24 更新包含 6 份新指南、4 份已改动指南，无删除。Trotter/qDrift 条目现在给出本地
`hamiltonian-simulation` / `simulate_hamiltonian` 开源执行路线；参考 Tool 本身仍不执行计算。
上游安装命令和模拟器偏好不覆盖本地开源策略。新增计算与当前验证见[开源适配说明](UNITARYLAB_OPEN_ADAPTATION.md)。
