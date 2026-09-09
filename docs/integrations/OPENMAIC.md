# 量子学习通 · OpenMAIC 应用集成

量子学习通嵌入 [OpenMAIC 官方应用](https://github.com/THU-MAIC/OpenMAIC) 的完整原版界面和服务端。
原版首页、课程库、建课预览、课堂、测验、PBL、课件编辑器和 Pro 工作台沿用上游实现。
OpenQuantum 提供入口、进程管理、持久存储及当前模型连接。此前的四页 SDK 建课回调和统一拒绝 AI 接口的适配已移除。

整套应用已经装配并能启动；这不代表所有在线功能均已验收。当前模型端点连接失败，真实 AI 建课、问答和编辑尚未跑通。

## 使用

```sh
npm install
npm run learning:ui:setup
npm run dev
```

从 `http://localhost:3000` 侧栏打开「量子学习通」。首次打开会启动 PostgreSQL、私有模型连接和原版 Next.js 应用，
默认只监听 `127.0.0.1:3037`，随 Harness Host 退出而停止。顶栏「返回 OpenQuantum」关闭展示，后台任务按原版规则运行。
应用显示名称统一为「量子学习通」，包括首页、工作台、课堂、编辑器、页面标题、多语言提示与视频导出标题。
MIT 许可和上游源码署名保留；语言和外观设置沿用原版，首次默认中文。

首页保留标准建课、深度互动、材料附件、课程导入和 PPTX 导入入口；Pro 开关进入原版工作台。
模型选择显示「OpenQuantum 当前模型」，实际每次请求读取 Harness 当前选择，不写入另一套 Provider Key。
原版建课范围和材料处理规则生效，不再附加四页、TXT-only 或 2,000 字要求限制。

这是本机单用户集成，使用上游开发模式和本机持久化认证。没有公开部署或多用户登录配置。

## 固定上游与安装

- 官方稳定版：[v1.0.1](https://github.com/THU-MAIC/OpenMAIC/releases/tag/v1.0.1)。
- 源码提交：`f50a25644c9c3893503cf0727ccf613c0ce1e748`。
- 源码及依赖：`.openquantum/external/openmaic`，不进入 OpenQuantum Git。
- `learning:ui:setup` 校验提交、按上游锁文件安装依赖，显式构建工作区包和同步导入器。
- PostgreSQL 使用固定版本 `embedded-postgres` 的平台二进制；安装入口显式执行其打包库链接准备，不安装全局数据库服务。
- `scripts/lib/openmaic-ui-source.mjs` 保存可重放的适配。文件内容摘要防止覆盖额外的上游本地改动。
  首页只增加历史课程同步；页面、CSS、建课、课堂和编辑器实现保留。
- 原版后台任务、素材处理、资源回收和退出逻辑全部保留；Node instrumentation 单独加载，避免 Next.js 的 Edge 编译误处理。

## 服务与职责

| 对象 | 职责 |
| --- | --- |
| Harness Client Plugin | 侧栏入口、独立来源 iframe、返回按钮、旧 SDK 课堂同步 |
| Bounded Host Route | `/openquantum/api/learning`，同源 JSON POST 边界，委托应用操作或子应用启动服务 |
| `ui-service.mjs` | 验证安装、启动本次拥有的服务、核对进程身份、随 Host scope 回收 |
| `database-service.mjs` / `database-worker.mjs` | 独立 PostgreSQL 进程、随机本机端口、私有凭据和持久目录 |
| `model-gateway.mjs` | 将上游 OpenAI Chat Completions 请求转换为注入的 Harness `llm.stream` 调用 |
| OpenMAIC 服务端 | 原版建课流程、Pro 教学任务及其工具、课堂文档、材料和学习记录 |
| Harness Model Interface | 当前 Provider、模型、凭据、协议适配和实际模型请求 |

这是一个完整外部子应用边界：OpenMAIC 的 Pro 教学任务仍由它自己的上游 runner 和数据库维护；
它们不是 Harness Session，也不声称经过 Harness Tool Registry、审批或科研 Acceptance。
OpenQuantum 的通用科研 Agent Runtime 仍由 Harness 提供，没有新增 OpenQuantum 自建 Agent 循环。
详见[扩展对象模型](../architecture/EXTENSION_MODEL.md#221-完整外部子应用)。

原生 Tool `generate_quantum_classroom` 保留为独立的、有界 SDK 能力，仍使用真实 Harness 会话及事件。
原版 UI 已不再绕回这条简化建课路径。它的输入校验和科学边界也不能替代上游课程导入或 Pro 工作台的规则。

### 模型连接

私有连接只接受本机、带本次随机 Bearer Token、且没有浏览器 Origin 的服务端请求。
Token 和真实模型凭据不会出现在浏览器模型配置中。iframe 消息只接受精确来源、窗口身份、UUID 和 `library` 命令。
原版应用接口保留自己的身份、所有权及 URL 信任边界，并额外限制本机 Host 与同源 Origin。

适配覆盖文本、内嵌图片、工具定义及历史、工具调用流、推理文本、用量、停止原因、取消和脱敏错误。
JSON 输出要求通过系统指令传给 Harness；不宣称提供 Provider 原生的严格 JSON Schema 约束。
模型别名固定为 `harness-default`，每个请求实际读取当前 Harness route；不提供任意 Provider 转发入口。

`.openquantum/learning/model-requests.jsonl` 只记录请求编号、实际 Provider / 模型、耗时、结束状态及用量，
不记录提示词、材料内容、模型地址或密钥。上游教学过程以自己的持久记录为准。

### 可选服务

原版图片、视频、云端语音、搜索、云端 PDF 解析和视频渲染入口均保留。它们需要各自的服务配置，不能由文本模型连接代替。
显式配置的上游媒体 / 搜索环境变量会传入子应用；上游 `.env.local` 和 `server-providers.yml` 仍按原版机制读取。
本次没有配置这些服务，也没有启动 MP4 渲染容器。视频导出沿用上游能力检查及组合 ZIP 路径。
浏览器语音功能仍取决于浏览器支持和麦克风权限。实验性渲染器及 Pi Chat 等开关保持上游默认值。

## 数据与旧版本迁移

| 位置 | 内容 |
| --- | --- |
| `.openquantum/learning/postgres/` | 原版课程、教学任务、材料元数据和服务端学习记录 |
| `.openquantum/learning/database.json` | 本机数据库凭据，权限 `0600`，不进入 Git |
| `.openquantum/learning/openmaic-data/` | 原版工作台材料字节；源码目录 `data` 指向这里 |
| `.openquantum/learning/classrooms/` | 旧 SDK 入口生成的原始课堂 JSON |
| 原版浏览器存储 | 学习者匿名标识、迁移标记、课程分组关系、光标及原版浏览器媒体资源 |

启动时将已有源码目录内的材料移动到独立持久目录；遇到两份数据或自定义链接会停止，避免覆盖。
数据库使用随机本机端口和独立进程，不接管其他 PostgreSQL 实例。重新准备上游源码不会自动删除这些数据。

首次从 OpenQuantum 打开时，将旧浏览器课堂和学习记录通过上游 DocumentStore / RuntimeStore 复制到服务器，
保留浏览器恢复副本。已编辑的服务端课堂不被覆盖，完成迁移后删除的课程不再自动出现。
学习记录迁移可以从中断位置恢复，发现不一致的记录前缀时保留两侧数据并报告错误。
旧文件夹迁移名称并调整本机分组关系，同时保存恢复快照；之后的删除或重新分组不被重复迁移撤销。
旧 SDK 课堂继续按导入标记同步。

原版仍有浏览器本地媒体和设备身份；本次不提供跨设备自动迁移或账户合并。
换浏览器、地址、端口或清理站点数据前，应使用原版课程导出，并备份上面的持久目录。
公开教学资源清单仍是独立工件，尚未批量输入模型；完整课程体系的制作不属于软件集成验收。

## 验证与剩余项

```sh
node --test tests/learning-library-migration.test.mjs tests/learning-model-gateway.test.mjs tests/learning-ui-bridge.test.mjs tests/quantum-learning.test.mjs tests/harness-quantum-learning.test.mjs
npm run harness:config
```

合同测试覆盖消息隔离、当前模型路由、流式工具调用、取消和错误脱敏、迁移恢复与用户修改保护，以及旧 SDK 会话行为。
模拟模型和离线课堂只用于验证连接合同，不算真实在线 AI 成功。

2026-09-09：22 项相关测试通过，适配后的上游 TypeScript 检查、相关 JavaScript 检查与 Harness 组合配置检查通过。
本机运行证据如下：

| 项目 | 实际结果 |
| --- | --- |
| 原版首页及模型选择 | 浏览器已显示原版首页、材料附件、深度互动、PPTX 导入和 Pro 开关；当前预览工具无响应，后续界面验收未完成 |
| 上游服务 | 身份检查、健康检查、模型目录、Pro 状态和 23 项原版技能目录正常响应；原版 runner 已启动 |
| PDF | 原版 `/api/extract-document` 成功提取自制量子材料中的文字 |
| 工作台上传 | 原版上传接口返回 201；71 字节自制材料重启后仍在，内容摘要与数据库一致 |
| 课程存储 | 三页测试课堂写入、重启读回成功；本次测试课堂已清理 |
| 迁移兼容性 | 隔离内存 IndexedDB 中的原生浏览器存储，通过原生 HTTP 文档接口及 PostgreSQL 学习记录接口迁移成功：3 页、2 条测验记录，保留完成状态和删除行为 |
| Pro 教学任务 | 原生创建返回 202，runner 实际请求 Harness 当前模型；请求失败状态和历史在重启后保留；不同匿名身份读取返回 404 |
| 在线 AI | 当前 `openquantum-public / glm5.2` 请求连接失败；直接端点检查也失败。未切换 Provider、模型或持久代理设置，AI 建课、实时教学和 AI 编辑仍未验收 |
| 可选媒体 / 搜索 / MP4 渲染 | 上游实现保留，外部服务未配置，未声明可用 |

界面日志：`.openquantum/learning/openmaic-ui.log`。本机验证记录保存在同目录的 `native-*-probe.json` 与相关测试日志中。
浏览器旧课程的实际迁移和完整建课界面仍需在预览工具恢复后验收，不能用上述隔离存储验证代替。

可通过 `OPENQUANTUM_OPENMAIC_PORT` 显式调整端口。本机此次把可重建的 `.next` 缓存链接到
`/Volumes/Elements/openquantum-build-cache/openmaic/.next`，并在其父目录设置指向上游依赖的 `node_modules` 链接，
保留 Turbopack 相对依赖解析。此缓存布局是本机状态，不进入 Git；其他机器默认在源码目录编译。
