# OpenQuantum 科学结果合同（Skill Contracts v1.1）

这是 Skill 层内部的共享合同模块，不是第五层业务系统。它只统一所有科研 Skill 都必须遵守的
结构、来源链和聚合不变量；算法、科学阈值、领域检查和解释仍保留在对应 Skill 中。

本模块中的 `Capability` 表示“一项带版本的科学主张与证据范围”，不表示可安装软件包、插件市场、
发布治理或独立 Runtime。Skill 仍由 Harness 原生 `SKILL.md` 发现，MCP 仍由 Agent preset 独立注册。

## 核心对象与四个独立状态

- `Capability Manifest`：声明能力范围、输入/产物 schema、Validator、版本化 Profile、评测套件、
  权限、资源上限、依赖与兼容性。
- `Result Package`：只记录输入、产物、执行引用和来源链事实；禁止携带运行状态、科学状态和分数。
- `Acceptance Report`：中央 builder 注入 Profile 规则并推导 `passed / conditional / failed`。
- `Score Report`：评测 runner 的逐例证据报告；硬门槛失败时为 `invalid`，且不得携带分数。
- `Reproduction Report`：比较两个不同结果包，验证独立性和容差后推导
  `reproduced / not_reproduced`。
- `Result Commit`：给 Harness `tool/result.meta` 使用的 64 KiB 引用信封，只携带路径、摘要和小型状态，
  不允许 Skill 自报 Session、call 或 event 身份。

平台把信任状态保持为四条正交轴：

```text
Runtime Completion: Harness 权威
Valid Score:        Score Report 权威；缺席 = unscored
Scientific Acceptance: Acceptance Report 权威；缺席 = not_evaluated
Reproduction:       Reproduction Report 权威；缺席 = not_attempted
```

高分不能覆盖科学硬失败；运行结束也不能推导科学通过或复现成功。

## 版本兼容

- v1.0 Capability / Result / Acceptance 继续按原行为读取。
- v1.1 将 Acceptance Profile、Reproduction Profile 与 Evaluation Suite 拆成独立 JSON，并由 manifest
  的版本和 SHA-256 锁定。
- v1.1 Result Package 必须精确记录 manifest 声明的依赖和 Acceptance Profile 摘要。
- 已发布定义不得原地改写；规则变化必须发布新版本并产生新摘要。

所有 schema 使用 Draft 2020-12。结构校验后还会执行 realpath、普通文件、路径归一化、摘要、字节数、
引用完整性、Skill frontmatter、秘密扫描和中央状态推导等语义检查。

## 模块 Interface

```js
import {
  loadCapability,
  loadResultPackage,
  buildAcceptanceReport,
  loadAcceptanceReport,
  buildScoreReport,
  loadScoreReport,
  buildReproductionReport,
  loadReproductionReport,
  projectTrustState,
  buildResultCommit,
} from "./.agents/skill-contracts/index.mjs";
```

典型流程：

1. `await loadCapability(skillRoot)`；
2. `loadResultPackage(resultPackagePath, capability)`；
3. 领域 Validator 只返回逐项 observations，不返回整体科学状态或分数；
4. 中央 builder 注入版本化定义并推导 Acceptance / Score / Reproduction；
5. 持久化报告后重新 load，验证其摘要和证据引用；
6. `buildResultCommit(...)` 生成可放入标准 `tool/result.meta` 的引用信封；
7. `projectTrustState(...)` 只投影四轴，不创造“综合成熟度”或擅自选择 latest 报告。

所有加载和构建函数失败时抛出 `ContractValidationError`，其 `issues` 是稳定错误列表。

## CLI

```bash
node .agents/skill-contracts/cli.mjs validate-capability .agents/skills/<id>
node .agents/skill-contracts/cli.mjs validate-result .agents/skills/<id> result-package.json
node .agents/skill-contracts/cli.mjs validate-acceptance \
  .agents/skills/<id> result-package.json acceptance-report.json
node .agents/skill-contracts/cli.mjs build-acceptance \
  .agents/skills/<id> result-package.json <validator-id> <profile-id> observations.json
```

CLI 继续支持 v1.0；v1.1 `build-acceptance` 的 observations 文件还必须提供 `scopeMatch`。输出文件使用
独占创建，避免无意覆盖已经发布的不可变报告。Score 与 Reproduction 的 runner 直接调用模块 Interface，
这样领域 eval 可以显式传入一组已验证的结果包，而不把文件发现逻辑塞进共享合同。

## 验证

```bash
npm run test:contracts
```

测试覆盖 v1.0 双读、v1.1 definitions/digest、路径与 symlink 逃逸、依赖锁定、秘密、证据引用、
全部聚合分支、Score/Reproduction 四轴和 Result Commit 边界。
