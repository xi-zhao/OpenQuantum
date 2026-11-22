# PyZX 0.10.8：生产接入修复

日期：2026-11-10 UTC。基于 main `508ed5cd05eb44276fd5009641efa7e82a3b70c0`，
延续 PR #82；未合并、未部署，也没有改动用户已经安装的环境。

## 范围与依赖

同步原有 PyZX manifest、冻结锁、bridge 版本守卫、Tool source.version、SDK 设置目录、
第三方说明与生成清单为 0.10.8。没有新增公开接口、宿主或运行时，未调整输入 schema、
位序、1e-8 工程容差与科学 Acceptance。#77/#79 的 README/新 SDK 工作不属于这个正确性修复；
在最新 main 上只重生成 PyZX 清单行，不等待那些功能合并。

核对官方 v0.10.8 peeled commit `d9691d0b2aaaab92f11ed0b2cabe2bcc36f8cc14`。
0.10.7/0.10.8 移除 PyQuil compiler、graph_tool/igraph、streaming_extract、旧 Quantomatic JSON、
d3.draw、gadget_extract，并有 flow/symbolic 行为调整。本 bridge 使用的 Circuit、full_reduce、
extract_circuit、basic_optimization 均仍支持，定向搜索未发现调用这些已移除入口。
Python 最低 3.11；现有项目固定 3.12.x。自定义 SDK 程序可能需要自行迁移这些上游 API。
锁只升级 PyZX 并移除不再需要的 typing-extensions，保留其他现有版本。

## 已完成的工程验证

在 Linux x86_64、Python 3.12.14、NumPy 2.5.3、Node 24.22.1 的独立工作区：

- 旧 0.10.6 冻结环境复现 XPhase 重映射约 0.707 与 U3 adjoint 约 1 的错误。
- 产品安装器按新冻结锁安装 0.10.8，五项独立矩阵检查全部通过；最大误差 <7e-16。
  [旧观测](evidence/2026-11-10-pyzx-old.json)、[新观测](evidence/2026-11-10-pyzx-new.json)。
  探针中的 productPinsChanged=false 仅说明探针本身不修改 pin，不代表本 PR 未更新 pin。
- 新版本守卫拒绝旧 0.10.6 环境，退出 1 并给出恢复冻结环境提示。
- 真实 MCP 三项测试通过：原数值案例、生产 SDK 两个反例、required/skip/65-qubit auto 与无效输入。
- 契约、SDK 访问与插件静态目录测试 16 项通过。插件目录测试不调用 Codex。
- 实际 Harness 本地协议 fixture 完成 PyZX 工具发现、真实调用、成功/失败及结果持久化，一项通过。
  修复原测试的会话标题请求抢先消耗一次性工具响应的竞态；默认四 SDK 测试范围不变，
  新增可选 OPENQUANTUM_UNITARY_NEXT_IDS=pyzx-optimization 以独立验证单项升级。
- release/lint/locales/capability conformance/SDK guides/generated inventory 检查通过。
- 新增 Ubuntu/macOS 真实 PyZX MCP 和独立矩阵 CI；远端结果需在当前提交后实际检查。

初次 npm --ignore-scripts 导致 node-pty 缺少原生模块，使用隔离缓存的正常 npm rebuild 后
实际 Harness 定向测试通过。整仓 npm run check 在重建前已经启动，共 1249 项（878 通过、9 失败、362 跳过），包含其他 Harness 测试失败，
不将其记为整仓绿色；本修复仍保持 Draft，等当前 head 的 CI 和完整审查。

## 复跑与回退

```bash
npm ci
node scripts/setup-paper-tools.mjs pyzx-optimization
node scripts/build-chatgpt.mjs
node --test tests/unitary-next-contracts.test.mjs tests/sdk-access.test.mjs tests/codex-plugin-catalog.test.mjs
OPENQUANTUM_REAL_UNITARY_NEXT=1 node --test --test-name-pattern='real PyZX' tests/unitary-next-live.test.mjs
OPENQUANTUM_REAL_UNITARY_NEXT=1 OPENQUANTUM_UNITARY_NEXT_IDS=pyzx-optimization node --test tests/harness-unitary-next.test.mjs
npm run check
```

回退须整体回退 manifest/lock、守卫与版本元数据，不能只改 pin；回退会重引入上面的 SDK 缺陷。
这些是限定案例的工程回归，不是全部 PyZX API、所有平台或科学 Acceptance；
scientificAcceptance/scientificValidation 继续为 not_evaluated，没有外部模型调用。
